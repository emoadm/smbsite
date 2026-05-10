'use server';

// Server-Action re-export for moderation-queue Client Components.
// MUST start with 'use server' so client imports become RPC stubs and the
// `next/headers` chain in role-gate.ts is not pulled into the browser bundle.
//
// Non-Server-Action exports (fetchModerationQueue + types) live in
// @/lib/submissions/admin-queries and are imported directly by the RSC
// ModerationQueueView and the client components (types only).
export {
  approveSubmission,
  rejectSubmission,
  suspendUser,
  unsuspendUser,
  grantEditor,
  revokeEditor,
} from '@/lib/submissions/admin-actions';
