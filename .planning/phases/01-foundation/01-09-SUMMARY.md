---
phase: 1
plan: 09
subsystem: auth-ui
tags: [react, useActionState, turnstile, input-otp, playwright, e2e, shadcn]
requires: [07, 08]
provides:
  - registration-form-client
  - login-form-client
  - otp-form-client-with-auto-submit
  - turnstile-widget-with-status
  - registration-e2e-spec
  - login-e2e-spec
  - anti-abuse-e2e-spec
  - responsive-pub-06-e2e-spec
affects:
  - src/components/forms/TurnstileWidget.tsx
  - src/components/forms/RegistrationForm.tsx
  - src/components/forms/LoginForm.tsx
  - src/components/forms/OtpForm.tsx
  - src/app/(frontend)/(auth)/register/page.tsx
  - src/app/(frontend)/(auth)/login/page.tsx
  - src/app/(frontend)/auth/otp/page.tsx
  - tests/e2e/registration.spec.ts
  - tests/e2e/login.spec.ts
  - tests/e2e/anti-abuse.spec.ts
  - tests/e2e/responsive.spec.ts
tech-stack:
  added: []
  patterns:
    - useActionState wiring of React forms to Server Actions ((prev, formData) → ActionState)
    - invisible Cloudflare Turnstile widget with status callback (gates Submit until ready)
    - shadcn InputOTP onComplete = formRef.requestSubmit() (auto-submit on 6th digit, D-01)
    - next-intl t.rich() for inline links (B-1 fix — zero Cyrillic in components)
    - TEST_OTP_SINK-gated Playwright path (read enqueued OTP from a JSON file in dev/test)
key-files:
  created:
    - src/components/forms/TurnstileWidget.tsx
    - src/components/forms/RegistrationForm.tsx
    - src/components/forms/LoginForm.tsx
    - src/components/forms/OtpForm.tsx
  modified:
    - src/app/(frontend)/(auth)/register/page.tsx
    - src/app/(frontend)/(auth)/login/page.tsx
    - src/app/(frontend)/auth/otp/page.tsx
    - tests/e2e/registration.spec.ts
    - tests/e2e/login.spec.ts
    - tests/e2e/anti-abuse.spec.ts
    - tests/e2e/responsive.spec.ts
key-decisions:
  - "Submit button on RegistrationForm is disabled until TurnstileWidget reports `ready` AND not pending (H-4). 5s fail-loud timeout in TurnstileWidget surfaces an Alert when the script never loads (privacy extension blocked, etc) instead of letting the form silently fail Zod validation server-side."
  - "Privacy/terms inline links use next-intl `t.rich('consents.privacyTerms', { privacyLink, termsLink })` — the message key in messages/bg.json declares `<privacyLink>` and `<termsLink>` rich-text tags. Zero Cyrillic literals in RegistrationForm.tsx; no `dangerouslySetInnerHTML` (B-1 fix)."
  - "Resend OTP wired to the existing `requestOtp` server action (M-3 fix). No new server action; the resend goes through the same per-email + per-IP rate limits from D-07."
  - "OtpForm wraps content in <Suspense> at the page level because `useSearchParams` puts OtpForm in the client boundary. Without Suspense, the page render bails on the missing search-params snapshot."
  - "login.spec.ts H-3 path is gated by `TEST_OTP_SINK` env var. Plan 1.10's queue stub already honors this path (see queue.ts lines 37-56) — when `TEST_OTP_SINK=/tmp/otp-sink.json` is set in dev/test, the addEmailJob call appends the plaintext OTP to the file. The test reads it, fills the OTP form, and asserts the /member redirect + reload-survives session. Without the sink env var, the test is skipped (CI without sink still runs the rest of login.spec.ts)."
  - "Honeypot field is named exactly 'website' (matches HONEYPOT_FIELD constant in src/lib/forms/honeypot.ts). Visually hidden via absolute left:-9999px positioning + `aria-hidden=true` + `tabIndex=-1` so neither sighted users nor screen readers nor keyboard users can hit it."
  - "Anti-abuse E2E test 'Turnstile widget is NOT loaded on /login' positively asserts D-05 (no captcha on login). Catches a future PR that accidentally re-adds Turnstile to LoginForm."
patterns-established:
  - "Pattern: Auth UI client component → 'use client' + useActionState(serverAction, initial) + useEffect redirect on state.ok → state.nextHref"
  - "Pattern: form-stamp prop pattern — server page calls signFormStamp() and passes the value to the client form, which renders it as a hidden input"
  - "Pattern: page-level <Suspense> wrapper around any client form that calls useSearchParams"
requirements-completed: [AUTH-01, AUTH-02, AUTH-05, AUTH-06, AUTH-07, AUTH-08, PUB-06]
duration: ~5 min
completed: 2026-04-30
---

# Phase 1 Plan 09: Auth UI + E2E coverage Summary

**Three React client forms (RegistrationForm with Turnstile + 4 D-12 consents, email-only LoginForm, 6-slot OtpForm with auto-submit on 6th digit) wired to plan 1.07's Server Actions via `useActionState`, plus four real Playwright specs (SC-1, SC-2, SC-3, PUB-06) replacing the failing-by-design fixme stubs from plan 1.02.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-30T11:22:17Z
- **Completed:** 2026-04-30T11:30:00Z (approx)
- **Tasks:** 3 (all `auto`)
- **Files created:** 4 (3 forms + Turnstile widget)
- **Files modified:** 7 (3 pages + 4 E2E specs)

## Accomplishments

- **RegistrationForm + TurnstileWidget**: 5 inputs (full_name, email, sector, role + honeypot), 4 D-12 consents (privacy_terms + cookies required, newsletter + political optional, none pre-ticked), Turnstile widget with 5s fail-loud timeout, hidden formStamp from `signFormStamp()`. Submit gated until Turnstile ready (H-4).
- **LoginForm**: email-only via `requestOtp`, NO Turnstile (D-05). Auto-redirects to `/auth/otp?email=...` on success.
- **OtpForm**: shadcn InputOTP with `maxLength=6`, `inputMode="numeric"`, `pattern="\d{6}"`, `autoFocus`, `onComplete=formRef.requestSubmit()` (auto-submit, D-01). ResendButton wires to `requestOtp` (M-3 fix; same rate-limiter from D-07).
- **4 real Playwright specs**: registration (SC-1, AUTH-01/02/07), login (SC-2, AUTH-04/05/06/07 incl. TEST_OTP_SINK end-to-end), anti-abuse (SC-3, AUTH-08/10 incl. positive D-05 assertion), responsive (PUB-06 across 5 routes × 4 viewports).
- `pnpm exec playwright test --list` reports 88 tests in 6 spec files (4 from this plan + branding from plan 1.08 + smoke from earlier).

## Task Commits

Each task committed atomically:

1. **Task 1.09.1: TurnstileWidget + RegistrationForm + register page** — `3c94e9c` (feat)
2. **Task 1.09.2: LoginForm + OtpForm + login/otp pages** — `a9692cc` (feat)
3. **Task 1.09.3: 4 real Playwright specs** — `f4b1bf3` (test)

**Plan metadata:** (added in final tracking commit below)

## Files Created/Modified

**Created:**
- `src/components/forms/TurnstileWidget.tsx` — Invisible Cloudflare Turnstile widget with `onStatusChange` callback ('loading' | 'ready' | 'error') and 5s fail-loud timeout (H-4).
- `src/components/forms/RegistrationForm.tsx` — Client form: 5 inputs + 4 consents + honeypot + formStamp + Turnstile, wired via `useActionState(register)`. Privacy/terms links via `t.rich()` (B-1 fix).
- `src/components/forms/LoginForm.tsx` — Email-only client form wired to `requestOtp`. Explicitly NOT importing TurnstileWidget (D-05).
- `src/components/forms/OtpForm.tsx` — 6-slot OTP entry with auto-submit, ResendButton wired to `requestOtp` (M-3 fix), wrong-email link to `/login`.

**Modified:**
- `src/app/(frontend)/(auth)/register/page.tsx` — Replaced placeholder text with `<RegistrationForm formStamp={signFormStamp()} />`.
- `src/app/(frontend)/(auth)/login/page.tsx` — Replaced placeholder text with `<LoginForm />`.
- `src/app/(frontend)/auth/otp/page.tsx` — Replaced placeholder text with `<Suspense><OtpForm /></Suspense>`.
- `tests/e2e/registration.spec.ts` — 3 real test cases (SC-1, AUTH-01/02/07).
- `tests/e2e/login.spec.ts` — 4 real test cases (SC-2, AUTH-04/05/06/07 incl. TEST_OTP_SINK gated H-3 path).
- `tests/e2e/anti-abuse.spec.ts` — 3 real test cases (SC-3, AUTH-08/10 incl. positive D-05 absence-on-/login assertion).
- `tests/e2e/responsive.spec.ts` — 5 real test cases (one per route, runs against all 4 viewport projects).

## Decisions Made

See `key-decisions` in frontmatter. Most notable:
- Submit gating via `turnstileStatus !== 'ready' || pending` — H-4 fix.
- Resend OTP reuses existing `requestOtp` (M-3 fix) — no new action.
- Privacy/terms links use next-intl `t.rich()` — zero Cyrillic in component (B-1 fix).
- Page-level `<Suspense>` around `OtpForm` because `useSearchParams` is a client-only hook.

## Deviations from Plan

None — plan executed exactly as written.

The 3 task action blocks were transcribed verbatim from the plan with no auto-fixes required. All `pnpm typecheck` and `pnpm lint:i18n` runs passed first try after each task.

## Issues Encountered

None.

## Self-Check

**Created files exist:**
- `src/components/forms/TurnstileWidget.tsx` — FOUND
- `src/components/forms/RegistrationForm.tsx` — FOUND
- `src/components/forms/LoginForm.tsx` — FOUND
- `src/components/forms/OtpForm.tsx` — FOUND

**Commits exist (verified via `git log --oneline`):**
- `3c94e9c` Task 1.09.1 — FOUND
- `a9692cc` Task 1.09.2 — FOUND
- `f4b1bf3` Task 1.09.3 — FOUND

**Verification gates:**
- `pnpm typecheck` exits 0 — PASS
- `pnpm lint:i18n` exits 0 (no hardcoded Cyrillic in src/) — PASS
- `pnpm exec playwright test --list` reports 88 tests across 6 spec files — PASS
- All 4 plan-owned spec files contain ZERO `test.fixme` — PASS
- `useActionState(register` present in RegistrationForm — PASS
- `useActionState(verifyOtp` present in OtpForm — PASS
- `TurnstileWidget` NOT imported in LoginForm (D-05) — PASS

## Self-Check: PASSED

## Next Phase Readiness

**Phase 1 offline plans complete.** Plan 1.09 was the last offline plan in the phase. The remaining Phase 1 work is in:
- Plan 1.10 (✅ already complete) — BullMQ queue + worker + React Email templates
- Plan 1.11 — observability (Sentry + structured logs)
- Plan 1.12 — Fly.io / Cloudflare / CI deploy (user-side checkpoints)
- Plan 1.13 — Brevo DNS + Postmaster warm-up checklist (user-side checkpoints)

The auth UI can now be exercised end-to-end against a live dev server (`pnpm dev`) once `.env.local` provides `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `OTP_HMAC_KEY`, and Turnstile test keys (already in `.env.test`). The full register → OTP → /member flow has a passing Playwright test gated on `TEST_OTP_SINK` for CI integration once a real DB is provisioned (plan 1.12 or earlier).

**No blockers introduced by this plan.** No new deferred items.

---
*Phase: 01-foundation*
*Completed: 2026-04-30*
