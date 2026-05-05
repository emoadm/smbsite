---
phase: 05-notifications
plan: "06"
subsystem: unsubscribe-endpoint
tags: [phase-5, unsubscribe, rfc-8058, node-runtime, hmac-verify, notif-02, notif-03]
dependency_graph:
  requires:
    - "src/lib/unsubscribe/hmac.ts (Plan 05-02) — verifyUnsubToken"
    - "src/lib/email/queue.ts (Plan 05-01) — addEmailJob + EmailJobKind"
    - "src/db/schema/consents.ts (Plan 05-02) — CONSENT_KINDS 8-entry const"
    - "messages/bg.json unsubscribe namespace (Plan 05-03)"
  provides:
    - "src/app/api/unsubscribe/route.ts — RFC 8058 GET+POST endpoint (Node runtime)"
    - "src/app/(frontend)/unsubscribed/page.tsx — 4-variant public confirmation page"
    - "src/lib/newsletter/brevo-sync.ts — brevoBlocklist + brevoUnblock ESP helpers"
    - "tests/integration/unsubscribe-route.test.ts — 19 integration tests"
    - "tests/e2e/unsubscribe.spec.ts — 5 Playwright e2e tests (scaffolded)"
  affects:
    - "Wave 3 plan 05-10 (schema push enables full DB round-trip)"
    - "Wave 4 plan 05-11 (UAT e2e execution)"
    - "Plan 05-05 (brevo-sync.ts stub pre-empts 05-05 — merge must deduplicate)"
tech_stack:
  added: []
  patterns:
    - "RFC 8058 dual GET+POST unsubscribe endpoint (mailbox provider POST + user footer link GET)"
    - "HMAC token as auth substitute for public unsubscribe route (D-14 / D-16)"
    - "D-13 append-only consent INSERT — 4 granted=false rows, one per newsletter topic"
    - "D-14 same-session Brevo blocklist sync with retry-queue safety net (Pitfall 4)"
    - "D-24 PII-safe logging — user_id only, no email in logger calls"
    - "T-05-06-07 open-redirect guard — reason param whitelist in variantFor()"
    - "force-dynamic RSC page for searchParams-gated variant rendering"
key_files:
  created:
    - src/app/api/unsubscribe/route.ts
    - "src/app/(frontend)/unsubscribed/page.tsx"
    - src/lib/newsletter/brevo-sync.ts
    - tests/integration/unsubscribe-route.test.ts
    - tests/e2e/unsubscribe.spec.ts
  modified: []
decisions:
  - "brevo-sync.ts created by Plan 05-06 (not 05-05) as Rule 3 blocking-dependency fix; Plan 05-05 merge must skip duplicate creation or extend with newsletter-worker integration"
  - "D-24 logger calls use user_id only — no email key in any logger.info/warn call; lock-in test enforces this"
  - "variantFor() whitelist: unknown reason values fall back to success variant (T-05-06-07 open-redirect mitigation)"
  - "D-13 INSERT: 4 newsletter topic rows in one db.insert().values([...]) call — mirrors cookie-consent/route.ts pattern"
metrics:
  duration_seconds: 520
  completed_date: "2026-05-05"
  tasks_completed: 2
  files_modified: 5
requirements:
  - NOTIF-02
  - NOTIF-03
---

# Phase 05 Plan 06: One-click Unsubscribe Endpoint + Confirmation Page Summary

**One-liner:** RFC 8058 GET+POST `/api/unsubscribe` route (Node runtime, HMAC auth substitute, 4-row consent INSERT, Brevo sync with retry fallback) + `/unsubscribed` RSC page rendering 4 reason variants from bg.unsubscribe.* translations.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| RED | Add failing tests for route + page invariants | `2ba5518` | tests/integration/unsubscribe-route.test.ts |
| 05.06.1 | /api/unsubscribe Node runtime route + brevo-sync stub | `2549754` | src/app/api/unsubscribe/route.ts, src/lib/newsletter/brevo-sync.ts, tests/integration/unsubscribe-route.test.ts (type fixes) |
| 05.06.2 | /unsubscribed RSC page + e2e spec | `483ee13` | src/app/(frontend)/unsubscribed/page.tsx, tests/e2e/unsubscribe.spec.ts |

## What Was Built

### Task 05.06.1 — /api/unsubscribe route (commit 2549754)

`src/app/api/unsubscribe/route.ts` — RFC 8058 compliant unsubscribe endpoint:

**Key invariants:**
- `export const runtime = 'nodejs'` — IORedis (BullMQ) is incompatible with Edge runtime
- `POLICY_VERSION = '2026-04-29'` — mirrors cookie-consent/route.ts (D-13)
- Both `GET` (user footer link) and `POST` (mailbox provider one-click) delegate to shared `handle()`
- HMAC token is the auth substitute — no `auth()` call (D-14)
- On verify failure: 303 redirect to `/unsubscribed?reason=<reason>` — never 404
- On success: INSERT 4 granted=false rows + await brevoBlocklist + 303 to `/unsubscribed`
- On Brevo failure: enqueue `unsubscribe-brevo-retry` (D-14 retry safety net) + still redirect to `/unsubscribed` (DB write is source of truth per Pitfall 4)
- All logger calls use `{ user_id }` only — no `email:` key (D-24)

`src/lib/newsletter/brevo-sync.ts` — ESP blocklist helpers:
- `brevoBlocklist(email)` — POST `/v3/contacts` with `emailBlacklisted: true, updateEnabled: true` (idempotent upsert)
- `brevoUnblock(email)` — PUT `/v3/contacts/{email}` with `emailBlacklisted: false`
- Lazy `BREVO_API_KEY()` getter (Pitfall 8 guard — never throws at module eval time)
- Throws on non-2xx so caller can catch and retry

**Integration tests (19 tests — all GREEN):**

| # | Test |
|---|------|
| 1–9 | Source invariants: Node runtime, GET+POST exports, POLICY_VERSION, no auth(), verifyUnsubToken import, brevoBlocklist+addEmailJob import, 4 topic kinds, ?reason= redirect, D-24 no email in logger |
| 10 | Valid token → 4 INSERTs + Brevo call + 303 to /unsubscribed |
| 11 | Expired token → 303 to /unsubscribed?reason=expired; no db.insert |
| 12 | bad-sig token → 303 to /unsubscribed?reason=bad-sig |
| 13 | Brevo failure → enqueues retry; still 303 to /unsubscribed (success path) |
| 14 | POST behaves identically to GET (RFC 8058 parity) |
| 15–19 | Page source invariants: getTranslations('unsubscribe'), width="form", no auth(), force-dynamic, robots noindex |

### Task 05.06.2 — /unsubscribed page + e2e spec (commit 483ee13)

`src/app/(frontend)/unsubscribed/page.tsx` — RSC confirmation page:

**4 variants per UI-SPEC §5.3:**

| URL | reason | Render |
|-----|--------|--------|
| /unsubscribed | (none) | success: CheckCircle2 + success.heading + body + CTA (/member/preferences) + community link (/community) |
| /unsubscribed?reason=expired | expired | Same as success + Alert with expired.alert.title + expired.alert.body |
| /unsubscribed?reason=bad-sig | bad-sig | invalid: invalid.heading + body + CTA (/login?next=/member/preferences) + community link |
| /unsubscribed?reason=malformed | malformed | Same as bad-sig |

**Page invariants:**
- `export const dynamic = 'force-dynamic'` — searchParams require per-request execution
- `generateMetadata` sets `robots: { index: false, follow: false }` (T-05-06-07)
- `variantFor()` whitelist — unknown reason values fall back to success (open-redirect guard)
- All copy from `t('unsubscribe.*')` — zero hardcoded Bulgarian (D-22)
- No `auth()` call — public route (D-14)

`tests/e2e/unsubscribe.spec.ts` — 5 Playwright tests scaffolded:
- success variant — heading + CTA hrefs + no Alert
- expired variant — Alert text visible
- bad-sig variant — invalid heading + login CTA href
- malformed variant — same as bad-sig
- a11y: exactly 1 `<h1>` per variant (UI-SPEC §8)

## Test Results

- `tests/integration/unsubscribe-route.test.ts` — 19 tests, all GREEN
- Full regression suite — 227 tests across 27 files, all GREEN (no regressions)
- `pnpm typecheck` — 0 errors (discriminated union `UnsubVerifyResult` narrows correctly)
- `tests/e2e/unsubscribe.spec.ts` — file exists, syntactically correct; execution deferred to Wave 4 (Plan 05-11 — requires live server)

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (route + page tests) | 2ba5518 | PASSED — tests failed before implementation |
| GREEN (route implementation) | 2549754 | PASSED — 19 tests pass |
| GREEN (page + e2e) | 483ee13 | PASSED — 19 tests still pass |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] brevo-sync.ts missing — parallel Plan 05-05 not yet merged**
- **Found during:** Task 05.06.1 pre-implementation check
- **Issue:** `/api/unsubscribe` imports `brevoBlocklist` from `@/lib/newsletter/brevo-sync` which is delivered by Plan 05-05 (running in parallel). The module did not exist in this worktree, causing a TypeScript module-not-found error and blocking compilation.
- **Fix:** Created `src/lib/newsletter/brevo-sync.ts` with full `brevoBlocklist` + `brevoUnblock` implementations (Brevo REST API v3). This is a complete, production-ready implementation — not a placeholder.
- **Merge impact:** When Plan 05-05 is merged, it will either skip creating this file (since it exists) or extend it with worker-specific logic. The exports `brevoBlocklist` and `brevoUnblock` are intentionally the same as what 05-05 would create.
- **Files modified:** `src/lib/newsletter/brevo-sync.ts` (created)
- **Commit:** `2549754`

**2. [Rule 1 - Bug] Test type casts required `as unknown as` double-cast**
- **Found during:** Task 05.06.1 typecheck
- **Issue:** `(await import('@/db')) as { db: { insert: ReturnType<typeof vi.fn> } }` — TypeScript correctly rejects this single cast because the real module type and the mock type don't overlap. This is standard vitest mock type narrowing.
- **Fix:** Changed all 4 mock-module type assertions to `as unknown as { ... }` (the canonical pattern for vitest mocks throughout the codebase).
- **Files modified:** `tests/integration/unsubscribe-route.test.ts`
- **Commit:** `2549754` (included in implementation commit)

## Pre-flight Gate (Manual)

Before the first production newsletter blast, manually inspect raw email headers in Gmail "Show Original" to confirm Brevo's auto-injected `List-Unsubscribe` is overridden by the explicit header set in Plan 05-05's worker (Pitfall 2 / RESEARCH Assumption A1). This gate is documented in 05-VALIDATION.md and Plan 05-11.

## Known Stubs

None. All 3 source files (`route.ts`, `page.tsx`, `brevo-sync.ts`) are complete functional implementations. The e2e spec is scaffolded (not a stub) — full execution requires a live server in Wave 4.

## Threat Flags

No new threat surface beyond what is documented in the plan's `<threat_model>`. All 7 registered threats (T-05-06-01 through T-05-06-07) have mitigations implemented and tested:
- T-05-06-01: HMAC verify (verifyUnsubToken) — the auth gate
- T-05-06-06: D-24 no-email-in-logger — lock-in test enforces this
- T-05-06-07: variantFor() whitelist — arbitrary reason values fall back to success

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/app/api/unsubscribe/route.ts | FOUND |
| src/app/(frontend)/unsubscribed/page.tsx | FOUND |
| src/lib/newsletter/brevo-sync.ts | FOUND |
| tests/integration/unsubscribe-route.test.ts | FOUND |
| tests/e2e/unsubscribe.spec.ts | FOUND |
| Commit 2ba5518 (RED: test file) | FOUND |
| Commit 2549754 (GREEN: route + brevo-sync) | FOUND |
| Commit 483ee13 (GREEN: page + e2e spec) | FOUND |
| 19/19 integration tests passing | PASSED |
| 227/227 full test suite | PASSED |
| TypeScript typecheck | PASSED |
| export const runtime = 'nodejs' | VERIFIED |
| POLICY_VERSION = '2026-04-29' | VERIFIED |
| No auth() call in route | VERIFIED |
| No auth() call in page | VERIFIED |
