---
phase: 02-public-surface-pre-warmup
plan: 02
subsystem: ui
tags: [next-intl, i18n, bulgarian, content-scaffolding, gdpr, cookie-consent, a11y]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "messages/bg.json baseline with site/auth/nav/member.placeholder/legal/footer/cookieBanner/error/destructive/errorsZod/email keys; next-intl 3.x wired throughout (frontend) layout; getTranslations() pattern established for Server Components."
provides:
  - "Complete Bulgarian string catalog for all Phase 2 routes (landing.*, agenda.*, faq.*, member.welcome.*, a11y.*) before any consuming component is built"
  - "Coalition-copy placeholder mechanism: literal '[ТЕКСТ ОТ КОАЛИЦИЯ]' in landing.hero.headline + landing.hero.subheadline + agenda.body, surfacing visibly in dev/staging until coalition delivers real content"
  - "Operational FAQ catalog locked at 6 items (D-04 scope: 'what members do' only) — no privacy/trust/coalition Q&As"
  - "/member welcome timeline copy: 3 bullet items (weekly email, channels coming soon, voting initiatives) per D-09 + D-10"
  - "Cookie banner granular categories with explicit Plausible cookieless transparency note ('без бисквитки') in analytics.description per RESEARCH Pitfall 5 / GDPR-01"
  - "Skip-to-content i18n key (a11y.skipToContent) for layout WCAG 2.1 AA prep (UI-SPEC §8.1)"
  - "Footer 4-column-grid keys (tagline, platformHeading, channelsHeading, channelsPending, agenda/faq/register links) for Phase 2 footer expansion"
  - "Tone bifurcation enforced (Pattern S4): Phase 1 auth.* keys preserved untouched in 'ти/те' singular informal; new Phase 2 keys all use formal-respectful 'вие/ви' plural"
affects: [02-03 component build, 02-04 page wiring, 02-05 member rewrite, 02-06 cookie banner replacement, 02-08 pre-launch grep gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern S4 (PATTERNS.md): nested namespaced keys mirroring auth.register.fields.* shape — landing.hero.*, faq.items[], member.welcome.banner.*"
    - "Coalition-copy placeholder mechanism (UI-SPEC §7.1): '[ТЕКСТ ОТ КОАЛИЦИЯ]' literal value for owner-side strings; pre-launch grep gate (02-08) is the enforcement"
    - "Cookie category shape change (string → {name, description}) keeps copy in bg.json single source of truth, ready for CookieBanner.tsx rewrite (02-06)"

key-files:
  created: []
  modified:
    - "messages/bg.json"

key-decisions:
  - "Top-level key insertion order: site → auth → nav → member → landing → agenda → faq → a11y → legal → footer → cookieBanner → error → destructive → errorsZod → email — matches plan-task §1 ordering and roughly mirrors usage frequency"
  - "cookieBanner.body switched from 'Можеш да избереш' (informal) to 'Можете да изберете' (formal) — banner is brand-new Phase 2 copy and falls under UI-SPEC §7.6 formal вие/ви; D-12 'do not retro-fit' applies only to auth.* not the cookie banner"
  - "footer.* intentionally duplicates labels with nav.* (agenda/faq/register) so neither header nor footer crosses namespaces in JSX (per plan §1 footer comment)"
  - "Phase 1 auth.* + email.* kept fully intact; the 'ти/те' singular informal tone in those keys is the documented and accepted mismatch (D-13 deferred)"

patterns-established:
  - "Pattern: Coalition placeholder values (literal '[ТЕКСТ ОТ КОАЛИЦИЯ]') in i18n catalog so missing copy visibly surfaces in every environment without breaking the build"
  - "Pattern: Cookie consent transparency — when the underlying tool is cookieless (Plausible), the category description states this explicitly to avoid consent dark-pattern (RESEARCH Pitfall 5)"

requirements-completed: [PUB-01, PUB-03, PUB-04, GDPR-01]

# Metrics
duration: 5m
completed: 2026-05-02
---

# Phase 02 Plan 02: bg.json Content Scaffolding Summary

**All Phase 2 Bulgarian UI strings landed in messages/bg.json before any consuming component is built — landing/agenda/faq/member.welcome/a11y/cookie keys plus 6-item operational FAQ catalog and the coalition-copy `[ТЕКСТ ОТ КОАЛИЦИЯ]` placeholder mechanism.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-02T23:03:05Z
- **Completed:** 2026-05-02T23:08:39Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added 7 new top-level i18n key trees: `landing`, `agenda`, `faq`, `a11y`, plus extensions to `nav` (3 new keys), `member` (full subtree replacement: `placeholder` → `welcome`), `footer` (8 new keys), and `cookieBanner` (categories shape change + settingsLink)
- 141 lines added / 8 lines removed; bg.json grew from 164 → 297 lines
- Coalition-copy placeholder mechanism installed: `landing.hero.headline`, `landing.hero.subheadline`, `agenda.body` all literally `[ТЕКСТ ОТ КОАЛИЦИЯ]` so plan 02-08's grep gate can fail the build if any remain at warmup launch
- FAQ catalog locked at exactly 6 operational items (D-04 scope) — every item has non-empty question + answer; privacy/trust/coalition-specific questions explicitly excluded (those route to `/legal/privacy` + `/agenda`)
- /member welcome timeline copy ships with 3 items per D-09 (weekly email update / channels start soon per D-10 / first civic initiatives) and 2 cards linking to /agenda + /faq
- Cookie banner granular categories now carry `{name, description}` objects; `analytics.description` explicitly contains the substring `без бисквитки` (RESEARCH Pitfall 5 anti-dark-pattern requirement, GDPR-01 transparency)
- Skip-to-content a11y key shipped (`a11y.skipToContent`) ready for layout consumption (UI-SPEC §8.1, WCAG 2.1 AA prep)
- Phase 1 auth.* / email.* / legal.* / error.* / destructive.* / errorsZod.* / site.* keys preserved bit-for-bit untouched; the deliberate 'ти/те' (auth) vs. 'вие/ви' (Phase 2) tone bifurcation is enforced (D-12, D-13)
- JSON is valid (parses with `node -e "JSON.parse(...)"`)

## Task Commits

Each task was committed atomically:

1. **Task 02.02.1: Add new top-level keys (landing, agenda, faq, a11y); extend nav; replace member.placeholder with member.welcome** — `32f93a7` (feat)

_No additional plan-metadata commit — orchestrator handles cross-plan SUMMARY/STATE/ROADMAP commits per the spawn brief._

## Files Created/Modified

- `messages/bg.json` — Added top-level `landing.*`, `agenda.*`, `faq.*` (6 items), `a11y.*`; extended `nav.*` (+3 keys), `footer.*` (+8 keys), `cookieBanner.*` (categories objects + settingsLink); replaced `member.placeholder.{heading,body}` with `member.welcome.{banner,next,cards}`. 141 lines added, 8 removed. All Phase 1 auth/email/legal/error/destructive/errorsZod/site keys preserved.

## Decisions Made

- **Top-level key order** (site → auth → nav → member → landing → agenda → faq → a11y → legal → footer → cookieBanner → error → destructive → errorsZod → email): mirrors plan-task §1 listing and groups Phase 2 additions (landing/agenda/faq/a11y) between auth-related (site/auth/nav/member) and infrastructure (legal/footer/cookieBanner/error/...). No load-bearing reason to deviate.
- **cookieBanner.body tone change**: the existing string used informal 'Можеш да избереш'. Since the cookieBanner is being structurally rewritten in Phase 2 (categories shape change for the new CookieBanner component in 02-06) and the plan-supplied target value uses formal 'Можете да изберете' (matching UI-SPEC §7.6 formal вие/ви for new Phase 2 surfaces), the banner moves to formal tone. D-12's "do not retro-fit Phase 1 auth strings" applies specifically to auth.* — the cookie banner is a separate cross-cutting concern being expanded in this phase.
- **footer.{agenda,faq,register} key duplication with nav.{agenda,faq,register}**: deliberate per plan §1 — single namespace per UI region keeps JSX simpler.

## Deviations from Plan

None — plan executed exactly as written. Every acceptance criterion, every required key value, and every value-match string (`[ТЕКСТ ОТ КОАЛИЦИЯ]`, `Прескочи към съдържанието`, `Програма`, `Въпроси`, `Регистрация`, `Регистрацията ви е потвърдена.`, `без бисквитки`) verified by both the plan's automated `<verify><automated>` Node block and an extended acceptance-criteria spot-check script.

## Issues Encountered

**1. First commit attempt landed on `main` instead of the worktree branch (recovered)**

- **What happened:** The first `git commit` was issued from the main repo path (`/Users/emoadm/projects/SMBsite`) rather than the worktree path (`/Users/emoadm/projects/SMBsite/.claude/worktrees/agent-a6efc6cafc781f220`). Bash CWD reset between calls returns to the worktree by default; using an absolute `cd` to the main repo path inadvertently targeted main's index. Pre-commit HEAD safety check missed it because `.git` is a directory in the main repo (not a file) so the worktree-mode guard short-circuited with `non-worktree`.
- **Recovery:** Used `git revert --no-edit 4cea24c` on `main` (non-destructive — adds a revert commit instead of force-rewinding the protected ref, per the destructive-git prohibition rules). The misplaced `feat` commit `4cea24c` and its revert `75bded9` both remain on `main` for audit trail; the net diff on `main` is zero.
- **Re-applied:** The same content was written to the worktree's `messages/bg.json` and committed on the `worktree-agent-a6efc6cafc781f220` branch as `32f93a7` — this is the canonical task commit for the orchestrator to merge back.
- **Net impact on this plan:** Zero. The orchestrator merging the worktree branch to `main` will produce the intended end state.
- **Followup recommendation:** The pre-commit HEAD assertion in execute-plan.md only triggers when `.git` is a file (worktree-mode); a parallel-executor running with the main-repo path inheritable as CWD can bypass it. A future hardening pass could either (a) also assert against an inherited `WORKTREE_PATH` env var, or (b) make the assertion unconditional when the agent was spawned for a worktree branch. Logged here for orchestrator visibility, not part of this plan's scope.

## User Setup Required

None — no external service configuration required. The coalition-copy placeholder values (`[ТЕКСТ ОТ КОАЛИЦИЯ]`) are tracked in STATE.md deferred items as `D-CoalitionContent-Hero` and `D-CoalitionContent-Agenda` — they MUST be filled in before warmup launch (plan 02-08 enforces with a build-time grep gate).

## Next Phase Readiness

- **Wave 1 sibling 02-01 (Tailwind tokens + Gilroy fonts)** — runs in parallel; both must land before Wave 2 (component build) starts.
- **Wave 2 (02-03 components):** can immediately import any new `landing.*`, `member.welcome.*`, `a11y.*`, `nav.*`, `footer.*`, `cookieBanner.*` key via `getTranslations()`/`useTranslations()`. JSON is valid; next-intl strict mode will not throw `MISSING_MESSAGE`.
- **Wave 4 (02-05 /member rewrite):** the old `member.placeholder.*` namespace has been deleted as planned; the current `src/app/(frontend)/member/page.tsx` still imports `member.placeholder` and WILL break the build until 02-05 lands. This is the documented wave coupling — 02-05 is the only consumer of the old namespace and rewrites the page to consume `member.welcome.*` instead. No other file in `src/` or `tests/` imports `member.placeholder.*` (verified by grep at planning time and at execution time).
- **Plan 02-08 pre-launch grep gate:** can now greps for the literal `[ТЕКСТ ОТ КОАЛИЦИЯ]` substring across `messages/bg.json` (3 occurrences expected today; 0 at warmup launch).

## Self-Check: PASSED

- `messages/bg.json` exists at `/Users/emoadm/projects/SMBsite/.claude/worktrees/agent-a6efc6cafc781f220/messages/bg.json` (verified)
- Commit `32f93a7` exists on branch `worktree-agent-a6efc6cafc781f220` (verified via `git log --oneline -3`)
- Both verification scripts (plan-supplied automated block + extended acceptance-criteria checks) print `OK` / `ALL CHECKS PASS`

---
*Phase: 02-public-surface-pre-warmup*
*Completed: 2026-05-02*
