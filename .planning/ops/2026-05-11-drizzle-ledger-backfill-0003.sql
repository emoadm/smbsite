-- Drizzle migrations ledger backfill — 0003_phase04_submissions
-- Context: operator manually applied 0003_phase04_submissions.sql to production
--   Neon via Neon SQL Editor on 2026-05-10 (per D-Phase04Plan01-LiveNeonPush in
--   .planning/STATE.md). The raw SQL ran successfully but Drizzle's ledger table
--   (drizzle.__drizzle_migrations) does NOT have a row for this migration.
--
-- Additional bug: _journal.json line 29 has `"when": 1747440000000` which is
--   2025-05-17 (a year off — should be 2026-05-09/10). Because Drizzle's
--   migrate algorithm in pg-core/dialect.js:60-71 skips any migration whose
--   folderMillis is <= the latest ledger row's created_at, 0003 will silently
--   be skipped on every prod migrate run.
--
-- This file does TWO things you need to coordinate:
--   1) [Neon SQL Editor — production]: run the SELECT, then the INSERT below
--   2) [git on the PR branch]: a sibling commit fixes _journal.json so the
--      `when` matches the value we insert into the ledger
--
-- Hash of 0003_phase04_submissions.sql (SHA256 of raw file bytes — matches
--   Drizzle migrator.js:23 `crypto.createHash("sha256").update(query).digest("hex")`):
--
--   c32f64e10f0ad7d9f18419750952d48713e09f36167f834ec3869f9532c43331
--
-- created_at value (matches the fixed _journal.json `when`):
--   1778457600000  (2026-05-10 12:00:00 UTC — close to the actual manual-apply timestamp)

-- ============================================================================
-- STEP 1 — Verify current prod ledger state (read-only, run first)
-- ============================================================================
SELECT id, hash, created_at,
       to_timestamp(created_at / 1000) AT TIME ZONE 'UTC' AS created_at_utc
FROM drizzle.__drizzle_migrations
ORDER BY created_at DESC;

-- Expected: 3 rows for 0000_init, 0001_grey_umar, 0002_panoramic_ink.
-- The highest created_at should be 1777947599124 (2026-05-04 02:19:59 UTC).
-- If you see a 4th row with hash c32f64e10f0ad7d9f18419750952d48713e09f36167f834ec3869f9532c43331,
-- the backfill is already done — STOP, you are good.
--
-- If you see a 4th row with a DIFFERENT hash for 0003 (because the operator
-- already attempted a backfill with a wrong value), DO NOT proceed — surface
-- back so we can compare hashes and resolve.

-- ============================================================================
-- STEP 2 — Verify the schema is already in place (read-only)
-- ============================================================================
SELECT 'submissions' AS table_name,
       EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name='submissions') AS exists
UNION ALL
SELECT 'moderation_log',
       EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name='moderation_log')
UNION ALL
SELECT 'ideas',
       EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name='ideas');

-- All three should be `true`. If any is `false`, the manual apply did NOT
-- complete and we have a bigger problem — surface back before proceeding.

-- ============================================================================
-- STEP 3 — Backfill the ledger row for 0003_phase04_submissions
-- ============================================================================
-- Only run this AFTER you've confirmed Step 1 + Step 2 look as expected.
-- The hash and created_at values must match what Drizzle would have written
-- if it had applied the migration itself.

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES (
  'c32f64e10f0ad7d9f18419750952d48713e09f36167f834ec3869f9532c43331',
  1778457600000
);

-- ============================================================================
-- STEP 4 — Verify the insert (read-only)
-- ============================================================================
SELECT id, hash, created_at,
       to_timestamp(created_at / 1000) AT TIME ZONE 'UTC' AS created_at_utc
FROM drizzle.__drizzle_migrations
ORDER BY created_at DESC;

-- Expected: 4 rows. The new 0003 row should be the FIRST (highest created_at)
-- with hash c32f64e10f0ad7d9f18419750952d48713e09f36167f834ec3869f9532c43331
-- and created_at = 1778457600000 (2026-05-10 12:00:00 UTC).
