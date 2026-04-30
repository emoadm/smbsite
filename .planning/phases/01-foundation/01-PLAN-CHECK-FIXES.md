---
phase: 1
slug: foundation
fixes_applied: 17
fixes_skipped: 0
generated: 2026-04-29
source: 01-PLAN-CHECK.md
---

# Phase 1 — Plan-Check Fix Changelog

Diff anchor for the re-check. Each row maps a finding ID from `01-PLAN-CHECK.md`
to the concrete change applied and the plan files touched.

## Summary

| Severity | Count | All applied? |
|----------|-------|--------------|
| BLOCKER  | 4     | yes |
| HIGH     | 6     | yes |
| MEDIUM   | 4     | yes |
| LOW      | 3     | yes (L-3 is a documentation note already noted in source files; no plan change required) |
| **Total** | **17** | **yes** |

Wave-number cascade — beyond the explicit B-3 fix, the cascade (per the
operator instruction "scan every other plan's depends_on for impact") forced
plan 09 from 2→3, plan 10 from 2→3, plan 12 from 2→4, plan 13 from 3→5.
Plan 11 stayed at wave 2 because its only dependency (plan 05) is wave 1.

---

## BLOCKERS

### B-1 — Hoist hardcoded Cyrillic out of `src/` into `messages/bg.json`

**Plans touched:** `01-04-PLAN.md`, `01-07-PLAN.md`, `01-09-PLAN.md`, `01-10-PLAN.md`

- Plan 04 `messages/bg.json` gains three new namespaces:
  - `site.metadataTitle` / `site.metadataDescription` (consumed by layout's `generateMetadata`)
  - `errorsZod.{invalidType, invalidEmail, required, tooLong, invalidEnum, custom}` (consumed by plan 07's `src/lib/zod-i18n.ts`)
  - `email.{from, registerOtp, loginOtp, welcome}` with `subject` / `heading` / `greetingNamed` / `greetingAnonymous` / `intro` / `footer` / `body` / `cta` (consumed by plan 10's React Email templates + worker subjects)
- Plan 04 `src/app/(frontend)/layout.tsx` now exports `generateMetadata` that resolves `site.metadataTitle/Description` via `getTranslations('site')`. Acceptance grep enforces `! grep -q "Синя България" layout.tsx`.
- Plan 04 `auth.register.consents.privacyTerms` rewritten to use next-intl rich-text tags `<privacyLink>...</privacyLink>` `<termsLink>...</termsLink>` (replaces bracket notation that forced plan 09 to regex-match Cyrillic).
- Plan 07 `src/lib/zod-i18n.ts` rewritten — Cyrillic `buildZodMessages()` map removed; resolver now reads `messages/bg.json#errorsZod`. Acceptance grep: `! grep -q "[Ѐ-ӿ]" src/lib/zod-i18n.ts`.
- Plan 07 frontmatter `files_modified` now includes `messages/bg.json`.
- Plan 09 `RegistrationForm.tsx` `linkifyConsent()` removed. Privacy/terms inline links rendered via next-intl `t.rich('consents.privacyTerms', { privacyLink, termsLink })`. Acceptance grep: `! grep -q "dangerouslySetInnerHTML"` AND `! grep -q "[Ѐ-ӿ]"`.
- Plan 10 worker subjects + all 3 React Email templates now consume a `t` prop sourced from `messages/bg.json#email.<kind>`. Worker uses `getTranslations({ locale: 'bg', namespace })`. Templates declare `OtpEmailT` / `LoginOtpEmailT` / `WelcomeEmailT` types; props now include `t`. Acceptance grep: `! grep -q "[Ѐ-ӿ]"` for worker.ts AND each template file.
- Plan 10 frontmatter `files_modified` now includes `messages/bg.json`.

### B-2 — CookieYes Bulgarian banner ships in Phase 1 (D-20)

**Plans touched:** `01-08-PLAN.md`

- Removed the "deferred to Phase 2" Notes line for cookie banner; replaced with the Phase-1 commitment.
- Added new **Task 1.08.4** "CookieYes Bulgarian banner + anonymous consent audit endpoint":
  - New file `src/components/layout/CookieBanner.tsx` (client component; loads CookieYes script via `next/script`; bridges `cookieyes_consent_update` event into the audit endpoint).
  - New file `src/app/api/cookie-consent/route.ts` (POST handler — for logged-in users writes 3 INSERT-only `consents` rows; for anonymous visitors sets a 12-month `sb_anon_id` httpOnly cookie).
  - `.env.example` declares `NEXT_PUBLIC_COOKIEYES_SITE_KEY`.
  - Root layout renders `<CookieBanner />` inside `<NextIntlClientProvider>`.
  - Banner copy is sourced from `messages/bg.json#cookieBanner` (already present from plan 04); operator copies it into the CookieYes dashboard during first deploy per OPS-RUNBOOK.
- Plan 08 frontmatter `files_modified` extended with the 4 new paths.
- Plan 08 truths + verification artifacts + threat model rows extended.

### B-3 — Wave-number cascade

**Plans touched:** `01-08-PLAN.md`, `01-09-PLAN.md`, `01-10-PLAN.md`, `01-12-PLAN.md`, `01-13-PLAN.md`

| Plan | depends_on | Old wave | New wave |
|------|------------|----------|----------|
| 08 | [04, 05] | 1 | 2 |
| 09 | [07, 08] | 2 | 3 |
| 10 | [05, 07] | 2 | 3 |
| 12 | [03, 04, 09, 10, 11] | 2 | 4 |
| 13 | [10, 11, 12] | 3 | 5 |

Plan 11 stays at wave 2 (only depends on 05, wave 1). Plan 09/10/12/13 changes are the cascade triggered by 08→2 (per operator instruction — "scan every other plan's depends_on for impact").

### B-4 — Plan 07 no longer mutates plan 05's `src/lib/auth.ts`

**Plans touched:** `01-07-PLAN.md`

- Import in `src/app/actions/register.ts` corrected from `@/lib/auth.helpers` to `@/lib/auth` (matches the real export from plan 05's `src/lib/auth.ts § persistHashedOtp`).
- The "Note: …" block instructing the executor to mutate plan 05's file removed; replaced with a citation pointer to plan 05 § Task 1.05.2 Step 2.
- No `files_modified` entry needed for `src/lib/auth.ts` — plan 07 no longer touches that file.

---

## HIGH

### H-1 — `src/lib/email/queue.ts` ownership across plans 07 + 10

**Plans touched:** `01-07-PLAN.md`, `01-10-PLAN.md`

- Plan 07 acceptance criterion relaxed: now requires `addEmailJob: (payload: EmailJobPayload) => Promise<void>` and the `EmailJobPayload` type only — `setEmailQueue` removed from the contract grep.
- Plan 10 Step 2 explicitly says "this REPLACES the stub from plan 1.07 wholesale — `setEmailQueue`/`StubEmailQueue` removed". Notes section + truths updated.

### H-2 — RESEARCH.md `Open Questions for Planner` lacked `(RESOLVED)` marker

**Files touched:** `01-RESEARCH.md`

- Heading renamed to `## Open Questions for Planner (RESOLVED)`.
- Each of the 7 numbered questions (Q1–Q7) gains an inline `**RESOLVED → plan 1.NN [Task ID]**` marker citing where the answer ships:
  - Q1 → plan 1.01, Q2 → plan 1.13 Task 1.13.1, Q3 → plan 1.04 Task 1.04.4, Q4 → plan 1.13 user_setup#brevo, Q5 → plan 1.12 Task 1.12.3, Q6 → plan 1.11, Q7 → plan 1.05 Tasks 1.05.1 + 1.05.2.

### H-3 — Plan 07 `verifyOtp` session establishment was best-effort

**Plans touched:** `01-07-PLAN.md`, `01-09-PLAN.md`, `01-10-PLAN.md`

- Plan 07 `verify-otp.ts` rewritten to mint the session row directly: `db.insert(sessions)` with `randomUUID()` token + 30-day expires; `__Secure-next-auth.session-token` cookie set via `cookies()` helper. The `signIn('email', ...)` call removed entirely. Acceptance grep enforces `! grep -q "signIn('email'"` AND `grep -q "db.insert(sessions)"` AND `grep -q "__Secure-next-auth.session-token"`.
- Plan 09 `tests/e2e/login.spec.ts` gains a new `AUTH-05 + AUTH-07 [@needs-test-sink]` test that registers, reads the OTP from the test sink, submits it, and asserts both `/member` content visible AND session-survives-refresh. Skipped automatically when `TEST_OTP_SINK` env is unset.
- Plan 10 `addEmailJob` honors `TEST_OTP_SINK`: when set in dev/test, appends every payload to the named JSON file before delegating to BullMQ. This is the mechanism plan 09's H-3 test reads.

### H-4 — Turnstile token race in registration

**Plans touched:** `01-09-PLAN.md`

- `TurnstileWidget` exposes `onStatusChange?: (s: 'loading'|'ready'|'error') => void`; reports `ready` on Cloudflare callback, `error` on script-load timeout (5s) or error-callback.
- `RegistrationForm.tsx` tracks `turnstileStatus` state; submit button disabled until `turnstileStatus === 'ready'`. When status === `'error'`, surfaces an `Alert variant="destructive"` rendering `auth.register.captchaFailed`.

### H-5 — Email templates hardcoded Cyrillic greeting

**Plans touched:** `01-10-PLAN.md` (covered by B-1 for the literal hoist; H-5 specifically is the architectural pattern)

- All three templates now accept a `t` function prop and resolve every Bulgarian string through it. `nominative greeting` constraint enforced at the JSON level: `messages/bg.json#email.registerOtp.greetingNamed` is "Здравей, {firstName}!". Plan 10's queue test now grep-asserts the JSON greeting is "Здравей" (not vocative) AND that the template `.tsx` files contain zero Cyrillic literals.

### H-6 — `next.config.ts` triple-rewrite pattern

**Plans touched:** `01-04-PLAN.md`, `01-11-PLAN.md`

- Plans 04 and 11 now say "ADD `withNextIntl` / `withSentryConfig` to the existing wrapping chain" (not REPLACE).
- Plan 11's verify command asserts ALL three wrappers present AND the canonical composition substring `withSentryConfig(withNextIntl(withPayload`.
- Plan 04's verify command asserts BOTH `withPayload` AND `withNextIntl` are present.
- Notes in both plans document the multi-plan ownership and the order-sensitive composition.

---

## MEDIUM

### M-1 — `</antomated>` typo in plan 03

**Plans touched:** `01-03-PLAN.md`

- Replaced `</antomated>` → `</automated>` (single occurrence at task 1.03.2).

### M-2 — `pnpm payload migrate` invoked without npm script alias

**Plans touched:** `01-04-PLAN.md`, `01-12-PLAN.md`

- Both plans switched to `pnpm exec payload migrate` (the package-manager-agnostic form that resolves `node_modules/.bin/payload` directly).

### M-3 — Resend OTP button was a no-op

**Plans touched:** `01-09-PLAN.md`

- `OtpForm.tsx` includes a `ResendButton` helper that wraps a `<form action={requestOtpAction}>` posting the email from `searchParams`. Reuses plan 07's existing `requestOtp` server action (no new action shipped). Subject to the same login-OTP rate limits per D-07.
- Notes section + acceptance criteria updated; the placeholder `formAction="/api/auth/resend"` no-op removed.

### M-4 — Backup workflow had no failure alerting

**Plans touched:** `01-12-PLAN.md`

- `backup.yml` gains two `if: failure()` steps:
  - "Notify Sentry on failure" — POSTs a minimal Sentry envelope with the failed run URL using `actions/github-script@v7` (no `@sentry/node` dependency).
  - "Notify Slack on failure (optional)" — `curl`-posts to `SLACK_WEBHOOK` if the secret is set.
- Acceptance criteria and verify command updated.

---

## LOW

### L-1 — Plan 04 acceptance criterion misleading about `metadata.title`

**Plans touched:** `01-04-PLAN.md`

- Removed the "metadata.title literal is allowed because it's not user-facing UI" clause (it IS user-facing — rendered as `<title>` and shared in social previews). Replaced with the explicit i18n source-of-truth statement after the B-1 hoist.

### L-2 — `.env.test` references localhost Postgres but CI lacks one

**Plans touched:** `01-12-PLAN.md`

- `ci.yml` adds a `postgres:16-alpine` service container with health-check, sets all required env vars at the job level (`DATABASE_URL` / `DIRECT_URL` / `PAYLOAD_DATABASE_URL` / Auth + Turnstile test keys), and runs `pnpm drizzle-kit migrate` before the build + Playwright steps. E2E specs that depend on a real DB now have one.

### L-3 — REQUIREMENTS.md count discrepancy (87 vs 81)

**Plans touched:** none

- Documentation note only — already acknowledged in `ROADMAP.md` and `REQUIREMENTS.md`. Phase 1 plans use the corrected in-scope count of 23. No plan defect to fix.

---

## Sanity checks performed after the fixes

- All 13 PLAN.md files still parse as valid Markdown with intact frontmatter.
- `messages/bg.json` block in plan 04 parses as valid JSON; namespaces present: `auth, cookieBanner, destructive, email, error, errorsZod, footer, legal, member, nav, site`.
- All wave numbers reconcile against `depends_on` (max wave of any dep + 1).
- No same-wave plan pair has `files_modified` overlap (plans 09 and 10 both wave 3 but touch disjoint paths; plan 11 wave 2 is also disjoint from plan 07/08 wave 2).
- All 17 acceptance criteria changes are accompanied by matching `<verify>` grep updates.
- B-4 elimination verified: `! grep "@/lib/auth.helpers" 01-07-PLAN.md` passes.

## Files touched

- `01-03-PLAN.md` (M-1)
- `01-04-PLAN.md` (B-1, L-1, H-6 propagation, M-2 propagation)
- `01-07-PLAN.md` (B-1, B-4, H-1, H-3)
- `01-08-PLAN.md` (B-2, B-3)
- `01-09-PLAN.md` (B-1, B-3, H-3 E2E coverage, H-4, M-3)
- `01-10-PLAN.md` (B-1, B-3, H-1, H-3 hook, H-5)
- `01-11-PLAN.md` (B-3 stays-at-2, H-6)
- `01-12-PLAN.md` (B-3, M-2, M-4, L-2)
- `01-13-PLAN.md` (B-3)
- `01-RESEARCH.md` (H-2)

`01-VALIDATION.md`, `01-CONTEXT.md`, `01-UI-SPEC.md`, `01-PATTERNS.md`, plans 01/02/05/06 — untouched (no findings against them).
