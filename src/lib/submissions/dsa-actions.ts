'use server';

import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { submissions, users } from '@/db/schema';
import { dsaReportSchema } from './zod';
import { verifyTurnstile } from '@/lib/turnstile';
import { getClientIp } from '@/lib/ip';
import { checkSubmissionPerUser, checkSubmissionPerIp } from '@/lib/rate-limit';

export type DsaSubmitResult =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

/**
 * T-04-08 — DSA Article 16 notice-and-action Server Action.
 *
 * Mirrors the submitProposal / submitProblemReport 6-step pipeline:
 * 1. Auth + emailVerified check
 * 2. Suspension gate (defense-in-depth; layout gate is Plan 04-07)
 * 3. Rate limit (per-user 5/24h + per-IP 10/24h) — DSA reports count
 *    against the same Upstash budget as PROP/PROB submissions
 * 4. Zod parse (dsaReportSchema)
 * 5. Turnstile verify
 * 6. DB INSERT — kind='dsa_report', target_submission_id=<reported id>,
 *    body=reason, topic=category
 *
 * T-04-08-02: kind + status HARDCODED — never accepted from FormData.
 * T-04-08-03: reporter identity NOT visible to reported content's submitter.
 * Security: authenticated members only (DSA Art.16 substantiated notice via identity).
 */
export async function submitDsaReport(
  _prevState: DsaSubmitResult | null,
  formData: FormData,
): Promise<DsaSubmitResult> {
  // 1. Auth + email-verified
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'submission.gate.unverified' };
  const sessionUser = session.user as { id: string; emailVerified?: Date | null };
  if (!sessionUser.emailVerified) return { ok: false, error: 'submission.gate.unverified' };

  // 2. Suspension gate (defense-in-depth — independent of member/layout.tsx Plan 04-07)
  const [u] = await db
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1);
  if (u?.status === 'suspended') return { ok: false, error: 'submission.gate.suspended' };

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
  const parsed = dsaReportSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // 5. Turnstile verification
  const tr = await verifyTurnstile(parsed.data['cf-turnstile-response'], ip ?? undefined);
  if (!tr.ok) return { ok: false, error: 'submission.error.captchaFailed' };

  // 6. INSERT — kind + status hardcoded (T-04-08-02).
  // category stored in `topic` column (same type, project convention).
  // body = reporter's reason text.
  // target_submission_id = UUID of the reported submission.
  await db.insert(submissions).values({
    submitter_id: sessionUser.id,
    kind: 'dsa_report',
    status: 'pending',
    body: parsed.data.reason,
    topic: parsed.data.category,
    target_submission_id: parsed.data.targetSubmissionId,
  });

  return { ok: true };
}
