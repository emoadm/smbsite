import { db } from '@/db';
import { submissions, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { assertEditorOrAdmin } from '@/lib/auth/role-gate';

// Phase 4 EDIT-04 — editor-side reads for the moderation queue.
// Full submitter identity is exposed here (D-C1 internal surface — NOT for public routes).
// assertEditorOrAdmin() is called first on every exported function.

export interface PendingRow {
  id: string;
  kind: 'proposal' | 'problem' | 'dsa_report';
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  title: string | null;
  body: string;
  topic: string;
  level: string | null;
  oblast: string | null;
  target_submission_id: string | null;
  created_at: Date;
  submitter: {
    id: string;
    full_name: string;
    email: string;
    sector: string;
    role: string;
    self_reported_source: string | null;
  };
}

export interface ModerationQueueData {
  proposals: PendingRow[];
  problems: PendingRow[];
  dsaReports: PendingRow[];
  counts: { proposals: number; problems: number; dsaReports: number };
}

export async function fetchModerationQueue(
  filter: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
): Promise<ModerationQueueData> {
  await assertEditorOrAdmin();

  const baseRows = await db
    .select({
      id: submissions.id,
      kind: submissions.kind,
      status: submissions.status,
      title: submissions.title,
      body: submissions.body,
      topic: submissions.topic,
      level: submissions.level,
      oblast: submissions.oblast,
      target_submission_id: submissions.target_submission_id,
      created_at: submissions.created_at,
      submitter_id: users.id,
      submitter_full_name: users.full_name,
      submitter_email: users.email,
      submitter_sector: users.sector,
      submitter_role: users.role,
      submitter_source: users.self_reported_source,
    })
    .from(submissions)
    .innerJoin(users, eq(submissions.submitter_id, users.id))
    .where(filter === 'all' ? undefined : eq(submissions.status, filter))
    .orderBy(desc(submissions.created_at))
    .limit(200);

  const map = (r: (typeof baseRows)[number]): PendingRow => ({
    id: r.id,
    kind: r.kind as PendingRow['kind'],
    status: r.status as PendingRow['status'],
    title: r.title,
    body: r.body,
    topic: r.topic,
    level: r.level,
    oblast: r.oblast,
    target_submission_id: r.target_submission_id ?? null,
    created_at: r.created_at,
    submitter: {
      id: r.submitter_id,
      full_name: r.submitter_full_name,
      email: r.submitter_email,
      sector: r.submitter_sector,
      role: r.submitter_role,
      self_reported_source: r.submitter_source,
    },
  });

  const proposals = baseRows.filter((r) => r.kind === 'proposal').map(map);
  const problems = baseRows.filter((r) => r.kind === 'problem').map(map);
  const dsaReports = baseRows.filter((r) => r.kind === 'dsa_report').map(map);

  return {
    proposals,
    problems,
    dsaReports,
    counts: {
      proposals: proposals.length,
      problems: problems.length,
      dsaReports: dsaReports.length,
    },
  };
}
