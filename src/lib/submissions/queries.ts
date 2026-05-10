import { db } from '@/db';
import { submissions } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface MyProposalRow {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  title: string | null;
  body: string;
  topic: string;
  moderator_note: string | null;
  created_at: Date;
  approved_at: Date | null;
}

export interface MyProblemRow {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  body: string;
  topic: string;
  level: string | null;
  oblast: string | null;
  moderator_note: string | null;
  created_at: Date;
}

/**
 * PROP-03 — list ONLY the caller's own proposals.
 *
 * The userId parameter MUST come from session.user.id (server-side only).
 * Never accept userId from request input (T-04-04-01 IDOR mitigation).
 *
 * Security: submitter_id is NOT selected back into the result rows (T-04-04-02).
 */
export async function getMyProposals(userId: string): Promise<MyProposalRow[]> {
  const rows = await db
    .select({
      id: submissions.id,
      status: submissions.status,
      title: submissions.title,
      body: submissions.body,
      topic: submissions.topic,
      moderator_note: submissions.moderator_note,
      created_at: submissions.created_at,
      approved_at: submissions.approved_at,
    })
    .from(submissions)
    .where(and(eq(submissions.submitter_id, userId), eq(submissions.kind, 'proposal')))
    .orderBy(desc(submissions.created_at))
    .limit(50);
  return rows as MyProposalRow[];
}

/**
 * PROB-05 — list ONLY the caller's own problem reports.
 *
 * The userId parameter MUST come from session.user.id (server-side only).
 * Never accept userId from request input (T-04-04-01 IDOR mitigation).
 *
 * Security: submitter_id is NOT selected back into the result rows (T-04-04-02).
 */
export async function getMyProblems(userId: string): Promise<MyProblemRow[]> {
  const rows = await db
    .select({
      id: submissions.id,
      status: submissions.status,
      body: submissions.body,
      topic: submissions.topic,
      level: submissions.level,
      oblast: submissions.oblast,
      moderator_note: submissions.moderator_note,
      created_at: submissions.created_at,
    })
    .from(submissions)
    .where(and(eq(submissions.submitter_id, userId), eq(submissions.kind, 'problem')))
    .orderBy(desc(submissions.created_at))
    .limit(50);
  return rows as MyProblemRow[];
}
