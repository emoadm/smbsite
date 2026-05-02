# Phase 2: Public Surface (Pre-Warmup) — Research

**Researched:** 2026-05-02
**Domain:** Next.js 15 App Router static generation + CDN caching, third-party script integration (CookieYes), self-hosted webfonts, image CDN, SEO metadata, performance budgeting
**Confidence:** HIGH (UI-SPEC already covers visual contract; this research focuses on implementation-side patterns)

## Summary

This research is intentionally narrow: the UI-SPEC already locks design tokens, copy, components and motion. What the planner still needs are concrete answers about *how to implement* the static-and-fast public surface against this codebase's specific stack — Next.js **15.3.9 stable** (not 16, not canary), Cloudflare in front of Fly.io Frankfurt, CookieYes hosted script, Bunny.net (currently used for Stream only), Playwright as the only browser test framework, no Lighthouse CI yet.

Three decisions land here that materially affect the plan:

1. **Static + ISR with `revalidate = 3600` is the right caching shape, not PPR.** Partial Prerendering is `canary`-only on Next.js 15; this project is on stable 15.3.9 (verified `node -e "require('./node_modules/next/package.json').version"` = `15.3.9`). PPR cannot be enabled. Use `export const revalidate = 3600` per public route, render Header as-is (it reads `auth()` and stays cookie-vary'd at the CDN), and let Cloudflare cache the anonymous variant only.

2. **CookieYes must use `next/script` with `strategy="beforeInteractive"`, NOT `afterInteractive`.** Phase 1's Cause 4 (`d-ci-app-failures`) was a Turnstile bug where `afterInteractive` injected scripts AFTER the page rendered. CookieYes' own docs prescribe `beforeInteractive` precisely to avoid the same race for consent enforcement. The current `CookieBanner.tsx` uses `afterInteractive` — this is a latent Phase 1 bug that should be corrected in Phase 2.

3. **Drop Bunny.net from the v1 image pipeline.** The hero image is a single static asset. Bunny Optimizer is a paid add-on ($9.50/month/website), does not output AVIF (March 2026), and adds an external dependency. Next.js' built-in `next/image` with the file in `public/` already gives WebP, multi-size srcSet, automatic preload, and edge caching via Cloudflare. Reserve Bunny for Phase 5 video (Bunny Stream) and any Phase 4+ user-uploaded media.

**Primary recommendation:** Static-rendered Server Components with `revalidate=3600`, Sinya cyrillic-tested webfonts via `next/font/local`, CookieYes loaded `beforeInteractive`, Lighthouse CI (treosh action) gating LCP < 2.5s + Performance ≥ 90 in CI, and a static `og-image.png` shipped from `public/`.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Hybrid landing — long `/` + `/agenda` + `/faq`. Three real URLs.
- **D-02:** Hybrid authorship. Coalition writes hero + agenda. Claude drafts FAQ + scaffolding + microcopy + `/member` welcome + cookie banner. Plan must include `[ТЕКСТ ОТ КОАЛИЦИЯ]` placeholder mechanism.
- **D-03:** Hero ships still image; `<VideoPlayer videoUrl?>` slot renders only when prop set. PUB-01 satisfied structurally.
- **D-04:** FAQ scope = operational only (5–8 Q&As). Privacy → `/legal/privacy`. Trust → `/agenda`.
- **D-05:** Coalition logo = high-res SVG. BLOCKING. Until then, sinyabulgaria.bg/media/2023/08/logo-vector-1.svg as placeholder.
- **D-06:** Palette extracted from sinyabulgaria.bg → tokens. UI-SPEC §4 already proposes; user redlines.
- **D-07:** Gilroy ExtraBold (800) + Light (300) for headlines, Roboto for body. Self-hosted in `public/fonts/`.
- **D-08:** No pixel-imitation of sinyabulgaria.bg. Modern fresh design.
- **D-09:** `/member` v1 = banner + "Какво следва" timeline + links to /agenda and /faq.
- **D-10:** Channels not yet created — "стартират скоро" copy.
- **D-11:** Member self-service deferred to Phase 6.
- **D-12:** Auth pages = light rebrand only (token + Gilroy h1; no microcopy/form changes).
- **D-13:** Auth pages full editorial polish deferred.
- **D-14:** Legal pages stay as Phase 1 drafts.
- **D-15:** Warmup launch gated on lawyer review.
- **D-16:** CookieYes standard banner; granular categories; Claude's discretion on visual treatment.
- **D-17:** Bulgarian-only via next-intl 4.x; ALL strings in `messages/bg.json`.
- **D-18:** PUB-02 — static generation + Cloudflare CDN caching; no per-request server work on `/`, `/agenda`, `/faq`.

### Claude's Discretion

- Cookie banner visual treatment (footer-attached / floating / gradient)
- Landing page section dividers + micro-ordering
- Spacing / typography ramp (UI-SPEC §3.2 already proposes)
- /agenda and /faq layout templates (Card vs flat / sidebar nav vs anchor-only)
- Hero image treatment (full-bleed vs contained, overlay opacity)
- Subtle fade-in motion only (UI-SPEC §10 already specifies)
- Internal anchor IDs (#mission, #vision, #cta)
- OG metadata + Twitter Card setup

### Deferred Ideas (OUT OF SCOPE)

- UTM/QR/oblast attribution (Phase 2.1)
- Source attribution dashboard (Phase 2.1)
- "Where did you hear about us" registration field (Phase 2.1)
- Final lawyer-reviewed legal text (coalition external dep)
- Real video content in hero (scaffolded only)
- Idea catalog / voting (Phase 3)
- Member self-service (Phase 6)
- Newsletter / channel notifications (Phase 5)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **PUB-01** | Visitor sees landing with text, video, images | UI-SPEC §5.2 hero with VideoPlayer slot; this research §4 (image pipeline) and §1 (static rendering) |
| **PUB-02** | Landing fully static / CDN-cached, survives QR-traffic peak | This research §1 (revalidate + Cache-Control) and §7 (Lighthouse CI gating) |
| **PUB-03** | Visitor can navigate between agitation pages | Three real routes: `/`, `/agenda`, `/faq` per D-01; this research §5 (sitemap) |
| **PUB-04** | "Join community" CTA visible on every page | UI-SPEC §5.2/5.3/5.4 — hero CTA, CTASection, footer CTA on every public page |
| **GDPR-01** | Cookie consent banner first-visit, granular (necessary/analytics/marketing) | This research §2 (CookieYes integration shape) |
| **GDPR-02** | "Privacy Policy" page in Bulgarian | Phase 1 draft already exists; tokens-only update in Phase 2 |
| **GDPR-03** | "Terms of Use" page in Bulgarian | Phase 1 draft already exists; tokens-only update in Phase 2 |

## Project Constraints (from CLAUDE.md)

- Bulgarian UI mandatory; Cyrillic strings live in `messages/bg.json`; zero hardcoded Bulgarian
- Next.js 15.x + Tailwind v4 + shadcn/ui + Payload 3.84 (locked stack)
- next-intl 4.x (locale routing already wired, defaultLocale='bg', localePrefix='never')
- `output: standalone` — Fly.io serves via `node server.js`
- WhatsApp Business API forbidden for political parties
- GDPR mandatory: data minimization, EU hosting, documented processors
- WCAG 2.1 AA pass required (BRAND-04 in Phase 6, but Phase 2 builds to pass)
- Tone: formal-respectful, contemporary, never vocative

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Static landing/agenda/faq render | Frontend Server (Next.js SSG) | CDN (Cloudflare cache layer) | RSC pre-rendered at build/revalidate; CDN edge-caches HTML for anonymous visitors |
| Header session indicator | Frontend Server (RSC) | — | Reads `auth()` server-side; cookie-vary'd at CDN to bypass cache for authenticated visitors |
| Cookie consent banner | Browser (CookieYes hosted script) | API (audit POST to `/api/cookie-consent`) | Banner UI is third-party JS in browser; consent decision posted server-side for audit log |
| Static font assets | Browser (next/font preload) | — | woff2 served from `_next/static` with immutable Cache-Control; no server work |
| Hero image | CDN (Cloudflare) | Frontend Server (next/image optimization) | Asset in `public/`; Next.js generates WebP variants; CDN serves long-lived |
| OG image (social card) | CDN (static asset) | — | Static `public/og-image.png` referenced from metadata; never per-request |
| Sitemap / robots | Frontend Server (RSC route handlers) | CDN (cached aggressively) | `app/sitemap.ts` and `app/robots.ts` — Next.js compiles to cached route handlers |
| Cookie consent audit | API (route handler) | Database (already wired Phase 1) | Existing `/api/cookie-consent` endpoint persists decision; not on critical render path |
| Performance gate | CI (Lighthouse CI Action) | — | Runs on PR; fails build below LCP/perf thresholds; not a runtime concern |

## Standard Stack

### Core (already installed, no version bumps needed)

| Package | Version | Verified | Purpose |
|---------|---------|----------|---------|
| `next` | 15.3.9 | [VERIFIED: node -e require] | App Router, Server Components, ISR via `revalidate` |
| `next-intl` | 4.11.0 | [VERIFIED: package.json] | Bulgarian translations; `getTranslations()` already wired |
| `react` / `react-dom` | 19.0.1 | [VERIFIED: package.json] | RSC + use cache flag (Next.js 16 only — N/A here) |
| `tailwindcss` | 4.2.4 | [VERIFIED: package.json] | CSS-first `@theme` config in globals.css |
| `lucide-react` | 0.469.0 | [VERIFIED: package.json] | Icon set for ValuePropGrid, Timeline, Footer |

### Phase-2-specific additions

| Package | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@radix-ui/react-accordion` (via shadcn add) | latest | Accordion primitive | FAQAccordion component; bring in via `pnpm dlx shadcn@latest add accordion` |
| Local font files (no npm) | — | Gilroy ExtraBold + Light woff2 | Place in `public/fonts/`; loaded via `next/font/local` |

### Image / OG / Sitemap

| Tool | Status | Why |
|------|--------|-----|
| `next/image` (built-in) | Use as-is | Automatic WebP, srcSet, lazy/priority, preload — covers v1 hero needs entirely |
| `next/font/local` (built-in) | Use as-is | Self-hosts Gilroy with automatic preload, FOIT/FOUT handling, fallback metrics adjustment |
| `app/sitemap.ts` (built-in) | New file | Generates sitemap.xml from list of public routes |
| `app/robots.ts` (built-in) | New file | Generates robots.txt with disallow rules for `/member`, `/admin`, `/api` |
| Static `public/og-image.png` | New asset | Single 1200×630 PNG; no `@vercel/og` dependency needed |

### Performance gating (NEW in Phase 2)

| Tool | Version | Purpose |
|------|---------|---------|
| `treosh/lighthouse-ci-action` | v12+ | GitHub Actions step that runs Lighthouse against staging URL; asserts on perf score + LCP |
| `@lhci/cli` (optional, scriptable) | 0.15.x | Local + CI runner for Lighthouse with `lighthouserc.json` config |

### Alternatives Rejected

| Instead of | Could Use | Tradeoff (rejected) |
|------------|-----------|---------------------|
| `next/font/local` for Gilroy | Raw `@font-face` in globals.css | Loses automatic preload, fallback metrics, FOIT prevention. UI-SPEC §3.1 already prescribes next/font/local — this confirms. |
| `next/image` + `public/` | Bunny.net Optimizer | Adds $9.50/month, no AVIF support (March 2026 limitation), extra latency hop. Single hero image doesn't justify it. Bunny stays for Phase 5 video. |
| Static `og-image.png` | `@vercel/og` dynamic generation | Adds cold-start compute on edge; coalition site has fixed branding, no per-page personalization needed. UI-SPEC §11.1 already prefers static. |
| `Cache-Control` headers in `next.config.ts` | Per-route `revalidate` segment config | Both work; per-route `revalidate` is simpler and more discoverable. Use `next.config.ts` headers ONLY for assets in `public/fonts/` and `public/og-image.png` (immutable, long-lived). |
| Partial Prerendering (PPR) | — | **NOT AVAILABLE** on Next.js 15.3.9 stable. PPR is canary-only on 15.x [CITED: nextjs.org/docs/15/app/api-reference/config/next-config-js/ppr]. Don't try to enable. |
| `next/og` static-at-build-time | — | Adds chromium dep at build; the static PNG approach is simpler. |

**Installation (additive):**

```bash
pnpm dlx shadcn@latest add accordion        # Adds Radix Accordion to src/components/ui
# No npm dep for Gilroy — it's woff2 files dropped in public/fonts/
# No npm dep for Lighthouse CI — it's a GitHub Action workflow file
```

**Version verification command (planner adds to plan-task acceptance):**

```bash
node -e "console.log('next', require('./node_modules/next/package.json').version)"
node -e "console.log('next-intl', require('./node_modules/next-intl/package.json').version)"
test -f node_modules/@radix-ui/react-accordion/package.json && echo "accordion installed"
```

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                          BROWSER                                 │
│                                                                  │
│  ┌─────────────┐  ┌────────────────┐  ┌─────────────────────┐  │
│  │ Static HTML │  │ Hydrated React │  │ CookieYes hosted JS │  │
│  │ (LCP target)│  │  islands (form,│  │  (script tag in     │  │
│  │             │  │   FAQAccordion,│  │   <head>; renders   │  │
│  │             │  │   FadeOnScroll)│  │   banner overlay)   │  │
│  └─────────────┘  └────────────────┘  └─────────────────────┘  │
│         ▲                ▲                      │               │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          │ HTML (cached)  │ JS bundles (cached)  │ POST /api/cookie-consent
          │                │                      │
┌─────────┼────────────────┼──────────────────────┼───────────────┐
│         ▼                ▼                      ▼               │
│              CLOUDFLARE CDN (Frankfurt edge)                    │
│   ┌──────────────────────────────┐   ┌──────────────────────┐  │
│   │ Cache key:                   │   │ Bypass cache:        │  │
│   │   path + cookie_present      │   │   - any path with    │  │
│   │ Anonymous:    s-maxage=3600  │   │     auth cookie      │  │
│   │ Authenticated: bypass        │   │   - all /api/* paths │  │
│   └──────────────────────────────┘   └──────────────────────┘  │
└─────────────┬───────────────────────────────────┬───────────────┘
              │ MISS or revalidate                │
              ▼                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│              FLY.IO (smbsite-prod, fra region)                   │
│                                                                  │
│  Web process group:                                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Next.js standalone server (node server.js)                  │ │
│  │                                                             │ │
│  │ Static-built routes (revalidate=3600):                      │ │
│  │   /          ← landing                                      │ │
│  │   /agenda    ← long-form prose                              │ │
│  │   /faq       ← Q&A accordion                                │ │
│  │   /sitemap.xml, /robots.txt                                 │ │
│  │                                                             │ │
│  │ Per-request routes (no cache):                              │ │
│  │   /member    ← reads auth() session                         │ │
│  │   /login, /register, /auth/otp                              │ │
│  │   /api/cookie-consent  ← consent audit log                  │ │
│  │   /admin     ← Payload (separate route group)               │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Data flow for anonymous landing visit (PUB-02 critical path):**

1. Browser → Cloudflare. Cloudflare checks cache key `(path=/, no-auth-cookie)`. HIT in 95%+ of warmup-period requests → returns HTML with `Age: <ttl>` header. **Origin compute: 0.**
2. Browser parses HTML, sees preload links for `/_next/static/.../gilroy.woff2` and `/_next/image?...` (hero) → Cloudflare HIT for both (immutable assets).
3. Browser hydrates React; CookieYes script (loaded `beforeInteractive`) renders consent banner. Plausible loads after consent (cookieless anyway).
4. Anonymous-only path. **Header session indicator on `/`** — see §1.4 below for how Header stays cache-friendly.

### Recommended Project Structure

```
src/
├── app/(frontend)/
│   ├── page.tsx                 # NEW — landing (replaces redirect)
│   ├── layout.tsx               # UPDATE — Gilroy via next/font/local; theme-color meta
│   ├── agenda/page.tsx          # NEW
│   ├── faq/page.tsx             # NEW
│   ├── member/page.tsx          # REPLACE — welcome (banner + timeline + cards)
│   ├── (auth)/...               # UPDATE — light rebrand (token-driven, no JSX changes)
│   └── legal/...                # UPDATE — token inheritance only
├── app/sitemap.ts               # NEW
├── app/robots.ts                # NEW
├── components/
│   ├── landing/                 # NEW directory
│   │   ├── Hero.tsx
│   │   ├── VideoPlayer.tsx
│   │   ├── ValuePropGrid.tsx
│   │   ├── CTASection.tsx
│   │   ├── FAQAccordion.tsx
│   │   ├── SectionEyebrow.tsx
│   │   └── TableOfContents.tsx
│   ├── member/                  # NEW directory
│   │   ├── MemberWelcomeBanner.tsx
│   │   └── Timeline.tsx
│   ├── layout/
│   │   ├── Header.tsx           # NO CHANGE (already inherits new tokens)
│   │   ├── Footer.tsx           # UPDATE — expand to 4-col grid (UI-SPEC §5.6)
│   │   ├── MainContainer.tsx    # UPDATE — add 'prose' variant
│   │   └── CookieBanner.tsx     # UPDATE — strategy='beforeInteractive', custom CSS
│   └── ui/
│       └── accordion.tsx        # NEW (shadcn add accordion)
├── styles/
│   └── globals.css              # UPDATE — UI-SPEC §4.3 token block
├── lib/
│   └── fonts.ts                 # NEW — next/font/local declarations
public/
├── fonts/                       # NEW directory
│   ├── gilroy-extrabold.woff2
│   └── gilroy-light.woff2
├── og-image.png                 # NEW (1200×630, static)
├── apple-touch-icon.png         # NEW (180×180)
├── favicon.ico                  # NEW or UPDATE (from coalition logo)
├── hero.jpg (or .webp)          # NEW (placeholder, coalition replaces)
└── logo.svg                     # NEW (coalition delivers; placeholder until)
messages/
└── bg.json                      # UPDATE — landing.*, agenda.*, faq.*, member.welcome.*, cookie.*, nav.*
```

### Pattern 1: Static page with `revalidate` (PUB-02 path)

**What:** Server Component that pre-renders at build time and re-renders on demand every N seconds (ISR). Output is cached on origin disk AND Cloudflare CDN.

**When to use:** `/`, `/agenda`, `/faq` — any public page where the same HTML can serve all anonymous visitors.

```tsx
// src/app/(frontend)/page.tsx
import { getTranslations } from 'next-intl/server';
import { Hero } from '@/components/landing/Hero';
// ... other imports

// Per-route ISR config (Next.js 14/15 stable API)
export const revalidate = 3600;        // regenerate at most every hour
// dynamic = 'auto' is the default; do NOT set 'force-static' because it would
// neutralize cookies()/headers()/auth() reads inside Header. We let Next.js
// auto-detect: page itself has no dynamic API calls, so it's cached.

export async function generateMetadata() {
  const t = await getTranslations('site');
  return {
    title: t('metadataTitle'),
    description: t('metadataDescription'),
    openGraph: { type: 'website', locale: 'bg_BG', images: ['/og-image.png'] },
    twitter: { card: 'summary_large_image', images: ['/og-image.png'] },
  };
}

export default async function LandingPage() {
  const t = await getTranslations('landing');
  return (
    <>
      <Hero
        kicker={t('hero.kicker')}
        headline={t('hero.headline')}
        subheadline={t('hero.subheadline')}
        ctaPrimaryLabel={t('hero.ctaPrimary')}
        ctaSecondaryLabel={t('hero.ctaSecondary')}
      />
      {/* ... ProblemSection, VisionSection, CTASection, FAQTeaser */}
    </>
  );
}
```

**Why `revalidate` and NOT `dynamic = 'force-static'`:**

- `force-static` forces `cookies()`, `headers()`, `useSearchParams()` to return **empty values** [CITED: nextjs.org/docs/14/app/api-reference/file-conventions/route-segment-config]. The Header reads `auth()` which reads cookies. Setting `force-static` on the page would break the session indicator inside the Header layout.
- `revalidate = 3600` keeps the page statically rendered (default behaviour when no dynamic APIs are called in the page itself), and refreshes on demand. The Header in the layout is a separate concern: it stays a Server Component but gets cookie-vary'd at the CDN layer (see §1.4).
- Confirmed: with `revalidate=N`, Next.js automatically emits `Cache-Control: s-maxage=N, stale-while-revalidate=...` [CITED: github.com/vercel/next.js/discussions/35104].

### Pattern 2: Header session indicator without breaking cache

**The problem:** The current Header (`src/components/layout/Header.tsx`) calls `await auth()` which reads cookies. If this runs in the layout above a "static" page, Next.js still pre-renders the page with the auth() result for the build-time anonymous case, but at request time, an authenticated user will hit a cache miss because the rendered HTML differs.

**The decision (UI-SPEC §13.1 confirms):** Keep Header as-is (Server Component reading session). At Cloudflare layer, configure cache rules to **bypass cache when an auth session cookie is present**. Anonymous visitors hit cache (the warmup-period majority); authenticated members hit origin (rare on `/`, `/agenda`, `/faq`).

**Cloudflare configuration (out of code; documented for ops):**

```
# Cache Rule (Cloudflare dashboard → Caching → Cache Rules)
Match:    (http.request.uri.path eq "/" or http.request.uri.path eq "/agenda" or http.request.uri.path eq "/faq")
          and (not http.cookie contains "next-auth.session-token")
          and (not http.cookie contains "__Secure-next-auth.session-token")
Cache:    Eligible for cache
TTL:      Respect origin (origin emits s-maxage=3600 from `revalidate=3600`)

# Bypass for authenticated cookies — separate rule, higher priority:
Match:    (http.cookie contains "next-auth.session-token") or (http.cookie contains "__Secure-next-auth.session-token")
Cache:    Bypass cache
```

**Why this works:** Auth.js v5 sets `next-auth.session-token` (HTTP) or `__Secure-next-auth.session-token` (HTTPS). Cloudflare's free plan supports custom Cache Rules with cookie-presence matching.

### Pattern 3: CookieYes integration shape

**Current code (`src/components/layout/CookieBanner.tsx`):**

```tsx
<Script
  id="cookieyes"
  src={`https://cdn-cookieyes.com/client_data/${siteKey}/script.js`}
  strategy="afterInteractive"     // ← BUG: should be beforeInteractive
/>
```

**Bug (CITED):** CookieYes' official docs prescribe `beforeInteractive` for Next.js 13+ App Router [CITED: cookieyes.com/documentation/installation-of-cookieyes-on-version-next-js-13-and-above]: *"It ensures the script loads and executes without delaying the rendering of the page."* Phase 1 used `afterInteractive` and a JS bridge — the bridge still works, but the strategy should be corrected.

**Additional CookieYes guidance:**
- CookieYes does NOT support the `crossorigin` attribute (causes caching issues). `next/script` adds `crossorigin` automatically in some scenarios. **Mitigation (per CookieYes):** if `crossorigin` ends up on the script tag, fall back to a raw `<script>` element rendered server-side (NOT `next/script`).
- Recommended placement: in `app/layout.tsx` at root, NOT in a deep client component. The current `CookieBanner.tsx` is placed in `(frontend)/layout.tsx` already — keep that.

**Phase 2 fix (UI-SPEC §9):**

```tsx
// src/components/layout/CookieBanner.tsx — corrected
'use client';

import Script from 'next/script';

export function CookieBanner() {
  const siteKey = process.env.NEXT_PUBLIC_COOKIEYES_SITE_KEY;
  if (!siteKey) return null;
  return (
    <>
      <Script
        id="cookieyes"
        src={`https://cdn-cookieyes.com/client_data/${siteKey}/script.js`}
        strategy="beforeInteractive"   // ← CORRECTED
      />
      <Script id="cookieyes-bridge" strategy="afterInteractive">
        {`(function(){
          function post(decision){
            fetch('/api/cookie-consent', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ decision: decision }),
              credentials: 'same-origin',
            }).catch(function(){});
          }
          document.addEventListener('cookieyes_consent_update', function(e){
            var d = (e && e.detail) || {};
            post({ analytics: !!d.analytics, marketing: !!d.advertisement });
          });
        })();`}
      </Script>
    </>
  );
}
```

**Note on `beforeInteractive`:** Per Next.js 15 docs, `beforeInteractive` requires the Script to be in `app/layout.tsx` (root layout). Putting it inside a `'use client'` component nested below works because the rendered `<Script>` is hoisted into `<head>` by the bundler. **Verify in plan-phase** — if hoisting fails, plan adjusts to put the Script directly in `(frontend)/layout.tsx`.

**Custom CSS overrides (UI-SPEC §9.2):**

CookieYes exposes button classes `.cky-btn-accept`, `.cky-btn-reject`, `.cky-btn-customize` and `data-cky-tag` selectors. CookieYes Custom CSS goes in **two places**:

1. **CookieYes dashboard → Cookie Banner → Custom CSS** (preferred; updates without redeploy)
2. **Inline `<style>` in CookieBanner.tsx** (works because the CookieYes script renders into a high-z-index DOM that CSS variables pierce)

Recommend approach: ship the override CSS in `CookieBanner.tsx` so token changes in `globals.css` propagate without dashboard work:

```tsx
<style>{`
  .cky-consent-container {
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    box-shadow: 0 8px 32px -8px rgba(0, 74, 121, 0.15);
  }
  .cky-btn-accept { background: var(--color-primary); color: #fff; }
  .cky-btn-reject {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-foreground);
  }
  .cky-btn-customize { color: var(--color-primary); text-underline-offset: 4px; }
  /* hide CookieYes branding (data-cky-tag selector) */
  div[data-cky-tag="powered-by"], div[data-cky-tag="detail-powered-by"] { display: none; }
`}</style>
```

**The dual-source-of-truth issue (UI-SPEC frontmatter flag):**

CookieYes Multilingual feature reads category names + descriptions from the dashboard. Bulgarian text in `messages/bg.json` (`cookieBanner.*` keys) only matters if we render OUR OWN banner — which we are not, per D-16. Plan-phase task: **configure CookieYes dashboard** with Bulgarian copy that exactly matches `bg.json` text, AND lock dashboard editing to one operator. If the dashboard text drifts from bg.json, audit will surface it.

Alternative (lower-priority): use CookieYes' "Translation API" via dashboard → Languages → add Bulgarian → mark as default. The `bg.json` keys then become reference-only documentation.

### Pattern 4: Self-hosted Gilroy via `next/font/local`

**Canonical free distribution:** `github.com/repalash/gilroy-free-webfont` ships **Light (300) and ExtraBold (800)** as `.eot`, `.woff`, `.ttf`, `.css` [VERIFIED: WebFetch of repo]. **Notably it does NOT ship `.woff2`** — this is a problem because woff2 is the modern format Next.js expects.

**Action required by planner:** plan-phase task generates `.woff2` from the source `.ttf` using `fonttools` or `pyftsubset`:

```bash
# In a one-time build script, NOT shipped at runtime:
pyftsubset gilroy-extrabold.ttf \
  --flavor=woff2 \
  --output-file=gilroy-extrabold.woff2 \
  --unicodes=U+0000-007F,U+0400-04FF,U+0500-052F  # Latin + Cyrillic + Cyrillic Ext
```

Or use the online tool at `transfonter.org` (no build dep needed).

**License [LOW confidence — must verify in plan-task]:** The repo description uses "free versions" — but does NOT include an explicit LICENSE file in the repo we fetched. UI-SPEC §3.1 asserts "free for commercial use" — this is an unverified claim. **Plan-phase MUST include a verification task:** check the repo's license file directly (or ask coalition's legal contact) before merging. If unverifiable, fall back to Inter ExtraBold or Manrope ExtraBold from Google Fonts (both have full Cyrillic).

**Cyrillic glyph coverage [LOW confidence]:** The repo README does not document Cyrillic support. UI-SPEC §3.4 already flags partial-Cyrillic risk and prescribes Roboto fallback. **Plan-phase MUST include a verification task:** open the woff2 in a font inspector (e.g., `fontTools.ttLib.TTFont` Python, or `wakamaifondue.com`) and confirm which Cyrillic codepoints are in the glyph table. If <90% coverage of `U+0400-04FF`, the fallback in CSS handles the gap but headlines render with mixed fonts on missing glyphs (visible regression).

**`next/font/local` integration:**

```tsx
// src/lib/fonts.ts — NEW
import localFont from 'next/font/local';
import { Roboto } from 'next/font/google';

export const gilroy = localFont({
  src: [
    {
      path: '../../public/fonts/gilroy-extrabold.woff2',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../../public/fonts/gilroy-light.woff2',
      weight: '300',
      style: 'normal',
    },
  ],
  variable: '--font-gilroy',
  display: 'swap',                    // FOUT, not FOIT — text appears immediately
  fallback: ['var(--font-roboto)', 'Georgia', 'serif'],
  preload: true,                      // injects <link rel="preload"> in <head>
  // Important: ascent/descent override matched to Roboto to minimize CLS during swap
  declarations: [
    { prop: 'ascent-override', value: '95%' },
    { prop: 'descent-override', value: '20%' },
    { prop: 'line-gap-override', value: '0%' },
  ],
});

export const roboto = Roboto({
  weight: ['400', '600'],
  subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
  display: 'swap',
  variable: '--font-roboto',
});
```

```tsx
// src/app/(frontend)/layout.tsx — UPDATED
import { gilroy, roboto } from '@/lib/fonts';
// ... drop Roboto_Slab import

return (
  <html lang={locale} className={`${roboto.variable} ${gilroy.variable}`}>
    {/* ... */}
  </html>
);
```

```css
/* src/styles/globals.css — UPDATED @theme block */
@theme {
  /* ... existing tokens ... */
  --font-sans: var(--font-roboto), system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif;
  --font-display: var(--font-gilroy), var(--font-roboto), Georgia, serif;
  /* ↑ 3-tier fallback: Gilroy → Roboto (covers Cyrillic gaps) → Georgia (system) */
}
```

**`font-display: swap` rationale (UI-SPEC §3.1):** Show fallback font immediately on first paint; swap to Gilroy when ready. Alternative `optional` would skip the swap if the font isn't already cached on first visit (LCP-friendly but produces inconsistent first impression for the hero — D-08 says "modern fresh design", which requires Gilroy on first paint). `block` blocks rendering for up to 3s — unacceptable for LCP < 2s on Slow 4G. **Pick `swap`.**

### Pattern 5: Hero image with `next/image`

**Decision:** Hero image lives at `public/hero.jpg` (or `hero.webp` if coalition delivers WebP source). Use `next/image` with `priority` and `fill`:

```tsx
import Image from 'next/image';

<section className="relative w-full">
  <Image
    src="/hero.jpg"
    alt=""                         // empty if decorative; coalition delivers final alt
    fill
    priority                       // emits <link rel="preload" as="image">
    sizes="100vw"
    style={{ objectFit: 'cover' }}
    className="absolute inset-0 -z-10"
  />
  <div className="absolute inset-0 -z-10" style={{ background: 'var(--color-hero-overlay)' }} />
  {/* hero text content */}
</section>
```

**Why not Bunny.net Optimizer for v1:**

| Aspect | next/image (built-in) | Bunny.net Optimizer |
|--------|-----------------------|---------------------|
| Cost | Free | $9.50/month/website |
| AVIF output | ✓ (auto, when client supports) | ✗ (March 2026 — does NOT output AVIF) |
| WebP output | ✓ | ✓ |
| srcSet generation | ✓ (automatic) | Manual via URL params |
| External origin | N/A (uses public/) | Requires Bunny Storage or external pull config |
| LCP preload | ✓ (priority prop) | Manual `<link rel="preload">` |

**Verdict:** Bunny stays for Phase 5 video (Bunny Stream). For a single hero image, `next/image` with the file in `public/` is simpler and more capable.

**Hero image format strategy:**
- **AVIF:** Next.js auto-generates from any source if client sends `Accept: image/avif`
- **WebP:** Auto-fallback for browsers without AVIF
- **JPEG:** Final fallback for ancient clients
- **Source format the coalition should deliver:** HQ JPEG at 2400×1350 (16:9, supports 1920×1080 desktop hero with 1.25x for retina). PNG only if image has transparency (it shouldn't — opaque hero photo).

**Hero image LCP target:** UI-SPEC §13.5 — LCP ≤ 2.5s. Strategy:
1. `priority` prop → automatic `<link rel="preload">`
2. Single AVIF/WebP variant served at viewport size (next/image handles this)
3. Hero overlay scrim is a CSS gradient (`var(--color-hero-overlay)` = `rgba(0,74,121,0.65)`), NOT a second image
4. Headline text uses `font-display: swap` so headline renders before Gilroy loads

### Anti-Patterns to Avoid

- **Don't use `dynamic = 'force-static'` on landing pages.** It silently empties cookies()/headers() return values; the Header session indicator will break for authenticated users. Use `revalidate` instead.
- **Don't try to enable PPR on this codebase.** It's canary-only on Next.js 15 [CITED: nextjs.org/docs/15/app/api-reference/config/next-config-js/ppr]. Setting `experimental.ppr: 'incremental'` in next.config.ts on stable will fail or produce incorrect output.
- **Don't use `next/script strategy="afterInteractive"` for CookieYes.** Use `beforeInteractive`. Phase 1 Cause 4 already taught this lesson with Turnstile.
- **Don't render the cookie banner as a blocking modal.** UI-SPEC §8.1: cookie banner must NOT gate content. Bottom-floating panel only.
- **Don't ship Gilroy as `.woff` or `.ttf`.** Convert to woff2 first (smaller, modern format, supported in 95%+ browsers since 2019).
- **Don't reach for `@vercel/og` for OG images.** Static PNG is sufficient for a single-brand site. UI-SPEC §11.1 already prefers static.
- **Don't add `Cache-Control` headers manually in `next.config.ts` for HTML pages.** Use per-route `revalidate` — Next.js emits the right `s-maxage` automatically [CITED: nextjs.org/docs/app/guides/incremental-static-regeneration]. Manual headers in next.config conflict and produce stale-control bugs (vercel/next.js#22319).
- **Don't combine `force-static` with `revalidate`.** They're mutually contradictory; Next.js silently picks `force-static` semantics. Just use `revalidate` alone.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie consent banner UI | Custom React modal with category toggles | CookieYes hosted script | GDPR consent has 200+ edge cases (auto-blocking pre-consent, regional rules, IAB TCF 2.2 if marketing pixels added, audit log retention). Free dashboard maintenance avoids one team-week of bugs. |
| Image optimization | Hand-coded `<picture>` with WebP+JPEG sources | `next/image` | Auto srcSet, lazy/priority, format negotiation, preload — already integrated. |
| Webfont loading | Raw `@font-face` in globals.css | `next/font/local` | next/font handles preload `<link>`, fallback metric adjustment (`size-adjust`), CLS prevention. Manual `@font-face` re-introduces FOIT/FOUT bugs. |
| Sitemap generation | Hand-written sitemap.xml | `app/sitemap.ts` | Routes change; static XML rots. Code-driven sitemap stays in sync. |
| Robots.txt | Static text file | `app/robots.ts` | Same — code-driven keeps disallow rules consistent with route changes. |
| OG image generation | Per-page Canvas / Puppeteer | Static PNG | Coalition has fixed branding. Per-page OG is a Phase 4+ concern when individual idea pages exist. |
| Performance budget enforcement | Custom Lighthouse runner script | `treosh/lighthouse-ci-action` GitHub Action | Maintained, integrates with PR checks, supports thresholds out of the box. |
| FAQ accordion | Hand-rolled `<details>` elements | Radix Accordion (via shadcn add) | Keyboard nav (Tab/Space/Enter/ArrowUp/Down), ARIA states, single-open mode all free. |
| Cyrillic glyph coverage testing | Visual diff on every PR | Playwright `branding.spec.ts` BRAND-06 | Already exists in this codebase. Extend with new fonts. |

**Key insight:** This phase is mostly *configuration and integration* — almost no novel UI logic. The fonts/images/scripts/sitemaps are commodities; the value is in correct wiring + Bulgarian copy + perf budget enforcement.

## Common Pitfalls

### Pitfall 1: `next/script` injects `crossorigin` attribute, breaks CookieYes caching

**What goes wrong:** Some Next.js 15 builds add `crossorigin="anonymous"` to `<Script>`-rendered tags. CookieYes' CDN responds with no `Access-Control-Allow-Origin` for `crossorigin` requests in some scenarios, causing the script to fail silently.
**Why it happens:** Webpack's CSP / SRI integration adds `crossorigin` automatically when present in the build pipeline.
**How to avoid:** Verify the rendered `<script>` tag in production has NO `crossorigin` attribute. If it does, fall back to a raw `<script src=... async>` rendered server-side (insert in `(frontend)/layout.tsx` JSX, not via `next/script`).
**Warning signs:** CookieYes banner does not appear; CSP errors in browser console; CookieYes script returns 200 but executes nothing.
**Verification:** `curl -sI https://staging.chastnik.eu/ | grep -i 'cookieyes'` and `view-source:` to inspect script tag attributes.

### Pitfall 2: Header reads session, page is "static" — Cloudflare serves wrong HTML

**What goes wrong:** `/` page is `revalidate=3600`. Header (in layout) reads `auth()`. At build, Next.js renders Header in anonymous state and includes that HTML in the static shell. Authenticated users hit Cloudflare cache, get HTML showing "Вход" link instead of their session indicator. Hydration mismatch warnings flood console.
**Why it happens:** Static rendering happens once at build; per-request session reads don't re-run for cached HTML.
**How to avoid:** Configure Cloudflare to bypass cache for any request with a session cookie (Pattern 2 above). Anonymous requests cache normally; authenticated requests hit origin.
**Warning signs:** Logged-in user reports "I see the login button after I'm already logged in." `Hydration failed` errors in Sentry.
**Verification:** Test with two browsers — anon must hit cache (`curl -sI / | grep cf-cache-status` = HIT), authenticated must hit origin (DYNAMIC or BYPASS).

### Pitfall 3: Gilroy `.woff2` file missing → font silently falls back to Roboto on every render

**What goes wrong:** Plan ships next/font/local pointing at `public/fonts/gilroy-extrabold.woff2`, but the `.woff2` was never generated (only `.ttf`/`.woff` exist in the GitHub repo). Next.js build emits no error; runtime falls through to fallback chain.
**Why it happens:** UI-SPEC §3.1 tells the planner to source from `github.com/repalash/gilroy-free-webfont`, but that repo only ships `.eot/.woff/.ttf` — NOT `.woff2`.
**How to avoid:** Plan task explicitly generates `.woff2` from `.ttf` (transfonter.org or `pyftsubset`). Add Playwright BRAND-06 assertion that hero h1 computed `font-family` resolves to Gilroy in DOM.
**Warning signs:** Hero looks "off" but no errors. `getComputedStyle($('h1'))['fontFamily']` returns Roboto in browser devtools.
**Verification:** `curl -sI https://staging/_next/static/.../gilroy-extrabold.woff2` returns 200; Playwright spec asserts `font-family` includes "gilroy".

### Pitfall 4: `output: standalone` doesn't ship `public/fonts/` files

**What goes wrong:** `next.config.ts` has `output: 'standalone'` (Fly.io). The standalone build copies `.next/standalone/` and assumes `public/` and `.next/static/` are copied separately. If the Dockerfile misses the `public/fonts/` copy step, fonts 404 in production.
**Why it happens:** Next.js documents this requirement [CITED: nextjs.org/docs/app/api-reference/config/next-config-js/output]: "you'll need to copy the `public` and `.next/static` folders manually".
**How to avoid:** Verify Dockerfile already does `COPY --from=builder /app/public ./public`. If not, fix in plan-phase task.
**Warning signs:** Production hero h1 renders in Roboto; `_next/static/...gilroy.woff2` returns 404.
**Verification:** `grep -n "COPY.*public" Dockerfile`. After deploy: `curl -sI https://chastnik.eu/fonts/gilroy-extrabold.woff2` returns 200.

### Pitfall 5: Plausible without consent → cookie banner illusion of compliance

**What goes wrong:** Plausible is cookieless. Banner shows "Анализи" toggle that doesn't actually gate any cookie. User thinks they're opting out of tracking; in reality Plausible runs regardless. Auditor flags this as a dark pattern.
**Why it happens:** Pattern of "show category for forward-compat" can mislead users about current state.
**How to avoid:** UI-SPEC §9.2 already addresses — Bulgarian copy explicitly states "Plausible Analytics — без бисквитки и без проследяване между сайтове." Make absolutely sure this language ships in `cookieBanner.categories.analytics.description`.
**Warning signs:** Privacy lawyer review flags it; auditor file claim.
**Verification:** Read CookieYes dashboard text and bg.json `cookieBanner.categories.analytics.description` — must say "без бисквитки".

### Pitfall 6: `revalidate` on a route ≠ Cloudflare TTL on the cache rule

**What goes wrong:** Next.js emits `Cache-Control: s-maxage=3600` from `revalidate=3600`. But Cloudflare's cache rule is configured with "Edge TTL: 1 day" — Cloudflare's own TTL overrides origin in some configurations. Stale content served for 24h instead of 1h.
**Why it happens:** Cloudflare's "Respect existing headers" vs "Override TTL" toggle is per-rule and easy to misconfigure.
**How to avoid:** Cloudflare cache rule for `/`, `/agenda`, `/faq` MUST be set to **"Use Edge TTL: Respect origin"** (NOT "Override"). This makes Cloudflare honor `s-maxage=3600`.
**Warning signs:** Coalition edits agenda copy; deploys; old content still served 4 hours later.
**Verification:** `curl -sI https://chastnik.eu/agenda | grep -E '(cf-cache|cache-control|age)'` — `age` should reset to 0 after a deploy (assuming a purge or natural revalidate).

### Pitfall 7: CookieYes dashboard text drifts from `bg.json`

**What goes wrong:** Operator updates "Анализи" description in CookieYes dashboard. `bg.json` still has old text. Audit log discrepancy. Different text shown to user vs what's stored in our consent record.
**Why it happens:** Two sources of truth; nobody designated to keep them aligned.
**How to avoid:** Plan-phase deliverable: a section in `01-OPS-RUNBOOK.md` (or new `02-OPS-RUNBOOK.md`) documenting "CookieYes dashboard config" with exact Bulgarian text per category. Any change to bg.json's `cookieBanner.*` keys triggers a runbook task to update CookieYes dashboard.
**Warning signs:** None in code — drift is human-process. Catch via quarterly review.
**Verification:** Manual: open CookieYes dashboard → languages → Bulgarian → diff against bg.json.

### Pitfall 8: `next/font/local` source path resolution

**What goes wrong:** `src: '../../public/fonts/gilroy-extrabold.woff2'` is relative to the file calling `localFont()`. If `lib/fonts.ts` is moved, the relative path breaks. Build fails with cryptic "ENOENT" during Webpack font-loader execution.
**Why it happens:** Documented [CITED: nextjs.org/docs/app/api-reference/components/font]: "path of the font file as a string ... relative to the directory where the font loader function is called."
**How to avoid:** Place `fonts.ts` in `src/lib/` (stable location, unlikely to move); use `../../public/fonts/...` exactly as written above. Add a comment explaining why the path looks like it does.
**Verification:** `pnpm build` in CI succeeds; `_next/static/media/gilroy-*.woff2` exists in the build output.

### Pitfall 9: `loadEnv.js` Payload bug breaks `output: standalone`

**What goes wrong:** Phase 1 Plan 01-13 noted: `payload@3.84 + next@15.3` has a `loadEnv.js` incompatibility that breaks `payload migrate` CLI. STATE.md flags this for Phase 2 resolution. If left unresolved AND Phase 2 introduces any Payload-collection touch (e.g., a new "site copy" collection later), it will surface.
**Why it happens:** Payload reads env via Next's `loadEnv` helper which changed signature in 15.3.
**How to avoid:** Phase 2 doesn't *need* to fix this (no Payload-collection changes in this phase per CONTEXT.md), but the planner should NOT introduce Payload-driven content fetching for landing/agenda. Coalition writes copy directly into `bg.json` and MDX. Defer Payload-driven editorial to Phase 4 (per UI-SPEC §"Punted to later phases").
**Verification:** Confirm no `await getPayload()` calls in Phase 2 plan tasks.

### Pitfall 10: Cyrillic Cap Я / Щ / Ц cropping with custom font

**What goes wrong:** Phase 1 BRAND-06 already tests for fallback boxes (`□`). New Gilroy ExtraBold may have different vertical metrics than Roboto Slab; descenders on `Я` / `Щ` may crop in tight line-heights.
**Why it happens:** Free-tier fonts often have smaller-than-standard glyph boxes on extended Cyrillic.
**How to avoid:** UI-SPEC §3.1 already prescribes `ascent-override`/`descent-override` declarations. Plan-phase task: visually inspect hero h1 with Bulgarian text containing all uppercase Cyrillic at 60px; use Playwright's screenshot comparison to flag regressions.
**Warning signs:** Hero h1 has clipped tails on letters with descenders.
**Verification:** Add a dedicated `tests/e2e/typography.spec.ts` test rendering "ЯЩЦЪЮ" at hero h1 size and asserting bounding-box height matches expected.

## Code Examples

### Example: ISR landing page with translations

```tsx
// src/app/(frontend)/page.tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Hero } from '@/components/landing/Hero';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { VisionSection } from '@/components/landing/VisionSection';
import { CTASection } from '@/components/landing/CTASection';
import { FAQTeaserSection } from '@/components/landing/FAQTeaserSection';

export const revalidate = 3600;  // ISR — re-render at most every hour

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('site');
  return {
    title: t('metadataTitle'),
    description: t('metadataDescription'),
    openGraph: {
      type: 'website',
      siteName: t('brandName'),
      locale: 'bg_BG',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', images: ['/og-image.png'] },
    alternates: { canonical: '/' },
  };
}

export default async function LandingPage() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <VisionSection />
      <CTASection />
      <FAQTeaserSection />
    </>
  );
}
```

### Example: app/sitemap.ts

```ts
// src/app/sitemap.ts
import type { MetadataRoute } from 'next';

const BASE = 'https://chastnik.eu';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`,        lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/agenda`,  lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/faq`,     lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/legal/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/legal/terms`,   lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/register`, lastModified: now, changeFrequency: 'yearly', priority: 0.6 },
    // /member, /login, /auth/* are NOT in sitemap (not for search indexing)
  ];
}
```

### Example: app/robots.ts

```ts
// src/app/robots.ts
import type { MetadataRoute } from 'next';

const BASE = 'https://chastnik.eu';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/agenda', '/faq', '/legal/'],
        disallow: ['/member', '/admin', '/auth/', '/api/', '/login', '/register'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
```

Source: [CITED: nextjs.org/docs/app/api-reference/file-conventions/metadata/robots]

### Example: next.config.ts addition for static asset caching

```ts
// next.config.ts — add headers() function alongside existing config
async function headers() {
  return [
    {
      source: '/fonts/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/og-image.png',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
      ],
    },
  ];
}

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: { reactCompiler: false },
  async headers() {
    return headers();
  },
};
```

**Note:** Do NOT add Cache-Control for HTML pages here. Per-route `revalidate` handles it correctly. Only static assets in `public/` need explicit headers because they're not subject to ISR revalidate semantics.

### Example: Lighthouse CI config (`.lighthouserc.json`)

```json
{
  "ci": {
    "collect": {
      "url": [
        "https://chastnik.eu/",
        "https://chastnik.eu/agenda",
        "https://chastnik.eu/faq"
      ],
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "throttling": {
          "rttMs": 150,
          "throughputKbps": 1638.4,
          "cpuSlowdownMultiplier": 4,
          "requestLatencyMs": 562.5,
          "downloadThroughputKbps": 1474.56,
          "uploadThroughputKbps": 675
        }
      }
    },
    "assert": {
      "preset": "lighthouse:no-pwa",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 0.95 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

GitHub Actions workflow snippet:

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on:
  pull_request:
    paths: ['src/**', 'public/**', 'messages/**']
jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: ./.lighthouserc.json
          uploadArtifacts: true
          temporaryPublicStorage: true
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getStaticProps` for SSG | App Router `revalidate` route segment | Next.js 13.4 (App Router stable) | New routes use `revalidate` directly; no `getStaticProps`/`getStaticPaths` |
| `next/head` for metadata | `generateMetadata()` async function | Next.js 13.2 | Already used in this codebase; extend for landing/agenda/faq |
| Tailwind `tailwind.config.js` | `@theme` block in CSS | Tailwind 4.0 (Jan 2025) | Already in use here; UI-SPEC §3.3 builds on this |
| `@font-face` in CSS | `next/font/local` | Next.js 13 | UI-SPEC §3.1 prescribes the modern path |
| Cloudinary / Imgix | `next/image` self-served | Next.js 11+ | For single-brand sites the built-in is sufficient |
| `@vercel/og` | Static PNG | Always for fixed-brand sites | UI-SPEC §11.1 already chose static |
| Manual sitemap.xml | `app/sitemap.ts` | Next.js 13.3 | Type-safe, code-driven |
| Bunny.net Optimizer for images | `next/image` (built-in) | Always (for fixed-asset hero) | Defer Bunny to Phase 5 video |

**Deprecated/outdated:**
- `Roboto_Slab` from `next/font/google` (currently in `(frontend)/layout.tsx`) → drop, replaced by Gilroy
- `--font-roboto-slab` CSS variable → drop, replaced by `--font-gilroy`
- `dynamic = 'force-static'` for landing pages → use `revalidate` instead (force-static neutralizes cookies()/headers())
- `experimental_ppr` → don't enable on stable Next.js 15 (canary-only)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Cloudflare free plan supports Cache Rules with cookie-presence matching | Pattern 2 (Header session) | If false, plan must add a `cf-cache-status: BYPASS` header from origin via custom logic, OR use Cloudflare Workers (paid). Verify in plan-phase by logging into the chastnik.eu Cloudflare dashboard. |
| A2 | Gilroy free webfont allows commercial use | Pattern 4 | If false, swap to Manrope ExtraBold (Google Fonts, full Cyrillic, free for commercial) before merge. |
| A3 | Gilroy free webfont covers ≥90% of Cyrillic codepoints | Pattern 4 | If false, headlines render with mixed Roboto fallback for missing glyphs. Visible regression. Plan-phase verification task generates a glyph coverage report. |
| A4 | The Dockerfile's `COPY --from=builder /app/public ./public` step exists | Pitfall 4 | If absent, font files 404 in production. Verify in plan-phase before adding font assets. |
| A5 | next/script `beforeInteractive` strategy correctly hoists into `<head>` from a nested `'use client'` component | Pattern 3 | If false, plan moves the Script directly into `(frontend)/layout.tsx` JSX. Verify with build output inspection. |
| A6 | `treosh/lighthouse-ci-action` supports asserting against staging URL (not just localhost) | Performance gating | Should work — the `url` config accepts any HTTPS URL. Verify by running the action against a staging deploy in plan-phase. |
| A7 | CookieYes dashboard supports a "Bulgarian" language with full UI translation | Pattern 3 / dual-source-of-truth | If absent, write all category text in English in dashboard and override entirely via custom inline `<style>` and JS that injects Bulgarian text post-render. Adds complexity. |
| A8 | The Phase 1 `loadEnv.js` Payload bug does NOT block static page generation in Phase 2 | Pitfall 9 | Phase 2 doesn't touch Payload collections, but the build step still imports Payload. If `next build` fails because of loadEnv, plan-phase must fix the patch-package as a P0 task. |

## Open Questions (RESOLVED)

> All three open questions identified at research time were resolved during plan-phase. Resolutions are recorded inline below for traceability (revision 2026-05-02 per plan-checker recommendation 1).

1. **Where does the hero image come from for v1 launch?**
   - What we know: D-03 says "still image sourced from coalition photo or stock-of-Bulgaria + logo overlay"
   - What's unclear: who is taking the photo / sourcing the stock; what licence applies to stock images
   - Recommendation: plan-phase ships a **placeholder hero** (Sinya navy gradient with logo + Bulgarian flag motif) generated programmatically, and adds a `D-CoalitionHeroImage` deferred item until coalition delivers final asset. Same placeholder pattern as the logo SVG.
   - **RESOLVED:** Placeholder hero ships in plan 02-03 Task 02.03.1 (`public/hero.jpg` generated programmatically alongside the shadcn Accordion install + MainContainer extension). Coalition delivers the final image as a content-prop swap tracked under the `D-CoalitionContent-Hero` deferred item in STATE.md (no code change needed at swap time — `<Hero />` reads the asset path, coalition replaces `public/hero.jpg`).

2. **Is there a staging URL for Lighthouse CI to hit?**
   - What we know: Production is `chastnik.eu`. Phase 1 OPS-RUNBOOK doesn't mention a staging environment.
   - What's unclear: Does Fly.io have a `smbsite-staging` app, or is staging implicit (PR preview deploys)?
   - Recommendation: plan-phase task either creates `smbsite-staging.fly.dev` (preferred — exercises the production deploy path), OR runs Lighthouse against a local `pnpm build && pnpm start` server in CI. Latter is simpler but doesn't test the Cloudflare layer.
   - **RESOLVED:** Plan 02-08 Task 02.08.6 targets production `https://chastnik.eu` directly — no separate staging URL is created. Lighthouse runs against production after deploy, which gives an accurate measurement that includes the Cloudflare cache layer (the actual visitor path). The tradeoff is that Lighthouse runs post-merge rather than as a PR gate; this is acceptable for v1 because performance regressions surface within the post-deploy run window before warmup invitations go out.

3. **What's the exact list of CookieYes dashboard configurations needed?**
   - What we know: Bulgarian text per category, custom CSS per UI-SPEC §9.2, "Reject All" button enabled, GDPR mode.
   - What's unclear: whether CookieYes "Multilingual" feature requires a paid tier, or if Bulgarian as primary language is on the free tier.
   - Recommendation: plan-phase task #1 = log into CookieYes dashboard with the existing `NEXT_PUBLIC_COOKIEYES_SITE_KEY`, screenshot the config UI, document gaps. If multilingual requires paid, configure Bulgarian as default / only language.
   - **RESOLVED:** Plan 02-06 §1.1 of `02-OPS-RUNBOOK.md` codifies the exact dashboard configuration steps. The operator confirms the Bulgarian language tier (free or paid) during the dashboard reconciliation step (§1.1 — A7 verification). If the free tier doesn't include Bulgarian, the runbook documents fallback Option A (configure banner with Bulgarian text in the default English-language slot — sufficient for v1, no recurring cost). The full category-by-category Bulgarian copy + drift-prevention checklist live in §1.2–§1.6 of the runbook.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + runtime | ✓ | ≥20 (engines.node) | — |
| pnpm | Build + dev | ✓ (in CI workflow) | latest | — |
| `next` | Core | ✓ | 15.3.9 [VERIFIED] | — |
| `next-intl` | i18n | ✓ | 4.11.0 [VERIFIED] | — |
| `tailwindcss` | Styles | ✓ | 4.2.4 [VERIFIED] | — |
| `lucide-react` | Icons | ✓ | 0.469.0 [VERIFIED] | — |
| Cloudflare account (chastnik.eu zone) | CDN cache rules | ✓ (Phase 1 wired DNS) | Free plan | If "cookie-presence" Cache Rule unavailable on free, plan moves Pattern 2 logic to a Cloudflare Worker (paid) OR accepts that all `/` requests pass through origin (degrade to no-cache for authenticated users only — server still emits `s-maxage=3600` for anonymous; CDN will cache by default Vary on Set-Cookie). |
| CookieYes account (`NEXT_PUBLIC_COOKIEYES_SITE_KEY`) | GDPR-01 | ✓ (env var exists) | Account tier unknown | If multilingual requires paid, configure single-language Bulgarian dashboard. |
| Bunny.net account | Phase 5 video | ✓ (deferred to Phase 5) | — | — |
| `treosh/lighthouse-ci-action` | Performance gate | ✓ (any GitHub Actions repo) | v12 | — |
| Gilroy `.woff2` files | Typography | ✗ (only `.ttf`/`.woff` in source repo) | — | Generate via transfonter.org or `pyftsubset`. Plan-phase task. |
| Coalition logo SVG | BRAND-02 | ✗ (D-CoalitionLogoSVG deferred) | — | Use sinyabulgaria.bg/media/2023/08/logo-vector-1.svg as placeholder until delivered. |
| Coalition hero image | PUB-01 | ✗ (not in deferred list yet) | — | Programmatic gradient placeholder for v1. |

**Missing dependencies with no fallback:** None — all gaps have viable workarounds.

**Missing dependencies with fallback:**
- Gilroy woff2: generate from .ttf in build pre-step
- Coalition logo: sinyabulgaria.bg asset as placeholder
- Coalition hero image: gradient placeholder

## Validation Architecture

> Validation strategy now lives in 02-VALIDATION.md (Nyquist gate compliance — extracted 2026-05-03 per plan-checker recommendation 2).

## Security Domain

> ASVS Level 1 enforcement is enabled in config.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Static pages have minimal attack surface; auth on /member is Phase 1 wiring (unchanged) |
| V2 Authentication | no (carry-forward only) | Phase 1 wired Auth.js v5; Phase 2 doesn't touch auth flows |
| V3 Session Management | no (carry-forward only) | Same — Phase 1 sessions remain |
| V4 Access Control | yes | `/member` requires session (Phase 1 wiring); `/admin` is Payload (Phase 1 wiring); robots.txt + middleware.ts (none currently) deny crawler indexing |
| V5 Input Validation | minimal | Only the existing `/api/cookie-consent` endpoint (Phase 1) accepts input; landing pages have zero form input themselves |
| V6 Cryptography | no | No new crypto operations in Phase 2 |
| V7 Error Handling & Logging | yes | Phase 1 Sentry already wired; landing pages log nothing user-specific |
| V11 Business Logic | no | No new business logic — content rendering only |
| V12 Files & Resources | yes | New files in `public/` (fonts, hero.jpg, og-image.png). Verify no upload/write paths added. |
| V13 API & Web Service | yes | sitemap.xml, robots.txt are public. Verify they don't leak private routes. |
| V14 Configuration | yes | New `next.config.ts` headers for `/fonts/`, `/og-image.png`. Verify no sensitive env vars exposed. |

### Known Threat Patterns for {Next.js + Cloudflare + Bulgarian content site}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via Bulgarian copy in CMS | Tampering / Information Disclosure | All copy comes from `bg.json` (compile-time) or coalition-authored MDX (build-time). React auto-escapes. No `dangerouslySetInnerHTML` in Phase 2 code. |
| Open redirect via auth callback | Spoofing | Auth.js v5 (Phase 1) handles redirect_uri validation. Phase 2 doesn't add new redirects. |
| Cookie banner bypass / consent forgery | Tampering | CookieYes is the third-party source of truth; the `/api/cookie-consent` audit endpoint stores a record but is non-authoritative for actual blocking. |
| Static asset path traversal | Tampering | next.config.ts `headers()` source: '/fonts/:path*' uses Next.js' router which doesn't allow traversal. Verify in plan-phase no `../` regex in route patterns. |
| robots.txt leaking private paths | Information Disclosure | Disallow rules name `/member`, `/admin`, `/api/`, `/auth/` — these paths are already discoverable via Cloudflare logs and JS bundle inspection. Listing them in robots is informationally neutral. |
| sitemap.xml exposing test routes | Information Disclosure | Hand-curated list in `app/sitemap.ts` — only the 3 public + 2 legal URLs. No dynamic enumeration. |
| Bot scraping landing for spam-target list | Information Disclosure | Phase 1 deferred WAF rule for non-Cloudflare-IP origin access. Phase 2 should resolve OR document deferral (see Phase 1 Deferred Items). Cloudflare Bot Fight Mode (free tier) covers 80% of scraper bots. |
| Image hot-linking from public/ | DoS (bandwidth) | Cloudflare CDN caches with long TTL; bandwidth is unmetered on free tier for HTTP cached requests. Acceptable. |
| Font hot-linking | DoS (bandwidth) | Same — Cloudflare caches woff2 with 1-year immutable. Plus CORS prevents cross-origin font usage by default. |
| OG image used as scraping bypass | Information Disclosure | Static PNG at `/og-image.png` — public by design. No PII inside the image. |

### Specific to GDPR-01

- **Consent before tracking:** Plausible is cookieless and not subject to consent. Any future tracking pixel (Meta, Google Tag Manager) MUST be wired to read `window.getCkyConsent()` before firing. Phase 2 doesn't add such pixels — but plan-phase must include a guidance note in `02-OPS-RUNBOOK.md` for future operators.
- **Audit log retention:** `/api/cookie-consent` POSTs decisions to Phase 1's audit table. GDPR-08 (Phase 6) requires hashed user_id — this Phase 2 endpoint stores anonymous decisions only (no user_id), so it's already GDPR-safe.

### WAF Custom Rule Resolution (Phase 1 deferred → Phase 2)

Phase 1 Plan 01-13 deferred a Cloudflare WAF custom rule:
```
(not ip.src in $cloudflare_ip_ranges) and (http.host eq "chastnik.eu")
```

This rule blocks direct origin-IP access (bypassing Cloudflare). On the free Cloudflare plan, the variable `$cloudflare_ip_ranges` is **not available** in the Custom Rules expression builder (paid feature). 

**Phase 2 resolution options:**

1. **Resolve via origin-side filtering** (recommended): Add Fly.io firewall rule via `flyctl ips list` and `[[services.tcp_checks]]` source-IP allow-list of Cloudflare IP ranges (published at `https://www.cloudflare.com/ips-v4/` and `/ips-v6/`). Requires periodic refresh (Cloudflare publishes a quarterly update).

2. **Resolve via Next.js middleware** (alternative): A `src/middleware.ts` file that reads `cf-connecting-ip` header and rejects requests where it's missing OR `cf-ray` header is missing. This works because Cloudflare always adds these headers. Bypass attempts directly to Fly.io won't have them. **Caution:** Phase 1's `chastnik-eu-empty-page.md` resolved-debug-session removed an existing middleware due to Edge Runtime issues. Re-introducing middleware needs care.

3. **Defer to Phase 6 / paid tier** (status quo): Keep the rule in deferred items; rely on Cloudflare DDoS Mitigation (free tier provides this) for layer-7 protection. Direct origin-IP attacks are theoretical until someone scans Fly.io IPs.

**Recommendation for Phase 2:** Option 2 (middleware), implemented as a small Edge-Runtime-compatible function. Adds ~5 plan tasks but resolves the deferral cleanly. If middleware proves problematic again (per the resolved chastnik-eu-empty-page session), fall back to Option 3 and document the risk.

## Sources

### Primary (HIGH confidence)
- [Next.js 14 Route Segment Config docs](https://nextjs.org/docs/14/app/api-reference/file-conventions/route-segment-config) — `dynamic`, `revalidate`, `fetchCache` semantics for stable Next.js 15.x
- [Next.js Font Module docs](https://nextjs.org/docs/app/api-reference/components/font) — `next/font/local` API, declarations, preload behavior
- [Next.js Sitemap docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) — `app/sitemap.ts` API
- [Next.js Robots docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots) — `app/robots.ts` API
- [Next.js 15 PPR docs](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/ppr) — confirms PPR is canary-only on 15.x
- [CookieYes Next.js 13+ installation guide](https://www.cookieyes.com/documentation/installation-of-cookieyes-on-version-next-js-13-and-above/) — `beforeInteractive` recommendation, crossorigin warning
- Verified `next@15.3.9` installed via `node -e require()` direct read of `node_modules/next/package.json`

### Secondary (MEDIUM confidence)
- [Next.js ISR Cache-Control discussion #35104](https://github.com/vercel/next.js/discussions/35104) — `revalidate` emits `s-maxage` automatically
- [CookieYes Custom CSS / data-cky-tag selectors](https://www.cookieyes.com/documentation/customize-cookie-banner/) — `.cky-btn-accept`, `data-cky-tag="powered-by"` selectors
- [Lighthouse CI Action (treosh)](https://github.com/marketplace/actions/lighthouse-ci-action) — GitHub Marketplace listing, v12 latest
- [Cloudflare Cache-Control docs](https://developers.cloudflare.com/cache/concepts/cache-control/) — `s-maxage` and `stale-while-revalidate` honoring
- [Bunny Optimizer pricing](https://bunny.net/pricing/optimizer/) — $9.50/month, no AVIF as of March 2026

### Tertiary (LOW confidence — flagged for verification in plan-phase)
- [Gilroy free webfont GitHub repo](https://github.com/repalash/gilroy-free-webfont) — license terms NOT explicit in fetched content; Cyrillic coverage NOT documented. **Plan-phase MUST verify both before merging.**
- A1 (Cloudflare free Cache Rules support cookie-presence matching) — based on community knowledge of free-tier feature parity; verify in plan-phase by attempting to create the rule

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All packages verified against `package.json` and `node_modules` directly
- Architecture: HIGH — Patterns derived from official Next.js 15 docs (correct version, not Next.js 16)
- Pitfalls: HIGH — Most are codebase-specific (Cause 4 of d-ci-app-failures, Phase 1 deferred items, output: standalone in fly.toml all verified by direct file reads)
- Gilroy webfont: LOW-LOW — License and Cyrillic coverage are unverified, flagged for plan-phase action
- Cloudflare free-tier capability: MEDIUM — Cookie-presence Cache Rules expected on free tier, but not verified against the chastnik.eu Cloudflare account

**Research date:** 2026-05-02
**Valid until:** 2026-06-02 (30 days for stable stack; CookieYes script API and Next.js 15 docs are stable; Lighthouse CI action versioning is stable)

---

*Phase: 02-public-surface-pre-warmup*
*Research completed: 2026-05-02*
