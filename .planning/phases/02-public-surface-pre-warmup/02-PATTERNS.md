# Phase 02: Public Surface (Pre-Warmup) — Pattern Map

**Mapped:** 2026-05-02
**Files analyzed:** 26 new/modified
**Analogs found:** 24 / 26 (2 files have no exact analog — middleware.ts (resolved-and-removed prior art instead) and font loader (next/font/local is brand-new))

This document maps every Phase 2 file-to-be-created to its closest Phase 1 analog and extracts the concrete code excerpts to copy. Plans should reference these patterns by name (e.g., "follow Pattern A — Server-Component-with-getTranslations from `src/app/(frontend)/legal/privacy/page.tsx`").

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/(frontend)/page.tsx` (REPLACE) | Server Component (page) | static / build-time + ISR | `src/app/(frontend)/legal/privacy/page.tsx` | exact (Server Component + getTranslations + MainContainer) |
| `src/app/(frontend)/agenda/page.tsx` (NEW) | Server Component (page) | static / ISR | `src/app/(frontend)/legal/privacy/page.tsx` | exact |
| `src/app/(frontend)/faq/page.tsx` (NEW) | Server Component (page) | static / ISR | `src/app/(frontend)/legal/privacy/page.tsx` | exact |
| `src/app/(frontend)/member/page.tsx` (REPLACE) | Server Component (page) | session-read / per-request | `src/app/(frontend)/member/page.tsx` (current) | exact (same file pattern, expanded JSX) |
| `src/app/(frontend)/layout.tsx` (UPDATE) | Layout (RSC) | layout shell | itself (current) | exact (extend, don't replace) |
| `src/components/landing/Hero.tsx` (NEW) | Server Component (pure) | props-only render | `src/components/layout/Header.tsx` | role-match (RSC reading translations + lucide + shadcn Button) |
| `src/components/landing/VideoPlayer.tsx` (NEW) | Server Component (pure) | conditional render from prop | n/a — no media component yet | no analog (use UI-SPEC §6 spec) |
| `src/components/landing/ValuePropGrid.tsx` (NEW) | Server Component (pure) | array.map render | `src/components/layout/Footer.tsx` | role-match (RSC + getTranslations + grid layout) |
| `src/components/landing/CTASection.tsx` (NEW) | Server Component (pure) | translation render | `src/components/layout/Footer.tsx` | role-match |
| `src/components/landing/FAQAccordion.tsx` (NEW) | **Client Component** | event-driven (open/close) | `src/components/forms/TurnstileWidget.tsx` | role-match (client-side interactivity wrapper around third-party primitive) |
| `src/components/landing/TableOfContents.tsx` (NEW) | Client Component | event-driven (sticky scroll) | n/a — no scroll-aware component | no analog (use UI-SPEC §5.3) |
| `src/components/landing/SectionEyebrow.tsx` (NEW) | Server Component (pure) | props-only | n/a (trivial — inline in callsite) | no analog needed |
| `src/components/member/Timeline.tsx` (NEW) | Server Component (pure) | array.map render | `src/components/layout/Footer.tsx` | role-match |
| `src/components/member/MemberWelcomeBanner.tsx` (NEW) | Server Component (pure) | session-data render | `src/components/layout/Header.tsx` | role-match (reads `auth()` for `firstName`) |
| `src/components/layout/Footer.tsx` (UPDATE) | Server Component (layout) | translation render | itself (current) | exact (expand, don't replace) |
| `src/components/layout/MainContainer.tsx` (UPDATE) | Layout primitive | props-only | itself (current) | exact (extend `Width` union) |
| `src/components/layout/CookieBanner.tsx` (REPLACE) | Client Component (script loader) | third-party script | `src/app/(frontend)/(auth)/register/page.tsx` post-Cause-4 | role-match (raw `<script>` pattern; see § Shared Pattern S3) |
| `src/components/ui/accordion.tsx` (NEW via shadcn) | Client Component (UI primitive) | Radix wrapper | `src/components/ui/select.tsx` | exact (other Radix shadcn primitive) |
| `src/styles/globals.css` (UPDATE) | Stylesheet config | static tokens | itself (current) | exact (expand `@theme` block) |
| `src/lib/fonts.ts` (NEW) | Module | next/font/local declarations | n/a — current uses `next/font/google` inline in layout.tsx | partial (extract pattern from `(frontend)/layout.tsx:9-21`) |
| `src/middleware.ts` (NEW or DEFER) | Edge runtime | request filter | `.planning/debug/resolved/chastnik-eu-empty-page.md` (anti-pattern reference) | role-match — see § Shared Pattern S5 |
| `next.config.ts` (UPDATE) | Build config | headers() addition | itself (current) | exact (extend `nextConfig` literal) |
| `src/app/sitemap.ts` (NEW) | Route handler (auto) | static | n/a (route handler `/api/cookie-consent`) | partial — Next.js convention |
| `src/app/robots.ts` (NEW) | Route handler (auto) | static | n/a | partial — Next.js convention |
| `messages/bg.json` (UPDATE) | i18n strings | static | itself | exact (add new top-level keys) |
| `tests/e2e/landing.spec.ts` (NEW) | Playwright spec | E2E | `tests/e2e/branding.spec.ts` | exact (Playwright + viewports + getByText/getByRole/Cyrillic regex) |
| `tests/e2e/cookie-consent.spec.ts` (NEW) | Playwright spec | E2E | `tests/e2e/branding.spec.ts` | exact |
| `tests/e2e/typography.spec.ts` (NEW) | Playwright spec | E2E + visual | `tests/e2e/branding.spec.ts` § BRAND-06 | exact |
| `public/fonts/gilroy-extrabold.woff2` (NEW asset) | Static asset | binary | n/a — generated externally (transfonter / pyftsubset) | no analog |
| `public/fonts/gilroy-light.woff2` (NEW asset) | Static asset | binary | n/a | no analog |
| `public/og-image.png` (NEW asset) | Static asset | binary | n/a — generated externally | no analog |
| `public/hero.jpg` (NEW asset, placeholder) | Static asset | binary | n/a | no analog |

---

## Shared Patterns (Cross-Cutting)

These patterns apply to multiple Phase 2 files. Each plan that creates a file in the affected category should follow the shared pattern from this section.

### Shared Pattern S1 — Server Component Page Skeleton (with i18n + Container)

**Source:** `src/app/(frontend)/legal/privacy/page.tsx`
**Apply to:** `/`, `/agenda`, `/faq`, `/member` (all `(frontend)` page files)

The Phase 1 canonical shape for an `(frontend)` Server-Component page is:

```tsx
import { getTranslations } from 'next-intl/server';
import { MainContainer } from '@/components/layout/MainContainer';

export default async function PrivacyPolicyPage() {
  const tDraft = await getTranslations('legal.draft');
  const tPriv = await getTranslations('legal.privacy');

  return (
    <MainContainer width="legal">
      <h1 className="mb-2 font-display text-3xl">{tPriv('title')}</h1>
      {/* ... */}
    </MainContainer>
  );
}
```

**Mandatory copy:**
- Default-export an `async function` (not arrow) — Phase 1 convention.
- Translations namespace per page (`'landing.hero'`, `'agenda'`, `'faq'`, `'member.welcome'`).
- Use `<h1 className="font-display text-3xl">{t('title')}</h1>` for the page title — NOT `<CardTitle>` (per **Cause 2 of d-ci-app-failures** which moved auth pages to raw `<h1>`; commit `a635faa`).
- Wrap in `<MainContainer width="...">`. Use `width="page"` for `/`, `width="prose"` (NEW variant) for `/agenda`, `width="legal"` for `/faq`.
- For static landing pages, add `export const revalidate = 3600;` at the top (see Pattern P1 in this doc).

**What differs per Phase 2 page:**
- Landing page does NOT use `MainContainer` for the hero (full-bleed `<section>` per UI-SPEC §5.2); inner content uses `MainContainer width="page"`.
- Member page uses `width="page"` (not `legal`) per UI-SPEC §5.5.
- Add `generateMetadata()` (NEW per page; existing layout has only a default).

### Shared Pattern S2 — getTranslations Namespace Pattern

**Source:** `src/components/layout/Header.tsx:9-11`, `src/lib/email/templates/OtpEmail.tsx:13-16`

```tsx
const tNav = await getTranslations('nav');
const tSite = await getTranslations('site');
```

Multiple namespaces in one component is the established Phase 1 pattern. Phase 2 components will need:
- `Hero.tsx`: `getTranslations('landing.hero')`
- `ValuePropGrid.tsx`: `getTranslations('landing.vision')`
- `FAQAccordion.tsx`: `useTranslations('landing.faq')` if Client Component, `getTranslations` if Server
- `MemberWelcomeBanner.tsx`: `getTranslations('member.welcome.banner')`
- `Timeline.tsx`: `getTranslations('member.welcome.next')`
- `Footer.tsx` expanded: keep existing `getTranslations('footer')` and add `getTranslations('nav')` for the platform-links column.

**Rich translations (link inside Bulgarian copy):** see `RegistrationForm.tsx:124-137` — uses `t.rich('consents.privacyTerms', { privacyLink: (chunks) => <Link>...{chunks}</Link> })`. Apply this to any Phase 2 copy that contains inline links (e.g., `/faq` lead text linking to `/legal/privacy` and `/agenda`).

### Shared Pattern S3 — Third-Party Script Loading: `beforeInteractive` vs raw `<script>`

**Source (the lesson):** `.planning/debug/resolved/d-ci-app-failures.md` § Cause 4 + commit `089bb7b`
**Source (the fix):** `src/app/(frontend)/(auth)/register/page.tsx:11-25`

This is the canonical anti-race pattern for third-party scripts. RESEARCH.md §3 prescribes `beforeInteractive` for CookieYes; if `beforeInteractive` hoisting fails (Pitfall 1), fall back to the raw `<script>` pattern proven in Cause 4.

**Reference excerpt — Phase 1's Cause-4 fix (raw SSR `<script>`):**

```tsx
// src/app/(frontend)/(auth)/register/page.tsx (lines 11-25)
{/*
  Loaded as raw <script> (NOT next/script) so it ships in initial SSR HTML.
  next/script's default `afterInteractive` strategy injects post-hydration,
  which races Playwright AUTH-08 (anti-abuse.spec.ts:25) — see
  .planning/debug/d-ci-app-failures.md Cause 4. This page is the ONLY route
  where the Turnstile widget is mounted; keeping the script here (not in a
  layout) preserves the AUTH-08 negative spec (anti-abuse.spec.ts:31) which
  asserts /login does NOT load the script.
*/}
<script
  src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
  async
  defer
/>
```

**Apply to `CookieBanner.tsx` REPLACE:**

Per RESEARCH.md §3, the new `CookieBanner.tsx` must change `strategy="afterInteractive"` → `strategy="beforeInteractive"`. If verification (per Pitfall 1) shows `crossorigin` is being injected and CookieYes fails to execute, drop `next/script` entirely and use the raw `<script async>` pattern shown above, placed in `(frontend)/layout.tsx` JSX (not in a deeply nested client component).

**Decision rule for plan-phase:**
1. First attempt: `<Script strategy="beforeInteractive">` (RESEARCH.md §3 preferred path).
2. Verify in `pnpm build` output that the rendered tag has NO `crossorigin` attribute.
3. If `crossorigin` IS injected OR script fails silently in production smoke, fall back to raw `<script>` placed in `(frontend)/layout.tsx` per the Cause-4 pattern.

### Shared Pattern S4 — Bulgarian Strings via next-intl (Zero Hardcoded Cyrillic)

**Source:** `messages/bg.json` (entirety) + every component using `getTranslations`/`useTranslations`

**Existing nested key structure to extend** (from `bg.json` lines 7-43, the `auth.register.fields.*` shape):

```json
"auth": {
  "register": {
    "title": "Регистрация",
    "fields": {
      "fullName": "Име и фамилия",
      "email": "Имейл"
    },
    "consents": {
      "privacyTerms": "Съгласявам се с <privacyLink>...</privacyLink>"
    }
  }
}
```

**New top-level keys for Phase 2** (mirror this shape):

```json
"landing": {
  "hero": {
    "kicker": "ПЛАТФОРМА НА МСП",
    "headline": "[ТЕКСТ ОТ КОАЛИЦИЯ]",
    "subheadline": "[ТЕКСТ ОТ КОАЛИЦИЯ]",
    "ctaPrimary": "Присъедини се",
    "ctaSecondary": "Виж идеята"
  },
  "problem": { "heading": "...", "body": "..." },
  "vision": {
    "heading": "...",
    "lead": "...",
    "cards": [
      { "title": "Гласуване по идеи", "body": "..." }
    ]
  },
  "cta": { "heading": "...", "body": "...", "button": "..." },
  "faqTeaser": { "heading": "...", "viewAll": "..." }
},
"agenda": { "title": "Програма", "body": "[ТЕКСТ ОТ КОАЛИЦИЯ]" },
"faq": {
  "title": "Често задавани въпроси",
  "lead": "...",
  "items": [
    { "question": "...", "answer": "..." }
  ]
},
"member": {
  "welcome": {
    "banner": { "heading": "...", "body": "..." },
    "next": { "heading": "...", "items": [...] },
    "cards": { "agenda": {...}, "faq": {...} }
  }
}
```

Existing `member.placeholder.*` keys (bg.json lines 75-79) → DELETE when `/member` page is replaced. Existing `cookieBanner.*` keys (lines 99-110) → KEEP AS-IS; transparency-only. New `nav.agenda` / `nav.faq` / `nav.register` → add to existing `nav` object (lines 71-74).

**Tone enforcement (UI-SPEC §7.6):** All NEW Phase 2 copy uses formal "вие/ви". Existing Phase 1 "ти/те" auth copy stays untouched (D-12 light rebrand, no microcopy changes). Verified explicitly in UI-SPEC §7.6.

### Shared Pattern S5 — Middleware: When NOT to Re-add One

**Source:** `.planning/debug/resolved/chastnik-eu-empty-page.md` § Resolution + § Files changed

The previous middleware was DELETED (commit not listed in this resolved doc; the file `src/middleware.ts` was simply removed) because:

1. Next 15.3 silently force-downgrades `runtime = 'nodejs'` middleware to Edge unless `experimental.nodeMiddleware: true` is set in `next.config.ts`.
2. `experimental.nodeMiddleware` only works on Next 15.5+ canary at the time, but Payload 3.84.1 pins Next.js < 15.5 — the upgrade path is closed.
3. The deleted middleware imported `auth()` → DrizzleAdapter → `node:crypto` + `pg`. None of those are Edge-compatible.

**RESEARCH.md §6 Option 2 prescribes** a NEW middleware that does ONLY `cf-connecting-ip` / `cf-ray` header checks, with ZERO auth or DB imports. This MUST stay Edge-compatible.

**Pattern for new `src/middleware.ts`:**

```ts
// src/middleware.ts — Edge-Runtime-only; NO @/lib/auth, NO @/db imports
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Allow Cloudflare-routed traffic (cf-ray header always present from CF)
  if (!req.headers.get('cf-ray')) {
    // Direct origin-IP access (bypassing Cloudflare) — block
    return new NextResponse('Forbidden', { status: 403 });
  }
  return NextResponse.next();
}

// IMPORTANT: do NOT export `runtime = 'nodejs'` — leave default Edge.
// Excludes /api/* per chastnik-eu-empty-page.md observation that excluding /api
// prevents Auth.js HEAD-probe 500s from being intercepted.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
```

**Anti-pattern (DO NOT do):**
- Do NOT `import { auth } from '@/lib/auth'` in middleware.
- Do NOT `import { db } from '@/db'`.
- Do NOT add `export const runtime = 'nodejs'` (the silent Edge downgrade trap).
- Do NOT use the matcher pattern that strips `/api` matching at the wrong layer.

**Plan-phase decision (per RESEARCH.md §Security Domain "WAF Custom Rule Resolution"):**
The recommendation is Option 2 (middleware) but adds 5 plan tasks. If middleware-related symptoms reappear during implementation, fall back to Option 3 (defer to Phase 6) and document the deferral. **Plan-phase task lead-in must explicitly cite this resolved debug session** so the next person doesn't re-discover the trap.

### Shared Pattern S6 — Component Boundary: Server vs Client

**Source:** `src/components/layout/Header.tsx` (RSC) vs `src/components/forms/TurnstileWidget.tsx:1` (`'use client'` first line) vs `src/components/forms/RegistrationForm.tsx:1`

**Rule (Phase 1 convention, carry forward):**
- All `(frontend)` page files default to RSC. NO `'use client'` at the top.
- A component is RSC unless it needs `useState`, `useEffect`, browser-only APIs, or event handlers — then `'use client'` first line.
- shadcn primitives in `src/components/ui/` are mostly RSC-friendly except interactive ones (Select, Checkbox, Form). Accordion (NEW) will require `'use client'` semantics in its wrapper.

**Phase 2 file boundaries:**

| File | Boundary | Reason |
|---|---|---|
| `Hero.tsx` | RSC | static render, async getTranslations |
| `VideoPlayer.tsx` | RSC | conditional `<video>` from prop; no JS interactivity (D-08: no autoplay) |
| `ValuePropGrid.tsx` | RSC | array.map of cards |
| `CTASection.tsx` | RSC | static render |
| `FAQAccordion.tsx` | **`'use client'`** | wraps Radix Accordion (open/close state) |
| `TableOfContents.tsx` | **`'use client'`** | scroll-position observer |
| `Timeline.tsx` | RSC | static array render |
| `MemberWelcomeBanner.tsx` | RSC | reads `auth()` — see Pattern P3 below |
| `SectionEyebrow.tsx` | RSC | trivial |
| `CookieBanner.tsx` (REPLACE) | `'use client'` (kept) | currently is; keep `'use client'` directive at line 1 |

**For FAQAccordion specifically** — analog `TurnstileWidget.tsx` shows the canonical Client Component shape:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
// ... imports

export function FAQAccordion({ items }: { items: FAQItem[] }) {
  // Radix Accordion handles open/close state internally; no useState needed in wrapper.
  // useTranslations must be `useTranslations` (client hook), NOT `getTranslations` (server-only).
  const t = useTranslations('landing.faq');
  // ...
}
```

`useTranslations` (client) vs `getTranslations` (server) — per next-intl 4.x. Client Components in `messages/bg.json`-using code must use `useTranslations`. This is established in `RegistrationForm.tsx:6-7`.

---

## Per-File Pattern Excerpts

### `src/app/(frontend)/page.tsx` (REPLACE — landing)

**Analog:** `src/app/(frontend)/legal/privacy/page.tsx` (full file, ~24 lines)

**Pattern (extracted lines 1-23):**

```tsx
import { getTranslations } from 'next-intl/server';
import { MainContainer } from '@/components/layout/MainContainer';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DRAFT_DATE = '2026-04-29';

export default async function PrivacyPolicyPage() {
  const tDraft = await getTranslations('legal.draft');
  const tPriv = await getTranslations('legal.privacy');

  return (
    <MainContainer width="legal">
      <h1 className="mb-2 font-display text-3xl">{tPriv('title')}</h1>
      <Alert className="mb-6">...</Alert>
      <article className="prose prose-slate max-w-none text-base" />
    </MainContainer>
  );
}
```

**Apply for landing — additions:**

1. Add `export const revalidate = 3600;` at top (RESEARCH.md §1 / Pattern P1).
2. Add `export async function generateMetadata()` returning OG/Twitter metadata (RESEARCH.md §"Code Examples — ISR landing page" lines 698-712).
3. Replace `<MainContainer width="legal">` with full-bleed `<HeroSection>` followed by `<MainContainer width="page">` for non-hero sections.
4. Compose imported Phase-2 components: `<Hero />`, `<ProblemSection />`, `<VisionSection />`, `<CTASection />`, `<FAQTeaserSection />` (UI-SPEC §5.2 layout).

**Differs from analog:** No `<MainContainer>` at outermost level (hero is full-bleed); no draft Alert; no `<article>`. The `font-display text-3xl` `<h1>` rule **stays** — page title `<h1>` is rendered inside `<Hero>`.

### `src/app/(frontend)/agenda/page.tsx` (NEW)

**Analog:** Same — `src/app/(frontend)/legal/privacy/page.tsx`.

**Pattern:** `MainContainer width="prose"` (NEW variant — see MainContainer update below) + `<h1 className="mb-2 font-display text-3xl">{t('title')}</h1>` + an `<article className="prose prose-slate prose-lg max-w-none">` placeholder body.

Coalition copy mechanism (UI-SPEC §5.3): seed `agenda.body` in `bg.json` with `[ТЕКСТ ОТ КОАЛИЦИЯ — заглавие на раздел]` placeholder. Use plain Bulgarian-string body via `t('body')` for v1; defer MDX migration.

Add `export const revalidate = 3600;` and `generateMetadata()` per Pattern P1.

### `src/app/(frontend)/faq/page.tsx` (NEW)

**Analog:** Same — `src/app/(frontend)/legal/privacy/page.tsx`.

**Pattern:** `MainContainer width="legal"` (existing 720px variant — sufficient per UI-SPEC §5.4) + `<h1 className="mb-2 font-display text-3xl">{t('title')}</h1>` + lead `<p>` + `<FAQAccordion items={...} />`.

Items array reads from `bg.json` `faq.items[]` (6 items per UI-SPEC §7.3). Add `export const revalidate = 3600;` and `generateMetadata()`.

### `src/app/(frontend)/member/page.tsx` (REPLACE — welcome)

**Analog:** Current `src/app/(frontend)/member/page.tsx` (lines 1-12 — itself, expanded).

**Existing pattern:**

```tsx
import { getTranslations } from 'next-intl/server';
import { MainContainer } from '@/components/layout/MainContainer';

export default async function MemberPage() {
  const t = await getTranslations('member.placeholder');
  return (
    <MainContainer width="legal">
      <h1 className="mb-4 font-display text-3xl">{t('heading')}</h1>
      <p className="text-base text-muted-foreground">{t('body')}</p>
    </MainContainer>
  );
}
```

**Apply for welcome page — additions:**

1. Add `import { auth } from '@/lib/auth';` and call `const session = await auth();` to extract `firstName`. Per Pattern P3.
2. Change to `width="page"` per UI-SPEC §5.5.
3. Replace placeholder JSX with: `<MemberWelcomeBanner firstName={firstName} />`, then `<h2>` "Какво следва", then `<Timeline items={...} />`, then 2-card grid linking to `/agenda` and `/faq`.
4. Translation namespace changes: `'member.placeholder'` → `'member.welcome'` (and DELETE the old keys from `bg.json`).
5. **DO NOT add `revalidate`** — this page reads session and is per-request; `(frontend)/member/layout.tsx` already does the auth guard so this page is implicitly dynamic.

**Differs:** session read; no `revalidate`; multiple sections instead of single `<h1>+<p>`.

### `src/app/(frontend)/layout.tsx` (UPDATE)

**Analog:** Itself (lines 1-47 above).

**Existing pattern:**

```tsx
const roboto = Roboto({ weight: ['400', '600'], subsets: [...], display: 'swap', variable: '--font-roboto' });
const robotoSlab = Roboto_Slab({ weight: ['600'], subsets: [...], display: 'swap', variable: '--font-roboto-slab' });
// ...
return (
  <html lang={locale} className={`${roboto.variable} ${robotoSlab.variable}`}>
    <body className="bg-background text-foreground font-sans antialiased">
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Sofia">
        <Header />
        <main className="min-h-[calc(100vh-14rem)]">{children}</main>
        <Footer />
        <CookieBanner />
      </NextIntlClientProvider>
    </body>
  </html>
);
```

**Phase 2 changes:**

1. **DROP** `Roboto_Slab` import + const + `${robotoSlab.variable}` from html className. (RESEARCH.md "State of the Art — Deprecated".)
2. **ADD** `import { roboto, gilroy } from '@/lib/fonts';` (NEW file — see Pattern P2).
3. **REPLACE** the html className to `className={\`${roboto.variable} ${gilroy.variable}\`}`.
4. **EXTEND** `generateMetadata()` to include `openGraph`, `twitter`, `themeColor`, `icons` (RESEARCH.md §11.4 — full block on lines 729-740 of RESEARCH.md).
5. **ADD** skip-to-content link as first child of `<body>`: `<a href="#main-content" className="sr-only focus:not-sr-only ...">Прескочи към съдържанието</a>` (UI-SPEC §8.1).
6. **ADD** `id="main-content"` to `<main>`.
7. **VERIFY** `<CookieBanner />` mount placement is preserved (currently last child of `NextIntlClientProvider` — keep there).

### `src/components/landing/Hero.tsx` (NEW, RSC)

**Analog:** `src/components/layout/Header.tsx` (lines 1-50)

**Imports + structure pattern (Header lines 1-7):**

```tsx
import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';

export async function Hero({ videoUrl }: { videoUrl?: string }) {
  const t = await getTranslations('landing.hero');
  return (
    <section className="relative w-full">
      {/* Background image OR <VideoPlayer> */}
      {videoUrl ? (
        <VideoPlayer src={videoUrl} />
      ) : (
        <Image src="/hero.jpg" alt="" fill priority sizes="100vw" className="absolute inset-0 -z-10 object-cover" />
      )}
      <div className="absolute inset-0 -z-10" style={{ background: 'var(--color-hero-overlay)' }} />
      <div className="mx-auto max-w-[1140px] px-4 py-16 md:px-6 md:py-24">
        <p className="text-sm uppercase tracking-wider text-secondary">{t('kicker')}</p>
        <h1 className="font-display text-4xl text-white md:text-6xl">{t('headline')}</h1>
        <p className="mt-4 text-lg text-white md:text-xl">{t('subheadline')}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg"><Link href="/register">{t('ctaPrimary')}</Link></Button>
          <Button asChild size="lg" variant="outline"><Link href="#vision">{t('ctaSecondary')}</Link></Button>
        </div>
      </div>
    </section>
  );
}
```

**Header lines to copy (showing how `Button asChild` + `Link` is composed in this codebase) — Header.tsx lines 41-44:**

```tsx
<Button asChild variant="ghost" size="sm">
  <Link href="/login">{tNav('login')}</Link>
</Button>
```

**Image priority preload pattern** — copy from `Header.tsx:20-27`:

```tsx
<Image
  src="/logo-placeholder.svg"
  alt={brand}
  width={120}
  height={40}
  className="h-8 w-auto md:h-10"
  priority
/>
```

For the hero: same `priority` flag, but use `fill` + `sizes="100vw"` for full-bleed (RESEARCH.md §"Pattern 5: Hero image with next/image" lines 532-547).

### `src/components/landing/VideoPlayer.tsx` (NEW, RSC)

**Analog:** None — stub component.

**Pattern (per UI-SPEC §6 + D-03):**

```tsx
export function VideoPlayer({ src, poster }: { src?: string; poster?: string }) {
  if (!src) return null;
  return (
    <video
      src={src}
      poster={poster}
      controls
      preload="metadata"
      className="absolute inset-0 -z-10 h-full w-full object-cover"
    >
      {/* No autoplay, no loop, no muted (D-08 formal-respectful tone) */}
    </video>
  );
}
```

Notes: D-08 forbids autoplay; user-initiated playback only. Bunny Stream embed swap (when coalition delivers a Bunny URL) is a single prop change at the call site.

### `src/components/landing/ValuePropGrid.tsx` (NEW, RSC)

**Analog:** `src/components/layout/Footer.tsx` (lines 4-26) — the "RSC + getTranslations + array layout" pattern.

**Footer pattern (lines 4-26):**

```tsx
export async function Footer() {
  const t = await getTranslations('footer');
  const year = new Date().getFullYear();
  return (
    <footer className="bg-surface mt-12">
      <div className="mx-auto flex max-w-[1140px] flex-col items-start gap-6 px-4 py-8 ...">
        <nav aria-label={t('legalGroupAria')} className="flex flex-col gap-2 md:flex-row md:gap-6">
          <Link href="/legal/privacy" className="text-accent hover:underline">{t('privacy')}</Link>
          ...
        </nav>
      </div>
    </footer>
  );
}
```

**Apply for ValuePropGrid:**

```tsx
import { getTranslations } from 'next-intl/server';
import { Vote, Lightbulb, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export async function ValuePropGrid() {
  const t = await getTranslations('landing.vision.cards');
  const items = [
    { icon: Vote, key: 0 },
    { icon: Lightbulb, key: 1 },
    { icon: AlertCircle, key: 2 },
  ];
  return (
    <div className="grid gap-6 md:grid-cols-3 md:gap-8">
      {items.map(({ icon: Icon, key }) => (
        <Card key={key}>
          <CardHeader>
            <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
            <h3 className="font-display text-xl mt-2">{t(`${key}.title`)}</h3>
          </CardHeader>
          <CardContent>
            <p className="text-base text-muted-foreground">{t(`${key}.body`)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

Card composition mirrors `register/page.tsx:26-35` (using `<Card><CardHeader><CardContent>`).

Lucide icon import pattern is project-standard (already used in `package.json` lucide-react@0.469.0; new Phase 2 occurrence).

### `src/components/landing/CTASection.tsx` (NEW, RSC)

**Analog:** `src/components/layout/Footer.tsx` (RSC + getTranslations + Button asChild Link)

```tsx
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';

export async function CTASection() {
  const t = await getTranslations('landing.cta');
  return (
    <section id="cta" className="bg-surface">
      <div className="mx-auto max-w-[1140px] px-4 py-12 text-center md:px-6 md:py-20">
        <h2 className="font-display text-3xl md:text-4xl text-primary">{t('heading')}</h2>
        <p className="mt-4 text-base text-muted-foreground md:text-lg">{t('body')}</p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/register">{t('button')}</Link>
        </Button>
      </div>
    </section>
  );
}
```

### `src/components/landing/FAQAccordion.tsx` (NEW, **Client Component**)

**Analog:** `src/components/forms/TurnstileWidget.tsx` (lines 1-7) — the `'use client'` + `useTranslations` shape.

**TurnstileWidget pattern (line 1, lines 1-7 imports):**

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
```

**Apply for FAQAccordion:**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function FAQAccordion({ namespace = 'faq' }: { namespace?: string }) {
  const t = useTranslations(namespace);
  // Items count comes from a sibling key in bg.json — call t.rich or t for each
  const items = [0, 1, 2, 3, 4, 5];  // 6 FAQ items per UI-SPEC §7.3
  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger>{t(`items.${i}.question`)}</AccordionTrigger>
          <AccordionContent>{t(`items.${i}.answer`)}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
```

Notes:
- Use `useTranslations` (next-intl 4.x client hook) NOT `getTranslations` (server-only). Pattern matches `RegistrationForm.tsx:6-7`.
- Item count is hardcoded (6) per UI-SPEC §7.3. If keys are missing, `t()` throws — caught at build-time by next-intl strict mode (verify in plan-phase).
- Accordion `type="single" collapsible` is the shadcn-prescribed default for FAQ patterns.

### `src/components/member/Timeline.tsx` (NEW, RSC)

**Analog:** `src/components/layout/Footer.tsx` (RSC + array map)

```tsx
import { getTranslations } from 'next-intl/server';

export async function Timeline() {
  const t = await getTranslations('member.welcome.next.items');
  const items = [0, 1, 2];
  return (
    <ol className="mt-6 space-y-8">
      {items.map((i) => (
        <li key={i} className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-base font-extrabold text-primary-foreground">
            {i + 1}
          </div>
          <div>
            <h3 className="font-display text-xl">{t(`${i}.title`)}</h3>
            <p className="mt-2 text-base text-muted-foreground">{t(`${i}.body`)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
```

### `src/components/member/MemberWelcomeBanner.tsx` (NEW, RSC)

**Analog:** `src/components/layout/Header.tsx` (lines 8-14) — the `auth()` + nullable session pattern.

**Header session-read pattern (lines 8-14):**

```tsx
export async function Header() {
  const tNav = await getTranslations('nav');
  const tSite = await getTranslations('site');
  const brand = tSite('brandName');
  const session = await auth();
  const email = session?.user?.email ?? null;
  const localPart = email ? truncate(email.split('@')[0]!, 12) : null;
```

**Apply for MemberWelcomeBanner:**

```tsx
import { CheckCircle2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { Card } from '@/components/ui/card';

export async function MemberWelcomeBanner() {
  const t = await getTranslations('member.welcome.banner');
  const session = await auth();
  const fullName = (session?.user as { name?: string })?.name ?? '';
  const firstName = fullName.trim().split(/\s+/)[0] ?? '';
  // Fallback string per UI-SPEC §7.4: bg.json `member.welcome.banner.body` uses
  // {firstName} placeholder OR a fallback key when name is missing.
  return (
    <Card className="border-l-4 border-l-success p-6">
      <div className="flex gap-4">
        <CheckCircle2 className="h-7 w-7 shrink-0 text-success" strokeWidth={1.5} />
        <div>
          <h1 className="font-display text-3xl">{t('heading')}</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {firstName ? t('body', { firstName }) : t('bodyFallback')}
          </p>
        </div>
      </div>
    </Card>
  );
}
```

The `firstName` extraction mirrors `OtpEmail.tsx:14-16` exactly:

```tsx
const firstName = (fullName ?? '').trim().split(/\s+/)[0] ?? '';
const greeting = firstName ? t('greetingNamed', { firstName }) : t('greetingAnonymous');
```

Reuse this idiom — no need to invent a new helper.

### `src/components/layout/Footer.tsx` (UPDATE — expand to 4-col)

**Analog:** Itself (lines 1-29 — current).

**Existing pattern (full file is the analog):**

```tsx
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export async function Footer() {
  const t = await getTranslations('footer');
  const year = new Date().getFullYear();
  return (
    <footer className="bg-surface mt-12">
      <div className="mx-auto flex max-w-[1140px] flex-col items-start gap-6 px-4 py-8 ...">
        <nav aria-label={t('legalGroupAria')} className="flex flex-col gap-2 md:flex-row md:gap-6">
          <Link href="/legal/privacy" className="text-accent hover:underline">{t('privacy')}</Link>
          ...
        </nav>
        <p>{t('copyright', { year })}</p>
      </div>
    </footer>
  );
}
```

**Phase 2 expansion (per UI-SPEC §5.6):**

1. Replace flex layout with 4-col grid: `<div className="grid gap-8 md:grid-cols-4">`.
2. Add `getTranslations('nav')` for the platform-links column.
3. Columns: Brand, Платформа (`/agenda`, `/faq`, `/register`), Правна информация (existing legal links + `/legal/privacy`, `/legal/terms`, contact), Канали (placeholder text per D-10).
4. Keep `text-accent` link class (alias for new `text-primary` per UI-SPEC §4.6 backcompat).
5. Add `<hr className="my-8 border-border" />` and copyright row.

Existing tests (`branding.spec.ts`) pass through unchanged because the legal-links assertion is a superset.

### `src/components/layout/MainContainer.tsx` (UPDATE)

**Analog:** Itself (lines 1-32).

**Existing pattern:**

```tsx
type Width = 'form' | 'legal' | 'page';

const WIDTH_CLASSES: Record<Width, string> = {
  form: 'max-w-[480px]',
  legal: 'max-w-[720px]',
  page: 'max-w-[1140px]',
};
```

**Phase 2 extension (UI-SPEC §5.1):**

```tsx
type Width = 'form' | 'legal' | 'prose' | 'page' | 'wide';

const WIDTH_CLASSES: Record<Width, string> = {
  form: 'max-w-[480px]',
  legal: 'max-w-[720px]',
  prose: 'max-w-[768px]',     // NEW — /agenda
  page: 'max-w-[1140px]',
  wide: 'max-w-[1280px]',     // NEW — forward-compat
};
```

No JSX changes; just two new entries in the union and map.

### `src/components/layout/CookieBanner.tsx` (REPLACE — fix `afterInteractive` → `beforeInteractive`)

**Analog:** Itself (current, lines 1-34) + `register/page.tsx:11-25` (Cause-4 fallback pattern).

**Current code (the bug):**

```tsx
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
        strategy="afterInteractive"   // ← BUG (RESEARCH.md §3)
      />
      <Script id="cookieyes-bridge" strategy="afterInteractive">
        {`(function(){ ... })();`}
      </Script>
    </>
  );
}
```

**Phase 2 corrected version (RESEARCH.md §3 lines 371-405):**

```tsx
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
        {/* Bridge stays afterInteractive — it consumes the cookieyes_consent_update event, doesn't load CookieYes itself */}
        {`(function(){ ... })();`}
      </Script>
      {/* CSS overrides per UI-SPEC §9.2 — token-driven so globals.css changes propagate without redeploy edit */}
      <style>{`
        .cky-consent-container { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 12px; ... }
        .cky-btn-accept { background: var(--color-primary); color: #fff; }
        .cky-btn-reject { background: transparent; border: 1px solid var(--color-border); color: var(--color-foreground); }
        .cky-btn-customize { color: var(--color-primary); text-underline-offset: 4px; }
        div[data-cky-tag="powered-by"], div[data-cky-tag="detail-powered-by"] { display: none; }
      `}</style>
    </>
  );
}
```

**Fallback path (if `beforeInteractive` hoisting fails per Pitfall 1):** Move the script to a raw `<script src=... async defer>` tag in `(frontend)/layout.tsx` JSX, mirroring the Cause-4 pattern from `register/page.tsx:11-25`. See § Shared Pattern S3.

**The bridge stays `afterInteractive`** — it listens for events, doesn't bootstrap CookieYes, so it's safe post-hydration.

### `src/components/ui/accordion.tsx` (NEW via shadcn add)

**Analog:** `src/components/ui/select.tsx` (existing Radix-wrapped shadcn primitive — same family).

**Install command:** `pnpm dlx shadcn@latest add accordion` (RESEARCH.md §"Phase-2-specific additions" line 152). Output is a generated file; no manual edits in v1.

The generated file follows shadcn-default exports (`Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`). FAQAccordion.tsx imports from `@/components/ui/accordion` — same alias style used by Card, Button, Select.

### `src/styles/globals.css` (UPDATE)

**Analog:** Itself (current, lines 1-36) — extend the existing `@theme` block.

**Existing pattern (lines 3-29):**

```css
@theme {
  /* Brand palette — Sinya Bulgaria (BRAND-01, UI-SPEC § Color) */
  --color-background: #FFFFFF;
  --color-surface: #F1F5F9;
  --color-foreground: #0F172A;
  --color-muted-foreground: #475569;
  --color-border: #E2E8F0;
  --color-accent: #004A79;
  --color-destructive: #E72E4D;
  --color-success: #009F54;
  --color-sky: #00B7ED;

  /* Typography scale — locked to 4 sizes (UI-SPEC § Typography) */
  --text-sm: 14px;
  --text-base: 16px;
  --text-xl: 20px;
  --text-3xl: 28px;

  /* Layout containers (UI-SPEC § Layout Shell) */
  --container-form: 480px;
  --container-legal: 720px;
  --container-page: 1140px;

  /* Font families (BRAND-06) — actual face loaded via next/font in layout */
  --font-sans: var(--font-roboto), system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif;
  --font-display: var(--font-roboto-slab), Georgia, serif;
}
```

**Phase 2 expansion (UI-SPEC §3.3 + §4.3 — full new block lines 198-238 of UI-SPEC):**

1. **Retune** existing tokens:
   - `--color-destructive: #E72E4D` → `#DC2626` (UI-SPEC §4.6 — AA contrast).
   - `--color-success: #009F54` → `#059669`.
   - `--color-sky: #00B7ED` → `#3AC7FF` (canonical Sinya).
2. **Add** new tokens: `--color-card`, `--color-card-foreground`, `--color-popover`, `--color-popover-foreground`, `--color-muted`, `--color-input`, `--color-ring`, `--color-primary` (alias of accent), `--color-primary-foreground`, `--color-secondary`, `--color-secondary-foreground`, `--color-hero-overlay`, `--color-hero-text`, `--color-warning`, `--color-warning-foreground`.
3. **Expand** typography scale to 8 sizes per UI-SPEC §3.3 (add `--text-xs`, `--text-lg`, `--text-2xl`, `--text-4xl`, `--text-5xl`, `--text-6xl`, plus 4 `--leading-*` tokens).
4. **Add** `--container-prose: 768px` and `--container-wide: 1280px`.
5. **Replace** `--font-display: var(--font-roboto-slab), ...` → `--font-display: var(--font-gilroy), var(--font-roboto), Georgia, serif;`.
6. **Add** the `prefers-reduced-motion` media query at the bottom (UI-SPEC §10.3).
7. **KEEP** the `[data-slot="input-otp-slot"]` block at lines 32-35 unchanged (UI-SPEC §3.5).

Backcompat: `--color-accent` stays as alias of `--color-primary` so Footer's `text-accent` className keeps working (UI-SPEC §4.6).

### `src/lib/fonts.ts` (NEW)

**Analog:** `(frontend)/layout.tsx:9-21` — pattern shape extracted to a module.

**Existing inline pattern in layout:**

```tsx
const roboto = Roboto({
  weight: ['400', '600'],
  subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
  display: 'swap',
  variable: '--font-roboto',
});
```

**Apply for `src/lib/fonts.ts` (RESEARCH.md §"Pattern 4" lines 467-502):**

```tsx
import localFont from 'next/font/local';
import { Roboto } from 'next/font/google';

export const gilroy = localFont({
  src: [
    { path: '../../public/fonts/gilroy-extrabold.woff2', weight: '800', style: 'normal' },
    { path: '../../public/fonts/gilroy-light.woff2', weight: '300', style: 'normal' },
  ],
  variable: '--font-gilroy',
  display: 'swap',
  fallback: ['var(--font-roboto)', 'Georgia', 'serif'],
  preload: true,
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

**Critical: relative path to woff2** — the path `'../../public/fonts/...'` is relative to `src/lib/fonts.ts` (RESEARCH.md Pitfall 8). Do not move this file.

**Path verification** — RESEARCH.md Pitfall 4 flags that `output: 'standalone'` may not copy `public/fonts/` automatically. Plan-phase MUST verify the Dockerfile has `COPY --from=builder /app/public ./public`.

### `src/middleware.ts` (NEW per RESEARCH.md §6 Option 2)

**Analog:** `.planning/debug/resolved/chastnik-eu-empty-page.md` § Resolution + § Files changed (anti-pattern reference — what NOT to do).

**See Shared Pattern S5** above for the full annotated pattern. Repeated here for completeness:

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  if (!req.headers.get('cf-ray')) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
```

**Planner watchout:** RESEARCH.md §"WAF Custom Rule Resolution" notes Option 3 (defer) is the safe escape hatch if any of the following surfaces during implementation: build emits `experimental.nodeMiddleware` warning, `pnpm build` fails, production smoke shows blank pages on `/`, `/agenda`, `/faq`. The deferral is acceptable and was already accepted once.

### `next.config.ts` (UPDATE — add `headers()` for static assets only)

**Analog:** Itself (lines 1-19).

**Existing pattern (full file):**

```tsx
import { withPayload } from '@payloadcms/next/withPayload';
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: { reactCompiler: false },
};

export default withSentryConfig(withNextIntl(withPayload(nextConfig)), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
```

**Phase 2 addition (RESEARCH.md §"Code Examples — next.config.ts addition" lines 776-802):**

```tsx
const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: { reactCompiler: false },
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/og-image.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
};
```

**DO NOT** add Cache-Control entries for HTML routes here (RESEARCH.md anti-pattern: `revalidate` on the route segment handles `s-maxage` automatically; manual headers conflict).

### `src/app/sitemap.ts` (NEW)

**Analog:** None in repo. Use Next.js convention (RESEARCH.md §"Code Examples — app/sitemap.ts" lines 729-746) verbatim:

```ts
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
  ];
}
```

### `src/app/robots.ts` (NEW)

**Analog:** None. Use RESEARCH.md §"Code Examples — app/robots.ts" lines 750-770 verbatim.

```ts
import type { MetadataRoute } from 'next';

const BASE = 'https://chastnik.eu';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: ['/', '/agenda', '/faq', '/legal/'],
      disallow: ['/member', '/admin', '/auth/', '/api/', '/login', '/register'],
    }],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
```

### `messages/bg.json` (UPDATE)

**Analog:** Itself.

**Existing nested pattern (the canonical shape — bg.json lines 7-43):**

```json
"auth": {
  "register": {
    "title": "Регистрация",
    "fields": {
      "fullName": "Име и фамилия"
    }
  }
}
```

**Phase 2 additions:**

1. NEW top-level keys: `landing`, `agenda`, `faq` (and update existing `member.welcome`, `nav`, `cookieBanner`).
2. Coalition-copy placeholders use `[ТЕКСТ ОТ КОАЛИЦИЯ]` per UI-SPEC §7.1. Plan-phase pre-launch checklist: grep for the placeholder string in `bg.json` and fail if any remain.
3. **DELETE** `member.placeholder.*` (lines 75-79) — replaced by `member.welcome.*`.
4. **EXTEND** `nav` (lines 71-74) with `agenda`, `faq`, `register` sub-keys.
5. **KEEP** `cookieBanner.*` (lines 99-110) as transparency-only documentation; CookieYes dashboard is the runtime source.

Tone rule: New `landing.*` / `agenda.*` / `faq.*` / `member.welcome.*` use formal "вие/ви". Existing `auth.*` keys keep "ти/те" untouched (D-12).

### `tests/e2e/landing.spec.ts` (NEW)

**Analog:** `tests/e2e/branding.spec.ts` (full file, lines 1-51).

**branding.spec.ts pattern (lines 1-21):**

```tsx
import { test, expect } from '@playwright/test';

test.describe('Branding contract — BRAND-02, BRAND-03, BRAND-06', () => {
  test('logo SVG is present in header on every Phase 1 route (BRAND-02)', async ({ page }) => {
    for (const path of ['/register', '/login', '/auth/otp', '/legal/privacy', '/legal/terms']) {
      await page.goto(path);
      const logo = page.getByRole('link', { name: 'Синя България' });
      await expect(logo).toBeVisible();
      const img = logo.locator('img');
      await expect(img).toHaveAttribute('alt', 'Синя България');
      await expect(img).toHaveAttribute('src', /logo-placeholder\.svg/);
    }
  });
```

**Apply for landing.spec.ts (covers PUB-01..04):**

```tsx
import { test, expect } from '@playwright/test';

test.describe('Public surface — PUB-01..04', () => {
  test('PUB-01: landing has h1 + image + (optional) video slot', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('section img, section video').first()).toBeVisible();
  });

  test('PUB-03: navigation between /, /agenda, /faq works', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /програма/i }).first().click();
    await expect(page).toHaveURL(/\/agenda$/);
    await page.goto('/');
    await page.getByRole('link', { name: /въпроси/i }).first().click();
    await expect(page).toHaveURL(/\/faq$/);
  });

  test('PUB-04: join CTA visible on landing, agenda, faq, member', async ({ page }) => {
    for (const path of ['/', '/agenda', '/faq']) {
      await page.goto(path);
      await expect(page.getByRole('link', { name: /регистрирай се|присъедини се/i }).first()).toBeVisible();
    }
  });

  test('PUB-02: landing emits Cache-Control with s-maxage', async ({ request }) => {
    const res = await request.get('/');
    const cc = res.headers()['cache-control'] ?? '';
    expect(cc).toMatch(/s-maxage=3600/);
  });
});
```

Patterns copied from analog: `getByRole`, `getByText` Cyrillic regex (`/программа/i`), `await expect(...).toBeVisible()`, multi-route loop. Adapted: PUB-04 CTA assertion, PUB-02 cache-header check via `request.get()` (extends the analog's pattern from `smoke.spec.ts:5`).

### `tests/e2e/cookie-consent.spec.ts` (NEW)

**Analog:** `tests/e2e/branding.spec.ts` (RGB pattern as above).

```tsx
import { test, expect } from '@playwright/test';

test.describe('GDPR-01 — cookie consent', () => {
  test('cookie banner appears on first visit', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    // CookieYes injects .cky-consent-container; wait up to 5s for it
    const banner = page.locator('.cky-consent-container, [data-cky-tag="notice"]').first();
    await expect(banner).toBeVisible({ timeout: 5000 });
  });

  test('granular categories present (necessary, analytics, marketing)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /настрой|customize/i }).click();
    for (const cat of [/необходими/i, /анализи/i, /маркетинг/i]) {
      await expect(page.getByText(cat).first()).toBeVisible();
    }
  });
});
```

### `tests/e2e/typography.spec.ts` (NEW)

**Analog:** `tests/e2e/branding.spec.ts` lines 23-35 (Cyrillic glyph rendering check).

**branding.spec.ts BRAND-06 pattern:**

```tsx
test('Roboto Cyrillic family is loaded on body (BRAND-06)', async ({ page }) => {
  await page.goto('/register');
  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(family.toLowerCase()).toContain('roboto');
});
```

**Apply for typography.spec.ts (RESEARCH.md Pitfall 10 — Cyrillic descender check):**

```tsx
test('Gilroy ExtraBold is loaded on hero h1 (Phase 2)', async ({ page }) => {
  await page.goto('/');
  const family = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    return h1 ? getComputedStyle(h1).fontFamily : '';
  });
  expect(family.toLowerCase()).toContain('gilroy');
});

test('Cyrillic descender glyphs (Я Щ Ц Ъ Ю) render at hero size without clipping', async ({ page }) => {
  await page.goto('/');
  const h1 = page.locator('h1').first();
  await expect(h1).toBeVisible();
  // Bounding-box height sanity check — cropped descenders show as <expected
  const box = await h1.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThan(40);  // hero h1 is 36px+ minimum
});
```

---

## Pattern Catalogue (lookup table for the planner)

These named patterns can be referenced by ID in plan-phase action sections (e.g., "Apply Pattern P1 to `/agenda`").

| Pattern ID | Name | Source | Apply To |
|---|---|---|---|
| **P1** | Static Server Component with `revalidate=3600` | RESEARCH.md §1 lines 282-318 + analog `legal/privacy/page.tsx` | `/`, `/agenda`, `/faq` page files |
| **P2** | next/font/local Gilroy module | RESEARCH.md §"Pattern 4" lines 467-502 | `src/lib/fonts.ts` |
| **P3** | Auth() session read in RSC for `firstName` | `Header.tsx:8-14` + `OtpEmail.tsx:14-16` | `MemberWelcomeBanner.tsx` |
| **P4** | shadcn primitive wrapped in Client Component | `ui/select.tsx` family + `'use client'` directive | `FAQAccordion.tsx`, `accordion.tsx` |
| **P5** | Lucide icon in card header | UI-SPEC §6 + new pattern | `ValuePropGrid.tsx`, `MemberWelcomeBanner.tsx`, Footer column icons |
| **P6** | Button asChild + Link | `Header.tsx:42-44` | All CTA buttons |
| **P7** | Rich translation with link chunks | `RegistrationForm.tsx:124-137` | `/faq` lead text, footer copy with embedded links |
| **P8** | First-name extraction from session.user.name | `OtpEmail.tsx:14` | `MemberWelcomeBanner.tsx` |
| **P9** | `font-display text-3xl` raw `<h1>` (NOT shadcn CardTitle) | `legal/privacy/page.tsx:13` + Cause-2 commit `a635faa` | All page-title `<h1>` elements in Phase 2 |
| **P10** | Raw SSR `<script>` for race-sensitive third-party JS | `register/page.tsx:11-25` (Cause-4 fix) | `CookieBanner.tsx` fallback path; future similar third-party scripts |

---

## No Analog Found

Files where the codebase has no close existing match — planner falls back to RESEARCH.md / UI-SPEC patterns directly:

| File | Role | Reason | Source-of-truth |
|---|---|---|---|
| `src/lib/fonts.ts` | next/font/local module | Phase 1 used inline `next/font/google` only; no `next/font/local` precedent | RESEARCH.md §"Pattern 4" lines 467-502 |
| `src/middleware.ts` | Edge middleware (new) | Previous middleware was deleted (chastnik-eu-empty-page.md); pattern is "do not repeat the trap" | RESEARCH.md §6 Option 2 + Shared Pattern S5 |
| `src/app/sitemap.ts` | Next.js metadata file | Pure framework convention — no in-repo precedent | RESEARCH.md §"Code Examples" lines 729-746 |
| `src/app/robots.ts` | Next.js metadata file | Same | RESEARCH.md lines 750-770 |
| `src/components/landing/VideoPlayer.tsx` | Media stub | No video components exist in repo | UI-SPEC §6 component spec |
| `src/components/landing/TableOfContents.tsx` | Scroll-aware Client Component | No scroll/intersection-observer components exist | UI-SPEC §5.3 |
| `public/fonts/*.woff2` | Binary assets | Generated externally (transfonter.org / pyftsubset) | RESEARCH.md §"Pattern 4" lines 450-457 |
| `public/og-image.png` | Image asset | Generated externally | UI-SPEC §11.1 |
| `public/hero.jpg` | Image asset | Coalition-delivered (placeholder until then) | UI-SPEC §13.3 |

---

## Integration with Existing Tests

`tests/e2e/branding.spec.ts` (lines 7-15) currently asserts logo presence on Phase 1 routes only. Phase 2 plan should:

1. **EXTEND** the route loop to include `/`, `/agenda`, `/faq`, `/member` — the existing logo + Cyrillic + `<h1>` assertions then cover all 9 frontend routes uniformly.
2. **EXTEND** BRAND-06 to assert `font-family` includes "gilroy" on `<h1>` elements (currently only asserts "roboto" on `body`).
3. **EXTEND** PUB-06 (`responsive.spec.ts:3`) ROUTES array to include `/`, `/agenda`, `/faq`, `/member`.

These are line-edit changes, not new specs — they reuse the existing matcher patterns and viewport projects.

---

## Metadata

**Analog search scope:**
- `src/components/layout/*` (5 files)
- `src/components/forms/*` (4 files)
- `src/components/ui/*` (8 files)
- `src/app/(frontend)/**/page.tsx` (5 files)
- `src/app/(frontend)/layout.tsx` + `member/layout.tsx`
- `src/lib/email/templates/*.tsx` (3 files — for translation patterns)
- `tests/e2e/*.spec.ts` (6 files)
- `messages/bg.json`
- `src/styles/globals.css`
- `next.config.ts`
- `.planning/debug/resolved/*` (2 sessions: chastnik-eu-empty-page, d-ci-app-failures)

**Files scanned:** ~40
**Pattern extraction date:** 2026-05-02
**Phase 1 commits referenced:** `5b05427`, `a635faa`, `e4e5cc6`, `0f22dac`, `cd75d17`, `089bb7b`, `489aed9`

*Phase: 02-public-surface-pre-warmup*
