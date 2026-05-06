---
plan: 05-10
phase: 05-notifications
status: complete
tasks_complete: 1
tasks_total: 1
note: retroactive — backfilled 2026-05-06 from git history + 05-SCHEMA-PUSH.md
---

# Plan 05-10 Summary — [BLOCKING] Schema Push (Drizzle migration + Payload tables)

**Mode:** Operator-driven (autonomous: false). Recovery from initial deploy failure required hotfix + manual DDL.

## What was applied

### A. Drizzle migration — `users.preferred_channel`

| Item | Value |
|------|-------|
| Migration file | `src/db/migrations/0002_panoramic_ink.sql` |
| SQL effect | `ALTER TABLE "users" ADD COLUMN "preferred_channel" text;` (nullable, no default) |
| Path used | CI deploy.yml `migrate` job (DIRECT_URL secret) |
| Verification | `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'preferred_channel';` → `[{ "column_name": "preferred_channel" }]` ✓ |

### B. Payload tables — `newsletters` + `community_channels`

| Item | Value |
|------|-------|
| Path used | **Manual DDL via Neon SQL console** (not auto-DDL — see incident) |
| DDL source | `.planning/phases/05-notifications/05-SCHEMA-DDL.sql` (hand-derived from collection/global TS files; idempotent IF NOT EXISTS / DO blocks) |
| Verification | `SELECT 1 FROM newsletters LIMIT 1` and `SELECT 1 FROM community_channels LIMIT 1` both return empty result (not relation-not-found) ✓ |

## Incident — initial deploy failed (root cause + recovery)

The first deploy (`3b4df52`, Fly.io v26) failed post-deploy smoke on `/`, `/register`, `/login` with HTTP 500. Root cause: `relation "community_channels" does not exist` (PG `42P01`). Plan 05-10's RESEARCH §A7 assumption — "Payload auto-DDL on first boot is the project pattern" — turned out to be **dev-mode behavior only**. In production, `@payloadcms/db-postgres` defaults to `push: false`, so new tables are NOT auto-created. The CI `payload migrate` step is also disabled per `.planning/todos/pending/2026-05-04-payload-tsx-esm-incompat.md`, which already explicitly blocked any new Payload schema change until the tsx incompat is fixed — Phase 5 violated that block.

**Recovery (commits `88080b0` + `5f3afde`):**
1. **Hotfix** — `Footer.tsx` + `community/page.tsx` wrap `findGlobal` in try/catch with fallback to `channelsPending` placeholder, so a missing/broken Payload Global does not crash every (frontend) page.
2. **Manual DDL** — operator hand-applied `05-SCHEMA-DDL.sql` via Neon SQL console (idempotent).

## Decisions honored

- **D-07 / D-08 / D-09** — `users.preferred_channel` column live; consent rows for the 4 granular newsletter topics writable.
- **D-Phase5-prep** — schema gate signed off; Wave 4 (Plan 05-11) verification unblocked.
- **NOTIF-04 / NOTIF-05** — `community_channels` global table exists; CommunityChannels Global swap workflow now possible from Payload admin.

## Notable deviations

1. **Auto-DDL assumption was wrong in prod.** RESEARCH §A7 has been corrected (auto-DDL is dev-only). All future Phase Payload schema changes must use manual DDL via Neon SQL console until the tsx-incompat TODO is resolved.
2. **`payload migrate` remains disabled.** The orchestrator's suggested `npx payload migrate` did not run; the `.planning/todos/pending/2026-05-04-payload-tsx-esm-incompat.md` TODO should be promoted to **blocker** severity.
3. **Memory updated:** `~/.claude/.../memory/project_payload_schema_constraint.md` records the manual-DDL-via-Neon convention.

## Verification

- Drizzle column verified live (see §A above)
- Payload tables verified live (see §B above)
- Public surface 200 on all (frontend) routes after deploy `27` (image `01KQW0K1PD95SBBK64S7TYCTZF`)
- Admin UI smoke passed 4/4 (composer renders + globals editable + newsletters list loads + can save draft)

## Commits

- `3b4df52` — docs(05-10): schema-push gate template — pending operator action
- `88080b0` — fix(05-10): try/catch around findGlobal so missing Payload Global does not crash (frontend)
- `5f3afde` — fix(05-10): manual DDL applied via Neon SQL console; redeploy
- `deb1a53` — docs(05-10): record incident + verified SQL outputs; status pending-admin-ui-smoke
- `bf803f3` — docs(05-10): flip schema-push gate to applied — admin UI smoke 4/4 passed

## Notes for downstream plans

- **Plan 05-11 (Wave 4)**: schema gate is closed; Playwright e2e specs can be un-skipped and run against migrated DB.
- **Plan 05-12+ (gap-closure)**: no schema impact — pure code/ops fixes.
- **Future Payload phases**: must include a manual-DDL-via-Neon step in their schema push plan; auto-DDL is unreliable in prod.
