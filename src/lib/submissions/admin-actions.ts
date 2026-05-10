'use server';

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { db } from '@/db';
import { submissions, moderation_log } from '@/db/schema';
import { assertEditorOrAdmin } from '@/lib/auth/role-gate';
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
  return (user as { id?: string } | null)?.id ?? null;
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
