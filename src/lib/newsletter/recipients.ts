import { sql } from 'drizzle-orm';
import { db } from '@/db';
import type { NewsletterTopic } from '@/lib/email/templates/NewsletterEmail';

export interface NewsletterRecipient {
  id: string;
  email: string;
  full_name: string;
}

/**
 * Phase 5 D-05 / D-09 — recipient list at DISPATCH time.
 *
 * Precedence:
 *   1. If a row exists with kind='newsletter_${topic}' → use latest by granted_at DESC.
 *   2. Else if a row exists with kind='newsletter' (legacy Phase 1) → use latest as blanket grant.
 *   3. Else → no consent (excluded).
 *
 * Filter:
 *   - email_verified IS NOT NULL (only confirmed members receive newsletters)
 *   - explicit (granted=true) OR (no topic row AND legacy granted=true)
 *
 * Why DISTINCT ON, not GROUP BY: PostgreSQL DISTINCT ON returns the FIRST
 * row of each group as ordered, which gives latest-per-(user, kind) in a
 * single index scan.
 */
export async function getNewsletterRecipients(
  topic: NewsletterTopic,
): Promise<NewsletterRecipient[]> {
  // topic is already 'newsletter_<x>' from the union; use as-is.
  const topicKind = topic;

  const result = await db.execute(sql`
    WITH per_user_topic AS (
      SELECT DISTINCT ON (user_id)
        user_id, granted, granted_at
      FROM consents
      WHERE kind = ${topicKind}
      ORDER BY user_id, granted_at DESC
    ),
    per_user_blanket AS (
      SELECT DISTINCT ON (user_id)
        user_id, granted, granted_at
      FROM consents
      WHERE kind = 'newsletter'
      ORDER BY user_id, granted_at DESC
    )
    SELECT u.id, u.email, u.full_name
    FROM users u
    LEFT JOIN per_user_topic   t ON t.user_id = u.id
    LEFT JOIN per_user_blanket b ON b.user_id = u.id
    WHERE
      u.email_verified IS NOT NULL
      AND (
        (t.user_id IS NOT NULL AND t.granted = true)
        OR (t.user_id IS NULL AND b.granted = true)
      )
  `);

  const rows = (result as unknown as { rows: Array<{ id: string; email: string; full_name: string }> }).rows ?? [];
  return rows;
}

/**
 * Phase 5 D-05 — single-user freshness check (used by Plan 05-08 preferences UI).
 * Returns the latest granted state for the (user, topic) pair, honoring
 * the same backward-compat precedence as getNewsletterRecipients.
 */
export async function getCurrentTopicState(
  userId: string,
  topic: NewsletterTopic,
): Promise<boolean> {
  const topicKind = topic;
  const result = await db.execute(sql`
    SELECT granted
    FROM consents
    WHERE user_id = ${userId} AND kind IN (${topicKind}, 'newsletter')
    ORDER BY
      CASE WHEN kind = ${topicKind} THEN 0 ELSE 1 END,
      granted_at DESC
    LIMIT 1
  `);
  const rows = (result as unknown as { rows: Array<{ granted: boolean }> }).rows ?? [];
  if (rows.length === 0) return false;
  return rows[0]!.granted === true;
}
