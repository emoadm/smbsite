import { pgTable, uuid, text, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';

// Sector + role values (D-09, D-10) kept as text for forward compatibility;
// Zod enforces the enum at the API boundary (plan 07).
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Auth.js base columns (adapter-required names)
    name: text('name'),
    email: text('email').notNull().unique(),
    emailVerified: timestamp('email_verified', { mode: 'date', withTimezone: true }),
    image: text('image'),
    // Phase 1 project extensions (D-08)
    full_name: text('full_name').notNull(),
    sector: text('sector').notNull(), // D-09
    role: text('role').notNull(), // D-10
    // Phase 2.1 attribution extensions (D-11, ATTR-06)
    self_reported_source: text('self_reported_source'), // qr_letter | email_coalition | sinya_site | facebook | linkedin | referral | news_media | other
    self_reported_other: text('self_reported_other'), // nullable — populated only when self_reported_source = 'other'
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    // Forward-compat for Phase 3 cooling period (D-04 / IDEA-07)
    email_verified_at: timestamp('email_verified_at', { mode: 'date', withTimezone: true }),
  },
  (t) => ({
    emailIdx: index('users_email_idx').on(t.email),
  }),
);

// OTP storage. Tokens stored as HMAC-SHA256 hashes (Pitfall K, plan 05).
export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(), // email
    token: text('token').notNull(), // HMAC-hashed OTP
    expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
    kind: text('kind').notNull().default('login'), // 'register' | 'login' (D-04)
    attempts: text('attempts').notNull().default('0'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    sessionToken: text('session_token').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
  },
  (t) => ({
    userIdx: index('sessions_user_idx').on(t.userId),
  }),
);

// Auth.js v5 adapter requires this table even if OAuth is unused in Phase 1.
export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: timestamp('expires_at', { mode: 'date', withTimezone: true }),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
  }),
);
