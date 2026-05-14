---
phase: quick
plan: 260514-q3u
subsystem: frontend-navigation
status: complete
tags: [header-nav, mobile-hamburger, member-dashboard, i18n, tdd]
requires: []
provides:
  - Q3U-01  # Header: 4 top-level nav links rendered for anon + signed-in
  - Q3U-02  # Header: mobile hamburger drawer; inline desktop nav
  - Q3U-03  # Member dashboard: 2 primary action CTAs
  - Q3U-04  # Member dashboard: 2 secondary "my submissions" cards
  - Q3U-05  # i18n: nav.* + member.welcome.actions.* + member.welcome.cards.my* keys
affects:
  - src/components/layout/Header.tsx
  - src/components/layout/HeaderMobileNav.tsx
  - src/app/(frontend)/member/page.tsx
  - messages/bg.json
tech-stack:
  added: []
  patterns:
    - "P6 (shadcn Button asChild + Link) — applied to all 4 desktop nav buttons, all 4 mobile drawer buttons, both /member primary CTAs"
    - "Server Component preserved (Header reads auth() + getTranslations); only the hamburger toggle is `'use client'`"
    - "RTL afterEach(cleanup) — Vitest globals are off in this project, so RTL does not auto-cleanup; explicit cleanup added to both new test files"
    - "Href-only assertions (no Bulgarian text in tests) — keeps tests resilient to copy edits; PUB-05 source-level linter is the copy-correctness contract"
    - "Mobile drawer renders all links unconditionally with `hidden` attr toggling visibility — SSR + crawlers + no-JS clients discover the surface"
key-files:
  created:
    - src/components/layout/HeaderMobileNav.tsx
    - tests/unit/header-nav.test.tsx
    - tests/unit/member-dashboard-ctas.test.tsx
  modified:
    - src/components/layout/Header.tsx
    - src/app/(frontend)/member/page.tsx
    - messages/bg.json
decisions:
  - "Same 4 public-nav links shown to anon + signed-in users (public surfaces stay public). Reduces session-conditional rendering and keeps the header information architecture flat."
  - "Desktop right-side login Button gets `hidden md:inline-flex` so mobile shows login only inside the hamburger panel (avoids duplicated login affordance on mobile)."
  - "Card grid switched from `lg:grid-cols-4` to `lg:grid-cols-3` so 6 cards form 2 rows of 3 (cleaner than 4+2 partial row)."
  - "Mobile drawer uses the HTML `hidden` attribute instead of conditional mounting so SSR ships all 4 hrefs to crawlers + no-JS clients (politically-motivated public surface must be SEO-discoverable)."
metrics:
  duration: "7.4 min"
  completed_date: "2026-05-14"
  tasks_completed: 2
  files_changed: 6
---

# Quick 260514-q3u: Header nav + Member dashboard CTAs — Summary

Wires 6 orphan surfaces (`/predlozheniya`, `/problemi`, `/member/predlozhi`, `/member/signaliziray`, `/member/predlozheniya`, `/member/signali`) into the global Header and the Member dashboard so anon visitors and signed-in members can discover and use them without typing URLs.

## Files Changed

| File                                      | Status | Lines | Notes                                                                                        |
| ----------------------------------------- | ------ | ----- | -------------------------------------------------------------------------------------------- |
| `src/components/layout/Header.tsx`        | M      | 97    | +desktop `<nav>` inline bar; +mobile hamburger wrapper; auth block keeps right-side position |
| `src/components/layout/HeaderMobileNav.tsx` | A      | 118   | New `'use client'` child — toggle button + absolute drawer panel; Escape + backdrop dismiss  |
| `src/app/(frontend)/member/page.tsx`      | M      | 188   | +Actions section (2 CTAs); card grid extended 4→6; lg:grid-cols-4 → lg:grid-cols-3           |
| `messages/bg.json`                        | M      | 818   | +5 nav.* keys; +1 actions block under member.welcome; +2 cards entries (myProposals/mySignals) |
| `tests/unit/header-nav.test.tsx`          | A      | 162   | 5 RTL tests — anon, signed-in, mobile DOM, aria-expanded toggle, login-when-anon             |
| `tests/unit/member-dashboard-ctas.test.tsx` | A      | 103   | 4 RTL tests — primary CTAs, secondary cards, existing-cards regression-lock, total surface   |

## i18n Keys Added (messages/bg.json)

### `nav.*` block (line 84)

- `nav.proposals = "Предложения"`
- `nav.problems = "Проблеми"`
- `nav.primary = "Основна навигация"` (aria-label for desktop nav)
- `nav.menuOpen = "Отвори менюто"` (mobile toggle aria-label when closed)
- `nav.menuClose = "Затвори менюто"` (mobile toggle aria-label when open)

### `member.welcome.actions.*` block (NEW, line 172)

- `member.welcome.actions.heading = "Действия"`
- `member.welcome.actions.submitProposal.label = "Подай предложение"`
- `member.welcome.actions.submitProposal.description = "Опиши конкретно решение, което смяташ, че коалицията трябва да защити."`
- `member.welcome.actions.reportProblem.label = "Сигнализирай проблем"`
- `member.welcome.actions.reportProblem.description = "Опиши конкретен проблем, който среща бизнесът ти."`

### `member.welcome.cards.*` additions (line 200)

- `member.welcome.cards.myProposals.title = "Моите предложения"`
- `member.welcome.cards.myProposals.body = "Виж статуса на предложенията, които си подал/а."`
- `member.welcome.cards.mySignals.title = "Моите сигнали"`
- `member.welcome.cards.mySignals.body = "Виж статуса на проблемите, които си сигнализирал/а."`

## Tests Added

### `tests/unit/header-nav.test.tsx` — 5 tests, all passing

| #   | Test                                                                         | Status |
| --- | ---------------------------------------------------------------------------- | ------ |
| 1   | Anon Header renders 4 nav hrefs + login link                                 | PASS   |
| 2   | Signed-in Header renders 4 nav hrefs + logout submit button                  | PASS   |
| 3   | HeaderMobileNav has all 4 hrefs in DOM regardless of `open` state            | PASS   |
| 4   | Toggle button `aria-expanded` flips on click                                 | PASS   |
| 5   | Login link appears inside drawer when `isAuthed=false`                       | PASS   |

### `tests/unit/member-dashboard-ctas.test.tsx` — 4 tests, all passing

| #   | Test                                                            | Status |
| --- | --------------------------------------------------------------- | ------ |
| 1   | 2 primary CTAs link to `/member/predlozhi` + `/member/signaliziray` | PASS   |
| 2   | 2 secondary cards link to `/member/predlozheniya` + `/member/signali` | PASS   |
| 3   | Existing 4 cards still link to `/agenda` + `/faq` + `/member/preferences` + `/community` | PASS   |
| 4   | All 4 new hrefs present (aggregate surface check)               | PASS   |

## Commits

| Phase        | Hash       | Subject                                                                  |
| ------------ | ---------- | ------------------------------------------------------------------------ |
| Task 1 RED   | `465ec68`  | test(quick-260514-q3u): add failing Header nav + HeaderMobileNav RTL tests |
| Task 1 GREEN | `de15b54`  | feat(quick-260514-q3u): Header desktop nav + mobile hamburger drawer       |
| Task 2 RED   | `485c7a2`  | test(quick-260514-q3u): add failing /member dashboard CTA + secondary-card tests |
| Task 2 GREEN | `1875cb6`  | feat(quick-260514-q3u): /member dashboard — 2 primary CTAs + 2 new secondary cards |

## Deviations from Plan

### Rule 3 — Fix blocking issues

**1. [Rule 3 — Blocker] Added `afterEach(cleanup)` to both new test files**

- **Found during:** Task 1 GREEN — Test 4 (aria-expanded toggle) failed with "Found multiple elements with the role button" because 4 prior renders accumulated in `document.body`.
- **Root cause:** Vitest is configured without `globals: true` in this project (verified in `vitest.config.mts`). `@testing-library/react` only auto-cleanups when global `afterEach` is available; otherwise the DOM persists across tests within the same file.
- **Fix:** Imported `cleanup` from `@testing-library/react` and added `afterEach(() => cleanup())` to both new test files.
- **Files modified:** `tests/unit/header-nav.test.tsx`, `tests/unit/member-dashboard-ctas.test.tsx`
- **Commits:** rolled into `de15b54` (Task 1 GREEN) and `485c7a2` (Task 2 RED) — visible as part of the test file.

### Note: i18n test resilience (not a deviation, design choice from plan)

Tests assert hrefs only — never label text. The plan recommended this approach explicitly. `scripts/lint-i18n.mjs` (PUB-05) is the source-level contract for copy correctness; duplicating Bulgarian strings into tests would create cross-component coupling.

## Verification Gates — Status

| Gate                                                              | Status                                             |
| ----------------------------------------------------------------- | -------------------------------------------------- |
| `pnpm vitest run tests/unit/header-nav.test.tsx`                  | 5/5 PASS                                           |
| `pnpm vitest run tests/unit/member-dashboard-ctas.test.tsx`       | 4/4 PASS                                           |
| `pnpm tsc --noEmit`                                               | clean                                              |
| `pnpm lint` (next lint)                                           | no new warnings/errors (pre-existing warnings only) |
| `node scripts/lint-i18n.mjs` (PUB-05)                             | `PUB-05 OK: no hardcoded Cyrillic in src/`         |
| `JSON.parse(messages/bg.json)`                                    | valid                                              |
| Regression: `tests/unit/i18n-phase-04-strings.test.ts`            | 7/7 PASS                                           |
| Regression: `tests/unit/community-page.test.ts`                   | 20/20 PASS                                         |
| Regression: `tests/unit/newsletter-i18n.test.ts`                  | 31/31 PASS                                         |

## Deferred / Out-of-Scope

- **Editor admin nav links** — still pending; tracked separately at `.planning/todos/pending/2026-05-14-editor-nav-links-attribution-moderation.md` (`D-EditorNavLinks`). Not in this plan's scope.
- **Operator visual verification (prod)** — pending operator sign-off after Fly redeploys. Anon `/` smoke: 4 nav links + Вход. Mobile `< 768px`: hamburger reveals all 4 + Вход. Signed-in `/member`: 2 prominent action buttons + 6 cards. See plan's `<verification>` step 5.
- **No Bulgarian text labels asserted in tests** — by design (i18n linter handles copy correctness at source level).

## Operator Visual Verification Status

**Pending** — Fly will redeploy on push of these commits to main. Operator should verify on prod:

1. Anon desktop `/` → 4 nav links visible (Програма, Предложения, Проблеми, Въпроси) + Вход.
2. Anon mobile (< 768px) → hamburger icon visible; click reveals panel with 4 links + Вход.
3. Click each → all 4 destinations return 200.
4. Log in as test member → `/member` renders 2 prominent CTAs (Подай предложение, Сигнализирай проблем) above the existing welcome banner cards.
5. Card grid: 6 cards total (Программа, Въпроси, Настройки, Канали, Моите предложения, Моите сигнали).
6. Click each → all destinations load.

## Self-Check: PASSED

- `src/components/layout/Header.tsx` — exists (97 lines)
- `src/components/layout/HeaderMobileNav.tsx` — exists (118 lines)
- `src/app/(frontend)/member/page.tsx` — exists (188 lines)
- `messages/bg.json` — exists, valid JSON (818 lines)
- `tests/unit/header-nav.test.tsx` — exists (162 lines)
- `tests/unit/member-dashboard-ctas.test.tsx` — exists (103 lines)
- All 4 commits exist on branch `worktree-agent-a12ab47c29dbccf59`:
  - `465ec68` (Task 1 RED)
  - `de15b54` (Task 1 GREEN)
  - `485c7a2` (Task 2 RED)
  - `1875cb6` (Task 2 GREEN)
- All 9 unit tests pass (`pnpm vitest run tests/unit/header-nav.test.tsx tests/unit/member-dashboard-ctas.test.tsx` → `Tests 9 passed (9)`).
- `pnpm tsc --noEmit` exits 0.
- `node scripts/lint-i18n.mjs` exits 0 with `PUB-05 OK`.
- No regressions in existing tests (i18n-phase-04-strings, community-page, newsletter-i18n all pass).
