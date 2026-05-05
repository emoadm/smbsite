'use server';

import { getPayload } from 'payload';
import config from '@/payload.config';
import { assertEditorOrAdmin } from '@/lib/auth/role-gate';
import { logger } from '@/lib/logger';

// Phase 5 D-04 / Pitfall 3 — cancel a scheduled blast.
//
// Order MATTERS:
//   1. UPDATE Payload doc status='cancelled' (DB write — source of truth).
//   2. Try BullMQ getJob(jobId).remove(); ignore failure.
//   3. Worker's per-recipient handler re-checks status before each Brevo call
//      (Plan 05-05 newsletter-send-recipient branch), so even if remove failed
//      and the job already promoted to active, the cancel still propagates.
//
// Pitfall 3 — never trust BullMQ remove() in isolation; doc.status is the
// authoritative cancel signal.

export type CancelResult =
  | { ok: true; jobRemoved: boolean }
  | { ok: false; reason: 'forbidden' | 'missing' | 'not_scheduled' };

export async function cancelScheduled(input: { newsletterId: string }): Promise<CancelResult> {
  try {
    await assertEditorOrAdmin();
  } catch {
    return { ok: false, reason: 'forbidden' };
  }

  const payloadInst = await getPayload({ config });
  const doc = (await payloadInst
    .findByID({ collection: 'newsletters' as never, id: input.newsletterId })
    .catch(() => null)) as { status?: string } | null;
  if (!doc) return { ok: false, reason: 'missing' };
  if (doc.status !== 'scheduled') return { ok: false, reason: 'not_scheduled' };

  // 1. UPDATE status='cancelled' FIRST — this is the source of truth.
  await payloadInst.update({
    collection: 'newsletters' as never,
    id: input.newsletterId,
    data: { status: 'cancelled' } as never,
  });

  // 2. Best-effort BullMQ job remove.
  let jobRemoved = false;
  try {
    const { Queue } = await import('bullmq');
    const IORedis = (await import('ioredis')).default;
    const conn = new IORedis(process.env.UPSTASH_REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: process.env.UPSTASH_REDIS_URL!.startsWith('rediss://') ? {} : undefined,
    });
    const queue = new Queue('email-queue', { connection: conn });
    const job = await queue.getJob(`newsletter-${input.newsletterId}`);
    if (job) {
      await job.remove();
      jobRemoved = true;
    }
    await queue.close();
    await conn.quit();
  } catch (err) {
    // Job already active or Redis unreachable — DB cancel is still authoritative.
    logger.warn(
      {
        newsletterId: input.newsletterId,
        err: err instanceof Error ? err.message : String(err),
      },
      'newsletter.cancel-scheduled.job_remove_failed',
    );
  }

  logger.info(
    { newsletterId: input.newsletterId, jobRemoved },
    'newsletter.cancel-scheduled.ok',
  );
  return { ok: true, jobRemoved };
}
