'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { users, consents } from '@/db/schema';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Phase 5 D-07 / D-13 / NOTIF-01 / NOTIF-03 — member preferences Server Actions.
//
// saveTopicPreference: INSERTs ONE consents row (append-only D-13) for the
//   given (user, topic) pair. Reading the latest row per (user, kind) gives
//   current state — see src/lib/newsletter/recipients.ts getCurrentTopicState.
//
// savePreferredChannel: UPDATEs users.preferred_channel (this column is on
//   users, NOT consents — D-07 declares it informational and not subject to
//   append-only audit semantics).

const POLICY_VERSION = '2026-04-29';

const TopicEnum = z.enum([
  'newsletter_general',
  'newsletter_voting',
  'newsletter_reports',
  'newsletter_events',
]);

const ChannelEnum = z.enum(['whatsapp', 'telegram', 'none']);

const TopicInput = z.object({
  topic: TopicEnum,
  granted: z.boolean(),
});

export type SavePrefResult =
  | { ok: true }
  | { ok: false; reason: 'unauthenticated' | 'invalid_input' | 'db_error' };

export async function saveTopicPreference(input: {
  topic: string;
  granted: boolean;
}): Promise<SavePrefResult> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, reason: 'unauthenticated' };

  const parsed = TopicInput.safeParse(input);
  if (!parsed.success) return { ok: false, reason: 'invalid_input' };

  try {
    await db.insert(consents).values({
      user_id: userId,
      kind: parsed.data.topic,
      granted: parsed.data.granted,
      version: POLICY_VERSION,
    });
    logger.info(
      { user_id: userId, topic: parsed.data.topic, granted: parsed.data.granted },
      'preferences.topic.saved',
    );
    return { ok: true };
  } catch (err) {
    logger.warn(
      { user_id: userId, err: err instanceof Error ? err.message : String(err) },
      'preferences.topic.db_error',
    );
    return { ok: false, reason: 'db_error' };
  }
}

export async function savePreferredChannel(input: {
  channel: string | null;
}): Promise<SavePrefResult> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, reason: 'unauthenticated' };

  const channelOrNull =
    input.channel === null || input.channel === undefined ? null : input.channel;
  if (channelOrNull !== null) {
    const parsed = ChannelEnum.safeParse(channelOrNull);
    if (!parsed.success) return { ok: false, reason: 'invalid_input' };
  }

  try {
    await db
      .update(users)
      .set({ preferred_channel: channelOrNull })
      .where(eq(users.id, userId));
    logger.info(
      { user_id: userId, channel: channelOrNull },
      'preferences.channel.saved',
    );
    return { ok: true };
  } catch (err) {
    logger.warn(
      { user_id: userId, err: err instanceof Error ? err.message : String(err) },
      'preferences.channel.db_error',
    );
    return { ok: false, reason: 'db_error' };
  }
}
