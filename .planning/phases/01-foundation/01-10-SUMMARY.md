---
phase: 1
plan: 10
subsystem: email
tags: [bullmq, upstash, brevo, react-email, worker, queue]
requires: [05, 07]
provides:
  - real-email-queue
  - brevo-rest-client
  - bullmq-worker
  - react-email-templates
  - worker-cli-entry
  - test-otp-sink
affects:
  - package.json
  - src/lib/email/queue.ts
  - src/lib/email/brevo.ts
  - src/lib/email/worker.tsx
  - src/lib/email/templates/OtpEmail.tsx
  - src/lib/email/templates/LoginOtpEmail.tsx
  - src/lib/email/templates/WelcomeEmail.tsx
  - scripts/start-worker.ts
  - tests/unit/queue.test.ts
tech-stack:
  added:
    - bullmq@5.76.4
    - ioredis@5.10.1
    - "@react-email/components@0.1.0"
    - "@react-email/render@1.1.0"
    - tsx@4.19.2 (devDependency)
  patterns:
    - lazy connection + queue init (no Redis touch in dev/test)
    - JSON-direct i18n in worker (decoupled from next-intl request scope)
    - dual-content (html + plainText) Brevo send
    - TEST_OTP_SINK file hook for E2E plaintext-OTP capture
    - Pitfall E enforcement (maxRetriesPerRequest: null + enableReadyCheck: false)
key-files:
  created:
    - src/lib/email/brevo.ts
    - src/lib/email/worker.tsx
    - src/lib/email/templates/OtpEmail.tsx
    - src/lib/email/templates/LoginOtpEmail.tsx
    - src/lib/email/templates/WelcomeEmail.tsx
    - scripts/start-worker.ts
  modified:
    - src/lib/email/queue.ts (replaced 01-07 stub wholesale per H-1)
    - tests/unit/queue.test.ts
    - package.json
key-decisions:
  - "Replaced plan 1.07's stub queue.ts wholesale per H-1: removed StubEmailQueue / setEmailQueue scaffolding; kept addEmailJob + EmailJobPayload + EmailJobKind as the public contract so all callers in plan 1.07 (register, request-otp) continue to work without edits. closeQueue exported for graceful shutdown in tests + scripts."
  - "Worker (src/lib/email/worker.tsx) uses a hand-rolled t() that imports messages/bg.json directly and walks the namespace path with {var} interpolation. The plan example used next-intl's getTranslations({ locale: 'bg', namespace }), but the worker runs as a standalone Node process via `tsx scripts/start-worker.ts`, OUTSIDE Next.js request scope — getTranslations may not resolve cleanly there. Direct JSON import is unambiguous and has zero coupling to Next.js runtime internals. The strings live in the same source of truth (messages/bg.json), so renaming a key still breaks the build the same way."
  - "Worker file extension is .tsx (not .ts) because it imports JSX templates and constructs them inline. Renamed mid-execution after typecheck flagged TS1005 (`<` parsed as comparison in .ts). scripts/start-worker.ts imports `'../src/lib/email/worker'` and the .tsx extension is resolved by tsx and Next's typescript config — no explicit extension needed in the import path."
  - "Brevo client always sends both `htmlContent` and `textContent` (Pitfall J). Plain-text variant produced by `render(component, { plainText: true })` from @react-email/render — same component, two output formats, ensures content parity (no plain-text-only or HTML-only divergence)."
  - "TEST_OTP_SINK is the integration hook plan 1.09's tests/e2e/login.spec.ts (AUTH-05 + AUTH-07) will use to read the plaintext OTP and complete the OTP→session→/member end-to-end flow without a live Brevo send. addEmailJob writes the payload as JSON BEFORE the Redis enqueue path; sink errors are swallowed so the action's primary path is never blocked by IO."
  - "Job retention: removeOnComplete after 24h (with cap of 1000 jobs to prevent memory creep on Upstash free tier), removeOnFail after 7 days (so failed-job diagnostics are available for a week before auto-purge). Documented as T-10-failed-job-pii-retention threat — failed jobs hold OTP plaintext for 7 days; trade-off accepted for retry diagnostics."
  - "Welcome template ships now even though no Phase 1 code path enqueues 'welcome' jobs yet — plan 1.13 deliverability checklist uses it for warm-up volume; post-MVP enhancement may also enqueue it on first /member visit. No behavioral cost to shipping early."
requirements-completed: [AUTH-03, NOTIF-08]
duration: ~25 min
completed: 2026-04-30
---

# Phase 1 Plan 10: Email queue + Brevo worker + React Email templates Summary

The real BullMQ queue replaces the stub from plan 1.07. `bullmq@5.76.4` + `ioredis@5.10.1` connect to Upstash with the exact Pitfall E settings (`maxRetriesPerRequest: null`, `enableReadyCheck: false`, TLS for `rediss://`). The worker process is a separate `tsx scripts/start-worker.ts` executable so plan 1.12 can run it on its own Fly machine. Three React Email templates (registration OTP 48h, login OTP 10min, welcome) accept a `t` prop sourced from `messages/bg.json#email.*` — zero Cyrillic literals in any `.tsx` file (B-1 / D-27 / PUB-05). `addEmailJob` resolves in <200ms when `UPSTASH_REDIS_URL` is unset (D-19 contract preserved through dev/test no-op path).

## What Was Built

**Task 1.10.1 — BullMQ queue + Brevo client + worker (combined commit with Task 1.10.2):**
- `src/lib/email/queue.ts` — Queue<EmailJobPayload> with Pitfall E settings; `addEmailJob` (TEST_OTP_SINK hook + dev no-op + prod-throw guard); `closeQueue` for graceful shutdown.
- `src/lib/email/brevo.ts` — POST `api.brevo.com/v3/smtp/email` with htmlContent + textContent (Pitfall J).
- `src/lib/email/worker.tsx` — Worker<EmailJobPayload> with concurrency 3; `loadT(namespace)` reads messages/bg.json directly (decoupled from Next.js request scope); processor handles all 3 EmailJobKind cases.
- `scripts/start-worker.ts` — tsx entry point with SIGTERM/SIGINT graceful shutdown.

**Task 1.10.2 — React Email templates (combined with Task 1.10.1 commit because worker.tsx imports them):**
- `OtpEmail.tsx` — 48h registration OTP, brand color heading, greetingNamed/greetingAnonymous selection.
- `LoginOtpEmail.tsx` — 10min login OTP, single greeting (always anonymous-style "Здравей!").
- `WelcomeEmail.tsx` — welcome with cta Button; same greeting selection as OtpEmail.

**Task 1.10.3 — queue.test.ts:**
- 6 assertions: <200ms addEmailJob, Pitfall E settings in source, htmlContent + textContent in brevo.ts, nominative greeting + no Уважаеми/Уважаема in messages/bg.json, OtpEmail.tsx Cyrillic-free, worker.tsx covers all 3 EmailJobKind cases.

## Verification

| Check | Result |
|-------|--------|
| `pnpm typecheck` | exits 0 |
| `pnpm lint:i18n` | exits 0 |
| `pnpm test:unit queue` | 6/6 pass |
| bullmq + ioredis + @react-email pinned | confirmed |
| queue.ts has Pitfall E settings + Queue<EmailJobPayload> | confirmed |
| brevo.ts targets api.brevo.com/v3/smtp/email + textContent | confirmed |
| worker.tsx has all 3 case statements + zero Cyrillic | confirmed |
| 3 templates with lang="bg" + zero Cyrillic | confirmed |
| scripts/start-worker.ts + worker package script | confirmed |

## Deviations from Plan

**[Rule 4 → file extension] Worker file is `.tsx`, not `.ts`**
Found during: Task 1.10.1 typecheck
Issue: Plan listed the worker as `src/lib/email/worker.ts`. The file imports JSX templates and constructs them inline (`<OtpEmail {...props} />`), which is invalid in `.ts` (TS1005 cascade). The plan-listed file extension was a transcription error — JSX-using code must be `.tsx`.
Fix: Created the file as `worker.tsx`. Importer (`scripts/start-worker.ts`) does not specify an extension, so resolution still works. SUMMARY's `affects:` list reflects the correct extension.

**[Rule 4 → architectural] `loadT` reads `messages/bg.json` directly instead of `next-intl/server`**
Found during: Task 1.10.1 design
Issue: Plan example used `getTranslations({ locale: 'bg', namespace })` from `next-intl/server`. The worker process runs as a standalone Node process (`tsx scripts/start-worker.ts`), OUTSIDE Next.js request scope. `next-intl/server`'s API expects a request context (or at least the `i18n/request.ts` wired through `createNextIntlPlugin`) and may throw or silently degrade in a non-Next runtime.
Fix: Hand-rolled `loadT(namespace)` walks `messages/bg.json` (imported as a JSON module) by namespace path and replaces `{var}` placeholders. Same source-of-truth (messages/bg.json), no Next.js coupling. Templates still receive a `t(key, vars)` function with the same signature as the plan example, so template `.tsx` files are unchanged.
Plan-side resolution: future revisit if next-intl publishes a runtime-agnostic helper.

**[Rule 5 → minor pragmatic] Tasks 1.10.1 and 1.10.2 committed together**
Reason: `worker.tsx` imports from `templates/*` so an isolated 1.10.1 commit (queue + brevo + worker without templates) would not typecheck. Splitting was not commit-friendly. Combined commit keeps every commit atomic-and-green.

## Self-Check: PASSED

All 3 tasks executed. 6 unit tests pass. Server Actions in plan 1.07 (register, request-otp, verify-otp) now have a real BullMQ-backed queue behind `addEmailJob` — the throw-on-call from plan 1.05's sendVerificationRequest stub is bypassed because we never call signIn('email', ...) (manual session mint via db.insert(sessions) per plan 1.07). Plan 1.09 will read plaintext OTPs through the TEST_OTP_SINK hook for E2E coverage.
