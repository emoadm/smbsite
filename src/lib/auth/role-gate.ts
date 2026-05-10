import { getPayload } from 'payload';
import { headers } from 'next/headers';
import config from '@/payload.config';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Phase 5 D-25 / Phase 02.1 D-13 — shared editor/admin gate.
 * Extracted from src/app/(payload)/admin/views/attribution/actions.ts.
 * Used by every admin Server Action in Phase 5 (composer, save-blast,
 * send-test, cancel-scheduled, recipient-count, preview).
 *
 * SINGULAR `role` (not `roles`) is locked in by tests/unit/role-gate.test.ts
 * and tests/unit/dashboard-role-gate.test.ts (Phase 02.1 lineage).
 *
 * Phase 4 — extend to recognize super_editor (D-A2). Closes pre-resolved Q1 latent gap.
 */
export async function assertEditorOrAdmin(): Promise<void> {
  const payload = await getPayload({ config });
  const h = await headers();
  const { user } = await payload.auth({ headers: h });
  const role = (user as { role?: string } | null)?.role ?? '';
  // Phase 4 — extend to recognize super_editor (D-A2). Closes pre-resolved Q1 latent gap.
  if (!['admin', 'editor', 'super_editor'].includes(role)) {
    throw new Error('Forbidden — editor or admin role required');
  }
}

/**
 * Phase 4 D-A2 — super_editor gate.
 * Used by Plan 04-07 grant/revoke flows that require elevated editorial role.
 * Accepts admin or super_editor only — NOT plain 'editor'.
 */
export async function assertSuperEditor(): Promise<void> {
  const payload = await getPayload({ config });
  const h = await headers();
  const { user } = await payload.auth({ headers: h });
  const role = (user as { role?: string } | null)?.role ?? '';
  if (!['admin', 'super_editor'].includes(role)) {
    throw new Error('Forbidden — super_editor role required');
  }
}

/**
 * Phase 4 D-A2 — server-action-level suspension gate.
 * Defense in depth: member/layout.tsx (Plan 04-07) also redirects suspended
 * accounts on RSC navigation, but Server Actions are reachable directly via
 * RPC without going through the Next.js form.
 *
 * NOTE: This checks the application `users.status` (Drizzle), NOT the Payload
 * admin_users table. The session token does NOT embed `status`, so we always
 * query DB live to avoid stale-cache bypass (PATTERNS.md Pattern 6).
 *
 * Throws Error('Account suspended') for callers to map to the
 * 'submission.gate.suspended' i18n key.
 */
export async function assertNotSuspended(userId: string): Promise<void> {
  const [u] = await db
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (u?.status === 'suspended') {
    throw new Error('Account suspended');
  }
}
