import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './auth';

// Phase 2.1 attribution capture (D-04, D-06, D-07, D-19, D-24, GDPR-09).
//
// One row per anonymous session, identified by `attr_sid` (unique).
// First visit INSERTs first_* columns; subsequent visits UPDATE last_*
// columns via Drizzle's onConflictDoUpdate on attr_sid.
//
// CRITICAL — D-19 / GDPR-09: NO inet column. NO raw IP column. NO ip address
// column. Raw IP exists only inside the BullMQ job payload (Redis-resident,
// ephemeral) and is discarded by the worker after the in-memory MaxMind
// GeoLite2 lookup. tests/unit/attribution-schema.test.ts grep-asserts this.
//
// Oblast format: ISO 3166-2 code only (e.g. 'BG-22' for Sofia-grad) per D-24.
// Bulgarian display names live in src/lib/oblast-names.ts (28-entry constant).
//
// All enum-shaped values stored as `text(...)` (D-24 + project convention from
// src/db/schema/auth.ts lines 16-17 sector/role). Never use pgEnum — adding
// values to a pg enum is DDL.
export const attribution_events = pgTable(
  'attribution_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Session identity — UUID v4 set by /api/attr/init (D-05). Unique.
    attr_sid: text('attr_sid').notNull().unique(),
    // User linkage — populated by verifyOtp Server Action on email confirm
    // (D-07). NULL until linkage; cascade deletes with user (Phase 6 GDPR-05
    // forward-prep — every user-linked attribution row is wiped when the
    // parent users row is deleted).
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    // First-touch (D-06): set on first INSERT, never overwritten.
    first_utm_source: text('first_utm_source'),
    first_utm_medium: text('first_utm_medium'),
    first_utm_campaign: text('first_utm_campaign'),
    first_utm_term: text('first_utm_term'),
    first_utm_content: text('first_utm_content'),
    first_referer: text('first_referer'),
    first_oblast: text('first_oblast'), // ISO 3166-2 e.g. 'BG-22' or 'unknown' (D-03, D-24)
    first_country: text('first_country'), // ISO alpha-2 e.g. 'BG' or 'unknown'
    first_qr_flag: text('first_qr_flag'), // 'qr' | null — derived from utm_medium=qr
    first_landing_path: text('first_landing_path'),
    first_seen_at: timestamp('first_seen_at', { withTimezone: true }).notNull(),
    // Last-touch (D-06): updated on every subsequent visit via upsert.
    last_utm_source: text('last_utm_source'),
    last_utm_medium: text('last_utm_medium'),
    last_utm_campaign: text('last_utm_campaign'),
    last_utm_term: text('last_utm_term'),
    last_utm_content: text('last_utm_content'),
    last_referer: text('last_referer'),
    last_oblast: text('last_oblast'),
    last_country: text('last_country'),
    last_qr_flag: text('last_qr_flag'),
    last_landing_path: text('last_landing_path'),
    last_seen_at: timestamp('last_seen_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    sidIdx: index('attr_events_sid_idx').on(t.attr_sid),
    userIdx: index('attr_events_user_idx').on(t.user_id),
    firstSeenIdx: index('attr_events_first_seen_idx').on(t.first_seen_at),
    utmSourceIdx: index('attr_events_utm_source_idx').on(t.first_utm_source),
    oblastIdx: index('attr_events_oblast_idx').on(t.first_oblast),
  }),
);
