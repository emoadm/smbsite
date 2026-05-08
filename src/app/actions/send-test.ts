'use server';

import { headers } from 'next/headers';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { addEmailJob } from '@/lib/email/queue';
import { assertEditorOrAdmin } from '@/lib/auth/role-gate';
import { logger } from '@/lib/logger';

// Phase 5 D-02 — single test send to caller's own email.
// Worker (Plan 05-05 newsletter-test branch) updates lastTestSentAt + clears
// lastEditedAfterTestAt on successful send.

export type SendTestResult =
  | { ok: true; sentTo: string }
  | { ok: false; reason: 'forbidden' | 'missing' | 'no_email' };

export async function sendTest(input: { newsletterId: string }): Promise<SendTestResult> {
  try {
    await assertEditorOrAdmin();
  } catch {
    return { ok: false, reason: 'forbidden' };
  }

  const payloadInst = await getPayload({ config });
  const h = await headers();
  const { user } = await payloadInst.auth({ headers: h });
  const editorEmail = (user as { email?: string } | null)?.email;
  if (!editorEmail) return { ok: false, reason: 'no_email' };

  const doc = (await payloadInst
    .findByID({ collection: 'newsletters' as never, id: input.newsletterId })
    .catch(() => null)) as { topic?: string } | null;
  if (!doc) return { ok: false, reason: 'missing' };

  // Pass editor userId so the worker can sign a real unsub token for the
  // test email. Payload admin user IDs are numbers at runtime, not strings
  // — coerce explicitly here. signUnsubToken serializes the uid into the
  // JWT body via JSON.stringify, but verifyUnsubToken rejects with
  // `reason=malformed` when typeof payload.uid !== 'string', which
  // produced the dead /unsubscribed?reason=malformed page on the first
  // click-through attempt.
  const editorUserIdRaw = (user as { id?: string | number } | null)?.id;
  const editorUserId =
    editorUserIdRaw != null ? String(editorUserIdRaw) : undefined;
  await addEmailJob({
    to: editorEmail,
    kind: 'newsletter-test',
    newsletterId: input.newsletterId,
    topic: doc.topic,
    fullName: (user as { name?: string } | null)?.name ?? '',
    userId: editorUserId,
  });

  logger.info({ newsletterId: input.newsletterId }, 'newsletter.send-test.enqueued');
  return { ok: true, sentTo: editorEmail };
}
