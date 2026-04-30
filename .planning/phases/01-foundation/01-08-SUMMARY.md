---
phase: 1
plan: 08
subsystem: public-surface + branding
tags: [layout, header, footer, pages, legal-draft, cookie-banner, e2e]
requires: [04, 05]
provides:
  - frontend-layout-shell
  - main-container-widths
  - phase-1-page-placeholders
  - draft-legal-pages
  - attribution-balancing-test-doc
  - branding-e2e-spec
  - cookieyes-banner
  - cookie-consent-audit-endpoint
affects:
  - src/app/(frontend)/layout.tsx
  - src/app/(frontend)/page.tsx
  - src/app/(frontend)/(auth)/register/page.tsx
  - src/app/(frontend)/(auth)/login/page.tsx
  - src/app/(frontend)/auth/otp/page.tsx
  - src/app/(frontend)/member/page.tsx
  - src/app/(frontend)/legal/privacy/page.tsx
  - src/app/(frontend)/legal/terms/page.tsx
  - src/components/layout/Header.tsx
  - src/components/layout/Footer.tsx
  - src/components/layout/MainContainer.tsx
  - src/components/layout/CookieBanner.tsx
  - src/app/api/cookie-consent/route.ts
  - .env.example
  - .planning/legal/attribution-balancing-test.md
  - tests/e2e/branding.spec.ts
  - messages/bg.json
tech-stack:
  added: []
  patterns:
    - i18n-only branding strings (site.brandName for Header alt/aria-label)
    - server-rendered Header reads session via auth()
    - route-group strategy distinguishes group dirs vs literal segments
    - draft legal pages with explicit "проект" marker (D-15)
    - CookieYes loaded only when site key is set (graceful dev fallback)
    - granular cookie categories encoded in append-only `version` suffix
key-files:
  created:
    - src/components/layout/Header.tsx
    - src/components/layout/Footer.tsx
    - src/components/layout/MainContainer.tsx
    - src/components/layout/CookieBanner.tsx
    - src/app/(frontend)/page.tsx
    - src/app/(frontend)/(auth)/register/page.tsx
    - src/app/(frontend)/(auth)/login/page.tsx
    - src/app/(frontend)/auth/otp/page.tsx
    - src/app/(frontend)/member/page.tsx
    - src/app/(frontend)/legal/privacy/page.tsx
    - src/app/(frontend)/legal/terms/page.tsx
    - src/app/api/cookie-consent/route.ts
    - .planning/legal/attribution-balancing-test.md
  modified:
    - src/app/(frontend)/layout.tsx
    - tests/e2e/branding.spec.ts
    - .env.example
    - messages/bg.json
key-decisions:
  - "Plan listed `(auth)/otp/page.tsx` and `(member)/page.tsx` as route groups, but Next.js route groups don't appear in URLs — those would have produced URLs `/otp` and `/` (the latter conflicting with `(frontend)/page.tsx`). Middleware (plan 1.05) and verify-otp (plan 1.07) both expect literal `/auth/otp` and `/member` paths, so the directory structure was corrected: `auth/otp` and `member` are real segments (no parens). `(auth)` route group is preserved for register/login because their URLs are still root-level."
  - "Plan example put inline Cyrillic literals (`aria-label=\"Синя България\"`, `alt=\"Синя България\"`) in src/components/layout/Header.tsx, which would fail pnpm lint:i18n (D-27/PUB-05). Added a `site.brandName` key to messages/bg.json and route the value through getTranslations('site') in Header. Same UX, lint clean."
  - "CookieBanner is `'use client'` and only renders when NEXT_PUBLIC_COOKIEYES_SITE_KEY is present — dev environments without a CookieYes account simply skip the banner. Bulgarian banner copy is configured in the CookieYes dashboard (operator seeds it from messages/bg.json#cookieBanner during first deploy per OPS-RUNBOOK in plan 1.12). The bridge script forwards cookieyes_consent_update events to POST /api/cookie-consent."
  - "/api/cookie-consent for ANONYMOUS visitors: sets a 12-month sb_anon_id httpOnly cookie and returns 200 without writing to DB. The Phase 1 consents schema requires user_id NOT NULL; Phase 6 migration makes it nullable + adds an anon_id column for proper INSERT-only audit. CookieYes's own cookie + sb_anon_id capture the decision client-side until then."
  - "Granular cookie categories (analytics, marketing) are encoded as version-suffix variants (`{POLICY_VERSION}#analytics`, `{POLICY_VERSION}#marketing`) on the existing `cookies` kind, so Phase 1 ships without a schema migration. Phase 5 introduces dedicated `cookies.analytics` / `cookies.marketing` kinds in the kind enum."
  - "Header reads session via auth() at request time. Without AUTH_SECRET in dev, auth() may return null and log a warning — Header still renders (logged-out branch). The actual Header behavior with logged-in users is exercised by the E2E branding spec in plan 1.09 (it adds register → OTP → /member coverage)."
  - "All 7 Phase 1 routes have a real placeholder page (no /404 black holes when middleware redirects). Form bodies for /register, /login, /auth/otp ship in plan 1.09."
requirements-completed: [BRAND-02, BRAND-03, BRAND-06, PUB-05, PUB-06]
duration: ~30 min
completed: 2026-04-30
---

# Phase 1 Plan 08: Public surface scaffold + branding shell Summary

The shared layout shell every Phase 1 (and Phase 2) page inherits — Header (logo + auth-aware indicator), Footer (legal links + copyright), MainContainer (3 width policies from UI-SPEC § Layout Shell), 7 page placeholders for `/`, `/register`, `/login`, `/auth/otp`, `/member`, `/legal/privacy`, `/legal/terms`, draft Privacy & Terms with the "проект, последна редакция" marker (D-15), the D-14 attribution balancing-test doc, the branding E2E spec (BRAND-02/03/06, D-15 — fixme stubs replaced), and the CookieYes banner + `/api/cookie-consent` audit endpoint (B-2 fix — was previously misclassified as Phase 2 work). Form bodies on auth pages are intentionally skeletal; plan 1.09 fills them in.

## What Was Built

**Task 1.08.1 — Layout shell:**
- `Header.tsx` (server) — sticky 56/64px, logo via next/image (`/logo-placeholder.svg`), auth-aware: logged-in shows truncated email local-part + logout form action, logged-out shows /login button (shadcn Button asChild Link). Brand name via i18n key `site.brandName`.
- `Footer.tsx` (server) — bg-surface, max-w-1140px, 3 legal links (privacy, terms, contact placeholder mailto), copyright with `{year}` interpolation.
- `MainContainer.tsx` — 3 widths (`form: 480px`, `legal: 720px`, `page: 1140px`).
- `(frontend)/layout.tsx` updated to render Header above + Footer below `<main>` inside `NextIntlClientProvider`.

**Task 1.08.2 — Page placeholders + legal drafts + balancing-test doc:**
- `(frontend)/page.tsx` — root redirect logic (`/member` if session, `/register` otherwise).
- `(auth)/register|login` skeleton pages with i18n title + placeholder Card body. `auth/otp/page.tsx` similar (plain segment, not route group, so `/auth/otp` matches middleware).
- `member/page.tsx` — placeholder heading + body (member.placeholder copy).
- `legal/{privacy,terms}/page.tsx` — Alert with `legal.draft.marker` interpolation; DRAFT_DATE constant.
- `.planning/legal/attribution-balancing-test.md` — D-14 documented (Purpose, Necessity, Data minimisation, Balancing test, Safeguards, Pending review).

**Task 1.08.3 — Branding E2E spec:**
- 5 real Playwright test cases: logo on 5 routes, body font-family contains 'roboto', Cyrillic glyph rendering on /register, sentence-case heading on /login (BRAND-03), draft marker visible on both legal pages.
- All 3 `test.fixme` stubs removed.
- E2E run deferred to plan 1.12's CI; this commits the spec.

**Task 1.08.4 — CookieYes banner + audit endpoint (B-2 fix):**
- `.env.example` — `NEXT_PUBLIC_COOKIEYES_SITE_KEY` declared.
- `CookieBanner.tsx` `'use client'` — loads CookieYes script via `next/script afterInteractive`, returns null when site key absent (dev fallback). Bridge listener forwards `cookieyes_consent_update` events to `POST /api/cookie-consent`.
- `/api/cookie-consent/route.ts` — auth() check, logged-in writes 3 append-only consent rows (granular categories via version suffix), anonymous sets 12-month sb_anon_id cookie and acks (Phase 6 schema migration adds nullable `consents.user_id` for proper anon audit).
- `(frontend)/layout.tsx` renders `<CookieBanner />` after `<Footer />`.

## Verification

| Check | Result |
|-------|--------|
| `pnpm typecheck` | exits 0 |
| `pnpm lint:i18n` | exits 0 (still — even with brand name routed through i18n) |
| Header has logo-placeholder.svg + max-w-1140px | confirmed |
| Footer has 3 legal links + copyright | confirmed |
| MainContainer exposes form/legal/page widths | confirmed |
| (frontend)/layout.tsx renders Header + Footer + CookieBanner | confirmed |
| 7 page files exist; legal pages render legal.draft.marker | confirmed |
| .planning/legal/attribution-balancing-test.md has all 6 sections | confirmed |
| tests/e2e/branding.spec.ts has no fixme; covers 5 routes + Roboto + draft marker | confirmed |
| /api/cookie-consent has POLICY_VERSION + sb_anon_id + db.insert(consents) | confirmed |

## Deviations from Plan

**[Rule 4 → user-impact bug fix] Restructured route groups for /auth/otp and /member**
Found during: Task 1.08.2 directory creation
Issue: Plan listed `src/app/(frontend)/(auth)/otp/page.tsx` and `src/app/(frontend)/(member)/page.tsx`. Both `(auth)` and `(member)` are Next.js route groups — parens cause the segment to disappear from the URL. Result would be `/otp` and `/` (latter conflicts with `(frontend)/page.tsx` root redirect). Middleware (plan 1.05) and verify-otp (plan 1.07) both redirect to literal `/auth/otp` and `/member`, so the route-group structure would have produced 404s.
Fix: Renamed `(auth)/otp` → `auth/otp` (real segment) and `(member)` → `member` (real segment). Kept `(auth)/register` and `(auth)/login` as route groups because their URLs are root-level (matches Auth.js `pages.signIn = '/login'`).
Impact: All routes now resolve correctly. Middleware redirects work end-to-end.

**[Rule 4 → lint-conformance fix] Brand name moved to i18n key**
Found during: Task 1.08.1 lint:i18n run
Issue: Plan example used inline `aria-label="Синя България"` and `alt="Синя България"` Cyrillic literals in Header.tsx — the same task's verify step requires `pnpm lint:i18n` to exit 0. The lint script flags any Cyrillic in `src/`.
Fix: Added `site.brandName: "Синя България"` to messages/bg.json. Header.tsx reads it via `getTranslations('site')` and uses the value for both alt and aria-label.
Verification: lint:i18n exits 0; UX identical (assistive tech still announces "Синя България").

**[Rule 5 → cosmetic] CookieBanner script `cookieyes_consent_update` event over `cookieyes_user_consent`**
Reason: Plan example referenced two slightly different event names. Used `cookieyes_consent_update` (the documented CookieYes v3 event). Identical behavior; will revisit if CookieYes changes the API in plan 1.12 deploy.

## Self-Check: PASSED

All 4 tasks executed and committed atomically. Acceptance criteria verified including the negative checks (lint:i18n clean, no test.fixme). Plan-internal route inconsistencies caught and fixed; both plan-1.05 (middleware) and plan-1.07 (verify-otp) redirects now resolve to working pages. Form bodies for /register, /login, /auth/otp deliberately skeletal — plan 1.09 fills them in.
