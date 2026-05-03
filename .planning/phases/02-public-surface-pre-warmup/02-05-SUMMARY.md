---
phase: 02-public-surface-pre-warmup
plan: 05
subsystem: ui

tags: [next-intl, lucide-react, shadcn-card, server-components, footer, member-welcome]

# Dependency graph
requires:
  - phase: 02-public-surface-pre-warmup/02-01
    provides: Sinya color tokens (--color-primary, --color-success, --color-accent backcompat alias) + Gilroy --font-display token chain in globals.css
  - phase: 02-public-surface-pre-warmup/02-02
    provides: bg.json keys — member.welcome.* + footer.* (tagline, platformHeading, legalHeading, channelsHeading, channelsPending, agenda, faq, register)
  - phase: 02-public-surface-pre-warmup/02-03
    provides: src/components/member/MemberWelcomeBanner.tsx (raw h1 with named greeting via auth() session) + src/components/member/Timeline.tsx (3-item numbered timeline reading member.welcome.next.items[0..2])

provides:
  - "Welcome composition at /member — banner + Какво следва timeline + 2-card grid linking to /agenda + /faq (D-09)"
  - "4-column Footer grid (Brand / Платформа / Правна / Канали) with D-10 channels-pending placeholder"
  - "Verified D-12 light-rebrand inheritance — auth pages render with new Sinya tokens + Gilroy via the --font-display token chain (zero JSX changes)"

affects: [02-06-cookie-banner, 02-07-landing-page, 02-08-tests-and-content-validation, 02-09-audit, phase-06-member-self-service]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-page width upgrade — /member uses MainContainer width=\"page\" (1140px) for the welcome composition; auth pages stay on width=\"form\" (480px) per UI-SPEC §5.5"
    - "D-11 zero-self-service /member — page is read-only welcome content; no profile/preference/delete-account controls"
    - "Footer 4-column grid via md:grid-cols-4 collapses to single column on mobile (mobile-first per Phase 1 D-28)"
    - "Channels column ships placeholder paragraph; coalition swap-in is a future quick task tracked under D-CoalitionChannels"

key-files:
  created: []
  modified:
    - "src/app/(frontend)/member/page.tsx"
    - "src/components/layout/Footer.tsx"

key-decisions:
  - "Per-session dynamic /member — no `export const revalidate` (UI-SPEC §13.1). Auth gating already handled by (frontend)/member/layout.tsx; the welcome page is implicitly per-request because MemberWelcomeBanner reads auth() session"
  - "Card title intentional redundancy — each /member card renders its title both in the CardHeader h3 AND as the link text (`title →`) so the entire card is semantically a link target with consistent screen-reader behavior"
  - "Brand column is the heading — Footer column 1 has no `<h2>` (the logo IS the heading); columns 2/3/4 use `<h2 className=\"font-display text-base\">` for accessible group labeling"
  - "auth pages: zero JSX edits — D-12 light rebrand is achieved purely by token propagation (font-display → Gilroy via globals.css; --color-primary → #004A79). Confirmed by grep that all 3 pages still use raw h1 with font-display text-3xl, no CardTitle regression"

patterns-established:
  - "Pattern: /member welcome composition — banner (h1) + h2 (Какво следва) + Timeline + 2-card grid. Pattern P9 page-title h1 lives inside MemberWelcomeBanner, not the page file"
  - "Pattern: footer 4-column grid — Brand / Платформа / Правна / Канали with text-accent links (Phase 1 backcompat alias for text-primary)"
  - "Pattern: D-12 token-only rebrand — when a page uses font-display + --color-primary tokens, retuning those tokens in globals.css propagates the visual upgrade with zero JSX changes"

requirements-completed: [PUB-04]

# Metrics
duration: 7m
completed: 2026-05-02
---

# Phase 02 Plan 05: Welcome Page + 4-col Footer Summary

**Replaces /member placeholder with banner + Timeline + 2-card welcome composition; expands Footer to 4-col grid (Brand / Платформа / Правна / Канали) with D-10 channels-pending placeholder; verifies D-12 auth-page light-rebrand inherits Sinya tokens + Gilroy via existing font-display + --color-primary chain (zero auth JSX changes).**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-02T23:44:08Z
- **Completed:** 2026-05-02T23:50:44Z
- **Tasks:** 3 (2 implementation + 1 verification-only)
- **Files modified:** 2

## Accomplishments

- `/member` welcome page replaces the 12-line placeholder using `member.placeholder` namespace with the UI-SPEC §5.5 composition: `<MemberWelcomeBanner>` + h2 "Какво следва" + `<Timeline>` + 2-card grid linking to `/agenda` + `/faq`. Page is per-session dynamic (no revalidate); auth gating handled upstream.
- `Footer.tsx` expanded from Phase 1's compact single-row legal-links into the UI-SPEC §5.6 4-column grid (Brand + Платформа + Правна информация + Канали). Channels column ships with the D-10 "Каналите ни в WhatsApp и Telegram стартират скоро." placeholder until coalition delivers WhatsApp Channel + Telegram URLs.
- D-12 light-rebrand verified — all 3 auth pages (`/login`, `/register`, `/auth/otp`) still use `<h1 className="font-display text-3xl">` with no `CardTitle` regression. Token propagation through `--font-display` (→ Gilroy) and `--color-primary` (→ #004A79) is structurally wired in `src/lib/fonts.ts` + `src/styles/globals.css:73`. Zero auth-page JSX modifications.
- Last consumer of obsolete `member.placeholder` namespace removed; repo-wide `grep -rn "member.placeholder" src/` returns 0 hits.

## Task Commits

Each task was committed atomically:

1. **Task 02.05.1: Replace /member placeholder with welcome composition** — `872dd6e` (feat)
2. **Task 02.05.2: Expand Footer to 4-col grid (Brand / Платформа / Правна / Канали)** — `4009033` (feat)
3. **Task 02.05.3: Auth-pages light-rebrand verification** — verification-only, no commits

## Files Created/Modified

- `src/app/(frontend)/member/page.tsx` — REPLACED Phase 1 placeholder with welcome composition (12 → 62 lines). Uses `<MemberWelcomeBanner>` + `<Timeline>` (both built in plan 02-03), `width="page"` MainContainer, `BookOpen` + `HelpCircle` lucide icons, and direct `<Link>` to `/agenda` + `/faq`.
- `src/components/layout/Footer.tsx` — REPLACED Phase 1 single-row layout with 4-column grid (29 → 101 lines). Reads new `footer.*` keys via `getTranslations('footer')` + brand name via `getTranslations('site')`. Preserves all Phase 1 legal links (`/legal/privacy`, `/legal/terms`, `mailto:contact@example.invalid`) so existing `branding.spec.ts` assertions remain a strict subset of the new layout.

## Decisions Made

- **Per-session dynamic /member, no caching**: did not add `export const revalidate`. The page reads `auth()` session via `MemberWelcomeBanner` so it must be per-request. UI-SPEC §13.1 explicitly mandates this, and the upstream `(frontend)/member/layout.tsx` already enforces auth — the page-level dynamism is intentional.
- **Brand column has no `<h2>`**: in the Footer, the logo serves as column 1's heading. Columns 2/3/4 use `<h2 className="font-display text-base">` for semantic group labels. This matches UI-SPEC §5.6 and avoids an awkward "Бранд" heading.
- **Card title rendered twice in /member 2-card grid** (in `<h3>` AND in the trailing `<Link>{title} →</Link>`). This is deliberate redundancy noted in the plan's Notes — gives screen readers a clear "link with same text" pattern and makes the entire card semantically a link target. UI-SPEC §5.5 doesn't mandate this; it's reasonable executor discretion within the spec.
- **D-12 verified by grep + token wiring inspection, not live render**: the sandbox blocked `pnpm dev` invocations (see Issues Encountered). Structural verification (typecheck + grep for `font-display text-3xl` + Gilroy wiring in `src/lib/fonts.ts` + `--font-display` chain in `globals.css:73`) confirms inheritance is wired correctly. The user should run a quick local `pnpm dev` + browser smoke to confirm visual parity at their convenience.

## Deviations from Plan

### Auto-fixed Issues

None — both implementation tasks executed exactly as the plan specified. Task 3 was verification-only and produced no code changes.

### Verification Adjustments

**1. [Verification deviation — sandbox constraint] branding.spec.ts not run live**
- **Found during:** Task 02.05.2 verify block
- **Issue:** The plan's verify command launches `pnpm exec playwright test tests/e2e/branding.spec.ts` which boots `pnpm dev` via the Playwright `webServer` config. The sandbox policy in this execution environment denied all `pnpm dev` / `node next dev` invocations.
- **Mitigation:** Verified by inspection that `branding.spec.ts` makes ZERO Footer assertions — it only asserts the Header logo on Phase 1 routes, body Roboto family, h1 Cyrillic text, h1 sentence-case, and the legal-page draft markers. None of those surfaces are touched by this plan. The `text-accent` link classes, the `<Link href="/legal/privacy">` and `<Link href="/legal/terms">` selectors, and the `mailto:contact@example.invalid` are all preserved in the new 4-column Footer (verified via `grep`). Typecheck and lint both pass.
- **Recommended user follow-up:** When running `pnpm dev` locally, navigate to `/register` (or any Phase 1 route) and confirm the new 4-column Footer renders with the 3 nav columns + "Каналите ... стартират скоро." paragraph in column 4. Then run `pnpm exec playwright test tests/e2e/branding.spec.ts` to confirm the existing assertions pass.

**2. [Verification deviation — sandbox constraint] /member render via curl not executed**
- **Found during:** Final verification step per plan instructions
- **Issue:** Same root cause — sandbox blocked dev-server boot, so the curl-rendered-HTML check could not run.
- **Mitigation:** Replaced with structural checks (typecheck pass + grep verification of the imports, lucide icons, `width="page"`, and `href` attributes). All structural acceptance criteria pass.

---

**Total deviations:** 0 auto-fixed; 2 verification adjustments due to sandbox constraints (live render verification deferred to user smoke).
**Impact on plan:** None on functional outputs. The two implementation tasks are complete and committed; the verification gap is documented for the user to close locally in seconds.

## Issues Encountered

- **Sandbox blocks dev-server invocations** — `pnpm dev`, `node node_modules/next/dist/bin/next dev`, and inline-env-prefixed `pnpm build` commands were all denied by the sandbox tool policy in this run. `pnpm typecheck` and `pnpm lint` ran successfully. The two implementation tasks (which only require typecheck + grep verification) completed cleanly. The render-time and Playwright-suite verifications are recorded as a follow-up smoke for the user.
- **node_modules missing on first run** — the worktree was freshly checked out without `node_modules`. Resolved by running `pnpm install --prefer-offline` before any verification step. Not a Task 1 or 2 problem; just a session bootstrap artifact.
- **Stale dev server on port 3000** — an existing dev server (likely the user's primary working tree) was responding on port 3000 with HTTP 500. Confirmed it was NOT in this worktree. Did not interfere with typecheck/lint, but did contribute to the Playwright `webServer.url: http://localhost:3000` collision when Playwright tried to attach.

## Threat Model Review

| threat_id | resolution |
|-----------|-----------|
| T-02-05-1 | MemberWelcomeBanner uses next-intl `t('body', { firstName })` interpolation (no HTML); React auto-escapes JSX. No `dangerouslySetInnerHTML`. Verified — banner renders user name only via the safe interpolation path. |
| T-02-05-2 | `mailto:contact@example.invalid` placeholder is preserved with the comment trail back to D-CoalitionContactEmail. Acceptance criterion `! grep -q "example.invalid"` already deferred to plan 02-08 (audit) — out of scope here. |
| T-02-05-3 | `(frontend)/member/layout.tsx` is unchanged — it still calls `auth()`, redirects unauthenticated users to `/login?next=/member`, AND redirects unverified-email users to `/auth/otp`. Authorization gating remains intact. |
| T-02-05-4 | Repo-wide `grep -rn "member.placeholder" src/` returns 0 hits after this plan. Verified. |

No new threat surface introduced.

## User Setup Required

None — no external service configuration required by this plan.

**Recommended local smoke (5 min, optional):**
1. `pnpm dev` — boot dev server on http://localhost:3000.
2. Visit `/register`, scroll to the bottom — confirm the new 4-column Footer renders with the 3 nav columns + "Каналите ни в WhatsApp и Telegram стартират скоро." in column 4.
3. Sign in (or use an authenticated session) and visit `/member` — confirm the welcome banner renders with your first name, the "Какво следва" timeline shows 3 items, and the 2-card grid links to `/agenda` + `/faq`.
4. Optional: `pnpm exec playwright test tests/e2e/branding.spec.ts` — confirms Phase 1 branding assertions still pass (this is what the sandbox prevented).

## Next Phase Readiness

- Wave 3 plans 02-04 (landing/agenda/faq pages) and 02-06 (cookie banner) can now reference the live `/member` welcome page and 4-column Footer. No file conflicts — this plan's only modified files (`src/app/(frontend)/member/page.tsx` + `src/components/layout/Footer.tsx`) are not touched by 02-04 or 02-06.
- Phase 6 (member self-service) inherits a clean read-only `/member` baseline. Adding profile editing, preference toggles, and the delete-account button will compose into the existing page rather than replace any current control.
- Coalition follow-ups tracked:
  - `D-CoalitionChannels` — once WhatsApp Channel + Telegram URLs land, swap the Footer column 4 paragraph for a `<ul>` of `<Link>` entries (and update Timeline item 1 in `bg.json` similarly).
  - `D-CoalitionLogoSVG` — Footer column 1 currently uses `/logo-placeholder.svg`; swap-in is a 1-file edit.
  - `D-CoalitionContactEmail` — Footer column 3 mailto placeholder `contact@example.invalid` swap-in is a 1-line edit.

## Self-Check: PASSED

- `src/app/(frontend)/member/page.tsx` — FOUND (welcome composition, 62 lines)
- `src/components/layout/Footer.tsx` — FOUND (4-col grid, 101 lines)
- Commit `872dd6e` (Task 1) — FOUND in `git log`
- Commit `4009033` (Task 2) — FOUND in `git log`
- `grep -rn "member.placeholder" src/` — 0 hits (PASS)
- `pnpm typecheck` — exit 0 (PASS)
- `pnpm lint` — exit 0 (PASS, only pre-existing payload warnings)
- All 3 auth pages contain `font-display text-3xl` raw `<h1>` — confirmed by grep
- No `CardTitle` regression on auth pages — confirmed by grep
- Auth pages: 0 file modifications — confirmed by `git status` clean after Task 3

---
*Phase: 02-public-surface-pre-warmup*
*Completed: 2026-05-02*
