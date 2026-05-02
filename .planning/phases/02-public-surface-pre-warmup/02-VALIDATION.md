---
phase: 2
slug: public-surface-pre-warmup
status: draft
nyquist_compliant: pending
wave_0_complete: pending
created: 2026-05-02
extracted: 2026-05-03
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: extracted from `02-RESEARCH.md` § Validation Architecture (revision 2026-05-03 per plan-checker recommendation 2 — research files should not host long-lived validation contracts).

This document is the canonical Nyquist gate for Phase 2. Every Phase 2 task that produces production code or content must trace its `<verify><automated>` line back to one of the rows below. The end-of-phase sign-off artifact (`02-SIGNOFF.md`, produced by plan 02-09) consumes this file and asserts each row's status flips to ✅ before warmup.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (unit)** | Vitest 2.1.8 (already wired Phase 1) |
| **Framework (E2E)** | Playwright 1.49.1 + `@playwright/test` |
| **Config file (unit)** | `vitest.config.mts` (project root) — Phase 1 |
| **Config file (E2E)** | `playwright.config.ts` (project root) — Phase 1; viewport projects `chromium-desktop`, `chromium-mobile-360`, `chromium-mobile-375` |
| **Quick run command** | `pnpm test:unit` |
| **Full E2E command** | `pnpm test:e2e` (multi-viewport) |
| **Specific spec** | `pnpm exec playwright test tests/e2e/landing.spec.ts --project=chromium-desktop` |
| **Performance gate** | `treosh/lighthouse-ci-action@v12` against production after deploy (plan 02-08 Task 02.08.4) |
| **Estimated runtime (quick)** | ~10 s |
| **Estimated runtime (full)** | ~60–90 s + Lighthouse CI ~3 min on PR |

---

## Sampling Rate

- **Per task commit:** `pnpm test:unit` (~10 s) + `pnpm exec playwright test --project=chromium-desktop` (~30 s)
- **Per wave merge:** Full multi-viewport Playwright suite + Vitest — ~3 min
- **Per PR:** Lighthouse CI runs against the production URL after deploy, gating on Performance ≥ 90, LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms, A11y ≥ 0.95, SEO ≥ 0.95
- **Before plan 02-09 sign-off:** Full suite green + UI-SPEC review_flag automated checks (lint:tokens, legal-visual-regression) + operator scroll-padding visual verify
- **Max feedback latency:** 90 s for code; ~3 min for Lighthouse on PR

---

## Phase Success Criteria → Verification Map

> ROADMAP.md Phase 2 Success Criteria SC-1..SC-4 (lines 70–73). Each row maps to one or more requirement IDs and one or more concrete verification commands. Plans 02-08 and 02-09 finalize the sign-off table.

### SC-1 — Landing renders in <2 s on Slow 4G; CDN-cached; no anonymous-redirect

| Verification | Type | Plan / Task | Automated Command | Status |
|--------------|------|-------------|-------------------|--------|
| `export const revalidate = 3600` lives at module scope of `/`, `/agenda`, `/faq` | Static check | 02-04 Task 02.04.1–02.04.3 | `grep -q "export const revalidate = 3600" src/app/(frontend)/{page,agenda/page,faq/page}.tsx` | ⬜ pending |
| `Cache-Control: s-maxage=3600` emitted from origin on each public route | Smoke (port-wait poll) | 02-04 Task 02.04.5 (checkpoint) | `curl -sI http://localhost:3000/ \| grep s-maxage=3600` (and /agenda, /faq) | ⬜ pending |
| Cloudflare `cf-cache-status: HIT` after warm cache | Production curl | 02-OPS-RUNBOOK §2.5 | `curl -sI https://chastnik.eu/ \| grep cf-cache-status` returns HIT on 2nd request | ⬜ pending |
| LCP ≤ 2500 ms on Slow 4G profile | Lighthouse CI | 02-08 Task 02.08.4 | `treosh/lighthouse-ci-action@v12` with `largest-contentful-paint: maxNumericValue=2500` | ⬜ pending |
| Performance ≥ 0.9, A11y ≥ 0.95, SEO ≥ 0.95 | Lighthouse CI | 02-08 Task 02.08.4 | same workflow, `categories:performance / accessibility / seo` thresholds | ⬜ pending |
| `/` does NOT call `redirect()` (anonymous-visit body renders Hero directly) | Static check | 02-04 Task 02.04.1 | `! grep -q "redirect(" src/app/(frontend)/page.tsx` | ⬜ pending |
| `tests/e2e/landing.spec.ts` exists with PUB-01..04 coverage | E2E | 02-08 Task 02.08.1 | `pnpm exec playwright test tests/e2e/landing.spec.ts` | ⬜ pending |

### SC-2 — Bulgarian mission/value/CTA copy; Sinya palette + logo

| Verification | Type | Plan / Task | Automated Command | Status |
|--------------|------|-------------|-------------------|--------|
| Mission + Vision + CTA sections render with copy from `bg.json` `landing.*` namespace | E2E | 02-08 Task 02.08.1 | `pnpm exec playwright test tests/e2e/landing.spec.ts -g "mission\|vision\|cta"` | ⬜ pending |
| All visible page strings come from `messages/bg.json` (no hardcoded Cyrillic in `.tsx`) | CI lint | Phase 1 OPS-RUNBOOK `lint:i18n` (extends to Phase 2 components) | `pnpm lint:i18n` | ⬜ pending |
| `--color-primary` resolves to `#004A79` (Sinya navy) | E2E (computed style) | 02-09 Task 02.09.2 | `tests/e2e/legal-visual-regression.spec.ts` reads `getComputedStyle(documentElement).getPropertyValue('--color-primary')` | ⬜ pending |
| `--color-destructive` retuned to `#DC2626`; `--color-success` to `#059669` | E2E (computed style) | 02-09 Task 02.09.2 | same spec, additional assertions | ⬜ pending |
| Coalition logo SVG renders in Header on every public page | E2E (existing) | Phase 1 BRAND-02 + extend in 02-08 Task 02.08.2 | `pnpm exec playwright test tests/e2e/branding.spec.ts -g "logo"` | ⬜ pending |
| Hero h1 computed `font-family` includes `Gilroy` (or `--font-gilroy`) | E2E (typography) | 02-08 Task 02.08.1 (`tests/e2e/typography.spec.ts`) | `pnpm exec playwright test tests/e2e/typography.spec.ts -g "Gilroy"` | ⬜ pending |
| Cyrillic `Я Щ Ц Ъ Ю` renders without fallback boxes at hero size | E2E (visual regression) | 02-08 Task 02.08.1 (`tests/e2e/typography.spec.ts`) | bounding-box height assertion | ⬜ pending |
| `[ТЕКСТ ОТ КОАЛИЦИЯ]` placeholder grep gate (must FAIL before warmup, indicating coalition delivery still pending) | CI script | 02-08 Task 02.08.5 | `pnpm check:placeholders` exits 1 until coalition delivers (expected pre-launch) | ⬜ pending |
| `text-6xl` Tailwind utility is bound by Hero.tsx (orphan-token watch) | CI lint | 02-09 Task 02.09.1 | `pnpm lint:tokens` exits 0 | ⬜ pending |
| `<h1>` page titles use raw `font-display text-3xl` (Pattern P9) — never shadcn `CardTitle` | Static check | 02-04, 02-05 acceptance criteria | `grep -L "CardTitle" src/app/(frontend)/(auth)/{register,login}/page.tsx src/app/(frontend)/auth/otp/page.tsx` | ⬜ pending |

### SC-3 — Verified member sees real /member welcome (not placeholder)

| Verification | Type | Plan / Task | Automated Command | Status |
|--------------|------|-------------|-------------------|--------|
| `/member` page renders `<MemberWelcomeBanner>` + `<Timeline>` + 2-card grid | Static check + E2E | 02-05 Task 02.05.1 + 02-08 Task 02.08.2 | `grep -q "MemberWelcomeBanner" src/app/(frontend)/member/page.tsx` + Playwright | ⬜ pending |
| Old `member.placeholder` namespace is GONE from bg.json AND no consumer in src/ | Static check | 02-02 + 02-05 Task 02.05.1 acceptance | `! grep -rn "member\.placeholder" src/ messages/bg.json` | ⬜ pending |
| 2-card grid links to `/agenda` and `/faq` | Static check | 02-05 Task 02.05.1 | `grep -E 'href="/(agenda\|faq)"' src/app/(frontend)/member/page.tsx` | ⬜ pending |
| Welcome banner displays the member's `firstName` (interpolated via t.rich, no `dangerouslySetInnerHTML`) | E2E | 02-08 Task 02.08.2 | extend `tests/e2e/branding.spec.ts` or new spec | ⬜ pending |
| `/member` is dynamic per-session (NO `export const revalidate` on the page) | Static check | 02-05 Task 02.05.1 | `! grep -q "export const revalidate" src/app/(frontend)/member/page.tsx` | ⬜ pending |
| Footer "Канали" column shows "стартират скоро" placeholder (D-10 fact, not omission) | Static check | 02-05 Task 02.05.2 | `grep -q "channelsPending" src/components/layout/Footer.tsx` | ⬜ pending |

### SC-4 — Privacy Policy + Terms of Use + granular cookie consent live

| Verification | Type | Plan / Task | Automated Command | Status |
|--------------|------|-------------|-------------------|--------|
| `/legal/privacy` and `/legal/terms` render with draft Alert + Bulgarian body | E2E (existing) | Phase 1 + extended in 02-09 Task 02.09.2 | `pnpm exec playwright test tests/e2e/branding.spec.ts -g "draft marker"` | ✅ existing |
| Cookie banner appears on first incognito visit | E2E | 02-08 Task 02.08.1 | `pnpm exec playwright test tests/e2e/cookie-consent.spec.ts -g "first-visit"` | ⬜ pending |
| Three granular categories present (necessary / analytics / marketing) | E2E + dashboard reconciliation | 02-08 Task 02.08.1 + 02-OPS-RUNBOOK §1.2 | spec asserts 3 toggles + operator runs §1.2 | ⬜ pending |
| Plausible "без бисквитки" disclosure present in analytics description | Dashboard + bg.json | 02-02 + 02-OPS-RUNBOOK §1.2 | `grep -q "без бисквитки" messages/bg.json` + dashboard match | ⬜ pending |
| `Reject All` button enabled with equal prominence to `Accept All` | Dashboard | 02-OPS-RUNBOOK §1.4 | operator confirms in incognito after dashboard save | ⬜ pending |
| `/api/cookie-consent` audit POST fires on consent decision (Phase 1 endpoint) | E2E network capture | 02-08 Task 02.08.1 | spec listens for POST `/api/cookie-consent` after Accept-All click | ⬜ pending |
| CookieYes script tag renders WITHOUT `crossorigin` attribute (A5 verification) | Smoke (port-wait poll) | 02-06 Task 02.06.2 | `! curl -s http://localhost:3000/ \| grep -E '<script[^>]*cookieyes[^>]*crossorigin'` | ⬜ pending |
| Lawyer-reviewed legal text deferred (D-15) — warmup launch gated on lawyer sign-off | Manual gate | 02-OPS-RUNBOOK §3 launch checklist | operator initials in §3.5 | ⬜ pending |

---

## Phase Requirements → Test Map

> Mirrors `02-RESEARCH.md` § Phase Requirements. Every requirement ID listed in ROADMAP Phase 2 (`PUB-01..04`, `GDPR-01..03`) gets at least one automated row.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PUB-01 | Landing has text + image + (optional) video slot | E2E | `pnpm exec playwright test tests/e2e/landing.spec.ts -x` | ❌ Wave 0 → 02-08 |
| PUB-02 | Landing is statically rendered + Cache-Control header set | E2E + Lighthouse CI | `pnpm exec playwright test tests/e2e/landing.spec.ts -g "cache-headers"` + Lighthouse on PR | ❌ Wave 0 → 02-08 |
| PUB-03 | Navigation between `/`, `/agenda`, `/faq` works | E2E | `pnpm exec playwright test tests/e2e/landing.spec.ts -g "navigation"` | ❌ Wave 0 → 02-08 |
| PUB-04 | "Join" CTA visible on landing + agenda + faq + member | E2E | `pnpm exec playwright test tests/e2e/landing.spec.ts -g "cta-presence"` | ❌ Wave 0 → 02-08 |
| GDPR-01 | Cookie consent banner appears on first visit, granular categories | E2E | `pnpm exec playwright test tests/e2e/cookie-consent.spec.ts` | ❌ Wave 0 → 02-08 |
| GDPR-02 | Privacy page renders Bulgarian text + draft marker | E2E (existing) | `pnpm exec playwright test tests/e2e/branding.spec.ts -g "draft marker"` | ✅ |
| GDPR-03 | Terms page renders | E2E (existing) | covered by branding.spec.ts | ✅ |
| BRAND-06 (extended) | Cyrillic glyphs render without fallback (extends to Gilroy) | E2E (existing, extend) | `pnpm exec playwright test tests/e2e/branding.spec.ts -g "Cyrillic"` | ✅ (extend in 02-08) |
| Visual regression | Hero h1 height with `Я Щ Ц` glyphs | E2E | new `tests/e2e/typography.spec.ts` | ❌ Wave 0 → 02-08 |
| Performance budget | LCP ≤ 2.5 s, Perf ≥ 90 | Lighthouse CI on PR | GitHub Action `treosh/lighthouse-ci-action@v12` | ❌ Wave 0 → 02-08 |
| Sitemap | sitemap.xml returns 200 with all 6 public URLs | Unit (HTTP fetch in test) | `pnpm exec vitest tests/unit/sitemap.test.ts` | ❌ Wave 0 → 02-08 |
| Robots | robots.txt allows /, disallows /member, /admin, /api/, /auth/ | Unit | `pnpm exec vitest tests/unit/robots.test.ts` | ❌ Wave 0 → 02-08 |
| Token retune (review_flag #2) | `--color-destructive` is `#DC2626`; `--color-success` is `#059669` | E2E (computed style) | `pnpm exec playwright test tests/e2e/legal-visual-regression.spec.ts` | ❌ Wave 0 → 02-09 |
| Orphan-token (review_flag #1) | `text-6xl` is bound by at least one src/ file | CI lint | `pnpm lint:tokens` (`scripts/lint-orphan-tokens.mjs`) | ❌ Wave 0 → 02-09 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Nyquist Coverage Matrix

> One row per Phase 2 requirement ID + each verification dimension. A requirement is Nyquist-compliant when at least one cell in its row is ✓ (or "n/a" with rationale). Goal: zero rows with all blank cells.

| Req ID / Concern | Type-check | Unit test | E2E test | Manual / Operator | Notes |
|------------------|-----------|-----------|----------|-------------------|-------|
| PUB-01 | ✓ (page.tsx + Hero.tsx) | n/a (no algorithmic logic — composition only) | ✓ landing.spec.ts (02-08) | ✓ visual smoke (02-04 Task 02.04.5 checkpoint) | — |
| PUB-02 | ✓ (revalidate type) | ✓ sitemap/robots unit tests (02-08) | ✓ landing.spec.ts cache-headers | ✓ Lighthouse on production after deploy + Cloudflare cache verify (02-OPS-RUNBOOK §2.5) | Performance gate is operator-checked post-deploy |
| PUB-03 | ✓ (Next.js link types) | ✓ sitemap.test.ts (02-08) | ✓ landing.spec.ts navigation | n/a | — |
| PUB-04 | ✓ (CTASection prop types) | n/a | ✓ landing.spec.ts cta-presence (covers /, /agenda, /faq, /member) | n/a | — |
| GDPR-01 | ✓ (CookieBanner.tsx) | n/a (3rd-party hosted UI) | ✓ cookie-consent.spec.ts (02-08) | ✓ operator runs 02-OPS-RUNBOOK §1 + visual smoke (02-06 Task 02.06.4) | A5 + A7 are operator gates |
| GDPR-02 | ✓ (existing legal/privacy/page.tsx) | n/a | ✓ branding.spec.ts draft-marker (existing) | ✓ lawyer review per D-15 (02-OPS-RUNBOOK §3.2) | Lawyer-final text is a deferred coalition deliverable |
| GDPR-03 | ✓ (existing legal/terms/page.tsx) | n/a | ✓ branding.spec.ts | ✓ lawyer review per D-15 | same as GDPR-02 |
| Token retune (review_flag #2) | ✓ (globals.css token block) | n/a | ✓ legal-visual-regression.spec.ts (02-09) | n/a | — |
| Orphan tokens (review_flag #1) | n/a | n/a | n/a | ✓ `pnpm lint:tokens` (CI step, 02-09) | Lint script enforces text-6xl is bound |
| Header scroll-padding (review_flag #3) | n/a | n/a | n/a | ✓ operator visual verify (02-09 Task 02.09.5) | scroll-padding-top: 5rem assumption |
| CookieYes dashboard parity (review_flag #4) | n/a | n/a | n/a | ✓ operator runs 02-OPS-RUNBOOK §1.2–1.6 quarterly | Dual-source-of-truth mitigation |
| WAF middleware (cf-ray) | ✓ (middleware.ts compiles Edge-clean) | n/a | n/a | ✓ operator curl direct origin IP returns 403 (02-07 Task 02.07.5) + D-CloudflareIPAllowlist post-warmup hardening | cf-ray is a soft signal only — see plan 02-07 threat model T-02-07-5 |
| Cloudflare cache rules | n/a | n/a | n/a | ✓ operator runs 02-OPS-RUNBOOK §2.1–2.5 (02-07 Task 02.07.5) | A1 verification + fallback path |
| Lighthouse CI staging URL (A6) | n/a | n/a | n/a | ✓ operator verifies on first PR (02-08 Task 02.08.6) | Production URL used directly per Open Question Q2 resolution |
| Coalition placeholder grep gate | n/a | n/a | n/a | ✓ `pnpm check:placeholders` (02-08 Task 02.08.5) — expected to FAIL until coalition delivers | Pre-warmup launch blocker |

Every Phase 2 requirement has at least one ✓; no all-blank rows. ✓ rows under "Manual / Operator" are explicitly listed in `Manual-Only Verifications` below to confirm they are not test-gaps.

---

## Wave 0 Requirements

The planner has allocated Wave 0 scaffolding to plan 02-08 (test files) and plan 02-09 (lint/regression scripts). Specifically:

- [ ] `tests/e2e/landing.spec.ts` — PUB-01..04 coverage (hero, sections, CTA, navigation, ISR cache headers)
- [ ] `tests/e2e/cookie-consent.spec.ts` — GDPR-01 banner appearance + category buttons + audit POST
- [ ] `tests/e2e/typography.spec.ts` — Cyrillic Я/Щ/Ц/Ъ/Ю rendering at hero size + Gilroy font-family resolution
- [ ] `tests/e2e/legal-visual-regression.spec.ts` — review_flag #2 token retune (`--color-destructive`, `--color-success`, `--color-primary`)
- [ ] `tests/unit/sitemap.test.ts` — sitemap returns expected 6 URLs
- [ ] `tests/unit/robots.test.ts` — robots disallows /member, /admin, /api/, /auth/
- [ ] `.lighthouserc.json` — Lighthouse CI config (Performance ≥ 0.9, LCP ≤ 2500 ms, CLS ≤ 0.1, TBT ≤ 200 ms, A11y ≥ 0.95, SEO ≥ 0.95)
- [ ] `.github/workflows/lighthouse.yml` — Lighthouse GitHub Action targeting `https://chastnik.eu/`
- [ ] `scripts/lint-orphan-tokens.mjs` + `pnpm lint:tokens` — review_flag #1 enforcement
- [ ] `scripts/check-coalition-placeholders.mjs` + `pnpm check:placeholders` — pre-warmup launch blocker on `[ТЕКСТ ОТ КОАЛИЦИЯ]`
- [ ] Extend `tests/e2e/branding.spec.ts` BRAND-06 to assert Gilroy is loaded (`getComputedStyle h1`.fontFamily contains "gilroy")
- [ ] Extend `tests/e2e/responsive.spec.ts` (PUB-06 from Phase 1) to cover the new `/`, `/agenda`, `/faq`, `/member` routes

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CookieYes dashboard category copy matches `bg.json` | GDPR-01 + UI-SPEC review_flag #4 | External dashboard, no API for dashboard config | Run 02-OPS-RUNBOOK §1.2–1.6 in CookieYes dashboard for `chastnik.eu`; visual smoke in incognito (02-06 Task 02.06.4 checkpoint) |
| CookieYes Bulgarian language tier confirmed (A7) | GDPR-01 | External dashboard | Run 02-OPS-RUNBOOK §1.1 + checkpoint 02-06 Task 02.06.4 |
| Cloudflare cache rules created (A1) | PUB-02 | External dashboard | Run 02-OPS-RUNBOOK §2.1–2.3 + checkpoint 02-07 Task 02.07.5 |
| Cloudflare-IP allow-list on Fly.io `internal_port` (true network-layer auth) | Hardening (post-warmup) | External infrastructure | `D-CloudflareIPAllowlist` deferred item — configure once Cloudflare IP ranges are pinned (https://www.cloudflare.com/ips/) |
| Lighthouse CI runs against production (A6) | PUB-02 | First-PR verification on real GitHub Actions runner | 02-08 Task 02.08.6: open a draft PR with a no-op change, observe `Lighthouse CI` workflow output, confirm thresholds enforced |
| Header height ~80 px ≈ scroll-padding-top: 5rem (review_flag #3) | UX integrity | Visual depth — automated bounding-box check is brittle for sticky-header offsets | 02-09 Task 02.09.5: click hero secondary CTA `<Link href="#vision">`, confirm VisionSection h2 renders BELOW the sticky header (not partially obscured) |
| Coalition logo SVG, hero image, agenda body, channel URLs delivered (D-CoalitionLogoSVG, D-CoalitionContent-Hero, D-CoalitionContent-Agenda, D-CoalitionChannels) | SC-2 + SC-3 polish | External coalition deliverable | Quick task swap when delivered; `pnpm check:placeholders` enforces gate |
| Lawyer-reviewed legal text (D-LawyerReviewLegal, D-15) | SC-4 | External coalition deliverable | Warmup launch gated on lawyer sign-off per 02-OPS-RUNBOOK §3.2 |

---

## Validation Sign-Off

- [ ] All Phase 2 tasks have `<automated>` verify, OR are listed in Manual-Only Verifications, OR are Wave 0 dependencies (02-08, 02-09)
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify (planner enforces during plan-phase)
- [ ] Wave 0 covers all ❌ references in the Phase Requirements → Test Map table
- [ ] No `--watch` flags in any test command in this phase
- [ ] Feedback latency < 90 s for full code suite (Lighthouse CI is post-deploy; ~3 min on PR)
- [ ] All "✓ Manual / Operator" rows in the Nyquist coverage matrix are reflected in 02-OPS-RUNBOOK or 02-SIGNOFF.md checklist
- [ ] `nyquist_compliant: true` set in this file's frontmatter when Wave 0 ships green AND all SC-1..SC-4 rows flip to ✅ (plan 02-09 Task 02.09.4 owns this transition)

**Approval:** pending — operator initials in `02-SIGNOFF.md` §3.5 launch-readiness checklist (produced by plan 02-09).

---

## Cross-References

- **Source extraction:** This file was extracted from `02-RESEARCH.md` § Validation Architecture on 2026-05-03 (revision pass per plan-checker recommendation 2). The research file now points here.
- **Related artifacts:**
  - `02-OPS-RUNBOOK.md` §1 (CookieYes dashboard) §2 (Cloudflare cache) §3 (launch-readiness checklist)
  - `02-SIGNOFF.md` (produced by plan 02-09 Task 02.09.4) — the canonical phase-gate sign-off document
  - `01-VALIDATION.md` (Phase 1 sibling, used as shape reference)
- **Research assumptions:** A1, A5, A6, A7 are operator-verified per Manual-Only Verifications above; A2, A3, A4, A8 were resolved during plan-phase (see `02-RESEARCH.md` § Assumptions Log).
