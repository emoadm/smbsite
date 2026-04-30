---
phase: 1
plan: 03
subsystem: database
tags: [drizzle, neon, postgres, auth-schema, consents]
requires: [01]
provides:
  - drizzle-client
  - auth-adapter-tables
  - consents-table
  - first-migration-sql
  - db-npm-scripts
affects:
  - package.json
  - src/db/
  - drizzle.config.ts
tech-stack:
  added:
    - drizzle-orm@0.45.2
    - drizzle-kit@0.31.10
    - "@neondatabase/serverless@0.10.4"
    - ws@8.18.0
    - "@types/ws@8.5.13"
  patterns:
    - schema barrel pattern (src/db/schema/index.ts)
    - dual-URL drizzle config (DATABASE_URL pooled, DIRECT_URL non-pooled)
    - HMAC-hashed OTP tokens (column allocated, hashing in plan 1.05)
    - append-only consents (D-13)
key-files:
  created:
    - drizzle.config.ts
    - src/db/index.ts
    - src/db/schema/auth.ts
    - src/db/schema/consents.ts
    - src/db/schema/index.ts
    - src/db/migrations/0000_init.sql
    - src/db/migrations/meta/_journal.json
    - src/db/migrations/meta/0000_snapshot.json
    - src/db/migrations/.gitkeep
  modified:
    - package.json
key-decisions:
  - "Skipped Task 1.03.3 (live `drizzle-kit push` to Neon) per user choice — no Neon project provisioned yet. Schema files + Drizzle client + migration SQL are committed and verified offline; live push deferred until DATABASE_URL/DIRECT_URL exist in .env.local."
  - "Renamed Drizzle's random migration tag (0000_zippy_black_tom) to deterministic 0000_init in both filename and meta/_journal.json so commits are reproducible across regenerations."
  - "Drizzle client uses neon-serverless Pool (WebSocket) over neon-http because Auth.js v5 sessions need transactions — http driver does not support multi-statement transactions per RESEARCH § Neon Postgres Connection Pooling."
  - "verification_tokens.attempts kept as text column (not smallint) to dodge a known Drizzle smallint serialization issue; cast at read-site in plan 1.05."
  - "Removed src/db/.gitkeep — superseded by real schema files."
requirements-completed: [OPS-06]
duration: ~10 min
completed: 2026-04-30
---

# Phase 1 Plan 03: Drizzle + Neon Schema Summary

Drizzle ORM 0.45.2 wired against Neon Postgres via the WebSocket Pool driver (transaction-capable for Auth.js v5 sessions), with the four Auth.js adapter tables (`users`, `verification_tokens`, `sessions`, `accounts`) carrying the D-08 project extensions (`full_name`, `sector`, `role`, `email_verified_at`), plus the D-13 append-only `consents` table whose `user_id` FK uses `ON DELETE RESTRICT` so withdrawals must INSERT a new row instead of mutating history. The migration runner reads `DIRECT_URL` (non-pooled) per Pitfall C — running schema-altering DDL through PgBouncer would corrupt the schema.

## What Was Built

**Task 1.03.1 — Schema + client:**
- 5 typed table declarations (`users`, `verification_tokens`, `sessions`, `accounts`, `consents`)
- `src/db/index.ts` exports `db` via `drizzle-orm/neon-serverless` with WebSocket polyfill (`ws`) for Node runtime
- `drizzle.config.ts` uses `process.env.DIRECT_URL`, `strict: true`, `verbose: true`
- `package.json` scripts: `db:generate`, `db:push`, `db:check`

**Task 1.03.2 — First migration SQL:**
- `pnpm db:generate` produced `0000_zippy_black_tom.sql` → renamed to `0000_init.sql`
- Contains `CREATE TABLE` for all 5 tables, 3 FK constraints (accounts/sessions cascade, consents restrict), 3 indexes (`users_email_idx`, `sessions_user_idx`, `consents_user_kind_idx`)
- `meta/_journal.json` tag updated from random → `0000_init`
- `pnpm db:check` exits 0 (no drift)

**Task 1.03.3 — DEFERRED (per user choice):** Live `drizzle-kit push` to Neon Frankfurt skipped because no Neon project exists yet. Resume by:
1. Provisioning Neon project `smbsite-prod` in `aws-eu-central-1`
2. Setting `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) in `.env.local`
3. Running `pnpm drizzle-kit push --strict=false`
4. Verifying `psql "$DIRECT_URL" -c "\dt"` lists all 5 tables

## Verification

| Check | Result |
|-------|--------|
| `pnpm typecheck` | exits 0 |
| `pnpm db:check` | exits 0 (no drift, schema valid) |
| `pnpm db:generate` | produced 5-table migration |
| schema files present | yes (auth.ts, consents.ts, index.ts) |
| `users` extension columns | full_name, sector, role, email_verified_at all present |
| `consents` FK to users | `ON DELETE restrict` confirmed in 0000_init.sql:62 |
| `verification_tokens.kind` default | `'login'` |
| `drizzle.config.ts` uses DIRECT_URL | confirmed |
| `src/db/index.ts` uses neon-serverless | confirmed (NOT neon-http) |
| migration tag deterministic | `0000_init` in filename + journal |

## Deviations from Plan

**[Rule 4 → user-approved deferral] Skipped Task 1.03.3 live schema push**
Found during: Plan 01-03 pre-execution prompt
Issue: Task 1.03.3 is a `checkpoint:human-verify` blocking gate that requires a real Neon Frankfurt project + `DATABASE_URL`/`DIRECT_URL`. User has not provisioned Neon yet.
Fix: Per user's interactive-mode choice ("Defer db:push"), wrote and committed all schema artefacts offline; tagged plan as **partial** until live push happens.
Files modified: schema, client, migration SQL all committed normally; `db:push` not executed.
Verification: Plan SUMMARY explicitly tracks this as `key-decisions[0]`. Downstream plans (`05`, `07`, `09`) will re-run `db:push` against the live DB before integration tests; until then, Drizzle integration tests for those plans will skip with `DATABASE_URL` missing.

**Total deviations:** 1 user-approved deferral. **Impact:** This plan is **partial** — the Drizzle codebase is complete, but no live database exists yet. Plans 04 (Payload Users), 05 (Auth.js), 07 (server actions), and 09 (auth UI) all assume a live DB during their integration steps. Each will need to either skip integration or wait for the user to provision Neon.

## Issues Encountered

**Live database not yet provisioned.** Several Wave 1+ plans expect a working `DATABASE_URL`/`DIRECT_URL`. Recommend the user provisions Neon before executing Plan 1.05 (Auth.js setup) since Auth.js's adapter tries to query at module-load time on `pnpm dev` boot.

## Next Phase Readiness

Code-side ready for **Plan 01-04** (i18n + Tailwind v4 + shadcn/ui + Payload Users collection). Plan 04 does NOT need a live DB at code-write time, only when Payload's own migrations run later. **Plan 1.05** (Auth.js) WILL be blocked at integration-test time without Neon.

## Self-Check: PASSED (with documented deferral)
