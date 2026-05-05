---
phase: 05-notifications
gate: schema-push
status: pending
applied_at: TBD — operator fills after CI deploy completes
applied_by: TBD
---

# Phase 5 — Schema Push Verification

This document is the BLOCKING gate sign-off for Phase 5. Wave 4 (plan 05-11)
verification cannot run until this gate is closed.

**Status:** pending — operator chose "Apply via CI (merge → deploy)" path. Waiting on:
1. Phase 5 commits merged to `main`
2. CI deploy.yml `migrate` job runs `pnpm drizzle-kit migrate` against live Neon
3. Fly.io deploy completes; Payload auto-DDLs the new tables
4. Operator pastes verification SQL outputs into the sections below
5. Operator (or orchestrator) flips `status: pending` → `status: applied`

## What was applied

### 1. Drizzle migration (`users.preferred_channel`)

- **Migration file:** `src/db/migrations/0002_panoramic_ink.sql`
- **SQL effect:** `ALTER TABLE "users" ADD COLUMN "preferred_channel" text;` (nullable; no default)
- **Path used:** B — CI deploy.yml `migrate` job (uses DIRECT_URL secret)
- **Commit SHA:** TBD — paste the merge commit SHA after merge to main
- **Verification SQL:**
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'preferred_channel';
  ```
- **Output:** TBD

### 2. Payload auto-DDL — `newsletters` table

- **Source:** `src/collections/Newsletters.ts` (Plan 05-04)
- **Trigger:** Payload boot during Fly.io deploy
- **Fly.io deploy ID:** TBD — paste from `flyctl status -a smbsite-prod` after deploy
- **Verification SQL:**
  ```sql
  SELECT 1 FROM newsletters LIMIT 1;
  ```
- **Output:** TBD

### 3. Payload auto-DDL — `community-channels` Global

- **Source:** `src/globals/CommunityChannels.ts` (Plan 05-04)
- **Trigger:** same deploy as #2
- **Verification SQL:**
  ```sql
  SELECT table_name FROM information_schema.tables
  WHERE table_name LIKE 'community%';
  ```
- **Output:** TBD

## Orchestrator-suggested `payload migrate` outcome

The orchestrator's `<schema_push_requirement>` recommended `CI=true PAYLOAD_MIGRATING=true npx payload migrate`. Per RESEARCH §A7 + the existing CI configuration, that command is currently broken on this codebase (tsx@4.21 + Node 22 ESM incompat — see `.planning/todos/payload-tsx-esm-incompat.md`).

- **Decision:** Use the project's auto-DDL-on-boot pattern (RESEARCH §A7, established in Phase 02.1) as the production-applied path. The disabled `payload migrate` step in deploy.yml stays disabled until the upstream tsx incompat is fixed.

## Admin UI smoke test (post-deploy)

- **`/admin/collections/newsletters`:** TBD
- **Create new newsletter draft:** TBD
- **`/admin/globals/community-channels`:** TBD
- **Edit + save fields:** TBD

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

TBD — free-form section for any anomalies during the push: unexpected drift, retries, manual SQL fixups, etc.

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
