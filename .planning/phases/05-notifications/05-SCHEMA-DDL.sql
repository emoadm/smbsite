-- Phase 5 — manual DDL to be applied to live Neon (production project).
--
-- Why manual: the project's `payload migrate` step in deploy.yml is disabled
-- per the documented tsx@4.21 + Node 22 ESM incompat
-- (.planning/todos/pending/2026-05-04-payload-tsx-esm-incompat.md). That TODO
-- explicitly blocked any new Payload collection schema change until the
-- incompat is fixed; Phase 5 was planned (RESEARCH §A7) on the assumption
-- that auto-DDL on boot would handle new collections, but in production
-- @payloadcms/db-postgres has push=false by default — so the new tables
-- never got created. This DDL mirrors what `payload generate:migration`
-- would produce, hand-derived from:
--   - src/collections/Newsletters.ts (Phase 5 plan 05-04)
--   - src/globals/CommunityChannels.ts (Phase 5 plan 05-04)
--   - src/migrations/20260501_160443_init.ts (template / conventions)
-- and corroborated against the actual SELECT query Drizzle ran against
-- community_channels in the failed deploy log:
--   select "id", "whatsapp_channel_url", "whatsapp_visible",
--          "telegram_channel_url", "telegram_visible", "bg_description",
--          "updated_at", "created_at" from "community_channels" ...
--
-- Idempotent (IF NOT EXISTS / DO blocks) — safe to re-run.
-- Wrapped in a transaction; rollback on any error.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Newsletters collection (src/collections/Newsletters.ts)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_newsletters_topic') THEN
    CREATE TYPE "public"."enum_newsletters_topic" AS ENUM(
      'newsletter_general',
      'newsletter_voting',
      'newsletter_reports',
      'newsletter_events'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_newsletters_status') THEN
    CREATE TYPE "public"."enum_newsletters_status" AS ENUM(
      'draft',
      'scheduled',
      'sending',
      'sent',
      'failed',
      'cancelled'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "newsletters" (
  "id" serial PRIMARY KEY NOT NULL,
  "subject" varchar NOT NULL,
  "preview_text" varchar,
  "topic" "enum_newsletters_topic" DEFAULT 'newsletter_general' NOT NULL,
  "body" jsonb NOT NULL,
  "scheduled_at" timestamp(3) with time zone,
  "status" "enum_newsletters_status" DEFAULT 'draft' NOT NULL,
  "last_test_sent_at" timestamp(3) with time zone,
  "last_edited_after_test_at" boolean DEFAULT false,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "newsletters_updated_at_idx"
  ON "newsletters" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "newsletters_created_at_idx"
  ON "newsletters" USING btree ("created_at");

-- ---------------------------------------------------------------------------
-- 2. CommunityChannels global (src/globals/CommunityChannels.ts)
--    Globals in Payload are stored as a single-row table.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "community_channels" (
  "id" serial PRIMARY KEY NOT NULL,
  "whatsapp_channel_url" varchar,
  "whatsapp_visible" boolean DEFAULT false,
  "telegram_channel_url" varchar,
  "telegram_visible" boolean DEFAULT false,
  "bg_description" varchar,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "community_channels_updated_at_idx"
  ON "community_channels" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "community_channels_created_at_idx"
  ON "community_channels" USING btree ("created_at");

-- ---------------------------------------------------------------------------
-- 3. Extend payload_locked_documents_rels for the new newsletters collection
--    (so admin-UI document locking works for newsletters).
-- ---------------------------------------------------------------------------

ALTER TABLE "payload_locked_documents_rels"
  ADD COLUMN IF NOT EXISTS "newsletters_id" integer;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payload_locked_documents_rels_newsletters_fk'
  ) THEN
    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_newsletters_fk"
      FOREIGN KEY ("newsletters_id")
      REFERENCES "public"."newsletters"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_newsletters_id_idx"
  ON "payload_locked_documents_rels" USING btree ("newsletters_id");

COMMIT;

-- ---------------------------------------------------------------------------
-- Post-apply verification queries — paste outputs into 05-SCHEMA-PUSH.md
-- ---------------------------------------------------------------------------
-- Drizzle migration check (Plan 05-02):
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'users' AND column_name = 'preferred_channel';
--
-- Payload tables check:
--   SELECT 1 FROM newsletters LIMIT 1;
--   SELECT 1 FROM community_channels LIMIT 1;
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name LIKE 'community%' OR table_name LIKE 'newsletter%';
--
-- Locked-documents FK check:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'payload_locked_documents_rels'
--   AND column_name = 'newsletters_id';
