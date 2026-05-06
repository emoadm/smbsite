---
phase: 05-notifications
plan: 14
subsystem: ops-redis
tags: [phase-5, gap-closure, ops, redis, bullmq, eviction-policy, remediates-uat-g4]
gap_closure: true
remediates:
  - uat_gap: G4
    truth: "Redis instance backing BullMQ uses `maxmemory-policy=noeviction`, OR the operator has explicitly accepted the risk by setting `WORKER_SKIP_EVICTION_ASSERT=1` after recording sign-off in 05-OPS-REDIS-EVICTION.md — silent degradation on CONFIG-GET error is forbidden"
    severity: major
    test: 1
requirements:
  - NOTIF-01
  - NOTIF-02
  - NOTIF-09
requires:
  - ioredis@5.x (existing dep — no new install)
  - dotenv@16.4.7 (devDep — Plan 05-12 already loaded)
provides:
  - "scripts/start-worker.ts startup-time `CONFIG GET maxmemory-policy` assertion (strict no-silent-degradation contract)"
  - "exported `evaluateEvictionPolicy(input, env)` pure helper (discriminated-union outcome) for unit-testing both error-path branches"
  - "explicit env-driven escape hatch `WORKER_SKIP_EVICTION_ASSERT=1` — grep-visible, audit-trailed, structured-warn-emitting"
  - "tests/unit/start-worker-eviction-policy.test.ts source-grep + behavior gates (10 it() blocks across 2 describes)"
  - "ops-gate doc `.planning/phases/05-notifications/05-OPS-REDIS-EVICTION.md` with per-environment verification + skip-flag audit trail"
affects:
  - "Worker boot path on Fly.io and local-dev (`pnpm worker`) — defence-in-depth regression guard at runtime"
  - "Phase 1 OTP queue (transitive — same UPSTASH_REDIS_URL per `src/lib/email/queue.ts:36`)"
  - "Phase 02.1 attribution queue (transitive — same shared Redis instance)"
tech_stack_added: []
patterns:
  - "discriminated-union outcome for testable env-flag-driven decision logic"
  - "short-lived IORedis client with 5s connectTimeout for one-shot CONFIG GET (isolates assertion failure mode from BullMQ lock-renewal lifecycle)"
  - "structured machine-greppable warn line `eviction-assert-skipped reason=<...> at=<ISO>` for downstream log alerting on escape-hatch use"
  - "ops-doc + STATE.md + startup-assertion three-layer enforcement (operator sign-off + ongoing runtime guard + phase-state record)"
key-files:
  created:
    - tests/unit/start-worker-eviction-policy.test.ts
    - .planning/phases/05-notifications/05-OPS-REDIS-EVICTION.md
    - .planning/phases/05-notifications/05-14-SUMMARY.md
  modified:
    - scripts/start-worker.ts
    - .planning/STATE.md
decisions:
  - "Strict no-silent-degradation contract: every CONFIG-GET error path either exits with code 1 OR emits a structured, audit-greppable warn line under an explicit operator-controlled env flag — silent catches forbidden (planner-checker B-2)"
  - "Skip flag covers ONLY the unverifiable case (CONFIG-GET errored). A verified-wrong policy ALWAYS exits with code 1, regardless of the flag. Implemented in `evaluateEvictionPolicy` via the `kind: 'wrong'` branch which the orchestrator handles before consulting the skip flag."
  - "Production cannot use the skip flag — contractually forbidden in the ops doc. If production Redis errors on CONFIG GET, escalate to plan upgrade or vendor switch."
  - "Short-lived standalone IORedis client (lazyConnect, 5s connectTimeout, maxRetriesPerRequest=1) for the assertion — does NOT reuse the BullMQ getConnection() singleton (which has `maxRetriesPerRequest: null` and would hang indefinitely on a stuck CONFIG GET)."
  - "Pure helper (`evaluateEvictionPolicy`) extracted as exported function alongside the orchestrator (`assertNoEviction`) so behavior tests run without mocking process.exit (Option A in plan task action step 1)."
  - "ESM async-main pattern (`async function main()` + `main().catch(...)`) instead of top-level await — keeps tsx-run entrypoint behavior intact and pulls all worker construction inside the assertion-gated block."
metrics:
  duration: ~30min (Task 05.14.1) + operator dashboard time (Task 05.14.2) + ~8min (Task 05.14.3 STATE update + this summary)
  completed: 2026-05-06
  tasks_completed: 3
  files_created: 3
  files_modified: 2
  commits: 4
---

# Phase 5 Plan 14: Redis Eviction Policy + Startup Assertion Summary

**One-liner:** All three Redis instances (local dev + staging Upstash + production Upstash) verified `maxmemory-policy=noeviction`, locked behind a startup-time assertion in `scripts/start-worker.ts` that hard-fails on any non-`noeviction` outcome under a strict no-silent-degradation contract — closing UAT G4 across all environments and transitively resolving a latent silent-job-loss risk in the Phase 1 OTP queue.

## What Was Built

Phase 5 Plan 14 closes UAT Gap **G4** — the BullMQ "Eviction policy is optimistic-volatile. It should be 'noeviction'" warning that printed 4× during UAT test 1. Three coupled deliverables:

1. **Operator step (Task 05.14.2):** Upstash dashboard toggle on staging + production from `optimistic-volatile` → `noeviction` (2026-05-06). Local dev was already at the Homebrew `redis-server` default of `noeviction` (no `maxmemory` cap → no eviction).

2. **Startup-time runtime assertion (Task 05.14.1):** New 80-line block in `scripts/start-worker.ts` runs one `CONFIG GET maxmemory-policy` against `UPSTASH_REDIS_URL` via a short-lived IORedis client at boot. Three outcomes:
   - **Verified `noeviction`** → `[worker] eviction-assert: noeviction ✓` log + proceed.
   - **Verified other policy** → `[worker] FATAL eviction-assert: Redis maxmemory-policy is "..." — BullMQ requires "noeviction"` + `process.exit(1)`. **Skip flag does NOT cover this case.**
   - **CONFIG-GET errored** (Upstash free-tier disallow, network, auth):
     - `WORKER_SKIP_EVICTION_ASSERT=1` set → structured `eviction-assert-skipped reason=<...> at=<ISO>` warn + proceed.
     - flag unset → fatal log + `process.exit(1)`. **No silent degradation.**

3. **Ops gate document (Task 05.14.1 skeleton + Task 05.14.2 sign-off):** `.planning/phases/05-notifications/05-OPS-REDIS-EVICTION.md` records per-environment verbatim verification, the skip-flag audit trail (which environments use the flag, why, and re-verify date), and operator sign-off. Currently `status: passed`, `skip_flag_in_use: false`, signed off by `emoadm` at `2026-05-06T22:00:00+03:00`.

4. **STATE.md update (Task 05.14.3):** records G4 closure across all three environments, references the ops doc, and notes the transitive Phase 1 OTP queue benefit (same `UPSTASH_REDIS_URL` per `src/lib/email/queue.ts:36`).

## Why This Matters

BullMQ uses TTLs on job lock keys, delayed-job sorted sets, and worker heartbeat keys. Redis with an eviction policy that drops TTL'd keys (e.g. `volatile-lru`, `volatile-ttl`, `optimistic-volatile`) can silently corrupt or lose in-progress jobs under memory pressure. BullMQ explicitly warns at boot but does NOT refuse to start.

UAT test 1 observed `optimistic-volatile` (Upstash free-tier default) on the dev Redis. The 4× repetition came from BullMQ printing the warning once per worker connection — email + attribution × 2 connections each (a primary + a `bclient` for blocking calls). The single `noeviction` policy fix at the Redis layer collapses all 4 warnings; the runtime assertion further collapses any future regression to one hard fail (or one explicit skip-with-audit warn).

**Production impact (the real risk):** under a memory spike (high-fan-out newsletter blast on a busy month, or a Phase 1 OTP burst from a QR campaign), Redis could evict an in-progress job's lock key → BullMQ's lock-renewal would fail → another worker would pick up the orphaned job → recipient could receive the newsletter twice OR not at all. Both elevate complaint rate and jeopardise sender reputation across the whole `news.chastnik.eu` domain — directly conflicting with the 4-week warmup ladder's goal.

**Why the strict no-silent-degradation contract matters:** the planner-checker B-2 pass identified a silent-on-CONFIG-error catch pattern as defeating the truth of G4 — the worker would boot even though `noeviction` was never verified, recreating exactly the silent-job-loss risk we set out to close. The revised contract: every error path either exits or emits a structured, audit-greppable warn line under an explicit operator-controlled flag. The flag only covers the unverifiable case; verified-wrong policies always exit. The flag's audit trail in the ops doc + the structured warn line + production's contractual prohibition together make the system honestly verifiable: noeviction holds, OR the operator has accepted the risk on a non-prod environment with a re-verification deadline.

## Cross-Phase Coverage — Phase 1 OTP Queue

`src/lib/email/queue.ts:36` reads `UPSTASH_REDIS_URL` — the same env var that the OTP enqueue path uses (Phase 1's email-OTP gate, `src/lib/email/queue.ts` `getConnection()` singleton). Setting `noeviction` on the production Redis fixes both Phase 1 OTP and Phase 5 newsletter at once. The startup assertion in `start-worker.ts` covers the worker-side check; the API-side `getConnection()` (which enqueues OTPs from the request path) does not need its own assertion because if the worker has verified `noeviction` once at boot, the policy is global to the Redis instance and the API-side enqueue benefits from the same guarantee.

This resolves a latent risk that was never explicitly logged as a Phase 1 gap: a Phase 1 OTP burst (e.g. coalition QR campaign drop produces 200 simultaneous registrations within minutes) on a free-tier Upstash with `optimistic-volatile` could have lost OTP send-jobs, causing visible registration failures at the worst possible moment of the warmup ladder. The infra fix on 2026-05-06 closed that risk; the runtime assertion prevents a future regression.

## Production Invariant

- Production Upstash exposes `CONFIG GET maxmemory-policy` via the `rediss://` connection (verified during UAT 2026-05-06 — both free and pay-as-you-go tiers expose the dashboard eviction toggle and the CONFIG command).
- The assertion's short-lived client uses `connectTimeout: 5000` and `maxRetriesPerRequest: 1` so a network-stuck CONFIG GET fails after 5 seconds rather than hanging the worker boot indefinitely.
- The assertion's IORedis client uses `lazyConnect: true` and explicitly `await client.connect()` so the connect-error path is testable and observable, then `await client.quit()` in a `finally` block to release the connection regardless of outcome.
- Production cannot ship with `WORKER_SKIP_EVICTION_ASSERT=1`. The ops doc skip-flag table reads `production: must be no` and the operator-confirmed `skip_flag_in_use: false` in frontmatter. Future operators inheriting this system can grep `fly secrets list -a smbsite-prod | grep WORKER_SKIP_EVICTION_ASSERT` to confirm the flag is not set.

## Per-Environment Verification (from 05-OPS-REDIS-EVICTION.md)

| Environment | Redis target | Policy | Action | Skip flag |
|-------------|--------------|--------|--------|-----------|
| Local dev | Homebrew `redis-server` on macOS | `noeviction` ✓ | none (default) | no |
| Staging Upstash | smbsite-staging, eu-west-1 (Frankfurt), Free | `noeviction` ✓ (was `optimistic-volatile`) | dashboard toggle 2026-05-06 | no |
| Production Upstash | smbsite-prod, eu-west-1 (Frankfurt), Pay-as-you-go | `noeviction` ✓ (was `optimistic-volatile`) | dashboard toggle 2026-05-06 | no (and contractually forbidden) |

Production worker boot-log paste is **deferred** (soft follow-up, not a blocker per the resume signal): the assertion code (commits f9ba1e5 + 53b355a) only just landed in `main`; first runtime verification happens on the next `fly deploy` of the worker process group. Operator will paste the relevant `fly logs -a smbsite-prod | grep eviction-assert` line into ops doc §"Startup assertion verification" after that deploy.

## Decisions Made

- **Strict no-silent-degradation contract.** Every CONFIG-GET error path must exit with code 1 OR emit a structured, audit-greppable warn line under an explicit operator-controlled env flag (`WORKER_SKIP_EVICTION_ASSERT=1`). Silent `console.warn + return` catches were explicitly rejected by planner-checker B-2 because they recreate the silent-job-loss risk the plan was supposed to close.
- **Skip flag scope-limited to the unverifiable case.** A verified-wrong policy ALWAYS exits with code 1, regardless of the skip flag. Implemented via `evaluateEvictionPolicy` returning `kind: 'wrong'` (which the orchestrator handles before reading the skip flag) versus `kind: 'unverifiable'` (which carries the `skipped: boolean` derived from the env). This makes it impossible for an insider to mask a wrong-policy by setting the flag in production (threat T-05-14-05).
- **Pure helper extracted (Option A from plan).** `evaluateEvictionPolicy(input, env)` is a pure function returning a discriminated-union outcome. The orchestrator `assertNoEviction()` is a thin async wrapper that performs the IORedis call, normalises success/error into the `EvictionCheckInput` shape, calls the helper, and translates outcomes to log lines + `process.exit(1)`. The unit test imports the helper as an ESM named export and covers all four behavior cases (ok, wrong, unverifiable+skip, unverifiable+no-skip) deterministically without mocking `process.exit`.
- **Short-lived standalone IORedis client.** The assertion does not reuse `src/lib/email/queue.ts`'s `getConnection()` singleton (`maxRetriesPerRequest: null` would hang on a stuck CONFIG GET). A fresh client with `lazyConnect: true`, `connectTimeout: 5000`, and `maxRetriesPerRequest: 1` runs one CONFIG GET, then `quit()` in a `finally` block. This isolates the assertion failure mode from the BullMQ lock-renewal lifecycle.
- **ESM async-main pattern.** `async function main() { await assertNoEviction(); /* ...workers... */ }` + `main().catch(...)` instead of top-level await — keeps tsx-run entrypoint behavior intact and gates all worker construction (email + attribution) inside the assertion-passed block. Worker variables (`emailWorker`, `attrWorker`) and shutdown handlers were brought verbatim from the pre-05-14 file into `main()`.
- **TLS handling preserved.** `tls: url.startsWith('rediss://') ? {} : undefined` mirrors the existing convention in `src/lib/email/queue.ts:39` so the assertion handles both local plain (`redis://`) and Upstash TLS (`rediss://`) connections uniformly.

## Verification

| Gate | Result |
|------|--------|
| `tests/unit/start-worker-eviction-policy.test.ts` | 10/10 it() blocks PASS (5 source-grep + 5 behavior) |
| `pnpm test:unit` (full suite, post-fix) | no regression beyond the pre-existing `payload-newsletters.test.ts:68` UploadFeature mismatch already logged in `.planning/phases/05-notifications/deferred-items.md` |
| `grep -c maxmemory-policy scripts/start-worker.ts` (non-comment) | ≥1 ✓ |
| `grep -c noeviction scripts/start-worker.ts` (non-comment) | ≥2 ✓ |
| `grep -cE "\.config\s*\(\s*['\"]GET['\"]" scripts/start-worker.ts` | 1 (line 83 — `client.config('GET', 'maxmemory-policy')`) |
| `grep -c WORKER_SKIP_EVICTION_ASSERT scripts/start-worker.ts` | ≥3 ✓ (type signature, helper read, comment) |
| `grep -c eviction-assert-skipped scripts/start-worker.ts` | ≥1 ✓ (the structured warn line) |
| `grep -cE "process\.exit\s*\(\s*1\s*\)" scripts/start-worker.ts` | ≥2 ✓ (verified-wrong branch + unverifiable-without-skip branch + main().catch) |
| `grep -E "^status:\s*passed" .planning/phases/05-notifications/05-OPS-REDIS-EVICTION.md` | match ✓ |
| `grep -E "^skip_flag_in_use:\s*false" .planning/phases/05-notifications/05-OPS-REDIS-EVICTION.md` | match ✓ |
| `grep -c "Phase 5 gap closure" .planning/STATE.md` | 3 ✓ |
| `grep -c "G1, G2, G3, G4" .planning/STATE.md` | 4 ✓ |

## Outcomes

- **UAT Gap G4 truth satisfied** across all three Redis environments (local + staging + production) under the strict no-silent-degradation contract.
- **Startup-time assertion provides ongoing enforcement** — no future regression possible without an explicit code revert that breaks the source-grep+behavior gate, OR an explicit env-flag set that emits an audit-greppable warn line.
- **Phase 1 OTP queue's silent-job-loss risk also resolved** (cross-phase coverage via shared `UPSTASH_REDIS_URL`).
- **Phase 5 ready for `/gsd-verify-work 05` re-run** with all 4 UAT gaps (G1, G2, G3, G4) closed.
- **Production-boot-log verification deferred** (soft follow-up): the assertion code only just landed in main; operator will paste the boot-log line into ops doc §"Startup assertion verification" after the next worker `fly deploy`. This is not a blocker per the resume-signal grammar (`phase-5-eviction-verified`).

## Threat Flags

None new. The plan's own threat model (T-05-14-01 to T-05-14-05) is fully discharged:

- T-05-14-01 (DoS via silent job loss) — mitigated by all three layers (operator policy fix + runtime assertion + ops-doc audit).
- T-05-14-02 (repudiation via silent skip) — mitigated by env-flag + structured warn line + ops-doc skip-flag table.
- T-05-14-03 (Redis URL leak in error message) — mitigated by error messages referencing `maxmemory-policy` value but never the connection string.
- T-05-14-04 (operator skips checkpoint and ships) — mitigated by Task 05.14.3 hard-blocking on `status: passed` + `skip_flag_in_use` excluding production, AND by the ongoing runtime assertion that refuses to boot on non-noeviction Redis.
- T-05-14-05 (insider sets skip flag in production to mask wrong-policy) — mitigated by `evaluateEvictionPolicy` returning `kind: 'wrong'` (handled before the skip flag is consulted), so the flag cannot mask a verified-wrong configuration.

## Deviations from Plan

None substantive — plan executed exactly as written. Minor mechanical:

- **Comment-line indexing for source-grep tests.** The source-grep helpers strip `//` and `*` line prefixes before regex match; the GREEN edits placed all required tokens (`maxmemory-policy`, `noeviction`, `WORKER_SKIP_EVICTION_ASSERT`, `eviction-assert-skipped`) on actual code lines so the greps catch them in non-comment code. The boot comment block (lines 16–30) also references these tokens but the strict counter targets non-comment occurrences, which the implementation exceeds.
- **`process.exit(1)` count.** The verify gate requires ≥2 occurrences in non-comment code. Implementation has 3: line 109 (verified-wrong), line 124 (unverifiable-without-skip), and line 165 (`main().catch` fatal). All three are intentional and gate distinct failure modes.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| f9ba1e5 | test | RED — failing source-grep + behavior gate for Redis eviction-policy assertion |
| 53b355a | feat | GREEN — Redis maxmemory-policy assertion in start-worker.ts + ops-doc skeleton |
| ee259f5 | docs | Redis maxmemory-policy operator sign-off (Task 05.14.2 close) |
| e874deb | docs | STATE.md — G4 closed, transitive fix to Phase 1 OTP queue noted (Task 05.14.3) |

## Self-Check: PASSED

All 5 declared files exist on disk:
- `tests/unit/start-worker-eviction-policy.test.ts` (created — 122 lines)
- `scripts/start-worker.ts` (modified — 166 lines, was 38 post-05-12)
- `.planning/phases/05-notifications/05-OPS-REDIS-EVICTION.md` (created — 149 lines, sign-off complete)
- `.planning/STATE.md` (modified — G4 closure recorded)
- `.planning/phases/05-notifications/05-14-SUMMARY.md` (this file)

All 4 declared commits exist in `git log`:
- `f9ba1e5` — `test(05-14): RED — ...`
- `53b355a` — `feat(05-14): GREEN — ...`
- `ee259f5` — `docs(05-14): Redis maxmemory-policy operator sign-off`
- `e874deb` — `docs(05-14): STATE.md — G4 closed, transitive fix to Phase 1 OTP queue noted`

## Notes for Downstream

- **Phase 5 ready for `/gsd-verify-work 05` re-run** with G1, G2, G3, G4 all closed. The verify-work gate will re-run the Phase 5 plan-check and UAT against the post-gap-closure state.
- **Production worker boot-log paste is the only soft follow-up** from this plan. Operator will paste the `[worker] eviction-assert: noeviction ✓` log line into ops doc §"Startup assertion verification" after the next `fly deploy` of the worker process group. This is not a blocker for `/gsd-verify-work 05`; the infra-level fix is independently verified via Upstash dashboard.
- **Phase 1 OTP queue benefit** is transitive and does not require a Phase 1 plan revision — the same Redis instance now serves both queues with `noeviction`. This is documented in STATE.md decisions and in this summary so future phase audits can trace the cross-phase coverage.
- **Skip flag behavior** is grep-visible. Any future operator who inherits the system can find every skip site by `grep -r WORKER_SKIP_EVICTION_ASSERT` in the codebase and `fly secrets list -a <app> | grep WORKER_SKIP_EVICTION_ASSERT` in deployed environments. The structured `eviction-assert-skipped` warn line in worker logs gives downstream log-monitoring an alertable substring on every boot where the flag is in use.
