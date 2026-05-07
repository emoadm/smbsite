---
phase: 05-notifications
gate: redis-eviction-policy
status: passed-with-contradiction
verified_at: 2026-05-06T22:00:00+03:00
verified_by: emoadm
skip_flag_in_use: true
skip_flag_set_at: 2026-05-07T21:32:53Z
skip_flag_set_by: emoadm (via fly secrets set on smbsite-prod)
policy_followup: open — production deploy contradicted the doc's CONFIG-GET-on-prod-Upstash assumption; see "Update — 2026-05-08" below.
---

# Phase 5 G4 — Redis maxmemory-policy verification

## Update — 2026-05-08 (post-first-prod-worker-deploy)

The first production deploy carrying the runtime assertion (image v36, commit
`e78109b`) crashlooped on machine `6e823240c12438` with:

```
[worker] FATAL eviction-assert: Cannot verify Redis maxmemory-policy=noeviction
— CONFIG GET returned unexpected shape: [].
```

This **contradicts the doc's prior assumption** in §3 below (lines 99, 112, 118)
that "Production Upstash exposes CONFIG GET via the connection string." It
does not, on the pay-as-you-go plan we are using. CONFIG GET returns an empty
array, indistinguishable from the staging-tier deny pattern the doc anticipates.

**Mitigation applied:** `WORKER_SKIP_EVICTION_ASSERT=1` set on `smbsite-prod`
via `fly secrets set` at 2026-05-07T21:32:53Z. Worker exited the crashloop;
all four machines now on image v36. Web app (`/`, `/register`, `/login`)
verified live via curl smoke at 21:33Z.

**Defence-in-depth still holds:** the Upstash dashboard verification
(`Eviction Policy: noeviction`) on 2026-05-06 by emoadm remains valid; the
infra-level policy is correct. What's lost is the worker-boot regression
guard against a future dashboard-side change.

**Policy decision deferred:** the doc's §3 line 112 — "Production — NOT
ACCEPTABLE" for the skip flag — is currently violated. Before next gate
review, operator decides between:
  (a) Accept skip flag in prod; rewrite §3 / "Skip-flag audit trail" to
      reflect that Upstash on the current plan blocks CONFIG GET
      regardless of tier, and document the alternate regression-detection
      strategy (e.g. periodic dashboard scrape, Sentry alert on BullMQ
      "Eviction policy" warn at boot).
  (b) Migrate the production Redis to a backend that exposes CONFIG GET
      (self-hosted on Hetzner, Redis Cloud, or Upstash dedicated cluster
      tier), then unset the skip flag and re-verify.

This file's `skip_flag_in_use` flips to `true` to reflect production
reality. The audit-trail table below (line 116) is left intact pending the
(a)/(b) decision so the contradiction is visible, not hidden.

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

- **Production worker boot log (post-deploy 2026-05-07T21:30Z, image v35):**
  ```
  [worker] FATAL eviction-assert: Cannot verify Redis maxmemory-policy=noeviction
  — CONFIG GET returned unexpected shape: [].
  Set WORKER_SKIP_EVICTION_ASSERT=1 to bypass after recording sign-off in
  .planning/phases/05-notifications/05-OPS-REDIS-EVICTION.md.
  ```
  → worker crashlooped; max restart count reached at 21:30:48Z.

- **Production worker boot log (post-skip-flag 2026-05-07T21:32:53Z, image v36):**
  ```
  [no FATAL line; main child remained running until Fly auto-stopped per autostop_machines]
  ```
  → worker startup succeeded with the skip flag set.

- **Status:** runtime CONFIG GET assertion **failed** in production (contradicts §3 line 99). Skip flag now bearing the load; doc-level policy decision tracked in the "Update — 2026-05-08" section above. Infra-level eviction policy itself (`noeviction`) remains independently verified via Upstash dashboard on 2026-05-06.

## Sign-off

- [x] Local dev Redis verified (`noeviction`) — Homebrew default, no skip flag
- [x] Staging Upstash verified (`noeviction`) — dashboard toggle 2026-05-06
- [x] Production Upstash verified (`noeviction`) — dashboard toggle 2026-05-06
- [~] Skip flag NOT in use in production — **NO LONGER TRUE** as of 2026-05-07T21:32:53Z (see "Update — 2026-05-08"). Policy decision (a)/(b) open.
- [~] Startup-time assertion confirmed in production worker boot log — assertion **executed** and **failed** with CONFIG GET = `[]`; defence-in-depth not active until policy decision lands.
- [x] STATE.md updated to note this resolves a latent risk in Phase 1 OTP queue too — Task 05.14.3

**UAT Gap G4 closed at the infra layer** (eviction policy is `noeviction`).
The boot-time defence-in-depth guard is currently bypassed in production
pending operator policy decision (see "Update — 2026-05-08").

## Operator notes

- The infra-level fix (Upstash dashboard toggle on prod + staging) was applied during UAT on 2026-05-06 (commit `263031a` test note). At that moment the worker code did NOT yet have the runtime assertion — that's what plans 05-14 (this) shipped. So the order of events was: (1) UAT surfaces the BullMQ warning → (2) operator flips the dashboard toggle to stop the bleeding → (3) Plan 05-14 ships the startup assertion as defence-in-depth so a future regression cannot silently re-introduce the risk.
- The startup assertion's first runtime check happens on the next `pnpm worker` boot locally OR the next `fly deploy` of the worker process group. Operator: paste the relevant `fly logs` line into the "Production worker boot log" section above after that deploy.
- No Upstash plan limitations encountered — both free (staging) and pay-as-you-go (prod) tiers expose the dashboard eviction toggle and the `CONFIG GET maxmemory-policy` command via `rediss://` connection.
