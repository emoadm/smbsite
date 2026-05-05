'use server';

import { getPayload } from 'payload';
import config from '@/payload.config';
import { addEmailJob } from '@/lib/email/queue';
import { assertEditorOrAdmin } from '@/lib/auth/role-gate';
import { logger } from '@/lib/logger';

// Phase 5 D-02 / D-04 / D-05 / NOTIF-09 — send blast (immediate or scheduled).
//
// Pre-flight gates (D-02):
//   1. assertEditorOrAdmin (D-25)
//   2. Newsletters doc exists + status === 'draft'
//   3. lastTestSentAt set + within 24h
//   4. lastEditedAfterTestAt === false (any edit since test invalidates the gate)
//
// On success:
//   - if scheduledAt set → delayMs = scheduledAt - now; status='scheduled'
//   - else                → delayMs = 0; status='sending'
//   - addEmailJob('newsletter-blast', { newsletterId, delayMs })
//
// Worker (Plan 05-05) takes over from there.

const TEST_GATE_MS = 24 * 60 * 60 * 1000;

export type SendBlastResult =
  | { ok: true; scheduled: boolean; recipientHint?: number }
  | {
      ok: false;
      reason:
        | 'gate_never'
        | 'gate_expired'
        | 'gate_invalidated'
        | 'wrong_status'
        | 'missing'
        | 'forbidden';
    };

export async function sendBlast(input: { newsletterId: string }): Promise<SendBlastResult> {
  try {
    await assertEditorOrAdmin();
  } catch {
    return { ok: false, reason: 'forbidden' };
  }

  const payloadInst = await getPayload({ config });
  const doc = (await payloadInst
    .findByID({ collection: 'newsletters' as never, id: input.newsletterId })
    .catch(() => null)) as
    | {
        status?: string;
        lastTestSentAt?: string | null;
        lastEditedAfterTestAt?: boolean;
        scheduledAt?: string | null;
      }
    | null;
  if (!doc) return { ok: false, reason: 'missing' };
  if (doc.status !== 'draft') return { ok: false, reason: 'wrong_status' };

  // 24h gate — D-02
  if (!doc.lastTestSentAt) return { ok: false, reason: 'gate_never' };
  const testTs = new Date(doc.lastTestSentAt).getTime();
  if (Date.now() - testTs > TEST_GATE_MS) return { ok: false, reason: 'gate_expired' };
  if (doc.lastEditedAfterTestAt === true) return { ok: false, reason: 'gate_invalidated' };

  // Compute delay
  let delayMs: number | undefined = undefined;
  let scheduled = false;
  if (doc.scheduledAt) {
    const target = new Date(doc.scheduledAt).getTime();
    const delta = target - Date.now();
    if (delta > 0) {
      delayMs = delta;
      scheduled = true;
    }
  }

  // Update status BEFORE enqueue (so a fast-firing worker sees the right state)
  await payloadInst.update({
    collection: 'newsletters' as never,
    id: input.newsletterId,
    data: { status: scheduled ? 'scheduled' : 'sending' } as never,
  });

  await addEmailJob({
    to: '', // unused for fan-out trigger
    kind: 'newsletter-blast',
    newsletterId: input.newsletterId,
    ...(delayMs !== undefined ? { delayMs } : {}),
  });

  logger.info(
    { newsletterId: input.newsletterId, scheduled },
    'newsletter.send-blast.enqueued',
  );
  return { ok: true, scheduled };
}
