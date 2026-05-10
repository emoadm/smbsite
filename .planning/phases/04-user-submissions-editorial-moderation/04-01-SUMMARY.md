---
phase: 04-user-submissions-editorial-moderation
plan: "01"
subsystem: storage
tags: [phase-4, wave-1, schema, ddl, foundation, payload-collections]
dependency_graph:
  requires: []
  provides:
    - "Drizzle submissions table (kind/topic/status/body/oblast/anonymous/moderator_note/target_submission_id)"
    - "Drizzle moderation_log table (append-only with REVOKE UPDATE,DELETE)"
    - "users.status (active|suspended) + users.platform_role columns (D-A2 dual-identity model)"
    - "Payload Pages collection (EDIT-03)"
    - "Payload Ideas collection without voting fields (EDIT-02 — Phase 3 re-activates voting via additive ALTER, D-A1)"
    - "ideas table DDL appended to 0003 so submissions+moderation_log+ideas applied in single Neon SQL run"
    - "public/maps/bg-oblasts.svg with 28 ISO 3166-2:BG paths (open-license)"
tech_stack:
  added:
    - "Bulgaria oblast SVG choropleth asset (open-license, attributed in CREDITS.md)"
  patterns:
    - "Drizzle pgTable + barrel re-export from src/db/schema/index.ts"
    - "DB-layer append-only enforcement via REVOKE UPDATE,DELETE (PATTERNS.md §append-only enforcement)"
    - "Payload collection registration in collections array (final order: Users, Newsletters, Pages, Ideas)"
    - "Drizzle migrate blocked → manual Neon SQL Editor paste (project memory: project_payload_schema_constraint.md)"
key_files:
  created:
    - src/db/schema/submissions.ts
    - src/db/migrations/0003_phase04_submissions.sql
    - src/db/migrations/meta/0003_snapshot.json
    - src/collections/Pages.ts
    - src/collections/Ideas.ts
    - public/maps/bg-oblasts.svg
    - public/maps/CREDITS.md
    - tests/unit/submission-schema.test.ts
    - tests/unit/moderation-log-schema.test.ts
    - tests/unit/pages-collection.test.ts
    - tests/unit/ideas-collection.test.ts
  modified:
    - src/db/schema/auth.ts (users.status + users.platform_role)
    - src/db/schema/index.ts (re-export submissions + moderation_log)
    - src/db/migrations/meta/_journal.json
    - src/payload.config.ts (Pages + Ideas registered)
    - .planning/STATE.md (Deferred Item: D-Phase04Plan01-LiveNeonPush)
decisions:
  - "Generated 0003_phase04_submissions.sql via drizzle-kit; appended ideas table DDL + REVOKE block at end so the operator runs ONE Neon SQL Editor session for the whole phase 4 storage layer"
  - "Ideas collection ships WITHOUT voting fields (EDIT-02 only); Phase 3 re-activation will ALTER the ideas table additively without rebase (D-A1)"
  - "REVOKE UPDATE,DELETE on moderation_log and REVOKE DELETE on submissions enforce append-only at the DB layer (defense-in-depth beyond application code)"
  - "users.status defaults to 'active'; users.platform_role nullable to keep existing rows unchanged"
  - "Payload column casing kept camelCase to match existing Newsletters convention (verified via src/collections/Newsletters.ts)"
metrics:
  completed_date: "2026-05-10"
  tasks_completed: 7
  blocking_checkpoint_resolved: "Task 6 — operator applied 0003_phase04_submissions.sql to production Neon via SQL Editor on 2026-05-10"
  follow_ups:
    - "Verify staging Neon branch parity before next staging deploy (D-Phase04Plan01-LiveNeonPush in STATE.md)"
---

# Plan 04-01 — Storage foundation

## Outcome

Phase 4 storage layer is in place. Drizzle schema declares `submissions` and `moderation_log` tables; `users` gained `status` (active|suspended) and `platform_role` columns to support the D-A2 dual-identity model. Payload registers two new collections: `Pages` (EDIT-03 — generic CMS pages) and `Ideas` (EDIT-02 — without voting fields, to be additively extended in Phase 3). The Bulgaria oblast choropleth SVG is committed under `public/maps/` for the Plan 04-05 `/проблеми` heat-map.

The 0003 migration was applied to production Neon manually via the Neon SQL Editor (Task 6 blocking checkpoint, resolved 2026-05-10). Append-only enforcement at the DB layer is live: REVOKE UPDATE,DELETE on `moderation_log` and REVOKE DELETE on `submissions`.

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 | Source open-license Bulgaria oblast SVG (28 ISO 3166-2:BG paths) | `265b368` |
| 2 | Drizzle schema — submissions + moderation_log tables; users.status + users.platform_role; barrel export | `7268831` |
| 3 | Generate Drizzle migration 0003_phase04_submissions.sql | `5bec976` |
| 4 | Payload Pages collection (EDIT-03) + payload.config registration | `ac8aacc` |
| 5 | Payload Ideas collection (EDIT-02, no voting fields) + payload.config registration + ideas DDL appended to 0003 | `1a9e4e7` |
| 6 | [BLOCKING checkpoint] Operator applied 0003_phase04_submissions.sql to production Neon via SQL Editor | (manual; verified by operator 2026-05-10) |
| 7 | Lock the migration in CI guard + STATE deferred-items entry | (this commit) |

## Open follow-ups

- **D-Phase04Plan01-LiveNeonPush** (logged in STATE Deferred Items) — verify staging Neon branch parity before next staging deploy.
- The optional `scripts/check-env.ts` runtime warn (Task 7 sub-action 1) was skipped per the plan's "skip if it would balloon scope" guidance; the STATE Deferred Items row is the load-bearing audit record.

## Downstream readiness

- **Plan 04-03** (member submission Server Actions) — schema is ready for Drizzle inserts into `submissions` with kind ∈ {proposal, problem}.
- **Plan 04-04** (member status pages) — schema exposes `submitter_id` for owner-isolation queries.
- **Plan 04-05** (public pages) — `submissions.status='approved'` filter is live; `bg-oblasts.svg` is in place for the heat-map.
- **Plan 04-06** (moderation queue) — `moderation_log` is append-only at the DB layer; admin Server Actions can rely on REVOKE for defense-in-depth.
- **Plan 04-07** (suspension) — `users.status` and `users.platform_role` columns ship now; suspended-account gate can read them.
- **Plan 04-08** (DSA Art.16) — `submissions.target_submission_id` is in the schema for DSA report rows pointing at reported content.
