import { getPayload } from 'payload';
import { headers } from 'next/headers';
import config from '@/payload.config';

/**
 * Phase 5 D-25 / Phase 02.1 D-13 — shared editor/admin gate.
 * Extracted from src/app/(payload)/admin/views/attribution/actions.ts.
 * Used by every admin Server Action in Phase 5 (composer, save-blast,
 * send-test, cancel-scheduled, recipient-count, preview).
 *
 * SINGULAR `role` (not `roles`) is locked in by tests/unit/role-gate.test.ts
 * and tests/unit/dashboard-role-gate.test.ts (Phase 02.1 lineage).
 */
export async function assertEditorOrAdmin(): Promise<void> {
  const payload = await getPayload({ config });
  const h = await headers();
  const { user } = await payload.auth({ headers: h });
  const role = (user as { role?: string } | null)?.role ?? '';
  if (!['admin', 'editor'].includes(role)) {
    throw new Error('Forbidden — editor or admin role required');
  }
}
