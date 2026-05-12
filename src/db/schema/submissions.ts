import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './auth';

// Phase 4 D-A1 — submissions + moderation_log tables.
//
// All enum-shaped values stored as text() (project convention from
// src/db/schema/auth.ts lines 16-17 sector/role). NEVER use pgEnum.
//
// DDL applied manually via Neon SQL Editor in 0003_phase04_submissions.sql.
// `payload migrate` is BLOCKED (project memory project_payload_schema_constraint.md).
export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    submitter_id: uuid('submitter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    kind: text('kind').notNull(), // 'proposal' | 'problem' | 'dsa_report'
    status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected' | 'hidden'
    title: text('title'), // proposals only (nullable)
    body: text('body').notNull(),
    topic: text('topic').notNull(),
    level: text('level'), // problems only: 'local' | 'national'
    oblast: text('oblast'), // problems only: ISO 3166-2:BG when level='local'
    moderator_note: text('moderator_note'),
    target_submission_id: uuid('target_submission_id'), // dsa_report only — points at the reported submission (nullable)
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    reviewed_at: timestamp('reviewed_at', { withTimezone: true }),
    reviewer_id: uuid('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
    approved_at: timestamp('approved_at', { withTimezone: true }),
  },
  (t) => ({
    submitterIdx: index('submissions_submitter_idx').on(t.submitter_id),
    statusKindIdx: index('submissions_status_kind_idx').on(t.status, t.kind),
    createdAtIdx: index('submissions_created_at_idx').on(t.created_at),
    oblastIdx: index('submissions_oblast_idx').on(t.oblast),
  }),
);

// D-A1: append-only. NEVER UPDATE or DELETE rows from the application.
// Enforced at DB layer in 0003_phase04_submissions.sql:
//   REVOKE UPDATE, DELETE ON TABLE moderation_log FROM <app_db_user>;
export const moderation_log = pgTable(
  'moderation_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    action: text('action').notNull(), // 'submission_approve' | 'submission_reject' | 'user_suspend' | 'user_unsuspend' | 'editor_grant' | 'editor_revoke' | 'super_editor_override' | 'dsa_report_review'
    actor_user_id: uuid('actor_user_id').references(() => users.id, { onDelete: 'restrict' }),
    target_kind: text('target_kind').notNull(), // 'submission' | 'user' | 'idea'
    target_id: uuid('target_id'),
    target_ids: text('target_ids').array(),
    note: text('note'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    actorIdx: index('moderation_log_actor_idx').on(t.actor_user_id),
    targetIdx: index('moderation_log_target_idx').on(t.target_id),
    createdIdx: index('moderation_log_created_idx').on(t.created_at),
  }),
);
