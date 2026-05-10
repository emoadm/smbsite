// Re-export Server Actions and query helpers for moderation-queue Client Components.
// Client Components importing Server Actions must come from 'use server' modules;
// this re-export keeps the view directory self-contained.
export { approveSubmission, rejectSubmission } from '@/lib/submissions/admin-actions';
export { fetchModerationQueue } from '@/lib/submissions/admin-queries';
export type { ModerationQueueData, PendingRow } from '@/lib/submissions/admin-queries';
