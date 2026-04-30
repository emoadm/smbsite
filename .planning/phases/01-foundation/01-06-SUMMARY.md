---
phase: 1
plan: 06
subsystem: anti-abuse
tags: [turnstile, rate-limit, disposable-email, upstash, ip-extraction]
requires: [01, 02]
provides:
  - turnstile-siteverify
  - rate-limit-policies
  - disposable-email-check
  - cf-ip-helpers
affects:
  - package.json
  - src/lib/turnstile.ts
  - src/lib/rate-limit.ts
  - src/lib/disposable-email.ts
  - src/lib/ip.ts
  - tests/unit/turnstile.test.ts
  - tests/unit/rate-limit.test.ts
  - tests/unit/disposable-email.test.ts
tech-stack:
  added:
    - disposable-email-domains-js@1.20.0
    - "@upstash/redis@1.37.0"
    - "@upstash/ratelimit@2.0.8"
  patterns:
    - fail-closed verification (every external call defaults to deny)
    - source-grep tests for config invariants (rate-limit policy strings)
    - cf-connecting-ip preferred over x-forwarded-for (D-22)
key-files:
  created:
    - src/lib/turnstile.ts
    - src/lib/ip.ts
    - src/lib/rate-limit.ts
    - src/lib/disposable-email.ts
  modified:
    - tests/unit/turnstile.test.ts
    - tests/unit/rate-limit.test.ts
    - tests/unit/disposable-email.test.ts
    - package.json
key-decisions:
  - "Used disposable-email-domains-js@1.20.0 (Pitfall F) — actively maintained, monthly updates. Confirmed package.json does NOT contain the abandoned 'disposable-email-domains' package. Bulgarian webmail abv.bg explicitly tested as NOT flagged."
  - "Rate-limit tests are source-grep based, not network-mocked: validate D-07 limit values without spinning up a real Upstash instance. Module-load test exercises Redis client construction with placeholder URL/token; the @upstash/redis client tolerates lazy URL validation in v1.37 so import doesn't fail."
  - "Turnstile fail-closed pattern: empty token, missing secret, non-2xx response, and any caught exception ALL return ok=false with a discriminated errorCodes string. Plan 1.07 surfaces these to users as 'auth.register.captchaFailed' or logs them at warn level (no error-code is exposed to the client to avoid CAPTCHA fingerprinting)."
  - "loginOtpEmail limiter lowercases email before keying — prevents 'User@x.com' vs 'user@x.com' from getting separate buckets. Other limiters key on already-canonical IDs (IP literal, subnet, OTP token)."
  - "RATE_LIMITS constant kept alongside the limiters so plan 1.07's error messages can render '3 attempts per 24h' without re-magicking the values. Single source of truth."
  - "Implemented the per-OTP verify limiter with fixedWindow(5, '15 m'): once an OTP is consumed (login OTP expires in 10min anyway), the bucket auto-rolls. The intent is to allow 5 wrong tries per OTP before plan 1.07 invalidates the row entirely (D-07)."
requirements-completed: [AUTH-08, AUTH-09, AUTH-10]
duration: ~15 min
completed: 2026-04-30
---

# Phase 1 Plan 06: Anti-abuse stack Summary

Three security primitives ready for plan 1.07's Server Actions: server-side Cloudflare Turnstile siteverify (AUTH-08, fail-closed), five Upstash rate-limit policies covering registration + login + OTP verification (AUTH-09, exact D-07 limits), and the actively-maintained disposable-email blocklist (AUTH-10, Pitfall F → `disposable-email-domains-js@1.20.0`, NOT the abandoned `disposable-email-domains`). Bulgarian webmail `abv.bg` explicitly tested as NOT flagged. IP extraction prefers `cf-connecting-ip` (D-22) and supports /24 subnet aggregation for the registration-subnet limiter (D-07 Pitfall 8). All three primitives committed atomically; no live external service calls until plan 1.07 wires them into Server Actions.

## What Was Built

**Task 1.06.1 — Disposable-email check:**
- `src/lib/disposable-email.ts` — `isDisposable(email)` trims + lowercases, guards against malformed input (no `@`, empty, trailing `@`), wraps the package call in try/catch returning false on error so Zod's `email()` refinement can still surface the validation error
- 7 assertions: rejects mailinator/10minutemail, accepts gmail/abv.bg, case+whitespace insensitive, graceful malformed-input handling

**Task 1.06.2 — Turnstile + IP helpers:**
- `src/lib/turnstile.ts` — `verifyTurnstile(token, ip?)` POSTs application/x-www-form-urlencoded to `challenges.cloudflare.com/turnstile/v0/siteverify` with `TURNSTILE_SECRET_KEY`. Discriminated `{ ok, errorCodes? }` result. Fail-closed on every error mode: empty token → `missing-input-response` (no fetch), missing secret → `missing-secret`, non-2xx → `http-{status}`, caught exception → `fetch-failed`
- `src/lib/ip.ts` — `getClientIp(headers)` reads `cf-connecting-ip` (D-22) with x-forwarded-for fallback for dev. `getSubnet(ip)` aggregates IPv4 to `/24`; IPv6 returns raw IP (defer /48 aggregation to v2)
- 5 mocked-fetch assertions verifying the contract end-to-end

**Task 1.06.3 — Upstash rate limiters:**
- `src/lib/rate-limit.ts` — 5 Ratelimit instances with distinct prefixes:
  - `registration-ip` — `slidingWindow(3, '24 h')`
  - `registration-subnet` — `slidingWindow(5, '24 h')`
  - `login-otp-email` — `slidingWindow(5, '1 h')` (lowercases email key)
  - `login-otp-ip` — `slidingWindow(20, '1 h')`
  - `otp-verify` — `fixedWindow(5, '15 m')`
- Five `check*` helpers returning `{ success, remaining, reset }`
- `RATE_LIMITS` constant exported so plan 1.07 can surface human-readable policy values in error messages
- 6 assertions: function-export shape + source-grep verifying each (limit, window) pair

## Verification

| Check | Result |
|-------|--------|
| `pnpm typecheck` | exits 0 |
| `pnpm lint:i18n` | exits 0 |
| `pnpm test:unit disposable-email` | 7/7 pass |
| `pnpm test:unit turnstile` | 5/5 pass |
| `pnpm test:unit rate-limit` | 6/6 pass |
| package.json pins disposable-email-domains-js@1.20.0 (NOT abandoned package) | confirmed |
| package.json pins @upstash/redis@1.37.0 + @upstash/ratelimit@2.0.8 | confirmed |
| turnstile.ts targets challenges.cloudflare.com siteverify URL | confirmed |
| rate-limit.ts has all 5 prefixes + correct (limit, window) pairs | confirmed |
| ip.ts checks cf-connecting-ip first | confirmed |

## Deviations from Plan

**[Rule 5 → minor non-deviation] `pnpm test:unit -- <name>` form replaced with `pnpm test:unit <name>`**
Reason: pnpm 10's `--` separator is consumed by pnpm before reaching the script's args. The plan's `pnpm test:unit -- otp-generator` style runs ALL tests (including unrelated SCAFFOLD MISSING stubs). The functionally-equivalent `pnpm test:unit otp-generator` filters correctly. Documented for downstream plans (01-07/01-09 use the same idiom).

## Self-Check: PASSED

All 3 tasks executed and committed atomically. 18 unit tests pass (7+5+6). All acceptance criteria verified. Server Actions in plan 1.07 will exercise these primitives end-to-end against `.env.test` placeholder URLs.
