---
phase: 1
plan: 12
subsystem: infra
tags: [docker, fly-io, frankfurt, cloudflare-waf, github-actions, bullmq-worker, pg-dump, bunny-net, sentry-eu, ci-cd]
requires: [03, 04, 09, 10, 11]
provides:
  - dockerfile-multistage-standalone
  - flytoml-frankfurt-web-worker-process-groups
  - github-actions-ci-with-ephemeral-postgres
  - github-actions-deploy-with-destructive-migration-gate
  - github-actions-nightly-pg-dump-backup-with-failure-alerts
  - sentry-eu-dsn-preflight-script
  - cloudflare-waf-runbook
  - payload-first-admin-runbook
  - postgres-restore-runbook
affects:
  - Dockerfile
  - .dockerignore
  - fly.toml
  - .github/workflows/ci.yml
  - .github/workflows/deploy.yml
  - .github/workflows/backup.yml
  - scripts/verify-eu-dsn.ts
  - scripts/backup-postgres.ts
  - .planning/phases/01-foundation/01-OPS-RUNBOOK.md
  - package.json
tech-stack:
  added: []
  patterns:
    - multi-stage Dockerfile (deps -> builder -> runner) with Next.js standalone output
    - Fly.io two-process-group app (web + worker) sharing one image
    - GitHub Actions postgres:16-alpine service container for E2E + migration testing
    - destructive-migration gate via GitHub Actions environment + required reviewers
    - DIRECT_URL only for migrations (Pitfall C)
    - Sentry-EU DSN regex preflight as a deploy job (Pitfall G)
    - daily pg_dump --format=custom | gzip -> Bunny.net Storage with size sanity check
    - failure-path alerting via raw Sentry envelope POST (no SDK dep) + optional Slack webhook
key-files:
  created:
    - Dockerfile
    - .dockerignore
    - fly.toml
    - .github/workflows/ci.yml
    - .github/workflows/deploy.yml
    - .github/workflows/backup.yml
    - scripts/verify-eu-dsn.ts
    - scripts/backup-postgres.ts
    - .planning/phases/01-foundation/01-OPS-RUNBOOK.md
  modified:
    - package.json
key-decisions:
  - "AUTH_URL pinned to https://chastnik.eu in fly.toml [env] (and substituted throughout the OPS runbook). Open Decision #5 / D-17 was already resolved on the coalition side; the plan still carried <sender-domain> as a placeholder but the runtime context for plan 01-12 is the confirmed final domain. Substitution happens here so plan 01-13's Brevo DNS work has a concrete target rather than a templating step."
  - "Fly.io declares two process groups (web + worker) in a single Dockerfile/image. The worker entry uses `node --import tsx scripts/start-worker.ts` so the same TypeScript entry that worked in dev (plan 01-10) runs in production with no transpile step — node_modules and scripts/ are deliberately copied into the runner stage even though Next.js standalone output would otherwise strip them. Two VM definitions in fly.toml — web=512mb, worker=256mb — keep the worker on the smallest viable shared CPU since BullMQ concurrency=3 won't saturate it."
  - "deploy.yml splits into 3 jobs (verify-eu-dsn -> migrate -> deploy) so the migration job can carry the GitHub Actions environment-protection rule (D-23) without making the build job wait for human approval on every push. Required-reviewer protection on the `production` environment is the destructive-migration gate. Pitfall C is enforced by passing only DIRECT_URL into both `drizzle-kit migrate` and `payload migrate` steps — DATABASE_URL (pooled) is never referenced in deploy.yml."
  - "ci.yml runs migrations against an ephemeral postgres:16-alpine service container, not against the prod DB. This pulls plan 09's E2E suite onto a real Drizzle schema (so `db.insert(sessions)` etc. actually work in CI) at the cost of an extra service startup (~5s). The CI postgres is recreated on each run; no shared state across CI runs."
  - "backup.yml posts directly to the Sentry envelope endpoint via raw fetch — the GitHub runner does not need to install @sentry/node or @sentry/cli for a one-shot failure ping. The DSN regex `^https://([^@]+)@([^/]+)/(\\d+)$` parses the public key, host, and project ID; the resulting URL works against any Sentry host, EU or US (the prod DSN itself is verified to be EU by the deploy preflight). Slack webhook is the second alert channel (M-4 fix) only fires when SLACK_WEBHOOK is set."
  - "scripts/backup-postgres.ts uses `pg_dump --format=custom` (not plain SQL) so pg_restore can selectively restore individual tables during a partial recovery, then gzips the dump for storage cost. The 1KiB sanity-check threshold catches the empty-dump failure mode (T-12-backup-empty) where pg_dump silently succeeds but writes only the header (~200B for an empty dump)."
  - "scripts/verify-eu-dsn.ts uses two distinct exit codes (1 = unset, 2 = wrong region) so the deploy.yml job can show a clean message; both fail the job. The regex matches both `.de.sentry.io` and `.eu.sentry.io` because Sentry's EU routing has used both hostnames historically — accepting both prevents a false-fail if Sentry rebrands the EU endpoint."
patterns-established:
  - "Pattern: GitHub Actions environment-as-gate — the `production` GHA environment in deploy.yml's `migrate` job is what enforces D-23's destructive-migration human gate. Future deploy workflows in later phases should reuse the same environment so reviewer rules are configured once."
  - "Pattern: failure-path alerting that tolerates missing optional secrets (`if: failure() && env.SLACK_WEBHOOK != ''`) — primary channel never fails because of an unset fallback. Future scheduled workflows (cron jobs in later phases) should follow the same Sentry-primary / Slack-optional pattern."
  - "Pattern: two-binary Fly.io app — `[processes]` block with web + worker, separate `[[vm]]` blocks per process, http_service binds to `processes = ['web']` only. Future Phase 5 additions (e.g., a newsletter-send worker) can either share the existing `worker` group or add a third process group with its own VM definition."
requirements-completed: [OPS-01, OPS-06, OPS-07]
duration: ~10 min
completed: 2026-05-01
---

# Phase 1 Plan 12: Hosting infrastructure Summary

**Production-deployable artifacts shipped: multi-stage Dockerfile + Fly.io Frankfurt config (web + worker process groups, min_machines_running=1) + GitHub Actions CI/deploy/backup workflows (DIRECT_URL migrations, EU-DSN preflight, destructive-migration reviewer gate, nightly pg_dump to Bunny.net with Sentry+Slack failure alerts) + the operations runbook documenting Cloudflare WAF, Payload first-admin bootstrap, Sentry EU DSN verification, and the Postgres restore procedure — all referencing the confirmed coalition domain `chastnik.eu`.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-01T06:35:39Z
- **Completed:** 2026-05-01T06:45:46Z
- **Tasks:** 3 (all `auto`)
- **Files created:** 9 (Dockerfile, .dockerignore, fly.toml, 3 workflows, 2 scripts, runbook)
- **Files modified:** 1 (package.json — added `verify:eu-dsn` script)

## Accomplishments

- **Container + Fly.io config (Task 1.12.1):** Multi-stage `Dockerfile` (node:20-alpine, deps -> builder -> runner) using `pnpm install --frozen-lockfile` and Next.js standalone output, with `postgresql-client` + `tini` in the runner so `pg_dump` works locally and PID-1 signals propagate to Node. `.dockerignore` excludes node_modules, .next, .git, .planning, tests, env files, tsbuildinfo. `fly.toml` declares `primary_region = "fra"`, `min_machines_running = 1` (Pitfall H — never cold-starts during a QR surge), and two process groups: `web` (`node server.js`) and `worker` (`node --import tsx scripts/start-worker.ts`) sharing one image with separate VM specs (512mb / 256mb). `AUTH_URL = "https://chastnik.eu"` pinned in `[env]`. `scripts/verify-eu-dsn.ts` exits non-zero unless `SENTRY_DSN` matches `.de.sentry.io` or `.eu.sentry.io` (Pitfall G); `package.json` exposes it as `verify:eu-dsn`.
- **CI/CD + nightly backup (Task 1.12.2):** `.github/workflows/ci.yml` runs lint, lint:i18n, typecheck, db:check, vitest, playwright (chromium-desktop) on PR + push, against an ephemeral `postgres:16-alpine` service container — Drizzle migrations apply to that CI postgres before build/E2E so plan 01-09's auth flows hit a real DB (L-2 fix). `deploy.yml` splits into 3 jobs: `verify-eu-dsn` (Pitfall G preflight), `migrate` (Drizzle + Payload migrations via `DIRECT_URL` only — Pitfall C — gated on the `production` GitHub Actions environment for required-reviewer approval per D-23), and `deploy` (`flyctl deploy --strategy rolling --remote-only`). `backup.yml` runs daily at 02:00 UTC; `scripts/backup-postgres.ts` runs `pg_dump --format=custom` piped through `gzip`, asserts the file is >1KiB before declaring success (T-12-backup-empty), then PUTs the dump to Bunny.net Storage. Failure-path alerts go to Sentry via a direct envelope POST (no SDK dep needed) and optionally to Slack when `SLACK_WEBHOOK` is set (M-4 fix).
- **Operations runbook (Task 1.12.3):** `.planning/phases/01-foundation/01-OPS-RUNBOOK.md` documents 6 sections: (1) Cloudflare WAF setup with the canonical custom-rule expression `(not ip.src in $cloudflare_ip_ranges) and (http.host eq "chastnik.eu")` (T-12-origin-bypass / OPS-01), (2) Payload first-admin bootstrap via `fly ssh console` + inline `payload.create` script (D-25 / RESEARCH Q5), (3) Sentry EU DSN verification incl. post-deploy `/api/_sentry-test` flow gated by `SENTRY_TEST_ENABLED`, (4) Postgres restore from Bunny Storage to a Neon dev branch with row-count sanity SQL (D-24), (5) worker process operations (`fly logs --process worker`), and (6) an 8-item first-deploy checklist for plan 01-13's deliverability sign-off. `<sender-domain>` placeholder substituted with `chastnik.eu` throughout.

## Task Commits

Each task committed atomically (with hooks):

1. **Task 1.12.1: Dockerfile + fly.toml + verify-eu-dsn** — `0efbf99` (feat)
2. **Task 1.12.2: GitHub Actions CI + deploy + backup workflows** — `1e37665` (feat)
3. **Task 1.12.3: Operations runbook** — `6a74a5d` (docs)

**Plan tracking commit:** added in the final commit below (SUMMARY.md + STATE.md + ROADMAP.md).

## Files Created/Modified

**Created:**
- `Dockerfile` — Multi-stage (node:20-alpine deps -> builder -> runner) with pnpm + Next.js standalone; runner installs postgresql-client + tini; CMD ["node","server.js"] (overridden for worker by fly process group).
- `.dockerignore` — Excludes node_modules, .next, .git, .planning, tests, playwright-report, test-results, coverage, env files, tsbuildinfo, README.
- `fly.toml` — `app = "smbsite-prod"`, `primary_region = "fra"`, `min_machines_running = 1` (Pitfall H), `[processes]` web + worker, two `[[vm]]` blocks (512mb web / 256mb worker), `AUTH_URL = "https://chastnik.eu"`.
- `.github/workflows/ci.yml` — PR + push CI: lint/lint:i18n/typecheck/db:check/vitest/playwright with `postgres:16-alpine` service container; `drizzle-kit migrate` runs before build/E2E.
- `.github/workflows/deploy.yml` — 3-job pipeline (verify-eu-dsn -> migrate -> deploy); migration job gated on `environment: name: production` (required reviewers); `DIRECT_URL` only for migrations; `flyctl deploy --strategy rolling --remote-only`.
- `.github/workflows/backup.yml` — Daily 02:00 UTC cron + `workflow_dispatch`; `pg_dump | gzip | PUT` to Bunny.net via `scripts/backup-postgres.ts`; failure-path posts Sentry envelope via raw `fetch` and optional Slack webhook (M-4 fix).
- `scripts/verify-eu-dsn.ts` — Asserts SENTRY_DSN matches `.de.sentry.io` or `.eu.sentry.io`; exits 1 (unset) or 2 (wrong region) on failure (Pitfall G).
- `scripts/backup-postgres.ts` — `pg_dump --format=custom` piped through `gzip`; size-check threshold 1KiB (T-12-backup-empty); streams to `https://storage.bunnycdn.com/<zone>/<filename>` via PUT with `AccessKey` header.
- `.planning/phases/01-foundation/01-OPS-RUNBOOK.md` — 6-section operator handbook (Cloudflare WAF, Payload first-admin, Sentry EU verification, Postgres restore, worker ops, first-deploy checklist).

**Modified:**
- `package.json` — Added `"verify:eu-dsn": "tsx scripts/verify-eu-dsn.ts"` script.

## Decisions Made

See `key-decisions` in frontmatter. Most notable:

- **AUTH_URL substitution `<sender-domain>` -> `chastnik.eu`** in fly.toml `[env]` and throughout the runbook. The plan carried the placeholder because plan 01-13 was nominally the domain-confirmation deliverable; in fact Open Decision #5 / D-17 had already been resolved coalition-side, so substitution happened here once. Plan 01-13 still does the Brevo DNS work but no longer has to also propagate the domain choice.
- **Two-process Fly.io app sharing one image** — `web` + `worker` declared in `[processes]`; the worker entry is `node --import tsx scripts/start-worker.ts` so the same TS file that ran in dev (plan 01-10) runs in production. Required keeping `node_modules` + `scripts/` in the runner stage even though Next.js standalone output strips them.
- **deploy.yml job split (verify-eu-dsn -> migrate -> deploy)** so the migration job alone carries the `environment: name: production` reviewer gate (D-23). Build/preflight don't wait on human approval on every push.
- **Raw Sentry envelope POST in backup.yml** — avoids installing `@sentry/node` or `@sentry/cli` on the runner just for a one-shot failure ping. Works against any Sentry host (the prod DSN's EU residency is verified by the deploy preflight, not by this alert path).

## Deviations from Plan

None significant.

The plan listed `<sender-domain>` as a placeholder in two artifacts (fly.toml `AUTH_URL` and the runbook). The orchestrator's runtime notes confirmed the coalition's final domain is `chastnik.eu` (Open Decision #5 / D-17 resolved). Substituting at write-time rather than threading another templating step was the pragmatic call — both files now carry the production-final value. This is in line with plan-author intent: the placeholder existed because the planner had no commit on which domain it would be, not because they wanted runtime substitution.

All other instructions from the plan's `<action>` blocks were transcribed verbatim. No Rule 1/2/3 auto-fixes were needed; no Rule 4 architectural decisions arose. `pnpm typecheck` exits 0 after Task 1.12.2 confirming `scripts/backup-postgres.ts` compiles cleanly under the project's tsconfig.

## Issues Encountered

None.

## Self-Check

**Created files exist:**
- `Dockerfile` — FOUND
- `.dockerignore` — FOUND
- `fly.toml` — FOUND
- `.github/workflows/ci.yml` — FOUND
- `.github/workflows/deploy.yml` — FOUND
- `.github/workflows/backup.yml` — FOUND
- `scripts/verify-eu-dsn.ts` — FOUND
- `scripts/backup-postgres.ts` — FOUND
- `.planning/phases/01-foundation/01-OPS-RUNBOOK.md` — FOUND

**Commits exist (verified via `git log --oneline`):**
- `0efbf99` Task 1.12.1 — FOUND
- `1e37665` Task 1.12.2 — FOUND
- `6a74a5d` Task 1.12.3 — FOUND

**Verification gates:**
- All 3 plan-stated `<verify><automated>` blocks executed and printed `PASS`
- `pnpm typecheck` exits 0
- `verify-eu-dsn.ts` smoke test: accepts `*.de.sentry.io` (exit 0), rejects `*.us.sentry.io` (exit 2)
- No file deletions in any of the 3 task commits
- No tracked-but-untracked-after artifacts (`git status --short` shows only `?? CLAUDE.md` which is unrelated to this plan and was untracked before plan start)

## Self-Check: PASSED

## Next Phase Readiness

**Plan 01-12 complete; plan 01-13 unblocked.** Plan 01-13 is the deliverability checklist (Brevo DNS records, Postmaster Tools enrollment, soft-launch warm-up cadence per D-18). With `chastnik.eu` confirmed and the operations runbook documenting the first-deploy checklist + Cloudflare WAF + Payload first-admin procedure, plan 01-13's user-side checkpoints can run against concrete artifacts.

**No blockers introduced.** The only operational pre-requisite for actually running this pipeline is the user-setup work flagged in the plan frontmatter (Fly.io app creation, Cloudflare zone setup, Bunny.net storage zone, GitHub repo secrets) — that's deliberately out of scope for plan 01-12 (the plan PRODUCES the artifacts; the operator runs them per runbook). Plan 01-13's user-setup phase will sequence those.

**No new deferred items.**

## Threat Flags

None new. All threats covered by `<threat_model>` mitigations:
- T-12-origin-bypass — Cloudflare WAF custom rule documented in runbook §1
- T-12-cold-start-latency — `min_machines_running = 1` in fly.toml
- T-12-secrets-in-CI-logs — workflows reference `${{ secrets.* }}` only, no echo
- T-12-destructive-migration-without-review — `environment: name: production` in deploy.yml `migrate` job
- T-12-sentry-us-region — verify-eu-dsn job runs before migrate + deploy
- T-12-backup-empty — `scripts/backup-postgres.ts` enforces >1KiB threshold
- T-12-pooled-migration — deploy.yml passes only `DIRECT_URL` to migration steps
- T-12-payload-public-admin — fly ssh console procedure in runbook §2; public admin signup is denied at plan 01-04's collection access control

---
*Phase: 01-foundation*
*Completed: 2026-05-01*
