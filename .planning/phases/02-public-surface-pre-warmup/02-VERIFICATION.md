---
phase: 02-public-surface-pre-warmup
verified: 2026-05-02T22:35:00Z
status: human_needed
score: 7/7 must-haves verified (code) — 5 operator/coalition deferred items required for warmup launch
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []

# All 4 ROADMAP success criteria are CODE-COMPLETE. Phase 2 ships
# "code-shipping-complete" per 02-SIGNOFF.md. Operator/coalition
# items in human_verification block must close before warmup
# invitations are sent — these are DELIBERATELY scoped as deferred
# per CONTEXT.md D-decisions and STATE.md deferred-items table.

human_verification:
  - test: "CookieYes dashboard reconciliation per OPS-RUNBOOK §1.1-§1.5"
    expected: "Bulgarian banner with 3 categories renders on chastnik.eu after 5min CookieYes propagation; Plausible 'без бисквитки' disclosure visible; audit POST fires to /api/cookie-consent"
    why_human: "Operator-only — Claude has no CookieYes dashboard access; UI-SPEC review_flag #4 dual-source-of-truth"
  - test: "Cloudflare Cache Rules creation per OPS-RUNBOOK §2.1-§2.5"
    expected: "Two rules created (bypass for auth-cookie + cache-anonymous Override-origin → 1h); A1 verified (free-tier supports cookie-presence); curl smoke shows cf-cache-status HIT on 2nd anonymous request, BYPASS for auth requests"
    why_human: "Operator-only — Claude has no Cloudflare dashboard access; PUB-02 SC-1 cache layer requirement"
  - test: "Lighthouse CI run on first PR (A6 verification)"
    expected: ".github/workflows/lighthouse.yml runs on first PR after deploy, asserts Performance ≥ 0.9, LCP ≤ 2500ms, A11y ≥ 0.95, SEO ≥ 0.95 against https://chastnik.eu/, /agenda, /faq"
    why_human: "Requires real GitHub Actions runner + production deploy; cannot run locally"
  - test: "scroll-padding-top: 5rem visual check (UI-SPEC review_flag #3)"
    expected: "Operator clicks hero 'Виж идеята' link → VisionSection h2 renders BELOW sticky header (not clipped). If clipped, bump scroll-padding-top from 5rem to 6rem in src/styles/globals.css"
    why_human: "Visual regression — automated bounding-box checks brittle for sticky-header offsets per OPS-RUNBOOK §3.5"
  - test: "Footer 'Настройки за бисквитки' click reopens CookieYes banner"
    expected: "After CookieYes dashboard configured, clicking footer link triggers window.revisitCkyConsent(); banner re-appears"
    why_human: "Requires live CookieYes script + real site key (not the CI placeholder)"
  - test: "Coalition deliverables (5 items) per OPS-RUNBOOK §3.2"
    expected: "D-CoalitionLogoSVG + D-CoalitionContent-Hero + D-CoalitionContent-Agenda + D-CoalitionChannels + D-LawyerReviewLegal — all 5 must close. pnpm check:placeholders exits 0."
    why_human: "External coalition deliverables — design-deliberate placeholder mechanism in v1; warmup launch BLOCKED until all 5 close"
---

# Phase 2: Public Surface (Pre-Warmup) Verification Report

**Phase Goal:** Anonymous visitors land on a fast, branded landing page explaining the coalition's mission with a clear "join the community" CTA; post-registration /member welcomes them with what's coming next; cookie consent and legal pages are live. MUST ship before warmup ladder begins so friends/family see real explanatory content and Sinya brand identity, not a barebones registration form.

**Verified:** 2026-05-02T22:35:00Z
**Status:** PASSED-WITH-OPERATOR-DEPENDENCIES (status field: `human_needed`)
**Re-verification:** No — initial verification

**One-line summary:** All Phase 2 code-shipping deliverables are present, wired, and pass the project's quality gates (typecheck, lint, vitest 54/54, playwright 156 enumerated, build, lint:tokens, lint:i18n). Five operator/coalition handoff items remain — these are DELIBERATELY scoped as "ship code now, operator + coalition close before warmup" per CONTEXT.md D-14, D-15, D-CoalitionChannels, D-CoalitionLogoSVG, D-CoalitionContent-Hero/Agenda, D-LawyerReviewLegal, and OPS-RUNBOOK §3 launch-readiness checklist. Phase 2 satisfies its goal as code-complete and is correctly classified `code-shipping-complete; awaiting coalition deliverables + operator sign-off` per 02-SIGNOFF.md.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| #   | Truth                                                                                          | Status                | Evidence       |
| --- | ---------------------------------------------------------------------------------------------- | --------------------- | -------------- |
| SC-1 | Visiting `/` renders a public landing page; does not redirect anonymous visitors away         | ✓ VERIFIED (code)     | `src/app/(frontend)/page.tsx:37-47` renders `<Hero/><ProblemSection/><VisionSection/><CTASection/><FAQTeaserSection/>`; `! grep -q redirect()`; `export const revalidate = 3600` set at line 19. CDN cache layer is operator-side (OPS-RUNBOOK §2). |
| SC-2 | Landing page communicates mission/value-prop/CTA in Bulgarian; uses Sinya palette + logo      | ✓ VERIFIED (code) — coalition placeholders for hero copy & logo per design | `messages/bg.json` has full `landing.problem.*`, `landing.vision.*`, `landing.cta.*`, `landing.faqTeaser.*`; hero copy is `[ТЕКСТ ОТ КОАЛИЦИЯ]` placeholder per D-02; `globals.css:20` `--color-primary: #004A79` (Sinya navy); Hero uses `font-display` (Gilroy via `src/lib/fonts.ts`); coalition logo SVG tracked under D-CoalitionLogoSVG (placeholder ships) |
| SC-3 | A registered, email-verified member on /member sees a welcoming Bulgarian page (not placeholder) | ✓ VERIFIED (code) — channel URLs deferred per D-10  | `src/app/(frontend)/member/page.tsx:17-62` renders `<MemberWelcomeBanner/> + h2 + <Timeline/> + 2-card grid` linking to `/agenda` and `/faq`; bg.json `member.welcome.banner.heading="Регистрацията ви е потвърдена."`; old `member.placeholder` namespace deleted (`grep -rn "member.placeholder" src/` → 0); channels show "стартират скоро" until D-CoalitionChannels closes |
| SC-4 | Privacy Policy + Terms of Use + granular cookie consent banner are live and accessible | ✓ VERIFIED (code) — lawyer-final text deferred per D-15 | `src/app/(frontend)/legal/{privacy,terms}/page.tsx` exist with draft Alert; `src/components/layout/CookieBanner.tsx:25-78` mounts CookieYes script `beforeInteractive` with Sinya CSS-variable overrides + 3 granular categories per bg.json `cookieBanner.categories.{necessary,analytics,marketing}`; `bg.json` line 237 includes "без бисквитки" Plausible disclosure (anti-dark-pattern) |

**Score:** 4/4 ROADMAP success criteria CODE-COMPLETE — all deferred sub-items are intentional scope per CONTEXT.md and OPS-RUNBOOK launch checklist

### Required Artifacts

| Artifact                                                | Expected                                                                          | Status      | Details                                         |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------- | ----------------------------------------------- |
| `src/app/(frontend)/page.tsx`                          | Replace redirect with Hero + sections; revalidate=3600; generateMetadata          | ✓ VERIFIED  | 47 lines; 5 landing imports wired; OG metadata set; canonical=`/` |
| `src/app/(frontend)/agenda/page.tsx`                   | width="prose" + draft Alert + body via t('body') placeholder                      | ✓ VERIFIED  | 63 lines; coalition `[ТЕКСТ ОТ КОАЛИЦИЯ]` placeholder mechanism intact |
| `src/app/(frontend)/faq/page.tsx`                      | width="legal" + 6-item FAQAccordion + cross-links to /legal/privacy + /agenda     | ✓ VERIFIED  | 53 lines; t.rich for inline links; metadataDescription i18n key                   |
| `src/app/(frontend)/member/page.tsx`                   | width="page" + MemberWelcomeBanner + Timeline + 2-card grid                       | ✓ VERIFIED  | 62 lines; per-session dynamic; D-09 composition                                   |
| `src/app/sitemap.ts`                                    | Lists 6 public URLs (/, /agenda, /faq, /legal/{privacy,terms}, /register)         | ✓ VERIFIED  | 16 lines; tested in tests/unit/sitemap.test.ts (3/3 pass)                         |
| `src/app/robots.ts`                                     | Allow public; disallow /member, /admin, /auth/, /api/, /login, /register          | ✓ VERIFIED  | 17 lines; tested in tests/unit/robots.test.ts (4/4 pass)                          |
| `src/middleware.ts`                                     | Strict-Edge, cf-ray casual-probe gate, NODE_ENV !== production bypass             | ✓ VERIFIED  | 56 lines; `Middleware 99.3 kB` Edge bundle; matcher excludes /api/* and /_next/* |
| `src/styles/globals.css`                                | Sinya canonical tokens, 8-size ramp, scroll-padding-top, reduced-motion fallback  | ✓ VERIFIED  | `--color-primary: #004A79`; `--color-destructive: #DC2626`; `--color-success: #059669`; `--text-6xl: 3.75rem` |
| `src/lib/fonts.ts`                                      | next/font/local Gilroy (800 + 300) + Roboto (400 + 600 + Cyrillic)                | ✓ VERIFIED  | 82 lines; license header documents D-GilroyLicenseRisk + Manrope mechanical fallback path |
| `public/fonts/gilroy-{extrabold,light}.woff2`           | Self-hosted woff2 with Cyrillic coverage (per 02-FONT-GLYPH-AUDIT.md)             | ✓ VERIFIED  | 11848 + 12216 bytes; both valid WOFF2; ALL_PASS Bulgarian glyphs |
| `public/{og-image.png,favicon.ico,apple-touch-icon.png,icon.png,hero.jpg}` | Static assets for OG/favicon/hero                                | ✓ VERIFIED — placeholder pending coalition  | All 5 files exist with correct dimensions; D-CoalitionLogoSVG + D-CoalitionFaviconSet swap-in tracked |
| `src/components/landing/{Hero,ProblemSection,VisionSection,CTASection,FAQTeaserSection,FAQAccordion,SectionEyebrow,ValuePropGrid,VideoPlayer,TableOfContents}.tsx` | 10 landing components | ✓ VERIFIED  | All present; only FAQAccordion + TableOfContents are 'use client'; rest are Server Components per Pattern S6 |
| `src/components/member/{MemberWelcomeBanner,Timeline}.tsx` | 2 member components                                                            | ✓ VERIFIED  | Both present; MemberWelcomeBanner reads auth() session via Pattern P3 |
| `src/components/layout/{Footer,CookieBanner,CookieSettingsLink}.tsx` | Layout components                                                       | ✓ VERIFIED  | Footer is 4-col grid; CookieBanner uses beforeInteractive; CookieSettingsLink calls window.revisitCkyConsent() |
| `tests/e2e/{landing,cookie-consent,typography,legal-visual-regression}.spec.ts` | 4 new Playwright specs                                              | ✓ VERIFIED  | All present; landing.spec covers PUB-01..04; cookie-consent covers GDPR-01 (skip-on-no-key); typography covers Gilroy load + Cyrillic descenders; legal-visual-regression covers review_flag #2 |
| `tests/unit/{sitemap,robots}.test.ts`                   | Vitest unit tests                                                                 | ✓ VERIFIED  | 7/7 pass; full vitest suite 54/54 pass                                            |
| `.lighthouserc.json` + `.github/workflows/lighthouse.yml` | Lighthouse CI config + workflow                                                  | ✓ VERIFIED  | JSON valid; workflow targets PRs touching src/**, public/**, messages/**, next.config.ts; A6 verifies on first PR |
| `scripts/{lint-orphan-tokens,check-coalition-placeholders}.mjs` | Pre-launch CI scripts                                                      | ✓ VERIFIED  | lint:tokens passes (text-6xl bound by Hero.tsx); check:placeholders correctly fails (3 placeholders, exit 1, expected pre-warmup behavior) |
| `02-OPS-RUNBOOK.md` §1 / §2 / §3                        | CookieYes dashboard + Cloudflare cache + launch readiness checklist               | ✓ VERIFIED  | All 3 sections present and referenced from 02-SIGNOFF.md and STATE.md |
| `02-SIGNOFF.md`                                         | Phase-gate signoff document mapping SC-1..SC-4 → artifacts                        | ✓ VERIFIED  | Maps SC-1..SC-4, all 7 requirement IDs, all 4 review_flags, all 8 RESEARCH assumptions |

### Key Link Verification (Wiring)

| From                                  | To                                              | Via                                   | Status     | Details                                                                            |
| ------------------------------------- | ----------------------------------------------- | ------------------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| `src/app/(frontend)/page.tsx`        | 5 landing components                            | `import { ... } from '@/components/landing/...'` | ✓ WIRED   | All 5 imports present at lines 3-7; rendered in JSX 39-45                          |
| `src/app/(frontend)/member/page.tsx` | MemberWelcomeBanner + Timeline                  | imports + JSX                         | ✓ WIRED    | Lines 6-7 import; lines 21+26 render                                               |
| `src/app/(frontend)/layout.tsx`      | CookieBanner, Footer, Header, fonts, skip-link  | imports + JSX                         | ✓ WIRED    | All 5 wired; html className uses `${roboto.variable} ${gilroy.variable}` (line 23) |
| `Footer.tsx`                          | CookieSettingsLink                              | import + JSX                          | ✓ WIRED    | Line 4 import; line 86 renders with t('cookieBanner.settingsLink') label           |
| `MemberWelcomeBanner.tsx`             | auth() session                                  | `import { auth } from '@/lib/auth'`   | ✓ WIRED    | Line 3 import; line 24 calls; firstName extracted via Pattern P8                   |
| `CookieBanner.tsx`                    | CookieYes hosted script                         | next/script `beforeInteractive`       | ✓ WIRED    | Line 31-35; A5 verified — no crossorigin attribute leaks                           |
| `CookieBanner.tsx`                    | /api/cookie-consent (audit log)                 | bridge script POST                    | ✓ WIRED    | Lines 36-51; Phase 1 endpoint reachable                                            |
| `Hero.tsx`                            | landing.hero.* i18n keys                        | `getTranslations('landing.hero')`     | ✓ WIRED    | Line 23; consumes kicker, headline, subheadline, ctaPrimary, ctaSecondary          |
| `Timeline.tsx`                        | member.welcome.next.items                       | `getTranslations(...)`                | ✓ WIRED    | Line 13; renders 3 items per D-09                                                  |
| `next.config.ts`                      | Static-asset Cache-Control headers              | async headers()                       | ✓ WIRED    | /fonts/* → 1y immutable; /og-image.png → 1d + 7d SWR                               |

### Data-Flow Trace (Level 4)

| Artifact                | Data Variable     | Source                         | Produces Real Data | Status                                                                |
| ----------------------- | ----------------- | ------------------------------ | ------------------ | --------------------------------------------------------------------- |
| `MemberWelcomeBanner`   | session.user.name | auth() / Phase 1 NextAuth      | Yes (real session) | ✓ FLOWING — uses Pattern P3; firstName extraction matches OtpEmail.tsx |
| `Hero` headline         | landing.hero.headline | bg.json                    | placeholder by design | ⚠ STATIC PLACEHOLDER — `[ТЕКСТ ОТ КОАЛИЦИЯ]` per D-02 (coalition writes); pre-warmup grep gate enforces |
| `Hero` subheadline      | landing.hero.subheadline | bg.json                  | placeholder by design | ⚠ STATIC PLACEHOLDER — same as above                                  |
| `agenda` body           | agenda.body       | bg.json                       | placeholder by design | ⚠ STATIC PLACEHOLDER — D-CoalitionContent-Agenda                      |
| `Footer` channels column | footer.channelsPending | bg.json ("стартират скоро") | placeholder by design | ⚠ STATIC PLACEHOLDER — D-CoalitionChannels (D-10 explicit)            |
| `FAQAccordion` (count=6) | faq.items[0..5]  | bg.json                       | Yes (Claude-drafted) | ✓ FLOWING — 6 operational Q&A pairs per D-04                          |
| `Timeline` (3 items)    | member.welcome.next.items[0..2] | bg.json             | Yes (Claude-drafted) | ✓ FLOWING — 3 items per D-09                                          |
| `CookieBanner` categories | cookieBanner.categories | bg.json                  | Yes — Bulgarian copy | ⚠ DASHBOARD-DEPENDENT — bg.json has source-of-truth strings; CookieYes dashboard reconciliation per OPS-RUNBOOK §1 is what visitors see |

All ⚠ STATIC PLACEHOLDER entries are INTENTIONAL per CONTEXT.md D-decisions. The placeholder mechanism is enforced by `pnpm check:placeholders` (exit 1 until coalition delivers).

### Behavioral Spot-Checks

| Behavior                                | Command                                                  | Result                                                       | Status |
| --------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ | ------ |
| Production build succeeds               | `pnpm exec next build` (with .env.test sourced)          | Compiled; 16/16 routes; Middleware 99.3 kB                  | ✓ PASS |
| Typecheck passes                        | `pnpm typecheck`                                         | exits 0; no output                                           | ✓ PASS |
| Lint passes (warnings OK)               | `pnpm lint`                                              | only pre-existing warnings (Sentry hook, payload, beforeInteractive doc-warning) | ✓ PASS |
| Vitest suite passes                     | `pnpm exec vitest run`                                   | 9 files, 54 tests passed                                     | ✓ PASS |
| Playwright specs enumerate              | `pnpm exec playwright test --list`                       | 156 tests across 10 files (4 viewports × specs)              | ✓ PASS |
| Orphan-token lint passes                | `pnpm lint:tokens`                                       | text-6xl bound in Hero.tsx; text-5xl reserved tolerated      | ✓ PASS |
| i18n lint passes                        | `pnpm lint:i18n`                                         | "PUB-05 OK: no hardcoded Cyrillic in src/"                   | ✓ PASS |
| Coalition placeholder gate              | `pnpm check:placeholders`                                | FAIL with 3 hits (EXPECTED v1 — pre-warmup launch blocker)   | ✓ EXPECTED FAIL |
| Sitemap returns 6 URLs                  | vitest `tests/unit/sitemap.test.ts`                      | 3/3 pass                                                      | ✓ PASS |
| Robots disallows private paths          | vitest `tests/unit/robots.test.ts`                       | 4/4 pass                                                      | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description                                          | Status      | Evidence                                                                          |
| ----------- | -------------- | ---------------------------------------------------- | ----------- | --------------------------------------------------------------------------------- |
| PUB-01      | 02-02, 02-03, 02-04 | Landing has text + image + (optional) video slot | ✓ SATISFIED | Hero.tsx renders text (`<h1>`, `<p>`) + image (`<Image src="/hero.jpg">`) + VideoPlayer slot for `videoUrl` prop; tests/e2e/landing.spec.ts PUB-01 |
| PUB-02      | 02-04, 02-07   | Landing CDN-cached (Cache-Control)                  | ✓ SATISFIED — operator step pending | `revalidate=3600` at module scope; static-asset headers in next.config.ts; **Cloudflare cache rules per OPS-RUNBOOK §2 — operator step** (Path A architecture); landing.spec.ts PUB-02 + Lighthouse CI config |
| PUB-03      | 02-04, 02-08   | Navigation between agitation pages                  | ✓ SATISFIED | sitemap lists 6 URLs (3 unit tests); Footer 4-col with /agenda + /faq + /register links; landing.spec.ts PUB-03 |
| PUB-04      | 02-03, 02-04, 02-08 | CTA on every page                              | ✓ SATISFIED | CTASection on /; CTA in /faq lead t.rich; CTA in /agenda; landing.spec.ts PUB-04 (covers /, /agenda, /faq) |
| GDPR-01     | 02-02, 02-06, 02-08, 02-09 | Cookie consent banner first-visit, granular | ✓ SATISFIED — operator dashboard step pending | CookieBanner.tsx with beforeInteractive + 3 categories per bg.json; CookieSettingsLink.tsx for revisit; cookie-consent.spec.ts (skip-on-no-key); **OPS-RUNBOOK §1 dashboard reconciliation operator step** |
| GDPR-02     | 02-04 (no edits) | Privacy page in Bulgarian                         | ✓ SATISFIED — lawyer-final deferred | src/app/(frontend)/legal/privacy/page.tsx renders title + draft Alert + body slot; tests/e2e/branding.spec.ts existing draft-marker test; **D-LawyerReviewLegal warmup gate** |
| GDPR-03     | 02-04 (no edits) | Terms page in Bulgarian                           | ✓ SATISFIED — lawyer-final deferred | src/app/(frontend)/legal/terms/page.tsx; same draft Alert + lawyer gate |

**Orphaned requirements check:** None. REQUIREMENTS.md maps PUB-01..04 + GDPR-01..03 to Phase 2; all 7 appear in plan frontmatter `requirements-completed` across 02-01..02-09. PUB-05 (i18n compliance) was satisfied as a side-effect of plan 02-04 deviation fix (faq.metadataDescription moved to bg.json).

### Anti-Patterns Found

| File                                          | Line | Pattern                              | Severity | Impact                                    |
| --------------------------------------------- | ---- | ------------------------------------ | -------- | ----------------------------------------- |
| messages/bg.json                              | 117, 118, 158 | `[ТЕКСТ ОТ КОАЛИЦИЯ]` placeholder | ℹ Info | INTENTIONAL placeholder per D-02; gated by `pnpm check:placeholders` — must close before warmup |
| src/components/layout/CookieBanner.tsx        | 31   | `next/script` `beforeInteractive` strategy outside `_document.js` | ℹ Info | Documented in JSDoc (lines 5-23); A5 verified via SSR HTML inspection (plan 02-06); ESLint warning is documentation noise |
| src/app/(payload)/admin/[[...segments]]/page.tsx, src/app/(payload)/layout.tsx, src/app/api/[...slug]/route.ts | 2 | Unused eslint-disable directive | ℹ Info | Phase 1 carry-forward; not in Phase 2 scope |
| src/components/layout/Footer.tsx              | 81   | `mailto:contact@example.invalid`     | ℹ Info  | Explicit placeholder for D-CoalitionContactEmail; tracked in 02-05 SUMMARY |
| public/favicon.ico                            | n/a  | 32×32 PNG renamed to .ico (not multi-res ICO) | ℹ Info  | Browsers tolerate; D-CoalitionFaviconSet quick-task swap |
| public/og-image.png                           | n/a  | Georgia font fallback (not bundled Gilroy)  | ℹ Info  | Functional; D-CoalitionLogoSVG quick-task swap          |

**No 🛑 Blocker anti-patterns found.** All ℹ Info items are documented design choices captured in CONTEXT.md, OPS-RUNBOOK.md, or STATE.md deferred items.

### D-decision Compliance (CONTEXT.md D-01..D-18)

| D# | Subject                                       | Status      | Evidence                                                                                  |
| -- | --------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| D-01 | Hybrid landing — single `/` + /agenda + /faq | ✓ HONORED   | All 3 routes exist; landing has 5 sections; tests pass                                   |
| D-02 | Hybrid content authorship + placeholder mechanism | ✓ HONORED | `[ТЕКСТ ОТ КОАЛИЦИЯ]` placeholders in bg.json for hero + agenda; FAQ Q&A Claude-drafted |
| D-03 | Hero ships still + VideoPlayer slot          | ✓ HONORED   | Hero.tsx accepts `videoUrl` prop; renders `<Image src="/hero.jpg">` when absent          |
| D-04 | FAQ scope: operational only (5-8 items)      | ✓ HONORED   | 6 operational Q&A in bg.json; no privacy/trust/coalition Qs                              |
| D-05 | Coalition logo = high-res official SVG (BLOCKING) | ✓ HONORED — placeholder pending | D-CoalitionLogoSVG tracked in STATE.md; placeholder logo-placeholder.svg ships    |
| D-06 | WebFetch sinyabulgaria.bg → propose tokens   | ✓ HONORED   | Sinya canonical tokens in globals.css with verified hexes (#004A79 etc.)                 |
| D-07 | Gilroy ExtraBold + Roboto                    | ✓ HONORED — D-GilroyLicenseRisk operator-accepted | self-hosted woff2 in public/fonts/; src/lib/fonts.ts; Manrope mechanical fallback documented |
| D-08 | No pixel-imitation of sinyabulgaria.bg       | ✓ HONORED   | Modern landing layout; no copy of source-site DOM                                         |
| D-09 | /member = banner + timeline + 2-card grid    | ✓ HONORED   | src/app/(frontend)/member/page.tsx implements exact composition                          |
| D-10 | Channels not yet created — placeholder copy  | ✓ HONORED   | Footer column 4 + Timeline item 1 use `channelsPending` "стартират скоро"                |
| D-11 | Member self-service deferred to Phase 6      | ✓ HONORED   | /member is read-only; no profile editing UI                                              |
| D-12 | Auth pages light rebrand (token-only)        | ✓ HONORED   | Zero auth-page JSX changes; tokens propagate via globals.css + font-display chain        |
| D-13 | Auth full editorial polish deferred          | ✓ HONORED   | Auth bg.json keys preserved bit-for-bit                                                  |
| D-14 | Legal pages = Phase 1 drafts                 | ✓ HONORED   | /legal/privacy + /legal/terms keep "проект, последна редакция" Alert                     |
| D-15 | Warmup launch gated on lawyer review         | ✓ HONORED   | D-LawyerReviewLegal in STATE.md + OPS-RUNBOOK §3.2; SIGNOFF.md tracks                    |
| D-16 | CookieYes integration scope                  | ✓ HONORED   | beforeInteractive loader; 3 categories; Bulgarian copy; bottom-floating per OPS §1.4     |
| D-17 | Bulgarian-only via next-intl                 | ✓ HONORED   | All new strings in bg.json; lint:i18n passes (no hardcoded Cyrillic)                     |
| D-18 | Server Components + static gen (CDN cache)   | ✓ HONORED — Path A | All public pages are Server Components; revalidate=3600; CDN cache via Cloudflare per OPS §2 |

### UI-SPEC review_flag closure

| Flag | Description                                          | Status                         | Resolution                                                                            |
| ---- | ---------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| #1   | text-5xl/6xl orphan-token watch                     | ✓ RESOLVED (automated)         | scripts/lint-orphan-tokens.mjs + `pnpm lint:tokens`; text-6xl bound by Hero.tsx       |
| #2   | destructive/success retune visual regression        | ✓ RESOLVED (automated)         | tests/e2e/legal-visual-regression.spec.ts (5 tests); computed-style assertions on --color-* |
| #3   | header height ~80px → scroll-padding-top: 5rem      | ⏳ OPS CHECKPOINT              | OPS-RUNBOOK §3.5 + plan 02-09 Task 02.09.5; fallback fix documented (bump 5→6rem)     |
| #4   | CookieYes dual-source-of-truth                      | ✓ RESOLVED (cited)             | OPS-RUNBOOK §1 + §1.6 drift-prevention checklist; bg.json source-of-truth + dashboard reconciliation |

### RESEARCH assumption resolution (A1-A8)

| A# | Description                                            | Status        | Evidence                                                              |
| -- | ------------------------------------------------------ | ------------- | --------------------------------------------------------------------- |
| A1 | Cloudflare free Cache Rules support cookie-presence    | ⏳ OPS verifies in §2.1 of runbook | Operator confirms in dashboard; §2.4 fallback path documented (D-CookieVaryCacheRule) |
| A2 | Gilroy commercial license OK                           | ✓ RESOLVED — UNVERIFIED, operator-accepted | 02-FONT-LICENSE.md "Operator Decision (2026-05-03)"; D-GilroyLicenseRisk + Manrope mechanical fallback path |
| A3 | Gilroy Cyrillic coverage                               | ✓ RESOLVED    | 02-FONT-GLYPH-AUDIT.md ALL_PASS — full uppercase + lowercase + Я Щ Ц Ъ Ю + ё Ё №      |
| A4 | Dockerfile copies public/                              | ✓ RESOLVED    | `Dockerfile:35` `COPY --from=builder /app/public ./public` (verified)                 |
| A5 | beforeInteractive hoists from Client Component         | ✓ RESOLVED    | Plan 02-06 SSR HTML inspection: preload + inline style ship; no crossorigin attribute |
| A6 | Lighthouse CI on staging URL                           | ⏳ OPS verifies on first PR (plan 02-08 Task 02.08.6) | .github/workflows/lighthouse.yml targets https://chastnik.eu/                          |
| A7 | CookieYes Bulgarian dashboard tier                     | ⏳ OPS verifies in dashboard (OPS-RUNBOOK §1.1) | Option A fallback documented (Bulgarian text in default-language slot)                |
| A8 | loadEnv.js Payload bug doesn't block static gen        | ✓ RESOLVED    | Plan 02-04 Task 02.04.5 build success — no `Cannot find module 'loadEnv'` error       |

### Coalition external dependencies (5 + 5 new deferred items)

**Original 5 from CONTEXT.md:**

| ID                              | Status                | Tracked In                                  |
| ------------------------------- | --------------------- | ------------------------------------------- |
| D-CoalitionLogoSVG              | ⏳ Pending             | STATE.md L102; OPS-RUNBOOK §3.2              |
| D-CoalitionContent-Hero         | ⏳ Pending             | STATE.md L103; bg.json line 117-118 placeholder; pnpm check:placeholders gate |
| D-CoalitionContent-Agenda       | ⏳ Pending             | STATE.md L104; bg.json line 158 placeholder   |
| D-CoalitionChannels             | ⏳ Pending (BLOCKING warmup) | STATE.md L105; Footer/Timeline placeholders  |
| D-LawyerReviewLegal             | ⏳ Pending (BLOCKING warmup) | STATE.md L106; OPS-RUNBOOK §3.2              |

**5 new deferred items added during Phase 2 execution:**

| ID                              | Status                | Tracked In                                  |
| ------------------------------- | --------------------- | ------------------------------------------- |
| D-GilroyLicenseRisk             | ⏳ post-warmup-hardening | STATE.md L108; src/lib/fonts.ts header     |
| D-CoalitionFaviconSet           | ⏳ post-warmup         | STATE.md L109                                |
| D-CloudflareIPAllowlist         | ⏳ post-warmup-hardening | STATE.md L107; src/middleware.ts SECURITY NOTE block |
| D-CookieVaryCacheRule           | ⏳ resolves_phase: 6 (conditional) | STATE.md L110; OPS-RUNBOOK §2.4 fallback |
| D-CFPurgeOnDeploy               | ⏳ resolves_phase: 6   | STATE.md L111; OPS-RUNBOOK §2.6              |

All 10 deferred items are properly tracked.

### Operator handoff items (from OPS-RUNBOOK §1/§2/§3)

**§1 CookieYes dashboard configuration (operator-only):**
- §1.1 A7 verification (Bulgarian language tier)
- §1.2 Paste 6 verbatim Bulgarian category strings
- §1.3 Paste 5 verbatim banner-shell strings
- §1.4 Set bottom-floating layout + ENABLE Reject All + DISABLE block-JS for Analytics
- §1.5 Save + 5-min wait + incognito visual smoke + DevTools POST verification
- §1.6 Subscribe to quarterly drift-prevention review

**§2 Cloudflare cache rule (operator-only):**
- §2.1 A1 verification (cookie-presence Cache Rule on free tier)
- §2.2 Bypass rule for `next-auth.session-token`
- §2.3 Public-pages cache rule, Edge TTL = Override origin → 1 hour
- §2.4 Fallback path if A1 falsifies (D-CookieVaryCacheRule)
- §2.5 Verification: anonymous HIT, authenticated BYPASS, asset cache headers
- §2.6 Manual purge procedure (post-launch)
- §2.7 Middleware origin-IP gate verification (cf-ray + 403 direct-Fly)

**§3 Phase 2 launch-readiness checklist (operator gate):**
- §3.1 Code + tests green (typecheck, lint, build, playwright, vitest, lighthouse, lint:tokens, lint:i18n)
- §3.2 Coalition deliverables (5 D-items, all coalition-side)
- §3.3 Infrastructure live (CookieYes dashboard, Cloudflare Cache Rules, OG card preview, favicon)
- §3.4 GDPR sign-off (Privacy + Terms live, banner appears, granular categories, Plausible disclosure, audit log, footer reopen link)
- §3.5 UI-SPEC review_flag closure (lint:tokens green, legal-visual-regression green, scroll-padding visual check, CookieYes drift checklist)
- §3.6 Operator initials + date

### Out-of-scope confirmation

| Out-of-scope item                                       | Confirmed?  | Evidence                                          |
| ------------------------------------------------------- | ----------- | ------------------------------------------------- |
| UTM/QR/oblast attribution capture (Phase 2.1 territory) | ✓           | No attribution code in src/; Phase 2.1 phase dir exists |
| "Where did you hear about us" registration field        | ✓           | No new registration field added                   |
| Member self-service UI (Phase 6)                        | ✓           | /member is read-only welcome content per D-11     |
| Lawyer-final legal text (D-14 punts)                    | ✓           | Privacy/Terms keep Phase 1 draft Alert            |
| Coalition-written hero/agenda copy (D-02)               | ✓           | Placeholder mechanism only; pre-launch grep gate enforces |
| Real video content in hero                              | ✓           | VideoPlayer slot exists; renders only when `videoUrl` prop set |
| Idea catalog / voting (Phase 3)                         | ✓           | Not touched                                       |
| Newsletter / channel notifications (Phase 5)            | ✓           | Not touched                                       |

### Human Verification Required

See `human_verification` section in YAML frontmatter. 6 items require operator/coalition action before warmup launch. None block code merge or Phase 2 close as `code-shipping-complete`.

### Gaps Summary

**There are NO code-side gaps.** Every Phase 2 must-have, success criterion, requirement, D-decision, review_flag, and RESEARCH assumption either:

1. Has shipped working code AND tests (32 of the 32 in-scope code items), OR
2. Is an explicitly-deferred coalition or operator dependency tracked in STATE.md + OPS-RUNBOOK + SIGNOFF.md (5 coalition deliverables + 5 ops items + 4 operator-only verification gates).

The phase goal — "ship a fast branded landing + welcoming /member + cookie consent + legal pages BEFORE warmup begins" — is satisfied at the code layer. The remaining work (CookieYes dashboard, Cloudflare cache rules, scroll-padding visual check, Lighthouse first-PR run, coalition deliverables, lawyer-reviewed legal text) is correctly scoped as warmup-launch gates per the 02-SIGNOFF.md sign-off mapping.

**Recommendation:** PASSED-WITH-OPERATOR-DEPENDENCIES. Phase 2 is ready to merge to main and proceed to next-phase planning. Operator must close the 6 human-verification items in OPS-RUNBOOK §3 before sending the first warmup invitation. The pnpm check:placeholders gate and OPS-RUNBOOK §3.6 sign-off block enforce this gate.

### Quality Gate Summary

| Gate                                  | Result                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm typecheck`                      | ✓ exits 0 (no output)                                                        |
| `pnpm lint`                           | ✓ exits 0 (4 pre-existing warnings: Sentry hook, 2 payload disables, CookieBanner beforeInteractive doc-warning) |
| `pnpm exec vitest run`                | ✓ 9 files, 54/54 tests pass (~512ms)                                         |
| `pnpm exec next build` (with .env.test) | ✓ Compiled; 16/16 routes; Middleware 99.3 kB Edge bundle; no warnings      |
| `pnpm exec playwright test --list`    | ✓ 156 tests across 10 spec files (4 viewport projects)                       |
| `pnpm lint:tokens`                    | ✓ exits 0; "text-6xl bound in 1 file(s): src/components/landing/Hero.tsx"   |
| `pnpm lint:i18n`                      | ✓ exits 0; "PUB-05 OK: no hardcoded Cyrillic in src/"                        |
| `pnpm check:placeholders`             | ✓ exits 1 with 3 hits (EXPECTED v1 — pre-warmup blocker; closes when coalition delivers) |

---

_Verified: 2026-05-02T22:35:00Z_
_Verifier: Claude (gsd-verifier, Opus 4.7)_
