---
phase: quick-260502-vau
plan: 01
subsystem: auth/anti-abuse
tags: [auth-08, turnstile, ci, ssr, playwright, d-ci-app-failures-cause-4]
requires: []
provides:
  - turnstile_api_js_in_initial_ssr_html
  - turnstile_widget_window_polling_pattern
affects:
  - src/app/(frontend)/(auth)/register/page.tsx
  - src/components/forms/TurnstileWidget.tsx
tech-stack:
  added: []
  patterns:
    - "Raw <script async defer> in Server Component for third-party JS that must be present in initial SSR HTML (bypasses next/script afterInteractive injection)"
    - "Client-side window.turnstile polling (100ms interval, 120 attempt cap) instead of next/script onReady wiring"
key-files:
  created: []
  modified:
    - src/app/(frontend)/(auth)/register/page.tsx
    - src/components/forms/TurnstileWidget.tsx
decisions:
  - "Place Turnstile <script> in /register page (not in (auth)/layout.tsx or root layout) — preserves AUTH-08 negative spec asserting /login has 0 challenges.cloudflare.com scripts"
  - "Poll window.turnstile every 100ms instead of using ?onload= callback (no global function leak; works under HMR remounts)"
  - "12s poll cap matches existing 12s fail-loud timeout effect — keeps single source of truth for the failure deadline"
metrics:
  duration: "~4 min"
  completed: "2026-05-02T19:40:35Z"
  tasks_total: 3
  tasks_completed: 3
  files_modified: 2
  commits: 2
---

# Quick Task 260502-vau: AUTH-08 Turnstile SSR Fix Summary

**One-liner:** Render Cloudflare Turnstile `api.js` as a raw SSR `<script>` tag in the `/register` Server Component instead of via `next/script` `afterInteractive`, eliminating the post-hydration injection race that caused AUTH-08 to fail on first Playwright attempt.

## What Changed

### 1. `src/app/(frontend)/(auth)/register/page.tsx` (commit `089bb7b`)

The Server Component now wraps `MainContainer` in a fragment and emits a literal `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer />` as its first child. Because the page is an `async function` Server Component, this tag ships verbatim in the initial SSR HTML response — Playwright's `page.locator('script[src*="challenges.cloudflare.com"]').count()` at `goto`-completion now sees count=1 deterministically (previously next/script injected the tag after hydration, racing the assertion).

The script is intentionally NOT placed in `(auth)/layout.tsx` or the root layout: the AUTH-08 negative spec (`anti-abuse.spec.ts:31`) asserts `/login` contains zero `challenges.cloudflare.com` scripts, and that asymmetry is preserved. A long inline comment in the page documents both the placement rationale and the link back to `.planning/debug/d-ci-app-failures.md` Cause 4.

### 2. `src/components/forms/TurnstileWidget.tsx` (commit `489aed9`)

Removed the `import Script from 'next/script'` and the `<Script ... onReady={renderWidget} onError={...} />` JSX. The widget now returns a single `<div ref={ref} />` and relies on a new `useEffect` that polls `window.turnstile` every 100ms (cap 120 attempts = 12s) until the global is defined, then calls `renderWidget()` and clears the interval. Existing behaviour preserved verbatim:

- `TurnstileStatus` type export and `onStatusChange` prop (RegistrationForm consumes both)
- `renderWidget()` defensive sitekey-missing branch + `appearance: 'interaction-only'`
- `callback` → `setStatus('ready')`, `error-callback` → `setStatus('error')`, `expired-callback` → `setStatus('loading')`
- Cached-script fast path (the line-70 mount effect)
- 12s fail-loud timeout effect (unchanged duration; the new polling cap matches it)

The doc comment was rewritten to point readers at the parent Server Component as the api.js source and to cross-reference `.planning/debug/d-ci-app-failures.md` Cause 4.

## Verification

```bash
pnpm exec playwright test tests/e2e/anti-abuse.spec.ts --project=chromium-desktop --reporter=list --retries=0
```

Result:
```
Running 3 tests using 1 worker
  ✓  1 [chromium-desktop] › anti-abuse.spec.ts:5:7 › SC-3 Anti-abuse › AUTH-10: disposable email rejection surfaces auth.register.invalidEmail message (5.8s)
  ✓  2 [chromium-desktop] › anti-abuse.spec.ts:25:7 › SC-3 Anti-abuse › AUTH-08: Turnstile widget script is loaded on /register (518ms)
  ✓  3 [chromium-desktop] › anti-abuse.spec.ts:31:7 › SC-3 Anti-abuse › AUTH-08: Turnstile widget is NOT loaded on /login (D-05) (937ms)

  3 passed (18.4s)
```

All 3 anti-abuse specs green on first attempt under `--retries=0`. AUTH-10 still passes (Turnstile widget still resolves to `'ready'` so the submit handler fires); AUTH-08 positive passes (script present on `/register`); AUTH-08 negative passes (script absent on `/login`).

`pnpm typecheck` is clean for both modified files.

## Deviations from Plan

None — plan executed exactly as written. Tasks 1, 2, and 3 each completed on first attempt with the patches specified by the plan.

## Resolves

This patch resolves **Cause 4** of `.planning/debug/d-ci-app-failures.md` (the `next/script` `afterInteractive` Turnstile race against AUTH-08). Causes 1, 2, and 3 of that debug bundle remain tracked separately and are addressed in sibling fix branches; this commit makes no claim about them.

## Hand-off

The orchestrator handles:
- Final docs commit including this `SUMMARY.md` plus `.planning/STATE.md`
- Status flip in `.planning/debug/d-ci-app-failures.md` for Cause 4
- Quick-task table row in `.planning/STATE.md` "Quick Tasks Completed"
- Any merge of `worktree-agent-a55948da6c38e75aa` back to `main`

## Self-Check

Verifying claims:

- File `src/app/(frontend)/(auth)/register/page.tsx`: FOUND, contains `challenges.cloudflare.com/turnstile/v0/api.js` (1 match)
- File `src/components/forms/TurnstileWidget.tsx`: FOUND, contains 0 occurrences of `from 'next/script'` or `<Script `, contains 5 occurrences of `window.turnstile`
- Commit `089bb7b`: FOUND in `git log`
- Commit `489aed9`: FOUND in `git log`
- Playwright run: 3 passed, 0 failed, 0 skipped, 0 retries used

## Self-Check: PASSED
