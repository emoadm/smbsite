---
phase: 05-notifications
gate: redis-eviction-policy
status: pending
verified_at: [ISO timestamp]
verified_by: [operator handle]
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

- **Redis target:** [docker / homebrew / WSL / Upstash dev — describe]
- **Connection string (redacted):** [`redis://localhost:6379` / `rediss://default:****@dev-instance.upstash.io:6379`]
- **Command run:**
  ```
  redis-cli -u $UPSTASH_REDIS_URL CONFIG GET maxmemory-policy
  ```
- **Output (verbatim):**
  ```
  [paste output]
  ```
- **Status:** [`noeviction` ✓ | `optimistic-volatile` — fix applied | other]
- **Action taken (if not noeviction):** [`redis-cli CONFIG SET maxmemory-policy noeviction` and persisted in redis.conf, OR Upstash dashboard toggle]
- **WORKER_SKIP_EVICTION_ASSERT in use here?** [no | yes — reason: ..., re-verify by: YYYY-MM-DD]

### 2. Staging Upstash

- **Upstash database name:** [name]
- **Region:** [eu-west-1 / etc.]
- **Plan:** [Free / Pay-as-you-go / Pro]
- **Verification path:**
  - Upstash dashboard: Database → Configuration → Eviction Policy
  - OR `redis-cli -u $UPSTASH_STAGING_URL CONFIG GET maxmemory-policy`
- **Output (verbatim):**
  ```
  [paste output]
  ```
- **Status:** [`noeviction` ✓ | `optimistic-volatile` — fix applied | toggle unavailable on free tier — escalate]
- **Action taken:** [dashboard toggle on YYYY-MM-DD | plan upgrade | etc.]
- **WORKER_SKIP_EVICTION_ASSERT in use here?** [no | yes — reason: ..., re-verify by: YYYY-MM-DD]

### 3. Production Upstash

- **Upstash database name:** [name]
- **Region:** [eu-west-1 — must be EU per CLAUDE.md sovereignty constraints]
- **Plan:** [Free / Pay-as-you-go / Pro]
- **Verification path:** [as above]
- **Output (verbatim):**
  ```
  [paste output]
  ```
- **Status:** [`noeviction` ✓ | other — describe]
- **Action taken:** [as above]
- **WORKER_SKIP_EVICTION_ASSERT in use here?** **PRODUCTION MUST NOT use the skip flag.** If CONFIG GET is unavailable on production Redis, escalate to plan upgrade or vendor switch — do NOT ship production with the skip flag.

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
| local-dev   | [no/yes]       | [...]  | [date]       |
| staging     | [no/yes]       | [...]  | [date]       |
| production  | **must be no** | n/a    | n/a          |

## Startup assertion verification

After Task 05.14.1 ships, restart the production worker on Fly.io. The
worker should print one of:

- `[worker] eviction-assert: noeviction ✓` → success.
- `eviction-assert-skipped reason=<...> at=<ISO>` → skip flag in use (only allowed outside production).
- `[worker] FATAL eviction-assert: ...` → worker exits with code 1; Fly's restart loop becomes the alerting channel.

- **Production worker boot log (post-deploy):**
  ```
  [paste relevant log lines from `fly logs -a smbsite-prod -i worker`]
  ```
- **Status:** [assertion passed at boot ✓ | failed — diagnostic]

## Sign-off

- [ ] Local dev Redis verified (`noeviction`) — or skip-flag use justified
- [ ] Staging Upstash verified (`noeviction`) — or skip-flag use justified with re-verify date
- [ ] Production Upstash verified (`noeviction`) — **skip flag MUST NOT be in use**
- [ ] Startup-time assertion confirmed in production worker boot log
- [ ] STATE.md updated to note this resolves a latent risk in Phase 1 OTP queue too

**UAT Gap G4 closed.** Phase 5 ready for `/gsd-verify-work 05`.

## Operator notes

[free-form section for any quirks — Upstash plan limitations, redis-cli
auth quirks, etc.]
