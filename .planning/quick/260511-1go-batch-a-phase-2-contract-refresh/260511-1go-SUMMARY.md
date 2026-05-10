---
quick_id: 260511-1go
slug: batch-a-phase-2-contract-refresh
phase: quick
status: incomplete
status_reason: CI human-verify pending — local typecheck + lint + grep verifications PASS; CI run on PR #2 must confirm the 42/12 → 46/8 Playwright failure delta before this can flip to `complete`.
plan: .planning/quick/260511-1go-batch-a-phase-2-contract-refresh/260511-1go-PLAN.md
commits:
  - 1ccb794 — fix(tests,ci): close Batch A — Phase 2 contract refresh
triage_findings_closed:
  - TRIAGE-260511-15o-#4
  - TRIAGE-260511-15o-#6
  - TRIAGE-260511-15o-#7
  - TRIAGE-260511-15o-#8
files_modified:
  - src/components/layout/Footer.tsx
  - tests/e2e/login.spec.ts
  - tests/e2e/registration.spec.ts
  - tests/e2e/proposals-public.spec.ts
date_completed: 2026-05-11
---

# Quick Task 260511-1go — Batch A: Phase 2 Contract Refresh Summary

One-liner: aligned 4 Phase 1 → Phase 2 contract mismatches in a single atomic commit (one code-bug in Footer + three test-bugs) to drop 4 CI Playwright failures with zero new deps / i18n keys / schema changes.

## Edits Applied

### Edit 1 — `src/components/layout/Footer.tsx:74` (TRIAGE #4 — code-bug)

Dropped `aria-label={brand}` from the Brand `<Link>`. The inner `<Image alt={brand}>` (Footer.tsx:77) already supplies the link's accessible name; the duplicate caused `branding.spec.ts` strict-mode `getByRole('link', { name: 'Синя България' })` to match two elements (Header brand + Footer brand). Header.tsx:21 keeps its `aria-label={brand}` (verified preserved post-edit).

Diff: 1 attribute removed; no other changes in the file. `git diff --stat` shows 2 insertions / 1 deletion (net -1 line) — the surrounding tag was reflowed by the formatter? No — exact single-line replacement; the +1 -1 in stat is the same line.

### Edit 2 — `tests/e2e/login.spec.ts:18-26` AUTH-06 test (TRIAGE #6 — test-bug)

Removed `await expect(page).toHaveURL(/\/register|\/login/);` from the AUTH-06 smoke test and refreshed the inline comment to record the Phase 2 contract. Phase 2 replaced the Phase 1 `/` → `/register|/login` redirect with a real landing page; anonymous visitors stay on `/`. The `page.getByRole('link', { name: 'Вход' })` visibility assertion remains as the logged-out indicator (Header.tsx:46-48 renders `<Link href="/login">{tNav('login')}</Link>` where `tNav('login') === 'Вход'`).

Untouched in the same file: AUTH-04 (still uses `toHaveURL(/\/login|\/auth\/otp/)` — its own contract, distinct from AUTH-06's), AUTH-05, AUTH-05 + AUTH-07 [@needs-test-sink].

### Edit 3 — `tests/e2e/registration.spec.ts:25-34` AUTH-01+AUTH-02 test (TRIAGE #8 — test-bug)

Inserted a source-dropdown picker between the consents-check block and the 3.5s dwell wait:

```ts
await page.getByRole('combobox', { name: /Откъде научихте/i }).click();
await page.getByRole('option', { name: 'QR код в писмо' }).click();
```

Root cause: `self_reported_source` is required in `RegistrationSchema` (`src/app/actions/register.ts:44` — no `.optional()`). The test never picked a value, Zod returned fieldErrors, and the form stayed on `/register` (failing the `toHaveURL(/\/auth\/otp/)` assertion at line 33). Locator pattern mirrors the existing sector/role pickers at lines 20-23 of the same test — no new locator strategy introduced. Bulgarian labels confirmed from `messages/bg.json`: trigger label "Откъде научихте за нас?" at line 43, option "QR код в писмо" at line 45.

Untouched in the same file: AUTH-02 unchecked-consent test (deliberately under-fills) and AUTH-07 smoke test.

### Edit 4 — `tests/e2e/proposals-public.spec.ts:4-13` first test (TRIAGE #7 — test-bug)

Scoped the D-C1 anonymity-audit email regex from `page.content()` (entire DOM) to `page.locator('main').innerHTML()` (proposals region only). False-positive source: Footer.tsx:124 renders `<a href="mailto:contact@example.invalid">{t('contact')}</a>` which matched the `/[a-z0-9]+@[a-z0-9]+\.[a-z]+/i` regex. `(frontend)/layout.tsx` wraps page bodies in `<main>`, so the new selector resolves the same on `/predlozheniya` while excluding Footer/Header.

Untouched in the same file: second test (`canonical byline appears when at least one proposal exists`).

## Verification Results

| Check                                                                       | Status | Notes                                                              |
| --------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------ |
| `! grep -n 'aria-label={brand}' src/components/layout/Footer.tsx`           | PASS   | No match (only Header.tsx:21 retains it, as required)              |
| `grep -n 'aria-label={brand}' src/components/layout/Header.tsx`             | PASS   | Line 21 still has it — Header brand intact                         |
| AUTH-06 `toHaveURL(/\/register\|\/login/)` removed                          | PASS   | `awk '/AUTH-06/,/^  \}\);/'` confirms only `goto('/')` + Вход link |
| `grep -n "name: 'Вход'" tests/e2e/login.spec.ts`                            | PASS   | Line 25 still asserts visibility                                   |
| `grep -n 'Откъде научихте' tests/e2e/registration.spec.ts`                  | PASS   | Line 31                                                            |
| `grep -n 'QR код в писмо' tests/e2e/registration.spec.ts`                   | PASS   | Lines 30 (comment) + 32 (option click)                             |
| `grep -n "locator('main').innerHTML" tests/e2e/proposals-public.spec.ts`    | PASS   | Line 11                                                            |
| `! grep -n 'await page.content()' tests/e2e/proposals-public.spec.ts`       | PASS   | No match                                                           |
| `pnpm typecheck` (`tsc --noEmit`)                                           | PASS   | Clean exit 0                                                       |
| `pnpm lint` (`next lint`)                                                   | PASS   | Clean — only pre-existing warnings (none in our 4 modified files)  |
| `git diff --stat` = 4 files                                                 | PASS   | 4 files / +13 / -7                                                 |
| Playwright targeted run (login + registration + proposals-public + branding) | DEFERRED | Per task instructions: rely on grep + typecheck + lint locally; let CI exercise the specs. |

## Triage Cross-References

All four findings are from `.planning/quick/260511-15o-triage-8-newly-visible-playwright-failur/260511-15o-TRIAGE.md`:

- **#4 — Footer brand strict-mode duplicate** → CODE-bug closed by Edit 1 (`src/components/layout/Footer.tsx:74`).
- **#6 — login AUTH-06 stale Phase 1 redirect** → TEST-bug closed by Edit 2 (`tests/e2e/login.spec.ts:18-26`).
- **#7 — proposals-public anonymity audit false-positive** → TEST-bug closed by Edit 4 (`tests/e2e/proposals-public.spec.ts:4-13`).
- **#8 — registration test missing required source pick** → TEST-bug closed by Edit 3 (`tests/e2e/registration.spec.ts:25-34`).

## Expected CI Delta

After this commit lands on PR #2 and CI runs, the Playwright test counter should move from **42 passing / 12 failing** to **46 passing / 8 failing** (in-scope failures only). The remaining 8 failures (#1, #2, #3, #5) are scoped to:

- **Batch B** (TRIAGE #1 cookieyes-site-key env var + #2 cf-ray Cloudflare bypass header) — separate quick task pending.
- **Batch C** (TRIAGE #3 RegistrationForm `<Label htmlFor="self_reported_other">` — visible vs sr-only decision pending).
- **Batch D** (TRIAGE #5 Cache-Control on /predlozheniya).

This commit must NOT silently mask any of #1, #2, #3, #5 — only #4, #6, #7, #8 are expected to flip green. Any other deltas in the CI run are a regression flag.

## Anti-Scope Confirmation (no out-of-scope changes)

`git diff --stat` against `8a6c9d2` (plan-dispatch commit) shows exactly the 4 files listed in `files_modified`. No edits to: `RegistrationForm.tsx`, `register.ts`, `next.config.ts`, `middleware.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`, `messages/bg.json`, any other spec, or any schema/Server Action. No `.skip` / `.fixme` / new `waitForTimeout` introduced.

## Remaining

1. Push the worktree branch and let CI run on PR #2.
2. Human-verify the CI Playwright delta (42/12 → 46/8) before flipping `status: incomplete` → `status: complete` here.
3. Open follow-up quick tasks for Batches B, C, D against the still-failing triage findings.

## Self-Check: PASSED

- Files modified verified on disk via grep.
- Fix commit `1ccb794` present in `git log`.
- No out-of-scope files touched (`git diff --stat` against `8a6c9d2` shows the 4 expected files only).
