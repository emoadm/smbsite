'use server';

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { db } from '@/db';
import { submissions, moderation_log, users } from '@/db/schema';
import { assertEditorOrAdmin, assertSuperEditor, assertNotLastSuperEditor } from '@/lib/auth/role-gate';
import { addEmailJob } from '@/lib/email/queue';

// Phase 4 EDIT-04 / EDIT-05 — editorial moderation Server Actions.
// APPEND-ONLY invariant: this file MUST NEVER call db.update(moderation_log) or db.delete(moderation_log).
// Enforced at DB layer (REVOKE on moderation_log per Plan 04-01 Task 5) and by
// tests/unit/moderation-log-schema.test.ts source-code assertion.

const approveSchema = z.object({ submissionId: z.string().uuid() });
const rejectSchema = z.object({
  submissionId: z.string().uuid(),
  note: z.string().trim().min(5).max(2000),
});

export type AdminActionResult = { ok: true } | { ok: false; error: string };

/**
 * Resolve the Payload admin_users id for the currently authenticated user.
 * NOTE: The moderation_log.actor_user_id FK references users.id (application users table),
 * NOT admin_users.id. Phase 4 ships with actor_user_id = NULL when the Payload admin_users.id
 * has no corresponding row in the application users table. Plan 04-07 ops runbook documents
 * the dual-identity provisioning requirement (T-04-06-05, disposition: accept).
 */
async function getActorUserId(): Promise<string | null> {
  const payload = await getPayload({ config });
  const h = await headers();
  const { user } = await payload.auth({ headers: h });
  const u = user as { id?: string | number; email?: string } | null;
  if (!u) return null;
  // admin_users.id is integer (Payload), users.id is UUID. If the session
  // already carries a UUID-shaped id, use it. Otherwise resolve via
  // shared email — the operator runbook treats admin_users.email and
  // users.email as the same identity (T-04-06-05, dual-identity model).
  if (typeof u.id === 'string' && /^[0-9a-f]{8}-/i.test(u.id)) return u.id;
  if (!u.email) return null;
  const [match] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, u.email))
    .limit(1);
  return match?.id ?? null;
}

/**
 * Approve a pending submission.
 *
 * Race safety: UPDATE filters WHERE status='pending' so only the first concurrent
 * call succeeds; the second returns alreadyHandled with NO log row inserted.
 * (T-04-06-02 mitigation)
 */
export async function approveSubmission(input: {
  submissionId: string;
}): Promise<AdminActionResult> {
  await assertEditorOrAdmin();
  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'submission.error.validation' };
  const actorId = await getActorUserId();

  try {
    await db.transaction(async (tx) => {
      // Atomic transition: only flip pending → approved (race-safe)
      const updated = await tx
        .update(submissions)
        .set({
          status: 'approved',
          approved_at: new Date(),
          reviewed_at: new Date(),
          reviewer_id: actorId,
        })
        .where(
          and(
            eq(submissions.id, parsed.data.submissionId),
            eq(submissions.status, 'pending'),
          ),
        )
        .returning({ id: submissions.id });

      if (updated.length === 0) {
        throw new Error('alreadyHandled');
      }

      // Append-only moderation_log INSERT (never UPDATE or DELETE)
      await tx.insert(moderation_log).values({
        action: 'submission_approve',
        actor_user_id: actorId, // NULL when admin_users.id has no matching users.id row (T-04-06-05)
        target_kind: 'submission',
        target_id: updated[0]!.id,
      });
    });

    // Post-transaction enqueue — won't roll back on email failure.
    // Worker handler (Plan 04-07) resolves submitter email + title from DB using userId=submissionId.
    await addEmailJob({
      to: '', // Plan 04-07 worker resolves submitter email from submissionId
      kind: 'submission-status-approved',
      userId: parsed.data.submissionId, // overloaded to carry submissionId (Plan 04-07 refactors this)
    });

    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'alreadyHandled') {
      return { ok: false, error: 'submission.error.alreadyHandled' };
    }
    throw err;
  }
}

/**
 * Reject a pending submission with a required moderator note.
 *
 * Zod enforces note.length >= 5 (trim). Same race-safety as approveSubmission.
 */
export async function rejectSubmission(input: {
  submissionId: string;
  note: string;
}): Promise<AdminActionResult> {
  await assertEditorOrAdmin();
  const parsed = rejectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'submission.error.validation' };
  const actorId = await getActorUserId();

  try {
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(submissions)
        .set({
          status: 'rejected',
          moderator_note: parsed.data.note,
          reviewed_at: new Date(),
          reviewer_id: actorId,
        })
        .where(
          and(
            eq(submissions.id, parsed.data.submissionId),
            eq(submissions.status, 'pending'),
          ),
        )
        .returning({ id: submissions.id });

      if (updated.length === 0) {
        throw new Error('alreadyHandled');
      }

      // Append-only moderation_log INSERT (never UPDATE or DELETE)
      await tx.insert(moderation_log).values({
        action: 'submission_reject',
        actor_user_id: actorId, // NULL when admin_users.id has no matching users.id row (T-04-06-05)
        target_kind: 'submission',
        target_id: updated[0]!.id,
        note: parsed.data.note,
      });
    });

    // Post-transaction enqueue — won't roll back on email failure.
    await addEmailJob({
      to: '', // Plan 04-07 worker resolves submitter email from submissionId
      kind: 'submission-status-rejected',
      userId: parsed.data.submissionId, // overloaded to carry submissionId (Plan 04-07 refactors this)
    });

    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'alreadyHandled') {
      return { ok: false, error: 'submission.error.alreadyHandled' };
    }
    throw err;
  }
}

// --- Phase 4 Plan 04-07 — EDIT-06 member lifecycle actions ---

const suspendSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().trim().min(10).max(2000),
});

const unsuspendSchema = z.object({
  userId: z.string().uuid(),
  note: z.string().trim().min(5).max(2000),
});

const userIdSchema = z.object({ userId: z.string().uuid() });

/**
 * Suspend a member account.
 *
 * Requires editor or admin role. Reason >= 10 chars.
 * Atomic: UPDATE users SET status='suspended' (WHERE status='active') + INSERT moderation_log.
 * Race safety: WHERE status='active' means only the first concurrent call succeeds;
 * the second returns alreadyHandled (T-04-07-02 mitigation).
 * Enqueues 'user-suspended' email job for BullMQ worker.
 */
export async function suspendUser(input: {
  userId: string;
  reason: string;
}): Promise<AdminActionResult> {
  await assertEditorOrAdmin();
  const parsed = suspendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'submission.error.validation' };
  const actorId = await getActorUserId();

  try {
    let userEmail: string | null = null;
    let userFullName: string | null = null;

    await db.transaction(async (tx) => {
      const updated = await tx
        .update(users)
        .set({ status: 'suspended' })
        .where(and(eq(users.id, parsed.data.userId), eq(users.status, 'active')))
        .returning({ id: users.id, email: users.email, full_name: users.full_name });

      if (updated.length === 0) {
        throw new Error('alreadyHandled');
      }

      userEmail = updated[0]!.email;
      userFullName = updated[0]!.full_name;

      await tx.insert(moderation_log).values({
        action: 'user_suspend',
        actor_user_id: actorId,
        target_kind: 'user',
        target_id: parsed.data.userId,
        note: parsed.data.reason,
      });
    });

    if (userEmail) {
      await addEmailJob({
        to: userEmail,
        kind: 'user-suspended',
        fullName: userFullName ?? '',
        suspensionReason: parsed.data.reason,
      });
    }

    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'alreadyHandled') {
      return { ok: false, error: 'submission.error.alreadyHandled' };
    }
    throw err;
  }
}

/**
 * Unsuspend a member account.
 *
 * Requires super_editor or admin role (D-A2 — only super-editors can reverse suspensions).
 * Reverses status: 'suspended' → 'active'. Appends unsuspend log row.
 */
export async function unsuspendUser(input: {
  userId: string;
  note: string;
}): Promise<AdminActionResult> {
  await assertSuperEditor();
  const parsed = unsuspendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'submission.error.validation' };
  const actorId = await getActorUserId();

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(users)
      .set({ status: 'active' })
      .where(and(eq(users.id, parsed.data.userId), eq(users.status, 'suspended')))
      .returning({ id: users.id });

    if (updated.length === 0) return;

    await tx.insert(moderation_log).values({
      action: 'user_unsuspend',
      actor_user_id: actorId,
      target_kind: 'user',
      target_id: updated[0]!.id,
      note: parsed.data.note,
    });
  });

  return { ok: true };
}

/**
 * Grant editor role to a member.
 *
 * Requires super_editor or admin role. Sets users.platform_role='editor'.
 */
export async function grantEditor(input: { userId: string }): Promise<AdminActionResult> {
  await assertSuperEditor();
  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'submission.error.validation' };
  const actorId = await getActorUserId();

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ platform_role: 'editor' })
      .where(eq(users.id, parsed.data.userId));

    await tx.insert(moderation_log).values({
      action: 'editor_grant',
      actor_user_id: actorId,
      target_kind: 'user',
      target_id: parsed.data.userId,
    });
  });

  return { ok: true };
}

/**
 * Revoke editor (or super_editor) role from a member.
 *
 * Requires super_editor or admin role.
 * If the target is a super_editor, assertNotLastSuperEditor() guard runs BEFORE the UPDATE
 * to prevent locking out all role management (T-04-07-05 mitigation).
 */
export async function revokeEditor(input: { userId: string }): Promise<AdminActionResult> {
  await assertSuperEditor();
  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'submission.error.validation' };
  const actorId = await getActorUserId();

  // Read target's current platform_role to decide whether last-super-editor guard applies.
  const [target] = await db
    .select({ platform_role: users.platform_role })
    .from(users)
    .where(eq(users.id, parsed.data.userId))
    .limit(1);

  if (target?.platform_role === 'super_editor') {
    await assertNotLastSuperEditor();
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ platform_role: null })
      .where(eq(users.id, parsed.data.userId));

    await tx.insert(moderation_log).values({
      action: 'editor_revoke',
      actor_user_id: actorId,
      target_kind: 'user',
      target_id: parsed.data.userId,
    });
  });

  return { ok: true };
}
