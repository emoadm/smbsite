# Phase 2 — Sign-off (Warmup Launch Gate)

**Phase:** 02-public-surface-pre-warmup
**Last updated:** 2026-05-03
**Status:** code-shipping-complete; awaiting coalition deliverables + operator sign-off (per 02-OPS-RUNBOOK.md §3)
**Validation contract:** see `02-VALIDATION.md` for the per-Nyquist-row test map. This file records the AS-OF-WARMUP status of each row.

Maps each ROADMAP.md Phase 2 success criterion to its verification artifact. All 4 ROADMAP success criteria + the 7 requirement IDs (PUB-01..04, GDPR-01..03) are accounted for.

> **Naming note (revision 2026-05-03):** This file was originally drafted as `02-VALIDATION.md` in plan 02-09. It has been renamed to `02-SIGNOFF.md` to avoid collision with the long-lived `02-VALIDATION.md` (the Nyquist gate / validation contract extracted from `02-RESEARCH.md` per plan-checker recommendation 2). The two files complement each other: 02-VALIDATION.md is the spec; 02-SIGNOFF.md is the as-of-warmup record.

## ROADMAP success criteria

### SC-1: Visiting the root URL renders a public landing page within 2 seconds on simulated Slow 4G; the page is served from Cloudflare CDN cache and does not redirect anonymous visitors away from real content

| Verification | Status | Artifact |
|--------------|--------|----------|
| Static gen + revalidate | ✓ code | `src/app/(frontend)/page.tsx` `export const revalidate = 3600` (plan 02-04 Task 02.04.1) |
| Cache-Control header | ✓ code + test | tests/e2e/landing.spec.ts PUB-02 + plan 02-04 Task 02.04.5 verification |
| Cloudflare CDN serving anonymous | ⏳ ops | 02-OPS-RUNBOOK.md §2 + plan 02-07 Task 02.07.5 operator checkpoint |
| Slow 4G LCP <= 2s | ⏳ ci | .lighthouserc.json LCP <= 2500ms (plan 02-08); first PR shows Lighthouse result |
| No redirect | ✓ code | src/app/(frontend)/page.tsx renders Hero + sections directly (no redirect call) |

### SC-2: Landing page communicates the coalition's mission, value proposition, and call-to-action clearly in Bulgarian; design uses the Sinya color palette and logo from sinyabulgaria.bg

| Verification | Status | Artifact |
|--------------|--------|----------|
| Mission + value prop sections | ✓ code | ProblemSection + VisionSection components (plan 02-03 Task 02.03.2) |
| CTA visible | ✓ test | tests/e2e/landing.spec.ts PUB-04 |
| Bulgarian-only | ✓ test | tests/e2e/branding.spec.ts BRAND-06 + i18n grep gate (Phase 1 OPS) |
| Sinya palette tokens | ✓ test | tests/e2e/legal-visual-regression.spec.ts review_flag #2 (plan 02-09 Task 02.09.2) |
| Coalition logo | ⏳ deferred | D-CoalitionLogoSVG — placeholder ships; final asset post-launch |
| Coalition hero copy | ⏳ deferred | D-CoalitionContent-Hero — placeholder mechanism active; pre-launch grep gate (plan 02-08 Task 02.08.5) |

### SC-3: A registered, email-verified member who lands on /member sees a welcoming Bulgarian page that explains what comes next (community channels, Telegram/WhatsApp Channel links, what to expect from email updates) — not a placeholder

| Verification | Status | Artifact |
|--------------|--------|----------|
| /member welcome composition | ✓ code | src/app/(frontend)/member/page.tsx renders MemberWelcomeBanner + Timeline + 2-card grid (plan 02-05 Task 02.05.1) |
| Bulgarian welcome copy | ✓ code | messages/bg.json member.welcome.* (plan 02-02) |
| Channel links | ⏳ deferred | D-CoalitionChannels — "стартират скоро" copy ships; quick task swaps URLs once delivered |
| Email cadence explanation | ✓ code | member.welcome.next.items[0] timeline item |
| Old placeholder gone | ✓ code | member.placeholder.* DELETED from bg.json (plan 02-02 acceptance criterion) |

### SC-4: Privacy Policy, Terms of Use, and granular cookie consent banner are live and accessible to every visitor before any interaction is recorded

| Verification | Status | Artifact |
|--------------|--------|----------|
| /legal/privacy renders | ✓ test | tests/e2e/branding.spec.ts draft-marker test (existing) |
| /legal/terms renders | ✓ test | same |
| Cookie banner appears first-visit | ✓ test | tests/e2e/cookie-consent.spec.ts (plan 02-08 Task 02.08.1) |
| Granular categories | ✓ test | same — necessary / analytics / marketing |
| Plausible "без бисквитки" copy | ✓ test | bg.json acceptance criterion (plan 02-02) + dashboard config (plan 02-06 §1) |
| Cookie-settings reopen link | ✓ code | Footer `<CookieSettingsLink>` calls window.revisitCkyConsent() (plan 02-09 Task 02.09.3) |
| Lawyer-reviewed legal text | ⏳ deferred | D-LawyerReviewLegal — draft text ships; warmup launch gated on lawyer review per D-15 |

## Requirement-level coverage

| ID | Description | Verification |
|----|-------------|--------------|
| PUB-01 | Landing has text/video/image | tests/e2e/landing.spec.ts |
| PUB-02 | Landing CDN-cached | tests/e2e/landing.spec.ts + .lighthouserc.json + 02-OPS-RUNBOOK §2 |
| PUB-03 | Navigation between agitation pages | tests/e2e/landing.spec.ts + tests/unit/sitemap.test.ts |
| PUB-04 | CTA on every page | tests/e2e/landing.spec.ts (covers /, /agenda, /faq) |
| GDPR-01 | Cookie consent banner first-visit, granular | tests/e2e/cookie-consent.spec.ts |
| GDPR-02 | Privacy page in Bulgarian | tests/e2e/branding.spec.ts (existing draft-marker test) |
| GDPR-03 | Terms page in Bulgarian | tests/e2e/branding.spec.ts (existing) |

## UI-SPEC review_flags resolution

| Flag | Status | Resolution |
|------|--------|------------|
| #1 text-5xl/6xl orphan-token watch | ✓ resolved | scripts/lint-orphan-tokens.mjs (plan 02-09 Task 02.09.1); text-6xl bound by Hero.tsx; text-5xl tolerated as reserved |
| #2 destructive/success retune visual regression | ✓ resolved | tests/e2e/legal-visual-regression.spec.ts (plan 02-09 Task 02.09.2) |
| #3 header height ~80px scroll-padding-top: 5rem | ⏳ ops | Operator visual check (plan 02-09 Task 02.09.5 checkpoint + 02-OPS-RUNBOOK §3.5) |
| #4 CookieYes dual-source-of-truth | ✓ resolved | 02-OPS-RUNBOOK.md §1 (plan 02-06 Task 02.06.3) + drift-prevention checklist §1.6 |

## RESEARCH assumptions resolution

| A# | Description | Status |
|----|-------------|--------|
| A1 | Cloudflare free Cache Rules support cookie-presence | ⏳ ops verifies in §2 of runbook |
| A2 | Gilroy commercial license OK | ✓ resolved (plan 02-01 02-FONT-LICENSE.md) |
| A3 | Gilroy Cyrillic coverage | ✓ resolved (plan 02-01 02-FONT-GLYPH-AUDIT.md) |
| A4 | Dockerfile copies public/ | ✓ verified (plan 02-01 Task 02.01.4) |
| A5 | beforeInteractive hoists from Client Component | ✓ verified (plan 02-06 Task 02.06.2) |
| A6 | Lighthouse CI on staging URL | ⏳ ops verifies on first PR (plan 02-08 Task 02.08.6) |
| A7 | CookieYes Bulgarian dashboard tier | ⏳ ops verifies in dashboard (plan 02-06 §1.1) |
| A8 | loadEnv.js Payload bug doesn't block static gen | ✓ verified (plan 02-04 Task 02.04.5 build success) |

## Phase-gate sign-off

Phase 2 is cleared for warmup invitations when:
- All ✓ items above remain true on the latest main-branch deploy
- All ⏳ items have moved to ✓
- 02-OPS-RUNBOOK.md §3.6 sign-off block has operator initials

Last verification run: __________________
