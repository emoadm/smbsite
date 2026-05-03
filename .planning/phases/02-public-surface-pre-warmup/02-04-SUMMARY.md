---
phase: 02-public-surface-pre-warmup
plan: 04
subsystem: ui
tags: [next.js, app-router, isr, sitemap, robots, metadata-routes, server-components, generateMetadata]

# Dependency graph
requires:
  - phase: 02-01
    provides: brand tokens (--color-primary, --color-secondary, --color-hero-overlay/text), font tokens (font-display), container width utilities (legal/prose), expanded typography ramp
  - phase: 02-02
    provides: bg.json i18n keys (site.metadataTitle/Description/brandName, agenda.title/leadEyebrow/draftAlert/body, faq.title/lead/items.[0..5], a11y.primaryNavLabel)
  - phase: 02-03
    provides: 13 Phase 2 components (Hero, ProblemSection, VisionSection, CTASection, FAQTeaserSection, FAQAccordion, MainContainer width="prose", SectionEyebrow, TableOfContents, …)
  - phase: 01
    provides: Pattern P9 raw <h1 font-display>, MainContainer scaffold, auth() session reader (used by parent layout's Header), Alert + AlertDescription primitives
provides:
  - Public landing route `/` rendering the full Phase 2 composition (no longer a redirect)
  - `/agenda` route with prose container + draft alert + coalition-placeholder body + optional TOC
  - `/faq` route with 6-item accordion + cross-links to /legal/privacy + /agenda (PUB-03)
  - `src/app/sitemap.ts` (Next.js MetadataRoute.Sitemap) listing 6 indexable URLs
  - `src/app/robots.ts` (Next.js MetadataRoute.Robots) with allow/disallow + sitemap pointer
  - generateMetadata on every public page (title/description/openGraph/twitter/canonical)
affects:
  - 02-05 (/member + auth pages — same pattern P1/P9 reuse, MainContainer width)
  - 02-06 (cookie banner integration — already wired into root layout from prior work)
  - 02-07 (Cloudflare middleware + cookie-vary cache rules — must REMEDIATE the s-maxage=3600 emission gap discovered here; see Deviations / Open Questions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern P1 reused: every public page is a Server Component using getTranslations + MainContainer + revalidate=3600 + generateMetadata"
    - "Pattern P9 enforced on /agenda + /faq page-title h1 (raw font-display text-3xl, NEVER CardTitle)"
    - "Pattern S2 (t.rich for inline Link chunks) reused on /faq lead — privacyLink + agendaLink chunks consumed from bg.json faq.lead"
    - "Next.js 15 file conventions: src/app/sitemap.ts auto-served at /sitemap.xml, src/app/robots.ts auto-served at /robots.txt — NO route handler boilerplate"
    - "PUB-05 enforcement: faq.metadataDescription i18n key created during execution to satisfy lint:i18n (deviation Rule 2)"

key-files:
  created:
    - src/app/(frontend)/agenda/page.tsx
    - src/app/(frontend)/faq/page.tsx
    - src/app/sitemap.ts
    - src/app/robots.ts
  modified:
    - src/app/(frontend)/page.tsx (replaced 8-line redirect with 45-line landing composition)
    - messages/bg.json (added faq.metadataDescription key for /faq description)

key-decisions:
  - "Landing page (/) does NOT redirect authenticated users to /member — both anonymous and authenticated visitors see the same landing composition; Header session indicator differentiates UX (UI-SPEC §13.1)"
  - "TOC_ITEMS array on /agenda is empty in v1 — agenda body has no h2 anchors yet; renders nothing per TableOfContents component contract"
  - "Sitemap intentionally lists /register but NOT /login, /member, /admin, /auth/* (registration is public-facing acquisition page; the rest are private)"
  - "Robots disallow names private paths explicitly (/member, /admin, /auth/, /api/, /login, /register) — RESEARCH §Security Domain notes this is informationally neutral (paths discoverable via JS bundles + Cloudflare logs)"
  - "FAQ description moved to bg.json (faq.metadataDescription) instead of inline literal — required by pnpm lint:i18n (PUB-05 enforcement); plan source had it inline"

patterns-established:
  - "Public-page module shape: import Metadata + getTranslations + MainContainer; export const revalidate = 3600; export async function generateMetadata; export default async function Page() { … }"
  - "OG metadata canonical: alternates.canonical = absolute path; openGraph.images = [{url:'/og-image.png', width:1200, height:630}] (file shipped by 02-07); openGraph.locale = 'bg_BG'"

requirements-completed: [PUB-02, PUB-03, PUB-04]
requirements-partial: [PUB-01]

# Metrics
duration: ~9min
completed: 2026-05-02
---

# Phase 02 Plan 04: Wire pages, sitemap, robots Summary

**Replaced `/` redirect with the landing composition; created `/agenda` + `/faq`; added Next.js MetadataRoute sitemap + robots — but ISR `s-maxage=3600` is masked at origin because the parent layout's Header calls `auth()`, forcing the routes dynamic. Acceptance criterion "Cache-Control: s-maxage=3600 on /, /agenda, /faq" FAILS at origin in build smoke; must be remediated in plan 02-07 (Cloudflare middleware injecting cache headers cookie-vary'd) or by extracting the auth call to a Client Component.**

## What Shipped

- `src/app/(frontend)/page.tsx` — replaced 8-line `redirect()` with 45-line Server Component rendering `<Hero /> <ProblemSection /> <VisionSection /> <CTASection /> <FAQTeaserSection />`. Declares `export const revalidate = 3600` and `generateMetadata` returning title/description/openGraph/twitter/canonical=/.
- `src/app/(frontend)/agenda/page.tsx` — new file. `MainContainer width="prose"` (768px), SectionEyebrow + raw `<h1 font-display>`, always-on `<Alert>` with `t('draftAlert')`, conditional `<TableOfContents>` (empty in v1), `<article class="prose prose-slate prose-lg">` body via `t('body')` ([ТЕКСТ ОТ КОАЛИЦИЯ]).
- `src/app/(frontend)/faq/page.tsx` — new file. `MainContainer width="legal"` (720px), raw `<h1 font-display>`, `t.rich('lead', { privacyLink, agendaLink })` rendering inline `<Link>` cross-references to `/legal/privacy` + `/agenda`, then `<FAQAccordion namespace="faq" count={6}>`.
- `src/app/sitemap.ts` — emits `MetadataRoute.Sitemap` with 6 URLs: `/`, `/agenda`, `/faq`, `/legal/privacy`, `/legal/terms`, `/register`. Confirmed `<urlset>` body with `grep -c "<url>"` returning **6**. Excludes `/member`, `/login`, `/auth/*`, `/admin`.
- `src/app/robots.ts` — emits `MetadataRoute.Robots` with `allow: ['/', '/agenda', '/faq', '/legal/']`, `disallow: ['/member', '/admin', '/auth/', '/api/', '/login', '/register']`, `sitemap: https://chastnik.eu/sitemap.xml`, `host: https://chastnik.eu`.
- `messages/bg.json` — added `faq.metadataDescription` key (deviation; see below).

## Performance

| Metric | Value |
|---|---|
| Tasks committed | 4 of 4 implementation tasks; Task 5 paused as `checkpoint:human-verify` |
| Total commits | 5 (4 task commits + 1 deviation fix) |
| Duration | ~9 minutes |
| Files created | 4 (agenda/page.tsx, faq/page.tsx, sitemap.ts, robots.ts) |
| Files modified | 2 (page.tsx, bg.json) |
| pnpm typecheck | PASS (0 errors) |
| pnpm lint | PASS (only pre-existing warnings on `(payload)` admin routes — out of scope) |
| pnpm lint:i18n | PASS after deviation fix (PUB-05 — no hardcoded Cyrillic in src/) |
| pnpm build | PASS (A8 verified — no Payload `loadEnv.js` regression) |
| Build route classification | `/`, `/agenda`, `/faq` = `ƒ (Dynamic)`; `/sitemap.xml` + `/robots.txt` = `○ (Static)` |
| /sitemap.xml | 200 OK, `application/xml`, 6 `<url>` entries, BASE = https://chastnik.eu |
| /robots.txt | 200 OK, `text/plain`, allow/disallow shape correct, sitemap+host pointers correct |
| Header anonymous render | Shows `/login` link (no email, no logout button) — session indicator works |

## Build Verification (operator-runnable)

The plan's Task 02.04.5 was reclassified as a `checkpoint:human-verify` per plan-checker review. The executor (this agent) ran the full verification chain in the worktree and recorded results below; the operator should re-run on the deployment target before approval.

### Step 1 — A8 verification (Payload `loadEnv.js` regression)

```bash
cd <worktree>
# .env.local must contain NEXT_PUBLIC_TURNSTILE_SITE_KEY + NEXT_PUBLIC_COOKIEYES_SITE_KEY
# (otherwise scripts/check-env.ts fails the prebuild gate — these are the same
#  public site keys already in the main repo's .env.production.local)
pnpm exec tsx --env-file=.env.local scripts/check-env.ts && pnpm exec next build 2>&1 | tail -30
```

Executor result: **PASS** — build completed, `Compiled successfully in 45s`, `Generating static pages (16/16)`, route table emitted. NO `Cannot find module 'loadEnv'` error. A8 confirmed.

### Step 2 — Cache-Control header smoke (port-wait poll, no fixed sleep)

```bash
cd <worktree>
pnpm exec next start --port 3033 &
SERVER_PID=$!
TIMEOUT=60; ELAPSED=0
until curl -s http://localhost:3033/ > /dev/null 2>&1; do
  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "ERROR: Server failed to start within ${TIMEOUT}s" >&2
    kill $SERVER_PID; exit 1
  fi
  sleep 0.5; ELAPSED=$((ELAPSED + 1))
done
for path in / /agenda /faq /sitemap.xml /robots.txt; do
  echo "--- $path ---"
  curl -sI "http://localhost:3033$path" | grep -iE "(cache-control|content-type|HTTP)"
done
kill $SERVER_PID 2>/dev/null
```

Executor result for `/`, `/agenda`, `/faq`: **`Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`** — NOT `s-maxage=3600`. See Deviations §1 for analysis and remediation path.

Executor result for `/sitemap.xml` + `/robots.txt`: **`cache-control: public, max-age=0, must-revalidate`** with correct content types and bodies (6-URL urlset and full robots rules).

### Step 3 — Visual sanity (browser-only, operator-driven)

Browse to `http://localhost:3033/`, `/agenda`, `/faq`. Confirm:

- [ ] `/` shows the hero with `[ТЕКСТ ОТ КОАЛИЦИЯ]` headline (placeholder mechanism intact)
- [ ] `/agenda` shows draft alert + placeholder body in 768px prose container
- [ ] `/faq` accordion lists 6 question/answer pairs; "Политиката за поверителност" and "страницата „Програма"" links in the lead navigate to `/legal/privacy` and `/agenda`
- [ ] Header logo links to `/` on every page; anonymous indicator shows `Вход` (login)
- [ ] No browser-console errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical functionality] Hardcoded /faq description fails PUB-05 i18n lint**

- **Found during:** Task 02.04.3 verification (`pnpm lint:i18n` after Task 02.04.3 commit + sitemap/robots commit)
- **Issue:** The plan's literal source for `faq/page.tsx` (line 280 of 02-04-PLAN.md) hardcodes the meta description as a Cyrillic string literal: `description: 'Как работи общността, какво следва от регистрацията и как се гласува.'`. The project's `scripts/lint-i18n.mjs` enforces PUB-05 (no Cyrillic literals in `src/`), and `pnpm lint:i18n` failed on this line.
- **Fix:** Added `faq.metadataDescription` key to `messages/bg.json` with the exact same Bulgarian copy; replaced the literal in `faq/page.tsx` with `description: t('metadataDescription')`. PUB-05 lint passes.
- **Files modified:** `messages/bg.json`, `src/app/(frontend)/faq/page.tsx`
- **Commit:** `9298f92` — `fix(02-04): move /faq description to bg.json (PUB-05 i18n compliance)`
- **Why Rule 2:** Project-level lint enforcement of i18n discipline is a correctness requirement, not optional polish. The plan literal violates a project-wide constraint that takes precedence (CLAUDE.md: "Език: Български интерфейс — кодът на английски").

**2. [Rule 1 — Bug] page.tsx doc-comment string `force-static` triggered grep anti-pattern check**

- **Found during:** Task 02.04.1 first-pass verification
- **Issue:** Plan's source for `page.tsx` included `DO NOT use 'dynamic = "force-static"'` inside a doc comment. The plan's automated verify chain runs `! grep -q "force-static"` which matches the literal regardless of comment context, so `pnpm typecheck` would have passed but the verify regex would have failed.
- **Fix:** Rewrote the doc-comment warning to describe the anti-pattern without containing the literal `force-static` substring. Substantive guidance preserved.
- **Files modified:** `src/app/(frontend)/page.tsx` (within the same commit `35cc4a0` — never amended; original file content was edited before the commit was made)
- **Why Rule 1:** Verify chain falsely failing on a comment is a bug in the plan literal that I corrected before commit; documented for transparency.

### Architectural Issue Surfaced (Rule 4 — Operator decision required at Task 02.04.5)

**1. ISR cache headers DO NOT emit `s-maxage=3600` at origin — routes are dynamic, not partial-static**

- **Found during:** Task 02.04.5 build smoke test (Step 2)
- **Acceptance criterion (plan §Task 02.04.5):** "`curl -sI http://localhost:3000/` returns `Cache-Control` header containing `s-maxage=3600`. Same for `/agenda` and `/faq`."
- **Observed:** All three routes emit `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` instead.
- **Build route table:** `/`, `/agenda`, `/faq` are classified `ƒ (Dynamic)` — not `○ (Static)` and not `◐ (ISR)`.
- **Root cause:** `src/app/(frontend)/layout.tsx` renders `<Header />`, which calls `auth()` (i.e., `cookies()` indirectly) at module level. Per Next.js 15 semantics, when a layout uses dynamic APIs the entire route subtree is rendered dynamically and `revalidate` is overridden by the `private, no-store` cache directives. This is consistent with the plan's own anti-pattern note ("DO NOT use force-static — neutralizes auth()") but NOT consistent with the plan's expectation that `revalidate=3600` would still emit `s-maxage=3600` while keeping the Header session indicator dynamic.
- **Plan note (line 50):** D-18 PUB-02 explicitly forbids `force-static` because of the Header — but the plan also expects `revalidate` to emit `s-maxage=3600`. These two requirements are mutually exclusive on Next.js 15 with the current Header architecture. Plan 02-04 cannot meet both.
- **Remediation paths (decision needed before declaring PUB-02 satisfied):**
  - **Path A — Defer to plan 02-07 (Cloudflare layer).** Plan 02-07 ships Cloudflare cache rules. Configure CF to override origin `Cache-Control` with `public, s-maxage=3600, stale-while-revalidate=...` for anonymous requests (cookie-vary on `__Secure-authjs.session-token`). Origin remains dynamic, edge caches anonymous HTML for 1 hour. This was already the planned Cloudflare design in 02-07; it just becomes the SOLE caching layer instead of a complement to origin ISR.
  - **Path B — Extract auth() to a Client Component.** Replace `<Header />` (Server Component reading `auth()`) with `<HeaderShell />` (Server Component, no auth) + `<HeaderSessionIndicator />` (Client Component fetching `/api/auth/session` after hydration). Routes return to static/ISR; origin emits `s-maxage=3600`. Cost: a brief `Вход` flash for authenticated users on initial paint (mitigated by sessionStorage hint).
  - **Path C — Accept the dynamic emission for v1.** Document that origin is dynamic-by-design; rely on Cloudflare for all anonymous caching (Path A). PUB-02 acceptance criterion is reworded from "origin emits s-maxage=3600" to "Cloudflare edge serves cached HTML to anonymous users with cookie-vary correctness".
- **Recommended path:** **Path A** — it aligns with the existing 02-07 Cloudflare runbook scope and avoids touching the Header architecture mid-phase. Path B is a clean alternative for a future plan if origin caching is later required. Path C is the same as Path A in practice.
- **No file changes made in this plan to address this** — the architectural decision is operator's call (Rule 4). Tasks 02.04.1–02.04.4 ship the page-level `revalidate=3600` correctly; the gap is at the layout level and outside this plan's stated `files_modified`.

### Out-of-Scope Discoveries (logged, not fixed)

- **`@sentry/nextjs` warns about missing `onRouterTransitionStart` hook + missing `global-error.js`.** Pre-existing in Phase 1; not touched here. Logged for a future Sentry hardening quick-task; out of scope per Rule scope boundary.
- **Three pre-existing `Unused eslint-disable directive` warnings in `src/app/(payload)/`.** Phase 1 carry-forward. Out of scope.

## Open Questions

1. **Which remediation path for the s-maxage=3600 acceptance gap?** (See Architectural Issue §1.) Recommendation: Path A — defer to plan 02-07 Cloudflare cache rules. Operator decision required.
2. **Should the partial requirements completion mark PUB-01 in REQUIREMENTS.md as fully complete or partial?** PUB-01 (single landing page replaces redirect) is functionally complete — the landing renders. Whether the cache layer requirement (a sub-aspect of PUB-02 stated in the must_haves "Cache-Control header containing s-maxage=3600") is part of PUB-01 or PUB-02 affects the requirements ledger. Recommendation: list PUB-01/03/04 complete, PUB-02 partial pending 02-07.

## Threat Flags

None — no new security surface introduced. Sitemap and robots adhere to threat model T-02-04-1 (hand-curated 6-URL list, no admin/api leakage) and T-02-04-2 (disallow list informational only).

## TDD Gate Compliance

Not applicable — plan type is not `tdd`; tasks declared `tdd="false"`.

## Self-Check: PASSED

**Files exist:**

- `src/app/(frontend)/page.tsx` — FOUND (modified, 45 lines)
- `src/app/(frontend)/agenda/page.tsx` — FOUND (created, 63 lines)
- `src/app/(frontend)/faq/page.tsx` — FOUND (created, 53 lines)
- `src/app/sitemap.ts` — FOUND (created, 16 lines)
- `src/app/robots.ts` — FOUND (created, 17 lines)
- `messages/bg.json` — FOUND (modified, +1 line for faq.metadataDescription)

**Commits exist (verified via `git log --oneline c73fbe7..HEAD`):**

- `35cc4a0` — `feat(02-04): replace / redirect with landing composition + ISR` (Task 02.04.1)
- `1211bca` — `feat(02-04): create /agenda page with prose container + draft alert` (Task 02.04.2)
- `a017a94` — `feat(02-04): create /faq page with 6-item accordion + cross-links` (Task 02.04.3)
- `cb82418` — `feat(02-04): add sitemap.ts + robots.ts (Next.js 15 metadata routes)` (Task 02.04.4)
- `9298f92` — `fix(02-04): move /faq description to bg.json (PUB-05 i18n compliance)` (deviation Rule 2)

**Acceptance criteria:**

- Task 02.04.1: ALL grep checks pass (revalidate=3600, generateMetadata, 5 landing imports, no next/navigation, no redirect, no force-static substring); typecheck passes — PASS
- Task 02.04.2: file exists, revalidate=3600, width="prose", font-display text-3xl, Alert+draftAlert, t('body'); typecheck passes — PASS
- Task 02.04.3: file exists, revalidate=3600, width="legal", FAQAccordion+count={6}, t.rich, href="/legal/privacy", href="/agenda"; typecheck passes — PASS
- Task 02.04.4: both files exist with MetadataRoute types; sitemap has 6 URLs; robots disallow shape correct; sitemap.xml URL pointer present; typecheck passes — PASS
- Task 02.04.5: build green (A8 verified) — PASS; cache-control header s-maxage=3600 — **FAIL** (architectural gap; see Deviations); checkpoint paused for operator decision

## Notes for Plan 02-07 (next consumer)

- Cloudflare cache rule for `/`, `/agenda`, `/faq`: cookie-vary on session token; serve `s-maxage=3600` to anonymous; bypass to origin when session cookie present. This is now the SOLE anonymous-page caching layer; origin emits `private, no-store` because of the Header `auth()` call.
- `og-image.png` does NOT exist yet — generateMetadata in this plan references `/og-image.png` as a forward dependency. Crawlers will see 404 for the OG asset until 02-07 ships it.
- Build env-check requires `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `NEXT_PUBLIC_COOKIEYES_SITE_KEY` in process.env at build time (Phase 1 hardening from `registration-flow-cascade.md`). These are public site keys; Fly.io secrets / Coolify env should already be configured.
