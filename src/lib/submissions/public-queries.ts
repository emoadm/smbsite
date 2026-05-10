import { unstable_cache } from 'next/cache';
import { db } from '@/db';
import { submissions } from '@/db/schema';
import { eq, and, desc, sql, isNotNull } from 'drizzle-orm';

export interface PublicProposalRow {
  id: string;
  title: string | null;
  body: string;
  topic: string;
  approved_at: Date | null;
}

export interface OblastAggRow {
  oblast: string;
  count: number;
}

/**
 * PROP-04 — public catalog of approved proposals.
 * D-C1 — column whitelist EXCLUDES every submitter-PII column.
 * No submitter_id. No full_name. No email. No sector. No role.
 */
export async function getApprovedProposals(
  opts: { limit?: number; offset?: number } = {},
): Promise<PublicProposalRow[]> {
  const limit = Math.min(opts.limit ?? 12, 50);
  const offset = opts.offset ?? 0;
  const rows = await db
    .select({
      id: submissions.id,
      title: submissions.title,
      body: submissions.body,
      topic: submissions.topic,
      approved_at: submissions.approved_at,
    })
    .from(submissions)
    .where(and(eq(submissions.kind, 'proposal'), eq(submissions.status, 'approved')))
    .orderBy(desc(submissions.approved_at))
    .limit(limit)
    .offset(offset);
  return rows as PublicProposalRow[];
}

/**
 * D-D1 — per-oblast counts of approved local problem reports.
 * D-D2 — small-N suppression at DB layer: HAVING count(*) >= 5.
 * Result is safe to render: oblasts below threshold are absent.
 * Cached for 30 min — aggregate is non-sensitive and changes slowly.
 */
async function getOblastProblemAggregatesRaw(): Promise<OblastAggRow[]> {
  const rows = await db
    .select({ oblast: submissions.oblast, count: sql<number>`count(*)::int` })
    .from(submissions)
    .where(
      and(
        eq(submissions.kind, 'problem'),
        eq(submissions.status, 'approved'),
        eq(submissions.level, 'local'),
        isNotNull(submissions.oblast),
      ),
    )
    .groupBy(submissions.oblast)
    .having(sql`count(*) >= 5`)
    .orderBy(sql`count(*) desc`);
  return rows.map((r) => ({ oblast: r.oblast as string, count: r.count }));
}

export const getOblastProblemAggregates = unstable_cache(
  getOblastProblemAggregatesRaw,
  ['phase04-oblast-aggregates-v1'],
  { revalidate: 1800, tags: ['phase04-aggregates'] },
);

/**
 * National-level approved problem reports.
 * D-D2 applied: returns null when count < 5.
 */
async function getNationalProblemCountRaw(): Promise<{ count: number } | null> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submissions)
    .where(
      and(
        eq(submissions.kind, 'problem'),
        eq(submissions.status, 'approved'),
        eq(submissions.level, 'national'),
      ),
    );
  const c = row?.count ?? 0;
  return c >= 5 ? { count: c } : null;
}

export const getNationalProblemCount = unstable_cache(
  getNationalProblemCountRaw,
  ['phase04-national-count-v1'],
  { revalidate: 1800, tags: ['phase04-aggregates'] },
);

/**
 * Top topic per oblast (or 'national' bucket).
 * D-D2: returns null when the top-topic count < 5.
 */
async function getOblastTopTopicRaw(
  oblastOrNational: string,
): Promise<{ topic: string; count: number } | null> {
  const isNational = oblastOrNational === 'national';
  const rows = await db
    .select({ topic: submissions.topic, count: sql<number>`count(*)::int` })
    .from(submissions)
    .where(
      and(
        eq(submissions.kind, 'problem'),
        eq(submissions.status, 'approved'),
        isNational ? eq(submissions.level, 'national') : eq(submissions.oblast, oblastOrNational),
      ),
    )
    .groupBy(submissions.topic)
    .orderBy(sql`count(*) desc`)
    .limit(1);
  const top = rows[0];
  if (!top || top.count < 5) return null;
  return { topic: top.topic, count: top.count };
}

export const getOblastTopTopics = unstable_cache(
  getOblastTopTopicRaw,
  ['phase04-oblast-top-topic-v1'],
  { revalidate: 1800, tags: ['phase04-aggregates'] },
);
