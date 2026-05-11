'use server';

import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { submissions, users } from '@/db/schema';
import { proposalSchema, problemReportSchema } from './zod';
import { verifyTurnstile } from '@/lib/turnstile';
import { getClientIp } from '@/lib/ip';
import { checkSubmissionPerUser, checkSubmissionPerIp } from '@/lib/rate-limit';

export type SubmitResult =
  | { ok: true; nextHref: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

/**
 * Load the Auth.js session user (id + emailVerified).
 * Returns null if no session or no user.
 */
async function loadSessionUser(): Promise<{ id: string; emailVerified?: Date | null } | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as { id: string; emailVerified?: Date | null };
}

/**
 * Read `users.status` live from DB (session token does NOT embed status).
 * Returns the status string or null if user not found.
 * PATTERNS.md Pattern 6 — always query DB to avoid stale-cache suspension bypass.
 */
async function checkAccountStatus(userId: string): Promise<string | null> {
  const [u] = await db
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return u?.status ?? null;
}

/**
 * T-04-03-01 — proposal submission Server Action.
 *
 * 6-step pipeline per plan:
 * 1. Auth + emailVerified check
 * 2. Suspension gate (defense-in-depth; layout gate is Plan 04-07)
 * 3. Rate limit (per-user 5/24h + per-IP 10/24h)
 * 4. Zod parse
 * 5. Turnstile verify
 * 6. DB INSERT (kind='proposal', status='pending')
 *
 * T-04-03-02: kind + status are HARDCODED — never accepted from FormData.
 * T-04-03-04: all error paths return typed keys; no stack trace reaches client.
 * T-04-03-05: suspension check runs here even if layout redirected.
 */
export async function submitProposal(
  _prevState: SubmitResult | null,
  formData: FormData,
): Promise<SubmitResult> {
  // 1. Auth + email-verified
  const sessionUser = await loadSessionUser();
  if (!sessionUser) return { ok: false, error: 'submission.gate.unverified' };
  if (!sessionUser.emailVerified) return { ok: false, error: 'submission.gate.unverified' };

  // 2. Suspension gate (defense-in-depth — independent of member/layout.tsx Plan 04-07)
  const status = await checkAccountStatus(sessionUser.id);
  if (status === 'suspended') return { ok: false, error: 'submission.gate.suspended' };

  // 3. Rate limit (per-user then per-IP)
  const h = await headers();
  const ip = getClientIp(h);
  const userR = await checkSubmissionPerUser(sessionUser.id);
  if (!userR.success) return { ok: false, error: 'submission.error.rateLimit' };
  if (ip) {
    const ipR = await checkSubmissionPerIp(ip);
    if (!ipR.success) return { ok: false, error: 'submission.error.rateLimit' };
  }

  // 4. Zod parse
  const raw = Object.fromEntries(formData.entries());
  const parsed = proposalSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // 5. Turnstile verification
  const tr = await verifyTurnstile(parsed.data['cf-turnstile-response'], ip ?? undefined);
  if (!tr.ok) return { ok: false, error: 'submission.error.captchaFailed' };

  // 6. INSERT — kind + status hardcoded (T-04-03-02); submitter_id = session user id (owner-isolation)
  await db.insert(submissions).values({
    submitter_id: sessionUser.id,
    kind: 'proposal',
    status: 'pending',
    title: parsed.data.title,
    body: parsed.data.body,
    topic: parsed.data.topic,
  });

  return { ok: true, nextHref: '/member/predlozheniya' };
}

/**
 * T-04-03-01 — problem report submission Server Action.
 *
 * Same 6-step pipeline as submitProposal but against problemReportSchema.
 * Additional fields: level (local|national) and oblast (nullable when national).
 *
 * T-04-03-03: raw IP never leaves server; only derived ISO oblast code passed to client.
 */
export async function submitProblemReport(
  _prevState: SubmitResult | null,
  formData: FormData,
): Promise<SubmitResult> {
  // 1. Auth + email-verified
  const sessionUser = await loadSessionUser();
  if (!sessionUser) return { ok: false, error: 'submission.gate.unverified' };
  if (!sessionUser.emailVerified) return { ok: false, error: 'submission.gate.unverified' };

  // 2. Suspension gate
  const status = await checkAccountStatus(sessionUser.id);
  if (status === 'suspended') return { ok: false, error: 'submission.gate.suspended' };

  // 3. Rate limit
  const h = await headers();
  const ip = getClientIp(h);
  const userR = await checkSubmissionPerUser(sessionUser.id);
  if (!userR.success) return { ok: false, error: 'submission.error.rateLimit' };
  if (ip) {
    const ipR = await checkSubmissionPerIp(ip);
    if (!ipR.success) return { ok: false, error: 'submission.error.rateLimit' };
  }

  // 4. Zod parse (includes superRefine requiring oblast when level='local')
  const raw = Object.fromEntries(formData.entries());
  const parsed = problemReportSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // 5. Turnstile verification
  const tr = await verifyTurnstile(parsed.data['cf-turnstile-response'], ip ?? undefined);
  if (!tr.ok) return { ok: false, error: 'submission.error.captchaFailed' };

  // 6. INSERT — oblast is null when level='national' (not from FormData directly)
  await db.insert(submissions).values({
    submitter_id: sessionUser.id,
    kind: 'problem',
    status: 'pending',
    body: parsed.data.body,
    topic: parsed.data.topic,
    level: parsed.data.level,
    // T-04-03-06: only write oblast when level='local'; null for national
    oblast: parsed.data.level === 'local' ? (parsed.data.oblast ?? null) : null,
  });

  return { ok: true, nextHref: '/member/signali' };
}
