---
phase: 05-notifications
gate: schema-push
status: pending-admin-ui-smoke
applied_at: 2026-05-05T12:14:35Z (Fly.io deploy 27 — image deployment-01KQW0K1PD95SBBK64S7TYCTZF)
applied_by: emoadm (Drizzle migration via CI; Payload tables via manual DDL — see incident note below)
---

# Phase 5 — Schema Push Verification

This document is the BLOCKING gate sign-off for Phase 5. Wave 4 (plan 05-11)
verification cannot run until this gate is closed.

**Status:** pending-admin-ui-smoke — schema is applied to live Neon and the
public surface is back to 200 on `/`, `/register`, `/login`, `/community`.
Final step before flipping to `applied` is operator confirmation that
`/admin/collections/newsletters` and `/admin/globals/community-channels`
load + persist edits (Step E below).

## Incident — initial deploy failed

The first deploy of Phase 5 (commit `3b4df52`, Fly.io version 26) failed
post-deploy smoke on `/`, `/register`, `/login` (HTTP 500). Root cause:
`relation "community_channels" does not exist` (PG `42P01`). The plan
had assumed Payload's "auto-DDL on first boot" pattern (RESEARCH §A7) —
but in production `@payloadcms/db-postgres` has `push: false` by default,
so new tables are NOT auto-created. The CI `payload migrate` step is
disabled per `.planning/todos/pending/2026-05-04-payload-tsx-esm-incompat.md`,
and that TODO already explicitly blocked any new Payload schema change
until the tsx incompat is fixed. Phase 5 violated that block.

Recovery (commits `88080b0` + `5f3afde`):
1. **Hotfix** — Footer.tsx + community/page.tsx wrap `findGlobal` in
   try/catch with a fallback to the existing `channelsPending` /
   placeholder branch, so a missing or broken Payload Global does not
   crash every (frontend) page.
2. **Manual DDL** — `05-SCHEMA-DDL.sql` was hand-derived from the
   collection/global TS files + the existing init migration's
   conventions, then operator-applied via the Neon SQL console.
   Idempotent (IF NOT EXISTS / DO blocks).

Follow-ups not in this gate:
- The tsx-incompat TODO needs to be promoted to a **blocker** (any
  future Payload schema change will hit the same wall).
- Phase 5 RESEARCH §A7's "auto-DDL on first boot is the project pattern"
  claim should be corrected — that is dev-mode behavior only.

## What was applied

### 1. Drizzle migration (`users.preferred_channel`)

- **Migration file:** `src/db/migrations/0002_panoramic_ink.sql`
- **SQL effect:** `ALTER TABLE "users" ADD COLUMN "preferred_channel" text;` (nullable; no default)
- **Path used:** B — CI deploy.yml `migrate` job (uses DIRECT_URL secret)
- **Commit SHA:** `5f3afde` (HEAD on main; the migration ran on the prior deploy of `3b4df52` and the column was already present, but the second deploy re-ran the migrate job idempotently)
- **Verification SQL:**
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'preferred_channel';
  ```
- **Output:** `[{ "column_name": "preferred_channel" }]` ✓

### 2. Payload — `newsletters` table (manual DDL, NOT auto-DDL)

- **Source:** `src/collections/Newsletters.ts` (Plan 05-04)
- **Trigger:** **manual DDL** via Neon SQL console — auto-DDL on boot does NOT run with `@payloadcms/db-postgres` in production (push defaults to false). DDL applied from `.planning/phases/05-notifications/05-SCHEMA-DDL.sql`.
- **Fly.io deploy ID:** `smbsite-prod:deployment-01KQW0K1PD95SBBK64S7TYCTZF` (version 27, region fra, 2026-05-05T12:14:35Z)
- **Verification SQL:**
  ```sql
  SELECT 1 FROM newsletters LIMIT 1;
  ```
- **Output:** statement executed successfully (table exists, 0 rows) ✓

### 3. Payload — `community_channels` Global table (manual DDL, NOT auto-DDL)

- **Source:** `src/globals/CommunityChannels.ts` (Plan 05-04)
- **Trigger:** same manual DDL transaction as #2.
- **Verification SQL:**
  ```sql
  SELECT 1 FROM community_channels LIMIT 1;
  SELECT table_name FROM information_schema.tables
  WHERE table_name LIKE 'community%' OR table_name LIKE 'newsletter%'
  ORDER BY table_name;
  ```
- **Output:**
  ```
  -- query 1: statement executed successfully (table exists, 0 rows) ✓
  -- query 2:
  [
    { "table_name": "community_channels" },
    { "table_name": "newsletters" }
  ]
  ```
  ✓

### 4. payload_locked_documents_rels FK extension

- **Trigger:** same manual DDL transaction as #2.
- **Verification SQL:**
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'payload_locked_documents_rels'
    AND column_name = 'newsletters_id';
  ```
- **Output:** `[{ "column_name": "newsletters_id" }]` ✓

## Orchestrator-suggested `payload migrate` outcome

The orchestrator's `<schema_push_requirement>` recommended `CI=true PAYLOAD_MIGRATING=true npx payload migrate`. That command remains broken on this codebase (tsx@4.21 + Node 22 ESM incompat — `.planning/todos/pending/2026-05-04-payload-tsx-esm-incompat.md`). Verified during incident recovery: pinning tsx to 4.19.2 via pnpm overrides did NOT resolve it — Node 22's strict ESM resolver refuses the extensionless `.ts` imports regardless of tsx version. `payload generate:migration` hits the same wall.

- **Original decision (RESEARCH §A7):** "auto-DDL on first boot is the project pattern" — **WRONG for production**. `@payloadcms/db-postgres` `push` defaults to false when `NODE_ENV=production`. Auto-DDL is dev-mode behavior only. Phase 1 + Phase 02.1 only escaped this because they shipped Payload schema changes via the single `20260501_160443_init.ts` migration that ran successfully under tsx@4.19.x before the incompat surfaced.
- **Final decision:** manual DDL applied via Neon SQL console for this incident. The disabled `payload migrate` step in deploy.yml stays disabled until the tsx incompat is fixed; until then, ANY new Payload collection / global / field rename is blocked.

## Admin UI smoke test (post-deploy)

- **`/admin/collections/newsletters` loads:** TBD — operator
- **"Create new" opens draft form:** TBD — operator
- **`/admin/globals/community-channels` loads:** TBD — operator
- **Edit `bgDescription` + Save persists after reload:** TBD — operator

## Rollback plan

If Phase 5 needs to be reverted post-deploy:

1. **Drizzle:** the migration adds a nullable column. Reverse:
   ```sql
   ALTER TABLE users DROP COLUMN IF EXISTS preferred_channel;
   ```
   Destructive for existing `preferred_channel` values; coordinate with operator before running.

2. **Payload tables:** dropping `newsletters` is destructive (loses any drafts); dropping `community-channels` Global table is destructive (loses URL config). Coordinate with coalition before any rollback.

3. **Deploy roll-back:** `flyctl releases list -a smbsite-prod` → `flyctl deploy --image-label <prev>` to redeploy the previous Phase 5-less image. The new tables stay in DB but are unreferenced by code — safer than dropping.

## Operator notes

- 2026-05-05 first deploy of Phase 5 (commit `3b4df52`, Fly.io v26) failed
  post-deploy smoke on `/`, `/register`, `/login`. Public site was 500 for
  ~30 minutes until hotfix `88080b0` deployed (Fly.io v27).
- Drizzle migrate ran cleanly on both v26 and v27 deploys; the failure was
  entirely on the Payload-table side.
- Manual DDL applied via Neon SQL console succeeded in a single transaction
  with no errors. Verification SQL passed all 4 checks.
- The `community_channels` table currently has 0 rows. Payload's `findGlobal`
  handles that gracefully (returns defaults), so the Footer + `/community`
  page render the placeholder copy until coalition delivers the real
  WhatsApp + Telegram URLs (D-CoalitionChannels, tracked separately in
  STATE.md).

---

## Operator action checklist

Run these one-at-a-time and paste outputs back to the orchestrator:

### Step A — push & merge

```bash
# From this repo:
git push origin main          # if you want to push directly to main
# OR open a PR and merge it; CI deploy runs on merge.
```

Wait for the GitHub Actions `deploy → migrate` job to finish (green check on the merge commit). The `migrate` job runs `pnpm drizzle-kit migrate` against the production DIRECT_URL.

### Step B — verify migration applied

Run from a Neon SQL console (production project) OR via psql with DIRECT_URL:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'preferred_channel';
```

Expected: 1 row with `column_name = preferred_channel`.

### Step C — deploy → trigger Payload auto-DDL

The deploy.yml `deploy` job runs after `migrate` succeeds; it builds the Docker image and runs `flyctl deploy`. Watch the deploy logs for any DDL error from Payload's first boot.

### Step D — verify auto-DDL

```sql
SELECT 1 FROM newsletters LIMIT 1;
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'community%' OR table_name LIKE 'newsletter%';
```

Expected: empty result for the first query (table exists, 0 rows); the second returns the Payload-emitted Global table name (likely `community_channels` per Postgres lowercase-snake-case convention) plus any Phase 5 newsletter-related tables.

### Step E — admin UI smoke

- Navigate to `/admin/collections/newsletters` — should load without error
- Click "Create new" — should open a draft form (you don't need to save)
- Navigate to `/admin/globals/community-channels` — should load without error
- Edit `bgDescription` field, click Save — should persist after reload

### Step F — return outputs

Paste the SQL outputs + Fly.io deploy ID + admin UI smoke result back here. The orchestrator will then:
- Fill in the TBD sections of this file
- Flip `status: pending` → `status: applied`
- Continue to Wave 4 (plan 05-11)
