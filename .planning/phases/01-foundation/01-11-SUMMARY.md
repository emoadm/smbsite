---
phase: 1
plan: 11
subsystem: observability
tags: [sentry-eu, pino, structured-logs, pii-redact, instrumentation]
requires: [05]
provides:
  - sentry-server-config
  - sentry-edge-config
  - sentry-client-config
  - structured-logger
  - sentry-test-route
  - smoke-e2e-spec
affects:
  - package.json
  - next.config.ts
  - src/instrumentation.ts
  - sentry.server.config.ts
  - sentry.edge.config.ts
  - instrumentation-client.ts
  - src/lib/logger.ts
  - src/app/api/_sentry-test/route.ts
  - tests/unit/logger.test.ts
  - tests/e2e/smoke.spec.ts
tech-stack:
  added:
    - "@sentry/nextjs@10.51.0"
    - pino@10.3.1
    - "@logtail/pino@0.5.5"
    - pino-pretty@13.0.0
  patterns:
    - PII-stripping Sentry beforeSend (server, edge, client)
    - replays disabled to prevent form-input capture leak
    - centralized REDACT list shared between logger source and test
    - dev-vs-prod transport switch (pino-pretty vs @logtail/pino)
    - one-shot post-deploy verification gated by SENTRY_TEST_ENABLED flag
key-files:
  created:
    - src/instrumentation.ts
    - sentry.server.config.ts
    - sentry.edge.config.ts
    - instrumentation-client.ts
    - src/lib/logger.ts
    - src/app/api/_sentry-test/route.ts
  modified:
    - next.config.ts
    - tests/unit/logger.test.ts
    - tests/e2e/smoke.spec.ts
    - package.json
key-decisions:
  - "Server beforeSend strips event.user.email/ip_address/name/full_name plus the cf-connecting-ip and x-forwarded-for request headers. Edge beforeSend mirrors the contract. Client beforeSend strips email/ip; replays are disabled entirely (replaysOnErrorSampleRate=0, replaysSessionSampleRate=0) so form-input capture cannot leak PII."
  - "next.config.ts H-6 chain preserved: withSentryConfig(withNextIntl(withPayload(nextConfig)), { org, project, silent, widenClientFileUpload }). Verifier confirms ALL three wrappers + the canonical composition substring are present so a future re-execution of plan 1.01 or 1.04 in isolation cannot silently undo the Sentry wrap."
  - "REDACT list lives in a single constant shared between src/lib/logger.ts and the test (declared as REDACT_LIST in the test). The source-grep test asserts every entry is mentioned in src/lib/logger.ts so renaming a single field requires editing both sides — a small barrier that has caught silent regressions in similar logger setups."
  - "Logger transport switches by environment: production with BETTERSTACK_SOURCE_TOKEN set → @logtail/pino transport ships JSON to Better Stack EU; otherwise → pino-pretty for dev console output. Switching to Axiom EU only changes target+options — no other code edits needed."
  - "/api/_sentry-test responds 404 in production unless SENTRY_TEST_ENABLED=1. Operator flips the flag once after deploy, captures the event in Sentry dashboard, then unsets the flag. Prevents the route from being scraped by bots in prod and polluting Sentry quota."
  - "Pitfall G (Sentry US data residency) is enforced by plan 1.12's deploy script (asserts SENTRY_DSN matches /\\.de\\.sentry\\.io/ before fly deploy) — this plan only ships the code that consumes the DSN. The DSN is set by the operator via fly secrets per plan 1.12's OPS-RUNBOOK."
requirements-completed: [OPS-02, OPS-03]
duration: ~15 min
completed: 2026-04-30
---

# Phase 1 Plan 11: Observability Summary

Sentry EU + structured-logging stack ready. `@sentry/nextjs@10.51.0` instrumented for server, edge, and client runtimes with PII-stripping `beforeSend` (deletes user.email, user.ip_address, user.name/full_name, cf-connecting-ip and x-forwarded-for request headers). Pino logger with the canonical D-21 redact list (email, password, ip, x-forwarded-for, cf-connecting-ip, name, full_name) censoring values to `[Redacted]`; `@logtail/pino` transport in production for Better Stack EU, `pino-pretty` for dev. Replays explicitly disabled to prevent session-capture from leaking form input. `next.config.ts` H-6 chain preserved as `withSentryConfig(withNextIntl(withPayload(nextConfig)))`. `/api/_sentry-test` route gated by `SENTRY_TEST_ENABLED=1` for one-shot post-deploy verification.

## What Was Built

**Task 1.11.1 — Sentry instrumentation:**
- `src/instrumentation.ts` — Next.js 15 `register()` hook routes by `NEXT_RUNTIME` to `../sentry.server.config` or `../sentry.edge.config`.
- `sentry.server.config.ts` + `sentry.edge.config.ts` + `instrumentation-client.ts` — `Sentry.init` with `tracesSampleRate: 0.1` and PII-stripping `beforeSend`. Client config disables replays entirely.
- `next.config.ts` — wrapped as `withSentryConfig(withNextIntl(withPayload(nextConfig)), { org, project, silent: !process.env.CI, widenClientFileUpload: true })`. H-6 three-plan composition preserved.

**Task 1.11.2 — pino logger (TDD):**
- `src/lib/logger.ts` — pino with `redact: { paths: REDACT, censor: '[Redacted]' }`, ISO timestamp, lowercase level. Production transport `@logtail/pino` (when BETTERSTACK_SOURCE_TOKEN set), dev transport `pino-pretty`.
- `tests/unit/logger.test.ts` — 2 assertions: end-to-end PII redaction (verified against 6 sentinel values; userId still present, `[Redacted]` appears) + source-grep guard that every REDACT entry appears in src/lib/logger.ts.

**Task 1.11.3 — Sentry test route + smoke spec:**
- `src/app/api/_sentry-test/route.ts` — 404 in prod unless `SENTRY_TEST_ENABLED=1`, otherwise logs + throws `'Sentry smoke test — intentional throw'`.
- `tests/e2e/smoke.spec.ts` — root URL <400 + Cyrillic heading visible; `/api/_sentry-test` returns 404 or 500 (either acceptable depending on env). Both `test.fixme` stubs replaced.

## Verification

| Check | Result |
|-------|--------|
| `pnpm typecheck` | exits 0 |
| `pnpm test:unit logger` | 2/2 pass |
| @sentry/nextjs@10.51.0 + pino@10.3.1 + @logtail/pino pinned | confirmed |
| All 4 Sentry config files exist with PII-stripping beforeSend | confirmed |
| next.config.ts wraps withSentryConfig(withNextIntl(withPayload)) — all 3 names present | confirmed |
| logger.ts has all 7 redact entries | confirmed |
| /api/_sentry-test gated by SENTRY_TEST_ENABLED in prod | confirmed |
| smoke.spec.ts has no fixme; covers root + sentry-test routes | confirmed |

## Deviations from Plan

None significant. The plan's verify command included `pnpm test:unit -- logger` (with `--`); I used `pnpm test:unit logger` (no `--`) per the same idiom note in plan 01-06's deviation log — pnpm 10 swallows the `--` so the no-`--` form is the one that filters correctly. All other acceptance criteria pass verbatim.

## Self-Check: PASSED

All 3 tasks executed and committed atomically. PII-stripping verified by both unit test (logger redact end-to-end) and code-level inspection (3 Sentry configs all delete user.email/user.ip_address). The H-6 three-plan composition for next.config.ts is intact; downstream plans editing next.config.ts must preserve all three wrappers.
