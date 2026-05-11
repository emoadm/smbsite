# Canonical Payload schema — capture procedure

**Artifact produced by this procedure:** `.planning/phases/04.1-payload-schema-reconciliation/canonical-schema.sql`

**First produced:** 2026-05-12 (Phase 04.1 Plan 02). Path A — local PostgreSQL 16 cluster (no Docker).

## 1. When to re-run this procedure

Any time `payload.config.ts` adds, removes, or renames a collection, a global, or a
richText / blocks field. The dump is the source-of-truth input for the matching
ops-side backfill SQL.

Known triggers in the project roadmap:

- **Phase 3 voting fields** — `Ideas` collection will gain `voteCount`, `userVotes[]`
  (or similar). Before the Drizzle migration that mirrors those changes, re-run
  this procedure and diff the new dump against the prior `canonical-schema.sql`
  to derive the prod backfill SQL.
- Any future Payload collection/global/field addition while
  `.planning/todos/payload-tsx-esm-incompat.md` remains open (i.e. while
  `payload migrate` is disabled in `deploy.yml`).

## 2. Inputs

| Requirement | Version used in 2026-05-12 capture | How to obtain |
| --- | --- | --- |
| PostgreSQL 16 server + client (`psql`, `pg_dump`) | 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1) | `sudo apt-get install -y postgresql-16 postgresql-client-16` |
| Node | v22.16.0 | nvm / system install |
| pnpm | 9.15.0 (matches `packageManager` in `package.json`) | `npm i -g pnpm@9.15.0` or corepack |
| Git worktree of `gsd/phase-04-user-submissions-editorial-moderation` (or whichever branch carries the current `payload.config.ts`) | HEAD = `294deb9` (post-Plan-01 dbName fix) | `git worktree add /tmp/smbsite-phase4-wt gsd/phase-04-user-submissions-editorial-moderation` |

No secrets are needed. The temporary PostgreSQL instance uses a local-only password
(`local`) bound to `127.0.0.1:54321`. No prod credentials, no Neon access, no
Brevo / Turnstile / Sentry network calls (the `next dev` boot only needs Payload
to initialise its DB connection; Brevo/Turnstile/Sentry env vars are populated with
non-empty placeholders so middleware/loaders don't throw, but no network I/O is
issued to those services during the schema-push step).

## 3. Step-by-step procedure

The procedure has four phases: (1) spin up an isolated Postgres, (2) check out the
Payload code on its branch with `push: true` flipped, (3) boot `next dev` and let
Payload create the schema, (4) `pg_dump` and tear everything down.

### 3.1 Path A — local PostgreSQL cluster (preferred when Docker is not installed)

```bash
# 3.1.1 — Install Postgres 16 if missing
sudo apt-get install -y postgresql-16 postgresql-client-16

# 3.1.2 — Create an isolated cluster on a non-default port (54321)
sudo pg_createcluster 16 canonical -p 54321 --start

# 3.1.3 — Set a local-only password and create the empty target DB
sudo -u postgres psql -p 54321 -c "ALTER USER postgres WITH PASSWORD 'local';"
sudo -u postgres psql -p 54321 -c "CREATE DATABASE payload_canonical;"

# 3.1.4 — Confirm the DB is empty
PGPASSWORD=local psql -h 127.0.0.1 -p 54321 -U postgres -d payload_canonical -c "\dt public.*"
# Expected: "Did not find any relation named "public.*"."
```

### 3.2 Path B — Docker (preferred when Docker is installed)

```bash
docker run -d --name pg-04.1-canonical \
  -e POSTGRES_PASSWORD=local \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=payload_canonical \
  -p 54321:5432 \
  postgres:16
until docker exec pg-04.1-canonical pg_isready -U postgres -d payload_canonical; do sleep 1; done
```

Both paths produce identical dumps for Payload v3.84 + drizzle-orm 0.36.x.

### 3.3 Check out the Phase 4 branch in a worktree and install deps

```bash
git worktree add /tmp/smbsite-phase4-wt gsd/phase-04-user-submissions-editorial-moderation
cd /tmp/smbsite-phase4-wt
grep -c "dbName: 'payload_ideas'" src/collections/Ideas.ts   # must be 1 — Plan 01 fix
pnpm install --frozen-lockfile
# postinstall hook runs scripts/patch-payload-loadenv.mjs — required for
# Payload @next/env ESM interop on Node 22.
```

### 3.4 Flip `push: true` in the worktree (DO NOT commit)

```bash
grep -n "push: false" src/payload.config.ts   # confirm the line exists (currently line 57)
sed -i "s/push: false/push: true/" src/payload.config.ts
grep -n "push: true" src/payload.config.ts    # confirm flip
```

The flip lives only in the worktree's working tree. We never commit it. When the
worktree is removed in 3.7 the edit is discarded.

### 3.5 Boot Payload via `next dev` so the schema-push runs

```bash
cat > /tmp/payload-boot.env <<'EOF'
PAYLOAD_DATABASE_URL=postgresql://postgres:local@127.0.0.1:54321/payload_canonical
DATABASE_URL=postgresql://postgres:local@127.0.0.1:54321/payload_canonical
DIRECT_URL=postgresql://postgres:local@127.0.0.1:54321/payload_canonical
PAYLOAD_SECRET=dump-only-not-prod-do-not-reuse
AUTH_SECRET=dump-only-not-prod-auth-secret-do-not-reuse-32bytes
AUTH_URL=http://localhost:3001
OTP_HMAC_KEY=dump-only-not-prod-hmac-key-do-not-reuse-32bytes-aaa
SITE_ORIGIN=http://localhost:3001
EMAIL_FROM_NEWSLETTER=newsletter@news.example.test
EMAIL_FROM_TRANSACTIONAL=no-reply@auth.example.test
UNSUBSCRIBE_HMAC_SECRET=dump-only-not-prod-unsubscribe-secret-do-not-reuse
BREVO_API_KEY=dump-only-not-prod-do-not-reuse
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
UPSTASH_REDIS_REST_URL=https://dump-only-not-real.upstash.io
UPSTASH_REDIS_REST_TOKEN=dump-only-not-prod-do-not-reuse
UPSTASH_REDIS_URL=rediss://dump:do-not-reuse@dump-only-not-real.upstash.io:6379
LOG_LEVEL=info
EOF

cd /tmp/smbsite-phase4-wt
set -a; source /tmp/payload-boot.env; set +a
pnpm exec next dev -p 3001 > /tmp/payload-push.log 2>&1 &
echo $! > /tmp/next.pid

# Wait for "Ready in" (Next.js handshake — ~10s)
for i in $(seq 1 60); do
  grep -q "Ready in" /tmp/payload-push.log && break
  sleep 2
done

# Trigger Payload boot by hitting /admin. Payload's drizzle-kit push fires
# the first time the admin route is requested. First request takes ~60-90s
# (Next.js compiles /admin/[[...segments]] in ~50s, then Payload pushes).
curl -sS -o /tmp/admin-response.html -w "HTTP %{http_code} in %{time_total}s\n" \
  http://127.0.0.1:3001/admin --max-time 180

# The successful log should include:
#   [⣷] Pulling schema from database...
#   [✓] Pulling schema from database...
#   GET /admin 200 in <ms>ms
grep -E "Pulling schema|GET /admin 200" /tmp/payload-push.log
```

### 3.6 Verify the schema was created

```bash
PGPASSWORD=local psql -h 127.0.0.1 -p 54321 -U postgres -d payload_canonical \
  -c "\dt public.*"
# Expected: 12 tables — admin_users, admin_users_sessions, community_channels,
#   newsletters, pages, payload_ideas, payload_kv, payload_locked_documents,
#   payload_locked_documents_rels, payload_migrations, payload_preferences,
#   payload_preferences_rels.
# CRITICAL: the table is named `payload_ideas` (NOT `ideas`). If you see a
#   bare `ideas` table here, Plan 04.1-01's dbName fix is missing from the
#   working tree — see Failure Mode B below.

PGPASSWORD=local psql -h 127.0.0.1 -p 54321 -U postgres -d payload_canonical \
  -c "\d public.payload_locked_documents_rels"
# Expected columns: id, order, parent_id, path, admin_users_id, newsletters_id,
#   pages_id, payload_ideas_id. (Globals like community_channels do NOT get an
#   FK column on this table in Payload v3.84 — they are reached via the global
#   table directly.)
```

### 3.7 Capture the dump and tear down

```bash
PGPASSWORD=local pg_dump \
  --schema-only \
  --no-owner \
  --no-acl \
  --schema=public \
  --host=127.0.0.1 --port=54321 --username=postgres \
  --dbname=payload_canonical \
  > .planning/phases/04.1-payload-schema-reconciliation/canonical-schema.sql

wc -l .planning/phases/04.1-payload-schema-reconciliation/canonical-schema.sql
# Expected: ~977 lines, ~25 KB, for the current 4-collection + 1-global config.

# Tear down: kill next dev, drop the Postgres cluster, remove the worktree
kill $(cat /tmp/next.pid) 2>/dev/null
pkill -f "next dev -p 3001" 2>/dev/null

# Path A — drop the dedicated cluster
sudo pg_ctlcluster 16 canonical stop
sudo pg_dropcluster 16 canonical

# Path B — kill the Docker container
docker rm -f pg-04.1-canonical

# Remove the Phase 4 worktree (this also discards the push:true edit)
git worktree remove --force /tmp/smbsite-phase4-wt
```

The dump artifact stays in `.planning/phases/04.1-payload-schema-reconciliation/`
on `main`. The Phase 4 branch HEAD is unchanged because the worktree's
`push: true` edit was never committed and the worktree itself is gone.

## 4. Expected outputs (verification gates)

After completing 3.7, all of the following must hold:

```bash
DUMP=.planning/phases/04.1-payload-schema-reconciliation/canonical-schema.sql

# Gate 1 — file exists, is non-empty, ~25 KB
test -s "$DUMP"
wc -l "$DUMP"                  # ~977 lines

# Gate 2 — exactly one CREATE TABLE per expected table
grep -c "^CREATE TABLE public.payload_ideas "                  "$DUMP"   # 1
grep -c "^CREATE TABLE public.pages "                          "$DUMP"   # 1
grep -c "^CREATE TABLE public.payload_locked_documents_rels "  "$DUMP"   # 1

# Gate 3 — bare `ideas` table is absent (proves the Plan 01 dbName override took effect)
grep -cE "^CREATE TABLE public\.ideas\b"                        "$DUMP"   # 0

# Gate 4 — payload_ideas_id and pages_id appear as FK columns + indexes
grep -c "payload_ideas_id"      "$DUMP"   # >= 2 (observed: 9)
grep -c "pages_id"              "$DUMP"   # >= 2 (observed: 9)

# Gate 5 — all 11 must-have core tables present (the 12th is payload_kv,
#   an internal Payload v3.84 KV store — included automatically)
for t in admin_users admin_users_sessions newsletters pages payload_ideas \
         community_channels payload_locked_documents \
         payload_locked_documents_rels payload_preferences \
         payload_preferences_rels payload_migrations; do
  test 1 -eq "$(grep -c "^CREATE TABLE public.${t} " "$DUMP")" \
    && echo "OK: $t" \
    || echo "FAIL: $t"
done
```

## 5. Failure modes and fixes

### A. Payload boot hangs >2 min on the first `/admin` GET

Likely cause: the `scripts/patch-payload-loadenv.mjs` loadEnv patch did not run
(no `node_modules/payload/dist/bin/loadEnv.js` in the worktree). Re-run
`pnpm install` to trigger postinstall.

If the boot hangs on `Pulling schema from database...` for more than 90 seconds:
the Postgres connection string is wrong. Check `PAYLOAD_DATABASE_URL` resolves to
the local cluster on `127.0.0.1:54321` (NOT a Neon DSN, NOT a pooler URL).

### B. A bare `ideas` table appears in the dump alongside `payload_ideas`

The Plan 01 dbName override is not in the working tree. Confirm:

```bash
grep -c "dbName: 'payload_ideas'" /tmp/smbsite-phase4-wt/src/collections/Ideas.ts
# must return 1
```

If 0: the worktree is on the wrong branch. Re-check out
`gsd/phase-04-user-submissions-editorial-moderation` at commit `294deb9` or
later.

### C. `pg_dump` fails with `permission denied`

The role connecting must own the `public` schema. For Path A (Postgres 16
local cluster), connect as `postgres` (set via `--username=postgres` and
`PGPASSWORD=local`). For Path B (Docker), same. For Path B-prime (Neon dev
branch — not used in 2026-05-12 capture, listed here for future operators),
use the branch's DIRECT URL with the role embedded in `DATABASE_URL`.

### D. `\restrict` token at the top of the dump differs between runs

Postgres 16's `pg_dump` emits a random per-dump security-restrict token at the
file head. This is metadata, not schema — Wave 3's diff logic should ignore
`^\\(restrict|unrestrict)\b` lines when comparing canonical-schema.sql across
runs.

### E. `next dev` is still running after the cleanup step

`pkill -f "next dev -p 3001"` should catch the child process. If a stray
`node` process remains on port 3001, find it via `lsof -i :3001` and kill it
explicitly. The leak is harmless (no prod data exposed) but it will hold the
worktree's node_modules open and may prevent `git worktree remove --force`.

## 6. Path A vs Path B trade-offs

| Aspect | Path A — local PostgreSQL cluster | Path B — Docker |
| --- | --- | --- |
| Setup time first run | ~30s (`apt-get install`) | ~5s (assuming Docker daemon already running) |
| Setup time subsequent runs | ~3s (just `pg_createcluster`) | ~3s (just `docker run`) |
| Requires Docker daemon | No | Yes |
| Requires sudo | Yes (`pg_createcluster`, `pg_dropcluster`) | No (if user is in `docker` group) |
| Isolation from host | Cluster has its own data directory + port | Full container isolation |
| Cleanup atomicity | `pg_dropcluster` deletes data directory | `docker rm -f` deletes container |
| Output identical? | Yes | Yes (verified — Payload v3.84 produces identical schema regardless of how the postgres:16 instance is provisioned) |

Use Path A when the dev machine doesn't have Docker installed. Use Path B
otherwise.

## 7. Commit convention

The dump file is committed on `main` (the Phase 04.1 planning directory lives
on `main` even though the Payload code lives on `gsd/phase-04-*`):

```bash
git add .planning/phases/04.1-payload-schema-reconciliation/canonical-schema.sql
git add .planning/phases/04.1-payload-schema-reconciliation/canonical-schema-CAPTURE.md
git commit -m "docs(04.1-02): canonical Payload schema dump + CAPTURE procedure"
```

Future re-runs for the same Phase 4 snapshot should produce identical CREATE
TABLE / column / index / FK statements; only the `\restrict` token at the head
of the file will change (see Failure Mode D). When Phase 3 adds voting fields,
the new dump goes into a sibling file (e.g.
`.planning/phases/03-XX-voting/canonical-schema.sql`) — do NOT overwrite the
Phase 04.1 dump, because it's the historical record of what the prod backfill
SQL was derived against.
