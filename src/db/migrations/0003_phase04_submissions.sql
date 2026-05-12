CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submitter_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"topic" text NOT NULL,
	"level" text,
	"oblast" text,
	"moderator_note" text,
	"target_submission_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewer_id" uuid,
	"approved_at" timestamp with time zone,
	CONSTRAINT "submissions_submitter_id_users_id_fk" FOREIGN KEY ("submitter_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "submissions_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "moderation_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"actor_user_id" uuid,
	"target_kind" text NOT NULL,
	"target_id" uuid,
	"target_ids" text[],
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "platform_role" text;
--> statement-breakpoint
CREATE INDEX "submissions_submitter_idx" ON "submissions" USING btree ("submitter_id");
--> statement-breakpoint
CREATE INDEX "submissions_status_kind_idx" ON "submissions" USING btree ("status","kind");
--> statement-breakpoint
CREATE INDEX "submissions_created_at_idx" ON "submissions" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "submissions_oblast_idx" ON "submissions" USING btree ("oblast");
--> statement-breakpoint
CREATE INDEX "moderation_log_actor_idx" ON "moderation_log" USING btree ("actor_user_id");
--> statement-breakpoint
CREATE INDEX "moderation_log_target_idx" ON "moderation_log" USING btree ("target_id");
--> statement-breakpoint
CREATE INDEX "moderation_log_created_idx" ON "moderation_log" USING btree ("created_at");
--> statement-breakpoint
-- Phase 4 EDIT-02 — Payload Ideas collection (CRUD without voting fields).
-- Phase 3 re-activation will ALTER this table to add voting columns
-- (votes, votable, votes_open_at) without rebasing the schema.
-- Column names use camelCase to match Payload's field names exactly
-- (Payload v3 with Postgres adapter uses the field name as the column name verbatim by default).
-- VERIFY before applying: run `SELECT column_name FROM information_schema.columns WHERE table_name='newsletters'`
-- in Neon SQL Editor. If columns are snake_case (e.g. last_test_sent_at), rename camelCase columns
-- below to snake_case to match before applying.
CREATE TABLE "ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" jsonb NOT NULL,
	"topic" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"submittedBy" text,
	"approvedBy" text,
	"moderatorNote" text,
	"publishedAt" timestamp with time zone,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ideas_status_idx" ON "ideas" ("status");
--> statement-breakpoint
-- Phase 4 D-A1: enforce append-only at DB layer (PATTERNS.md §append-only enforcement).
-- Replace `app_db_user` with the actual Neon role used by the application
-- (see Neon → Settings → Roles; production role is typically `neondb_owner`
-- or the Drizzle-connection role from DATABASE_URL).
--
-- The DO block guards the REVOKEs so CI and other environments where the
-- role doesn't exist don't fail the migration. Production substituted the
-- real role name in the Neon SQL Editor when applying manually on 2026-05-10
-- — that one-off path is unaffected by this guard.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_db_user') THEN
    REVOKE UPDATE, DELETE ON TABLE moderation_log FROM app_db_user;
    REVOKE DELETE ON TABLE submissions FROM app_db_user;
  ELSE
    RAISE NOTICE 'app_db_user role not present — REVOKEs skipped (expected in CI / dev containers)';
  END IF;
END $$;
