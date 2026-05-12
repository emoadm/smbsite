-- Payload schema backfill — Phase 4 Pages + Ideas collections
--
-- Context: Phase 4 (PR #2, merge commit deaadc0) added Payload `Pages` +
--   `Ideas` collections to payload.config.ts but `payload migrate` is
--   disabled in deploy.yml (tsx@4.21 + Node 22 ESM incompat — see
--   .planning/todos/payload-tsx-esm-incompat.md). The manual-DDL convention
--   from project memory `project_payload_schema_constraint.md` was not
--   followed for these collections. Deploy 2026-05-11 23:01 UTC crashed
--   every authenticated `/admin/*` route on the query:
--
--     select "payload_locked_documents"."id", … "payload_locked_documents__rels"."pages_id" …
--                                                                            ^^^^^^^^ does not exist
--
--   Prod rolled back to v52 (image :deployment-01KR49EAD0V2BE2W8NSYT63V95,
--   pre-merge SHA 3e052f5) at 2026-05-12 00:42 UTC. This SQL re-applies the
--   missing Payload-side delta so the next deploy survives.
--
-- Source-of-truth dump: .planning/phases/04.1-payload-schema-reconciliation/canonical-schema.sql
-- Delta enumeration:    .planning/phases/04.1-payload-schema-reconciliation/04.1-DELTA.md
-- Reference pattern:    .planning/ops/2026-05-11-drizzle-ledger-backfill-0003.sql
--
-- Idempotence: every CREATE/ALTER is guarded with IF NOT EXISTS or a
--   DO $$ … END $$ existence check against pg_catalog / information_schema.
--   Safe to re-run if the SQL Editor session drops mid-apply.
--
-- Transactional shape: this file is NOT wrapped in BEGIN/COMMIT because
--   ALTER TYPE … ADD VALUE (Step 2) cannot run inside a transaction block
--   if the resulting value is referenced in the same transaction (Postgres
--   limitation, PG 12+ relaxed for ADD VALUE but the safe pattern is no-tx).
--   The DDL statements are individually atomic — partial application leaves
--   the schema in a recoverable state, and the IF-NOT-EXISTS guards make
--   re-running a no-op.
--
-- DO NOT TOUCH Drizzle-managed tables (already in prod via 0000-0003):
--   users, accounts, sessions, verification_tokens, consents,
--   attribution_events, submissions, moderation_log, ideas
--   ^^^ Drizzle's `ideas` is the future voting catalog (Phase 3, paused).
--       Payload's collection writes to `payload_ideas` (Plan 04.1-01 dbName
--       override). The two tables coexist in public.* — never alias them.

-- ============================================================================
-- STEP 0 — Verify pre-state (read-only — run first, confirm expectations)
-- ============================================================================
--
-- The operator runs each Step 0 query in turn and confirms the expected
-- output BEFORE proceeding to Step 1+. If any query returns an unexpected
-- shape, STOP and surface back — canonical-schema.sql assumptions may be
-- wrong for this prod state.

-- 0a) List every public table; expected: Drizzle tables + Payload pre-Phase-4 tables.
-- NEW tables we're about to CREATE should NOT appear yet.
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Expected to contain (pre-apply, in alphabetical order):
--   accounts, admin_users, admin_users_sessions, attribution_events,
--   community_channels, consents, ideas (Drizzle), moderation_log,
--   newsletters, payload_locked_documents, payload_locked_documents_rels,
--   payload_migrations, payload_preferences, payload_preferences_rels,
--   sessions, submissions, users, verification_tokens
-- Expected to NOT contain: pages, payload_ideas
-- May or may not contain: payload_kv (Payload v3.84+ created on first boot;
--   prod's Payload version at v52 boot may have been earlier — IF NOT EXISTS
--   guard in Step 3 handles either case).
-- If `pages` or `payload_ideas` ALREADY exist, the apply is partial — the
-- CREATE TABLE IF NOT EXISTS guards make this safe to proceed.

-- 0b) Inspect payload_locked_documents_rels columns. Expected: order, parent_id,
-- path, admin_users_id, newsletters_id (PRE-apply state). Should NOT contain
-- pages_id or payload_ideas_id yet.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'payload_locked_documents_rels'
ORDER BY ordinal_position;
-- Expected pre-apply columns: id, order, parent_id, path, admin_users_id,
--   newsletters_id  (six columns).
-- Expected post-apply: pages_id, payload_ideas_id appended  (eight columns).

-- 0c) Inspect payload_preferences_rels columns. Expected NO CHANGE (per
-- 04.1-DELTA.md §5: payload_preferences_rels does NOT get pages_id /
-- payload_ideas_id columns — only payload_locked_documents_rels does).
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'payload_preferences_rels'
ORDER BY ordinal_position;
-- Expected pre-apply AND post-apply (unchanged):
--   id, order, parent_id, path, admin_users_id  (five columns).
-- If prod has additional columns (e.g., pages_id) we did NOT plan for, STOP.

-- 0d) Confirm the `__rels` vs `_rels` naming. The failing query in the Fly
-- log said `payload_locked_documents__rels` (double underscore). Verify
-- the actual prod table is single underscore (Payload v3 convention, which
-- is what canonical-schema.sql shows). If prod returns rows for the
-- double-underscore version, STOP — the dump's table name assumption is
-- wrong for this prod state.
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
  AND (table_name LIKE 'payload_%_rels' OR table_name LIKE 'payload_%__rels')
ORDER BY table_name;
-- Expected: exactly two rows —
--   payload_locked_documents_rels
--   payload_preferences_rels
-- Both single-underscore.

-- 0e) Current admin_users role enum values. Pre-Phase-4 had [admin, editor].
-- The backfill ADDs `super_editor` (Phase 4 EDIT-02 added it to Users.ts).
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'public.enum_admin_users_role'::regtype
ORDER BY enumsortorder;
-- Expected pre-apply: admin, editor (two rows).
-- Expected post-apply: admin, editor, super_editor (three rows).
-- If pre-apply already shows three values, the ENUM-add is a no-op — proceed.

-- 0f) Confirm Drizzle-managed tables exist in prod (sanity — these MUST
-- stay untouched by this backfill).
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN ('users','accounts','sessions','verification_tokens',
                     'consents','attribution_events','submissions',
                     'moderation_log','ideas')
ORDER BY table_name;
-- Expected: 9 rows. If any row is missing, the prerequisite Drizzle
-- migration is missing too — STOP and surface back (do NOT proceed with
-- the Payload backfill; the Drizzle/Payload coexistence assumption is broken).


-- ============================================================================
-- STEP 1 — Create new ENUMs (idempotent via DO-block pg_type guard)
-- ============================================================================
--
-- Postgres does not support `CREATE TYPE … IF NOT EXISTS`. Each block below
-- checks pg_catalog.pg_type for the typname before issuing the CREATE.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_type t
                 JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'enum_pages_status') THEN
    CREATE TYPE public.enum_pages_status AS ENUM (
        'draft',
        'published'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_type t
                 JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'enum_payload_ideas_status') THEN
    CREATE TYPE public.enum_payload_ideas_status AS ENUM (
        'draft',
        'approved',
        'rejected'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_type t
                 JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'enum_payload_ideas_topic') THEN
    CREATE TYPE public.enum_payload_ideas_topic AS ENUM (
        'economy',
        'labor',
        'taxes',
        'regulation',
        'other'
    );
  END IF;
END $$;


-- ============================================================================
-- STEP 2 — Add `super_editor` to enum_admin_users_role (idempotent)
-- ============================================================================
--
-- ALTER TYPE … ADD VALUE IF NOT EXISTS is Postgres 12+ syntax (Neon is 16).
-- Pre-Phase-4 enum had [admin, editor]; Phase 4 added super_editor.

ALTER TYPE public.enum_admin_users_role ADD VALUE IF NOT EXISTS 'super_editor';


-- ============================================================================
-- STEP 3 — Create new tables (idempotent; sequences, defaults, PKs inline)
-- ============================================================================
--
-- Each block below mirrors the canonical-schema.sql verbatim (with
-- IF NOT EXISTS added to the CREATE TABLE line and PRIMARY KEY inlined as a
-- CONSTRAINT clause so it's part of the same idempotent CREATE).
-- Sequences are created first; the CREATE TABLE references them via
-- DEFAULT nextval('…'::regclass).

-- 3a) `pages` table — Phase 4 EDIT-03 (Pages collection)
-- Source: canonical-schema.sql lines 242-251 (table) + 258-264 (sequence)
--                                + 533-536 (default) + 624-625 (pkey).
CREATE SEQUENCE IF NOT EXISTS public.pages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE IF NOT EXISTS public.pages (
    id integer NOT NULL DEFAULT nextval('public.pages_id_seq'::regclass),
    title character varying NOT NULL,
    slug character varying NOT NULL,
    body jsonb NOT NULL,
    status public.enum_pages_status DEFAULT 'draft'::public.enum_pages_status NOT NULL,
    published_at timestamp(3) with time zone,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pages_pkey PRIMARY KEY (id)
);

ALTER SEQUENCE public.pages_id_seq OWNED BY public.pages.id;


-- 3b) `payload_ideas` table — Phase 4 EDIT-02 (Ideas collection)
-- Slug stays `ideas` (admin URL preserved) per Plan 04.1-01; table name
-- overridden to `payload_ideas` via `dbName: 'payload_ideas'` to avoid
-- collision with Drizzle's `ideas` table.
-- Source: canonical-schema.sql lines 278-290 (table) + 297-303 (sequence)
--                                + 542-543 (default) + 632-633 (pkey).
CREATE SEQUENCE IF NOT EXISTS public.payload_ideas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE IF NOT EXISTS public.payload_ideas (
    id integer NOT NULL DEFAULT nextval('public.payload_ideas_id_seq'::regclass),
    title character varying NOT NULL,
    description jsonb NOT NULL,
    topic public.enum_payload_ideas_topic NOT NULL,
    status public.enum_payload_ideas_status DEFAULT 'draft'::public.enum_payload_ideas_status NOT NULL,
    submitted_by character varying,
    approved_by character varying,
    moderator_note character varying,
    published_at timestamp(3) with time zone,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payload_ideas_pkey PRIMARY KEY (id)
);

ALTER SEQUENCE public.payload_ideas_id_seq OWNED BY public.payload_ideas.id;


-- 3c) `payload_kv` — Payload v3.84+ internal KV store
-- Defensive CREATE: prod v52 may or may not have this depending on the
-- Payload version that booted into the database. The dump (Payload v3.84)
-- includes it; older Payload versions did not. IF NOT EXISTS handles both
-- cases.
-- Source: canonical-schema.sql lines 317-321 (table) + 328-334 (sequence)
--                                + 550 (default) + 640-641 (pkey).
CREATE SEQUENCE IF NOT EXISTS public.payload_kv_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE IF NOT EXISTS public.payload_kv (
    id integer NOT NULL DEFAULT nextval('public.payload_kv_id_seq'::regclass),
    key character varying NOT NULL,
    data jsonb NOT NULL,
    CONSTRAINT payload_kv_pkey PRIMARY KEY (id)
);

ALTER SEQUENCE public.payload_kv_id_seq OWNED BY public.payload_kv.id;


-- ============================================================================
-- STEP 4 — Add new FK columns to payload_locked_documents_rels (idempotent)
-- ============================================================================
--
-- ONLY payload_locked_documents_rels gets new FK columns. The corresponding
-- payload_preferences_rels columns are NOT added per 04.1-DELTA.md §5/§11 D-1
-- (Payload only generates rels FK columns for collections that the parent
-- table references; payload_preferences only references admin_users).
--
-- Both new columns are nullable integers (matching the existing admin_users_id
-- and newsletters_id columns), so existing rows remain valid post-ALTER.

ALTER TABLE public.payload_locked_documents_rels
    ADD COLUMN IF NOT EXISTS pages_id integer;

ALTER TABLE public.payload_locked_documents_rels
    ADD COLUMN IF NOT EXISTS payload_ideas_id integer;


-- ============================================================================
-- STEP 5 — Create indexes (idempotent)
-- ============================================================================
--
-- Five (or six) new indexes per canonical-schema.sql. Two on the new rels
-- columns (Step 4 targets), three on the new `pages` and `payload_ideas`
-- tables (created_at + updated_at + slug-unique on pages), one on payload_kv
-- (only effective if Step 3c created the table; otherwise it's already there).

-- 5a) Per-FK indexes on payload_locked_documents_rels
-- Source: canonical-schema.sql lines 811-814 and 832-835
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_pages_id_idx
    ON public.payload_locked_documents_rels USING btree (pages_id);

CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_payload_ideas_id_idx
    ON public.payload_locked_documents_rels USING btree (payload_ideas_id);

-- 5b) Per-table indexes on `pages`
-- Source: canonical-schema.sql lines 737, 744, 751
CREATE INDEX IF NOT EXISTS pages_created_at_idx
    ON public.pages USING btree (created_at);

CREATE UNIQUE INDEX IF NOT EXISTS pages_slug_idx
    ON public.pages USING btree (slug);

CREATE INDEX IF NOT EXISTS pages_updated_at_idx
    ON public.pages USING btree (updated_at);

-- 5c) Per-table indexes on `payload_ideas`
-- Source: canonical-schema.sql lines 758, 765
CREATE INDEX IF NOT EXISTS payload_ideas_created_at_idx
    ON public.payload_ideas USING btree (created_at);

CREATE INDEX IF NOT EXISTS payload_ideas_updated_at_idx
    ON public.payload_ideas USING btree (updated_at);

-- 5d) Unique key index on `payload_kv` (idempotent — no-op if payload_kv
-- already had it from a prior Payload boot)
-- Source: canonical-schema.sql line 772
CREATE UNIQUE INDEX IF NOT EXISTS payload_kv_key_idx
    ON public.payload_kv USING btree (key);


-- ============================================================================
-- STEP 6 — Add FK constraints (idempotent via DO-block existence check)
-- ============================================================================
--
-- Postgres does not support `ADD CONSTRAINT IF NOT EXISTS`. Each constraint
-- below is wrapped in a DO-block that queries information_schema.table_constraints
-- before issuing the ADD CONSTRAINT.
--
-- Constraint NAMES are taken verbatim from canonical-schema.sql so future
-- `pg_dump` comparisons match cleanly. Note the asymmetry: the `pages_id`
-- FK uses constraint name `…_pages_fk` while the `payload_ideas_id` FK
-- uses constraint name `…_ideas_fk` (NOT `_payload_ideas_fk`) because
-- Payload generates FK names from the collection SLUG (`ideas`), not its
-- DBNAME (`payload_ideas`). See 04.1-DELTA.md §11 D-2.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_schema = 'public'
                     AND constraint_name = 'payload_locked_documents_rels_pages_fk') THEN
        ALTER TABLE public.payload_locked_documents_rels
            ADD CONSTRAINT payload_locked_documents_rels_pages_fk
            FOREIGN KEY (pages_id) REFERENCES public.pages(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_schema = 'public'
                     AND constraint_name = 'payload_locked_documents_rels_ideas_fk') THEN
        ALTER TABLE public.payload_locked_documents_rels
            ADD CONSTRAINT payload_locked_documents_rels_ideas_fk
            FOREIGN KEY (payload_ideas_id) REFERENCES public.payload_ideas(id) ON DELETE CASCADE;
    END IF;
END $$;


-- ============================================================================
-- STEP 7 — Verify post-apply (read-only — every row should now match canonical)
-- ============================================================================
--
-- The operator runs each Step 7 query and confirms the expected output.
-- Any deviation surfaces back; otherwise Wave 4 is complete and the operator
-- can proceed to Wave 5 (re-deploy Phase 4 + Phase 02.3).

-- 7a) Confirm new tables exist
SELECT 'pages' AS check_name,
       EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name='pages') AS exists
UNION ALL
SELECT 'payload_ideas',
       EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name='payload_ideas')
UNION ALL
SELECT 'payload_kv',
       EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name='payload_kv');
-- Expected: all three rows return true.

-- 7b) Confirm new columns on payload_locked_documents_rels
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name = 'payload_locked_documents_rels'
  AND column_name IN ('pages_id','payload_ideas_id')
ORDER BY column_name;
-- Expected: 2 rows — pages_id (integer, YES) and payload_ideas_id (integer, YES).

-- 7c) Confirm payload_preferences_rels was NOT mutated
SELECT column_name
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='payload_preferences_rels'
  AND column_name IN ('pages_id','payload_ideas_id');
-- Expected: 0 rows. If non-empty, the operator (or a prior partial apply)
-- inadvertently added FK columns to the wrong rels table — surface back.

-- 7d) Confirm `super_editor` is now a value in enum_admin_users_role
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'public.enum_admin_users_role'::regtype
ORDER BY enumsortorder;
-- Expected: 3 rows — admin, editor, super_editor.

-- 7e) Confirm new FK constraints exist on payload_locked_documents_rels
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_schema='public'
  AND table_name='payload_locked_documents_rels'
  AND constraint_type='FOREIGN KEY'
ORDER BY constraint_name;
-- Expected to include:
--   payload_locked_documents_rels_admin_users_fk  (pre-existing)
--   payload_locked_documents_rels_ideas_fk        (NEW — points to payload_ideas)
--   payload_locked_documents_rels_newsletters_fk  (pre-existing)
--   payload_locked_documents_rels_pages_fk        (NEW)
--   payload_locked_documents_rels_parent_fk       (pre-existing)
-- Five FK rows total.

-- 7f) Confirm Drizzle-managed tables remain untouched (sanity — no regression)
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN ('users','accounts','sessions','verification_tokens',
                     'consents','attribution_events','submissions',
                     'moderation_log','ideas')
ORDER BY table_name;
-- Expected: 9 rows. Drizzle's `ideas` is the future voting catalog; Payload's
-- `payload_ideas` is the editorial CMS table. Both coexist.
