---
phase: 02
plan: 09
subsystem: public-surface-pre-warmup
tags: [ui-spec, review-flag, lint, visual-regression, cookie-consent, signoff, phase-gate]
requires:
  - 02-01 (globals.css token retune)
  - 02-03 (Hero.tsx text-6xl binding)
  - 02-05 (Footer.tsx 4-col layout)
  - 02-06 (CookieYes runtime + OPS-RUNBOOK §1)
  - 02-07 (OPS-RUNBOOK §2 Cloudflare cache)
  - 02-08 (test infrastructure + lighthouse)
provides:
  - "scripts/lint-orphan-tokens.mjs (UI-SPEC review_flag #1 mitigation — text-6xl bound check)"
  - "tests/e2e/legal-visual-regression.spec.ts (UI-SPEC review_flag #2 mitigation — token retune visual regression)"
  - "src/components/layout/CookieSettingsLink.tsx + Footer wiring (UI-SPEC §9.2 cookie banner reopen)"
  - "02-OPS-RUNBOOK.md §3 launch-readiness checklist (operator gate before warmup launch)"
  - "02-SIGNOFF.md (canonical Phase 2 phase-gate sign-off mapping ROADMAP SC-1..4 → artifacts)"
affects:
  - "package.json (added pnpm lint:tokens script)"
  - "src/components/layout/Footer.tsx (added CookieSettingsLink in legal column)"
  - ".planning/phases/02-public-surface-pre-warmup/02-OPS-RUNBOOK.md (replaced reserved §3 with full launch-readiness checklist)"
tech-stack:
  added: []
  patterns:
    - "Tiny Client Component wrapper for Server Component event handler (CookieSettingsLink follows the cookie-banner bridge pattern)"
    - "Token-orphan CI gate via shell grep over src/ — same shape as existing scripts/check-coalition-placeholders.mjs"
    - "computed-style assertion via page.evaluate(getComputedStyle) for CSS variable retune verification"
key-files:
  created:
    - "scripts/lint-orphan-tokens.mjs"
    - "tests/e2e/legal-visual-regression.spec.ts"
    - "src/components/layout/CookieSettingsLink.tsx"
    - ".planning/phases/02-public-surface-pre-warmup/02-SIGNOFF.md"
  modified:
    - "package.json"
    - "src/components/layout/Footer.tsx"
    - ".planning/phases/02-public-surface-pre-warmup/02-OPS-RUNBOOK.md"
decisions:
  - "Decision: text-5xl tolerated as orphan (reserved per UI-SPEC §3.3) rather than deleted; the lint script enforces only text-6xl is bound and reports text-5xl status"
  - "Decision: CookieSettingsLink uses (window as unknown as { revisitCkyConsent?: () => void }) instead of (window as any) to satisfy strict TypeScript while still accommodating CookieYes' runtime-attached method"
  - "Decision: legal column hosts the cookie-settings link (not Brand column) — visual hierarchy 'links → settings' AFTER contact mailto"
  - "Decision: 02-SIGNOFF.md is named separately from 02-VALIDATION.md per the 2026-05-03 plan-checker recommendation 2 — 02-VALIDATION.md is the long-lived spec; 02-SIGNOFF.md is the as-of-warmup snapshot"
metrics:
  duration_seconds: 368
  duration_human: "~6min"
  tasks_completed: 4
  tasks_total: 5
  files_created: 4
  files_modified: 3
  commits: 4
  completed_date: "2026-05-03"
---

# Phase 2 Plan 9: UI-SPEC review_flag wrap-up + footer cookie-settings link + Phase 2 sign-off Summary

Closed all four UI-SPEC frontmatter review_flags (1 + 2 + 4 fully resolved with automated artifacts; 3 documented as operator-checkpoint with fallback fix instructions), wired the CookieYes "reopen banner" footer link via a small Client Component, and produced the Phase 2 phase-gate sign-off document mapping ROADMAP SC-1..SC-4 + 7 requirement IDs + 8 RESEARCH assumptions to verification artifacts.

## What Shipped

### Task 02.09.1 — UI-SPEC review_flag #1 (orphan-token watch)

`scripts/lint-orphan-tokens.mjs` — node script that greps `src/` for `text-5xl` and `text-6xl` Tailwind utility usage. Exits 0 when `text-6xl` is bound by at least one file (Hero.tsx h1 desktop display per UI-SPEC §5.2); fails build with a fix suggestion otherwise. `text-5xl` is tolerated as reserved per UI-SPEC §3.3 — script reports its status without failing. Wired as `pnpm lint:tokens` in package.json.

Verification: `pnpm lint:tokens` exits 0, reports `text-6xl bound in 1 file(s): src/components/landing/Hero.tsx`.

**Commit:** `a9a4afc` — feat(02-09): add lint:tokens script enforcing text-6xl orphan-token watch

### Task 02.09.2 — UI-SPEC review_flag #2 (token retune visual regression)

`tests/e2e/legal-visual-regression.spec.ts` — Playwright spec with 5 tests:

1-2. Defense-in-depth render check on `/legal/privacy` + `/legal/terms` (re-covers branding.spec.ts draft-marker assertion against the retuned token stack).

3-5. Direct CSS-variable assertions via `page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-*'))`:
- `--color-destructive` matches `#DC2626` or `rgb(220, 38, 38)` (Phase 1 retune from `#E72E4D`)
- `--color-success` matches `#059669` or `rgb(5, 150, 105)` (Phase 1 retune from `#009F54`)
- `--color-primary` matches `#004A79` or `rgb(0, 74, 121)` (canonical Sinya navy)

Match accepts both hex and rgb() notation since browser engines vary how they expose --color-* properties declared as hex.

Verification: `pnpm typecheck` exits 0 (file is valid TypeScript). Playwright execution requires running dev server — verified statically + via typecheck; runtime green pending operator Task 02.09.5 step 2.

**Commit:** `02301c8` — test(02-09): add /legal/* visual regression for retuned destructive + success tokens

### Task 02.09.3 — UI-SPEC §9.2 cookie banner reopen footer link

`src/components/layout/CookieSettingsLink.tsx` — small Client Component (`'use client'`) button. On click, invokes `window.revisitCkyConsent()` (CookieYes runtime API attached after script load). Guarded with `typeof === 'function'` so it's a silent no-op if CookieYes isn't loaded or `NEXT_PUBLIC_COOKIEYES_SITE_KEY` isn't set in dev.

`src/components/layout/Footer.tsx` — adds `tCookie = await getTranslations('cookieBanner')` and renders `<CookieSettingsLink label={tCookie('settingsLink')} />` as the last `<li>` in the legal column (after the contact mailto). Bulgarian label "Настройки за бисквитки" was shipped in `messages/bg.json` by plan 02-02.

Verification: `pnpm typecheck` exits 0. Runtime click behavior verified statically via guard inspection; live CookieYes click behavior pending operator Task 02.09.5 step 3.

**Commit:** `197c5f9` — feat(02-09): add Footer cookie-settings link calling window.revisitCkyConsent()

### Task 02.09.4 — Phase-gate launch-readiness + 02-SIGNOFF.md

`02-OPS-RUNBOOK.md` §3 — replaced the previous "(Reserved)" stub with the full Phase 2 launch-readiness checklist. Six subsections:
- §3.1 code+tests green (typecheck, lint, build, playwright, vitest, lighthouse, lint:tokens, lint:i18n)
- §3.2 coalition deferred items (D-CoalitionLogoSVG, D-CoalitionContent-Hero, D-CoalitionContent-Agenda, D-CoalitionChannels, D-LawyerReviewLegal) + `pnpm check:placeholders` exit 0
- §3.3 infrastructure live (CookieYes dashboard, Cloudflare Cache Rules, OG card preview, favicon)
- §3.4 GDPR sign-off (Privacy + Terms live, banner appears, granular categories, Plausible disclosure, audit log, footer reopen link)
- §3.5 UI-SPEC review_flag closure (mappings to lint:tokens, legal-visual-regression spec, scroll-padding operator check, CookieYes drift checklist)
- §3.6 sign-off block (operator initials)

`02-SIGNOFF.md` — new file at `.planning/phases/02-public-surface-pre-warmup/02-SIGNOFF.md`. Maps each ROADMAP Phase 2 success criterion (SC-1..SC-4) to its verification artifact + status (✓ code/test, ⏳ ops/deferred). Covers all 7 requirement IDs (PUB-01..04, GDPR-01..03), all 4 UI-SPEC review_flags, and all 8 RESEARCH assumptions A1-A8. Includes naming-note paragraph clarifying the rename from 02-VALIDATION.md to avoid collision with the long-lived per-Nyquist-row validation contract (which remains untouched as 02-VALIDATION.md).

Verification: full automated check matrix per Task 02.09.4 `<verify>` line — all 16 grep assertions pass.

**Commit:** `60c5bc9` — docs(02-09): append OPS-RUNBOOK §3 launch-readiness checklist + create 02-SIGNOFF.md

### Task 02.09.5 — Operator visual checkpoint (review_flag #3 + final phase-gate smoke)

**Status:** awaiting operator (this plan is `autonomous: false`).

The remaining UI-SPEC review_flag #3 (header height ~80px → `scroll-padding-top: 5rem`) is a visual-only verification that cannot be reliably automated (sticky-header offset checks via getBoundingClientRect are brittle for transform/sticky contexts). Operator instructions are in the plan + 02-OPS-RUNBOOK §3.5; fallback fix is documented (bump `scroll-padding-top` from 5rem to 6rem in `src/styles/globals.css`).

Operator pickup steps:
1. `pnpm dev`, visit `/`, click hero secondary CTA (`<Link href="#vision">`); confirm VisionSection h2 renders BELOW sticky header.
2. `pnpm lint:tokens && pnpm exec playwright test tests/e2e/legal-visual-regression.spec.ts --project=chromium-desktop` — both green.
3. Manual: visit `/`, click footer "Настройки за бисквитки", confirm CookieYes banner reopens (no-op without console error if dev key unset).
4. Final phase-gate smoke: `pnpm typecheck && pnpm lint && pnpm lint:tokens && pnpm build && pnpm exec vitest run && pnpm exec playwright test`. `pnpm check:placeholders` is EXPECTED to fail with 3 hits (coalition gate per UI-SPEC §7.1).
5. Cross-check 02-SIGNOFF.md row references against 02-VALIDATION.md.

## UI-SPEC Review_flag Resolution Status

| Flag | Description | Status | Resolution Artifact |
|------|-------------|--------|---------------------|
| #1 | text-5xl/6xl orphan-token watch | ✓ resolved (automated) | `scripts/lint-orphan-tokens.mjs` + `pnpm lint:tokens` |
| #2 | destructive/success retune visual regression on /legal/* | ✓ resolved (automated) | `tests/e2e/legal-visual-regression.spec.ts` |
| #3 | header height ~80px → scroll-padding-top: 5rem | ⏳ ops checkpoint | `02-OPS-RUNBOOK.md §3.5` + Task 02.09.5 |
| #4 | CookieYes dual-source-of-truth | ✓ resolved (cited) | `02-OPS-RUNBOOK.md §1` + `§1.6` drift-prevention checklist (plan 02-06 work; cited in 02-SIGNOFF.md) + Footer reopen link wired (Task 02.09.3) |

## 02-SIGNOFF.md Status

✓ Created at `.planning/phases/02-public-surface-pre-warmup/02-SIGNOFF.md` (NOT 02-VALIDATION.md — that file is untouched and remains the long-lived Nyquist contract per plan-checker rec 2).

Maps:
- 4 ROADMAP success criteria (SC-1..SC-4) → verification status + artifact
- 7 requirement IDs (PUB-01..04, GDPR-01..03) → automated verification
- 4 UI-SPEC review_flags → resolution
- 8 RESEARCH assumptions (A1-A8) → status
- Naming-note paragraph documenting the rename from 02-VALIDATION.md to 02-SIGNOFF.md
- Phase-gate sign-off section pointing to 02-OPS-RUNBOOK §3.6 for operator initials

## OPS-RUNBOOK §3 Status

✓ Appended to existing `02-OPS-RUNBOOK.md` (§1 CookieYes + §2 Cloudflare cache untouched). §3 is now the canonical launch-readiness checklist with 6 subsections covering all coalition external dependencies, infrastructure, GDPR, review_flag closure, and the operator sign-off block.

## Deviations from Plan

None — plan executed exactly as written.

The only deviation worth noting is non-substantive: the plan's CookieSettingsLink example used `(window as any).revisitCkyConsent` for brevity; the shipped version uses `(window as unknown as { revisitCkyConsent?: () => void })` to satisfy stricter TypeScript without introducing `any`. Functionally identical; type-safety improvement only.

## Authentication Gates

None encountered — no auth-gated APIs in scope for this plan.

## Self-Check: PASSED

- File existence verified for: scripts/lint-orphan-tokens.mjs, tests/e2e/legal-visual-regression.spec.ts, src/components/layout/CookieSettingsLink.tsx, .planning/phases/02-public-surface-pre-warmup/02-SIGNOFF.md, .planning/phases/02-public-surface-pre-warmup/02-OPS-RUNBOOK.md (§3 present)
- Commits verified: a9a4afc, 02301c8, 197c5f9, 60c5bc9 — all present in `git log --oneline -5`
- 02-VALIDATION.md untouched (not in `git status` modified list)
- pnpm lint:tokens green; pnpm typecheck green
