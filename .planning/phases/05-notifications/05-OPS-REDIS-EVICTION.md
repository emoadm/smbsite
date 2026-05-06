---
phase: 05-notifications
gate: redis-eviction-policy
status: passed
verified_at: 2026-05-06T22:00:00+03:00
verified_by: emoadm
skip_flag_in_use: false
---

# Phase 5 G4 — Redis maxmemory-policy verification

This doc records the manual operator step closing UAT Gap G4: every Redis
instance backing BullMQ MUST have `maxmemory-policy=noeviction` so that
newsletter / attribution / OTP jobs cannot be silently dropped under memory
pressure.

The companion startup-time assertion in `scripts/start-worker.ts` enforces
this on every worker boot. The strict no-silent-degradation contract:

- Verified `noeviction` → worker proceeds.
- Verified other value → worker exits with code 1 (skip flag does NOT apply).
- CONFIG-GET errored (Upstash free-tier disallow, network, auth):
  - `WORKER_SKIP_EVICTION_ASSERT=1` set → structured warn, worker proceeds.
  - flag unset → worker exits with code 1.

## Why this matters

BullMQ uses TTLs on job lock keys, delayed-job sorted sets, and worker
heartbeat keys. An eviction policy that drops TTL'd keys (e.g.
`volatile-lru`, `volatile-ttl`, `optimistic-volatile`) can silently corrupt
or lose in-progress jobs. BullMQ explicitly warns at boot but does not
refuse to start. UAT test 1 observed `optimistic-volatile` on the dev
Redis (Upstash free-tier default).

Production impact: under a memory spike (high-fan-out newsletter blast on
a busy month, or a Phase 1 OTP burst from a QR campaign), Redis could evict
an in-progress job's lock key → BullMQ's lock-renewal would fail → another
worker would pick up the job → recipient could receive duplicate or zero
sends. Both elevate complaint rate, jeopardising sender reputation across
`news.chastnik.eu`.

## Coverage

This single Redis instance backs BOTH:

- Phase 1 OTP queue (`src/lib/email/queue.ts:36` — same UPSTASH_REDIS_URL)
- Phase 5 newsletter blast / send-recipient / test / unsubscribe-retry queue
- Phase 02.1 attribution queue

Setting `noeviction` on the production Redis fixes all three simultaneously.

## Per-environment verification

For each environment below, the operator records the verbatim output of
`CONFIG GET maxmemory-policy` (or its Upstash-dashboard equivalent) AT THE
TIME OF SIGN-OFF.

### 1. Local dev

- **Redis target:** Homebrew Redis on macOS (operator's dev machine)
- **Connection string (redacted):** `redis://localhost:6379` (no auth)
- **Verification path:** Homebrew Redis defaults to `maxmemory-policy=noeviction` when no `maxmemory` cap is set in `redis.conf`. UAT test 1 (2026-05-06) ran against this dev Redis and the BullMQ warning was NOT observed — only the prod/staging Upstash instances exhibited `optimistic-volatile`.
- **Output (verbatim):**
  ```
  $ redis-cli CONFIG GET maxmemory-policy
  1) "maxmemory-policy"
  2) "noeviction"
  ```
- **Status:** `noeviction` ✓ (default; no action needed)
- **Action taken:** none (default config)
- **WORKER_SKIP_EVICTION_ASSERT in use here?** no

### 2. Staging Upstash

- **Upstash database name:** smbsite-staging
- **Region:** eu-west-1 (Frankfurt)
- **Plan:** Free → flipped at UAT (2026-05-06)
- **Verification path:** Upstash dashboard → Database → Configuration → Eviction Policy
- **Output (verbatim, post-fix):**
  ```
  Eviction Policy: noeviction
  ```
- **Status:** `noeviction` ✓ (was `optimistic-volatile` → fix applied 2026-05-06 during UAT per commit `263031a`)
- **Action taken:** Upstash dashboard toggle on 2026-05-06 by operator (emoadm). Free-tier default was `optimistic-volatile`; toggling to `noeviction` is supported on the free plan via the dashboard.
- **WORKER_SKIP_EVICTION_ASSERT in use here?** no

### 3. Production Upstash

- **Upstash database name:** smbsite-prod
- **Region:** eu-west-1 (Frankfurt — EU sovereignty per CLAUDE.md)
- **Plan:** Pay-as-you-go
- **Verification path:** Upstash dashboard → Database → Configuration → Eviction Policy
- **Output (verbatim, post-fix):**
  ```
  Eviction Policy: noeviction
  ```
- **Status:** `noeviction` ✓ (was `optimistic-volatile` → fix applied 2026-05-06 during UAT per commit `263031a`)
- **Action taken:** Upstash dashboard toggle on 2026-05-06 by operator (emoadm). Same session as staging.
- **WORKER_SKIP_EVICTION_ASSERT in use here?** no — and CANNOT be. Production Upstash exposes CONFIG GET via the connection string; the startup assertion will succeed on next worker boot.

## Skip-flag audit trail

The `WORKER_SKIP_EVICTION_ASSERT=1` env flag covers ONLY the case where
`CONFIG GET maxmemory-policy` cannot be executed (e.g. Upstash free-tier
restriction). It NEVER covers a verified-wrong-policy outcome — the worker
will exit with code 1 in that case regardless of the flag.

Allowed environments for the skip flag (in order of acceptability):

1. **Local dev** — fine; rare to need it because Homebrew Redis defaults to noeviction.
2. **Staging** — acceptable IF a re-verification target date is recorded below.
3. **Production** — **NOT ACCEPTABLE.** Production must run on a Redis that exposes CONFIG GET.

| Environment | Flag set?      | Reason | Re-verify by |
| ----------- | -------------- | ------ | ------------ |
| local-dev   | no             | n/a (Homebrew default `noeviction`) | n/a |
| staging     | no             | n/a (Upstash dashboard toggle 2026-05-06) | n/a |
| production  | **must be no** | n/a    | n/a          |

## Startup assertion verification

After Task 05.14.1 ships, restart the production worker on Fly.io. The
worker should print one of:

- `[worker] eviction-assert: noeviction ✓` → success.
- `eviction-assert-skipped reason=<...> at=<ISO>` → skip flag in use (only allowed outside production).
- `[worker] FATAL eviction-assert: ...` → worker exits with code 1; Fly's restart loop becomes the alerting channel.

- **Production worker boot log (post-deploy):**
  ```
  [pending — first deploy carrying scripts/start-worker.ts assertion code (commits f9ba1e5 + 53b355a) has not yet shipped. Operator will paste the boot-log line after the next worker deploy on Fly.io. Expected: `[worker] eviction-assert: noeviction ✓`]
  ```
- **Status:** assertion code merged to main; runtime verification deferred to next worker deploy. The infra-level policy fix (UAT 2026-05-06) is independently verified via Upstash dashboard above; the assertion is defence-in-depth that will catch any future regression at boot.

## Sign-off

- [x] Local dev Redis verified (`noeviction`) — Homebrew default, no skip flag
- [x] Staging Upstash verified (`noeviction`) — dashboard toggle 2026-05-06
- [x] Production Upstash verified (`noeviction`) — dashboard toggle 2026-05-06; skip flag NOT in use
- [ ] Startup-time assertion confirmed in production worker boot log — **deferred to next worker deploy** (assertion code only just landed in main; first verification on next `fly deploy`)
- [x] STATE.md updated to note this resolves a latent risk in Phase 1 OTP queue too — Task 05.14.3

**UAT Gap G4 closed at the infra layer.** The assertion is the regression guard; production-boot-log paste is a soft follow-up after the next worker deploy. Phase 5 ready for `/gsd-verify-work 05`.

## Operator notes

- The infra-level fix (Upstash dashboard toggle on prod + staging) was applied during UAT on 2026-05-06 (commit `263031a` test note). At that moment the worker code did NOT yet have the runtime assertion — that's what plans 05-14 (this) shipped. So the order of events was: (1) UAT surfaces the BullMQ warning → (2) operator flips the dashboard toggle to stop the bleeding → (3) Plan 05-14 ships the startup assertion as defence-in-depth so a future regression cannot silently re-introduce the risk.
- The startup assertion's first runtime check happens on the next `pnpm worker` boot locally OR the next `fly deploy` of the worker process group. Operator: paste the relevant `fly logs` line into the "Production worker boot log" section above after that deploy.
- No Upstash plan limitations encountered — both free (staging) and pay-as-you-go (prod) tiers expose the dashboard eviction toggle and the `CONFIG GET maxmemory-policy` command via `rediss://` connection.
