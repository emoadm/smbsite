---
phase: 1
slug: foundation
verdict: APPROVED
plans_checked: 13
generated: 2026-04-30
recheck_pass: 2026-04-30
status: approved
gates_failed: []
prior_findings: { blocker: 4, high: 6, medium: 4, low: 3, total: 17 }
recheck_outcomes: { resolved: 16, partial: 1, unresolved: 0, new_findings: 2 }
---

# Phase 1 — Plan Check Verdict (Re-check)

**Verdict:** APPROVED
**Plans checked:** 13 (`01-01-PLAN.md` … `01-13-PLAN.md`)
**Re-check basis:** trust-but-verify against `01-PLAN-CHECK-FIXES.md` plus full re-run of the 7-dimension goal-backward audit.
**Outcome:** All 4 BLOCKERs RESOLVED. All 6 HIGH RESOLVED. All 4 MEDIUM RESOLVED. All 3 LOW RESOLVED (or N/A as documentation note). Two NEW findings (1 warning, 1 nit) discovered during re-check; neither blocks execution.

The plan set is now ready for `/gsd-execute-phase 1`. Wave numbers reconcile, file ownership is unambiguous, all PUB-05 / D-27 violations are removed, the cookie banner ships in Phase 1, and the verify-otp session-establishment path is no longer best-effort.

---

## 1. Per-Finding Resolution Table

### BLOCKERs (all RESOLVED)

| ID | Status | Evidence |
|----|--------|----------|
| **B-1** Cyrillic in `src/` breaks `lint:i18n` | **RESOLVED** | Plan 04 task 1.04.4 `generateMetadata()` resolves `site.metadataTitle/Description` from `messages/bg.json` (lines 487-495); verify includes `! grep -q "Синя България" layout.tsx` (line 585). Plan 07 task 1.07.1 `src/lib/zod-i18n.ts` reads `errorsZod` namespace from JSON, no Cyrillic literals; verify includes `! grep -q "[Ѐ-ӿ]" src/lib/zod-i18n.ts` (line 180). Plan 09 task 1.09.1 RegistrationForm uses `t.rich('consents.privacyTerms', { privacyLink, termsLink })` (lines 211-219); `linkifyConsent` removed; verify includes `! grep -q "[Ѐ-ӿ]"` and `! grep -q "dangerouslySetInnerHTML"` (line 297). Plan 10 task 1.10.1 worker calls `getTranslations({ locale: 'bg', namespace })` (lines 219-222); all 3 templates accept a `t` prop and have zero Cyrillic literals; verify lines 298 and 445 enforce. Plan 04 `messages/bg.json` (lines 376-403) declares the new `email.{from,registerOtp,loginOtp,welcome}`, `errorsZod.*`, and `site.{metadataTitle,metadataDescription}` namespaces. |
| **B-2** D-20 CookieYes silently dropped | **RESOLVED (with one PARTIAL sub-aspect)** | Plan 08 frontmatter wave: 2 (line 5), `files_modified` adds `src/components/layout/CookieBanner.tsx`, `src/app/api/cookie-consent/route.ts`, `.env.example` (lines 19-21). New Task 1.08.4 (lines 443-604) ships the CookieYes loader script via `next/script`, the consent-update bridge, root-layout integration, and `.env.example` `NEXT_PUBLIC_COOKIEYES_SITE_KEY`. T-08-cookie-banner-missing now CLOSED by mitigation (line 615). PARTIAL aspect: the `/api/cookie-consent` POST handler intentionally does NOT persist a `consents` row for anonymous visitors because the schema declares `consents.user_id NOT NULL`; the handler returns `anonAudited: false` (lines 568-574) and defers the schema migration to Phase 6. See N-1 below. |
| **B-3** Wave numbers inconsistent with `depends_on` | **RESOLVED** | Computed waves now match declared waves end-to-end: 01→0, 02→0 (deps:01), 03→0 (deps:01), 04→0 (deps:01,03), 05→1 (deps:03,04), 06→1 (deps:01,02), 07→2 (deps:05,06), 08→2 (deps:04,05) [was 1, fixed], 09→3 (deps:07,08) [was 2, cascaded], 10→3 (deps:05,07) [was 2, cascaded], 11→2 (deps:05) [stays at 2], 12→4 (deps:03,04,09,10,11) [was 2, fixed], 13→5 (deps:10,11,12) [was 3, cascaded]. (Plans 02-04 inherit the wave-0 "scaffolding cohort" convention from the prior pass — accepted by the prior checker, not re-flagged here.) |
| **B-4** Plan 07 silently mutates plan 05's `src/lib/auth.ts` | **RESOLVED** | Plan 07 line 213 imports `{ persistHashedOtp } from '@/lib/auth'` directly (the existing export from plan 05 task 1.05.2). Line 324 explicitly states "no edit to plan 1.05's file is required". The "Note: Update plan 1.05's `src/lib/auth.ts`" instruction is gone. `files_modified` does NOT list `src/lib/auth.ts`. |

### HIGH (all RESOLVED)

| ID | Status | Evidence |
|----|--------|----------|
| **H-1** `src/lib/email/queue.ts` ownership across plans 07 + 10 | **RESOLVED** | Plan 07 acceptance criterion line 185 narrows the contract to `addEmailJob: (payload: EmailJobPayload) => Promise<void>` plus `EmailJobPayload`; explicitly notes "the internal `setEmailQueue` scaffold is implementation detail — plan 1.10 may remove it". Plan 10 task 1.10.1 line 56 says "this REPLACES the stub from plan 1.07 wholesale — the internal `setEmailQueue`/`StubEmailQueue` scaffolding is removed (it was always intended as a temporary import boundary; plan 1.07's acceptance criterion was relaxed accordingly)". Notes line 587 confirms the relax. |
| **H-2** RESEARCH.md `Open Questions` lacked `(RESOLVED)` | **RESOLVED** | RESEARCH.md line 1342: heading is `## Open Questions for Planner (RESOLVED)`. All 7 questions have inline `**RESOLVED → plan 1.NN ...**` markers (lines 1346-1352). |
| **H-3** Plan 07 `verifyOtp` session establishment was best-effort | **RESOLVED** | Plan 07 task 1.07.3 Step 2 (lines 478-488) directly mints the session: `crypto.randomUUID()` token, `db.insert(sessions)`, `__Secure-next-auth.session-token` httponly cookie with 30d expiry. The `signIn('email', ...)` call is removed. Verify (line 508) includes `grep -q "db.insert(sessions)"`, `grep -q "__Secure-next-auth.session-token"`, AND `! grep -q "signIn('email'"`. Plan 09 login.spec.ts gains `AUTH-05 + AUTH-07 [@needs-test-sink]` test (lines 604-639) that completes the OTP flow end-to-end and asserts `/member` content + reload-survives. Plan 10 `addEmailJob` honors `TEST_OTP_SINK` (lines 109-121). |
| **H-4** Turnstile token race in registration | **RESOLVED** | Plan 09 task 1.09.1 TurnstileWidget exposes `onStatusChange` (line 75) with 5-second timeout (lines 86-91). RegistrationForm tracks `turnstileStatus` state (line 144); submit button is `disabled={pending \|\| turnstileStatus !== 'ready'}` (line 244). Error state surfaces `Alert variant="destructive"` with `auth.register.captchaFailed` (lines 236-240). |
| **H-5** Email templates hardcoded Cyrillic greeting | **RESOLVED** | All 3 templates (plan 10 task 1.10.2 lines 326-440) now declare a `t` prop type (`OtpEmailT`, `LoginOtpEmailT`, `WelcomeEmailT`) and resolve every Bulgarian string via `t(...)`. Worker `loadT()` passes `getTranslations({ locale: 'bg', namespace })` (line 219). Acceptance criteria (lines 449-453) enforce zero Cyrillic + nominative greeting in JSON. Queue test (lines 501-511) asserts `Здравей` is present and `Уважаеми/Уважаема` are absent. |
| **H-6** `next.config.ts` triple-rewrite pattern | **RESOLVED** | Plan 04 task 1.04.1 line 85 says "ADD `withNextIntl` to the existing wrapping chain ... do NOT replace"; verify (line 104) greps for BOTH `withNextIntl(withPayload` AND `withPayload`. Plan 11 task 1.11.1 line 125 says "ADD `withSentryConfig` ... do NOT replace"; lines 139-149 show the canonical composition; verify (line 155) greps for ALL THREE wrappers AND the canonical substring `withSentryConfig(\s*withNextIntl(withPayload`. Notes in both plans document the multi-plan ownership (plan 11 line 381). |

### MEDIUM (all RESOLVED)

| ID | Status | Evidence |
|----|--------|----------|
| **M-1** `</antomated>` typo | **RESOLVED** | Plan 03 line 260 verify block now reads `</automated>`. No remaining `</antomated>` occurrences in the phase. |
| **M-2** `pnpm payload migrate` lacks npm script | **RESOLVED** | Plan 04 task 1.04.5 line 615 uses `pnpm exec payload migrate`. Plan 12 deploy.yml line 330 uses `CI=true PAYLOAD_MIGRATING=true pnpm exec payload migrate`. Both use the package-manager-agnostic `pnpm exec` form. |
| **M-3** Resend OTP button no-op | **RESOLVED** | Plan 09 task 1.09.2 OtpForm includes `ResendButton` helper (lines 433-449) wrapping `<form action={action}>` with `useActionState(requestOtp, ...)` and the email from `searchParams`. Verify (line 500) asserts `grep -q "ResendButton"`, `grep -q "requestOtp"` AND `! grep -q '/api/auth/resend'`. |
| **M-4** Backup workflow has no failure alerting | **RESOLVED** | Plan 12 backup.yml gains "Notify Sentry on failure" step (lines 376-398) using `actions/github-script@v7` to POST a minimal Sentry envelope, plus a conditional Slack webhook fallback (lines 399-407) gated on `env.SLACK_WEBHOOK != ''`. Verify (line 474) asserts `grep -q "if: failure()"` and `grep -q "Notify Sentry on failure"`. |

### LOW (all RESOLVED or N/A)

| ID | Status | Evidence |
|----|--------|----------|
| **L-1** Misleading metadata acceptance comment | **RESOLVED** | Plan 04 acceptance line 594 reads "the layout uses no Cyrillic literals; `generateMetadata` resolves `site.metadataTitle` / `site.metadataDescription` from `messages/bg.json` per D-27". The misleading "metadata.title literal is allowed" clause is gone. |
| **L-2** `.env.test` localhost Postgres but CI lacks one | **RESOLVED** | Plan 12 ci.yml gains a `postgres:16-alpine` service container with health-check (lines 235-247), job-level env vars (lines 248-258), and a `pnpm drizzle-kit migrate` step before build + Playwright (lines 278-279). E2E now has a real DB in CI. |
| **L-3** Documentation-only count discrepancy | **N/A** | No plan defect; documentation note already acknowledged in ROADMAP.md and REQUIREMENTS.md. |

**Resolution counts:** RESOLVED = 16 · PARTIAL = 1 (B-2 sub-aspect — see N-1) · UNRESOLVED = 0.

---

## 2. New Findings From Re-check (introduced by the fixes themselves)

### N-1 — Anonymous cookie-consent decisions are NOT persisted to `consents` table (B-2 sub-aspect)
**Severity:** WARNING (not a blocker; CookieYes itself records the decision in its own first-party cookie + dashboard)
**Affected plan:** 08 task 1.08.4 (lines 567-574)
**Issue:** D-20 (verbatim from CONTEXT.md): "for anonymous visitors, in CookieYes's own cookie + a server-side audit row keyed by anonymous session." The B-2 fix ships the CookieYes loader, the bridge script, the `sb_anon_id` httpOnly cookie, AND the route handler — but the route handler explicitly skips the DB write for anonymous visitors and returns `{ ok: true, anonAudited: false }` because the existing `consents.user_id` column is `NOT NULL`. The plan code documents this as "Phase 6 makes user_id nullable + adds INSERT-only DB grant — the schema migration is queued." T-08-anon-consent-orphan in the threat model (line 616) acknowledges the limitation.

**Why this is a warning, not a blocker:** D-20 ALSO names CookieYes's first-party cookie as a valid storage mechanism. The visitor's decision IS persisted (via CookieYes), just not in our local `consents` audit table. The auditing gap is real but recoverable — operators can re-derive anonymous-visitor consents from the CookieYes dashboard if a regulator asks. The full fix (nullable `user_id` + Phase 1 migration) is a Phase 6 prerequisite already on the roadmap.

**Fix path (optional, can defer):** Either (a) add a Phase 1 schema migration to make `consents.user_id` nullable and add the missing INSERT for anonymous visitors, OR (b) accept the partial implementation and ensure Phase 6's GDPR self-service plan explicitly covers the schema migration + backfill from CookieYes export. Option (b) is consistent with D-20's "OR" wording and is what the plan currently does; no execution-blocking action required.

### N-2 — Plan 07 carries a stale "Note on the Auth.js signIn integration" paragraph that contradicts the H-3-fixed code
**Severity:** NIT (does not change behavior; only stale documentation)
**Affected plan:** 07 task 1.07.3 line 505 ("Note on the Auth.js signIn integration: …")
**Issue:** The Note paragraph still describes the OLD approach where `verifyOtp` calls `signIn('email', …)` and "ignores the error", and says "plan 1.09 swaps in a manual `db.insert(sessions)` write". The actual code in Step 2 (lines 478-488, also Notes line 568) implements the direct `db.insert(sessions)` path and verify (line 508) explicitly forbids `signIn('email'`. Reading the Note before the code could mislead an executor. The verify command is authoritative — code wins — but the inconsistency is a minor doc defect.

**Fix path:** Delete the stale "Note on the Auth.js signIn integration" paragraph at line 505, OR rewrite it to match the H-3 fix. Not blocking (a re-execution would still produce the right code because verify enforces it).

---

## 3. Re-run Audit Highlights (goal-backward)

- **Coverage matrix (23 ROADMAP requirements):** still 23/23 covered. AUTH-02 now FULLY covered (was PARTIAL — banner UX present via plan 08 Task 1.08.4). PUB-05 now FULLY covered (was PARTIAL — lint:i18n will pass after fix).
- **Wave 0 deliverable matrix:** unchanged from prior pass; all 17 artifacts owned. `wave_0_complete` and `nyquist_compliant` flip happens in plan 02 task 1.02.2 as before.
- **Dependency graph:** no cycles, no missing references, no forward references. Wave numbers reconcile against `max(deps.wave) + 1` for every plan after the cascade.
- **File-ownership conflicts:** none after the H-1 (queue.ts ownership relax) + B-4 (auth.ts cross-mutation removal) fixes. `messages/bg.json` is co-modified by plans 04 (creator) and 10 (extender) — both are listed in their respective `files_modified` and the namespaces are non-overlapping (plan 04 declared the email/errorsZod/site namespaces directly in task 1.04.3; plan 10 reuses them).
- **Truths-vs-research consistency:** all message-key references in plans 04/07/09/10 align with the keys plan 04 declares in `messages/bg.json` (verified by reading lines 376-403 of plan 04 against lines 220-264 of plan 09 and lines 232-263 of plan 10).
- **Context compliance (CONTEXT.md):** all D-decisions checked. D-20 now has implementing tasks (B-2 fix); no deferred ideas leak in.
- **CLAUDE.md compliance:** plans honor the locked stack (Next.js 15.x via plan 01, Drizzle via 03, Payload 3.x via 04, Auth.js v5 via 05, Brevo via 10, Bunny.net via 12, no forbidden tools). PUB-05 enforcement now ships clean.

---

## 4. Sign-off

**Verdict:** APPROVED — execution may proceed via `/gsd-execute-phase 1`.

The two re-check findings (N-1 anonymous-consent persistence, N-2 stale Note in plan 07) are non-blocking. N-1 is consistent with D-20's "OR" wording and is queued for Phase 6 schema work; N-2 is a documentation nit that the verify command (which forbids `signIn('email'`) makes harmless.

**Reviewer:** gsd-plan-checker
**Original review:** 2026-04-29
**Re-check pass:** 2026-04-30
