import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const CONSENT_KINDS = [
  'privacy_terms',
  'cookies',
  'newsletter',                  // legacy — Phase 1 single-checkbox-blanket-grant (D-09 backward compat)
  'newsletter_general',          // Phase 5 D-08 — Общи обявявания
  'newsletter_voting',           // Phase 5 D-08 — Нови гласувания
  'newsletter_reports',          // Phase 5 D-08 — Отчети по инициативи
  'newsletter_events',           // Phase 5 D-08 — Покани за събития
  'political_opinion',
] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

// D-13: append-only. NEVER UPDATE or DELETE rows from the application.
// Withdrawals INSERT a new row with granted = false.
// onDelete: 'restrict' — Phase 6 deletion flow handles cascade explicitly.
export const consents = pgTable(
  'consents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    kind: text('kind').notNull(), // one of CONSENT_KINDS
    granted: boolean('granted').notNull(),
    version: text('version').notNull(), // policy version, e.g. "2026-04-29"
    granted_at: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
    region: text('region'), // populated in Phase 2 (oblast/country)
  },
  (t) => ({
    userKindIdx: index('consents_user_kind_idx').on(t.user_id, t.kind),
  }),
);
