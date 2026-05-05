'use server';

import { getNewsletterRecipients } from '@/lib/newsletter/recipients';
import { assertEditorOrAdmin } from '@/lib/auth/role-gate';
import type { NewsletterTopic } from '@/lib/email/templates/NewsletterEmail';

// Phase 5 D-05 — recipient count preview for composer.
//
// Returns COUNT only — never the user list (privacy — editor doesn't need
// per-recipient identity at compose time).

export type RecipientCountResult =
  | { ok: true; count: number }
  | { ok: false; reason: 'forbidden' };

export async function getRecipientCount(input: {
  topic: NewsletterTopic;
}): Promise<RecipientCountResult> {
  try {
    await assertEditorOrAdmin();
  } catch {
    return { ok: false, reason: 'forbidden' };
  }
  // Reuses the same DISTINCT ON CTE; for v1 audience scale the cost is
  // acceptable. Future optimization: dedicated COUNT query.
  const recipients = await getNewsletterRecipients(input.topic);
  return { ok: true, count: recipients.length };
}
