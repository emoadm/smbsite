---
phase: 1
plan: 04
subsystem: i18n + design system + cms-bootstrap
tags: [next-intl, tailwind-v4, shadcn, payload-users, brand-tokens]
requires: [01, 03]
provides:
  - i18n-routing
  - i18n-request-config
  - tailwind-v4-theme
  - shadcn-component-registry
  - bg-message-catalog
  - payload-users-collection
  - root-frontend-layout
  - logo-placeholder
affects:
  - package.json
  - next.config.ts
  - src/i18n/
  - src/styles/globals.css
  - components.json
  - postcss.config.mjs
  - src/lib/utils.ts
  - src/components/ui/
  - messages/bg.json
  - src/app/(frontend)/layout.tsx
  - src/collections/Users.ts
  - src/payload.config.ts
  - public/logo-placeholder.svg
  - tests/unit/theme.test.ts
tech-stack:
  added:
    - next-intl@4.11.0
    - zod@3.24.2
    - zod-i18n-map@2.27.0
    - tailwindcss@4.2.4
    - "@tailwindcss/postcss@4.2.4"
    - lucide-react@0.469.0
    - react-hook-form@7.54.2
    - "@hookform/resolvers@5.2.2"
    - class-variance-authority@0.7.1
    - clsx@2.1.1
    - tailwind-merge@2.6.0
  patterns:
    - single-locale next-intl (locales=['bg'], localePrefix='never')
    - Tailwind v4 CSS-first @theme block (no tailwind.config.js)
    - shadcn/ui new-york + slate baseColor + cssVariables
    - i18n-only metadata (D-27, no Cyrillic literals in src/)
    - Payload first-user-creates-admin gate (D-25)
key-files:
  created:
    - src/i18n/routing.ts
    - src/i18n/request.ts
    - postcss.config.mjs
    - src/styles/globals.css
    - components.json
    - src/lib/utils.ts
    - src/components/ui/button.tsx
    - src/components/ui/input.tsx
    - src/components/ui/label.tsx
    - src/components/ui/alert.tsx
    - src/components/ui/card.tsx
    - src/components/ui/checkbox.tsx
    - src/components/ui/select.tsx
    - src/components/ui/form.tsx
    - src/components/ui/input-otp.tsx
    - messages/bg.json
    - src/app/(frontend)/layout.tsx
    - src/collections/Users.ts
    - public/logo-placeholder.svg
  modified:
    - next.config.ts
    - src/payload.config.ts
    - tests/unit/theme.test.ts
    - package.json
key-decisions:
  - "Skipped Task 1.04.5 (live `pnpm exec payload migrate`) per user choice — same pre-Neon deferral pattern as plan 01-03 Task 1.03.3. Payload schema push must run together with the deferred Drizzle `db:push` once DATABASE_URL/DIRECT_URL exist in .env.local."
  - "Used `pnpm dlx shadcn@latest add` for the locked 9-component set (D-26: button, input, label, alert, card, checkbox, select, form, input-otp). No `.gitkeep` needed in src/components/ui/ — directory has real files now."
  - "Peer-dep mismatch logged: @hookform/resolvers@5.2.2 wants react-hook-form@^7.55.0 but plan pinned 7.54.2. shadcn add succeeded; runtime compatibility holds. Reconcile when wiring forms in plan 1.07/1.09 if RHF v7.54.x rejects v5 resolver typings."
  - "Single-locale next-intl uses localePrefix:'never' so URLs are /register, /login (NOT /bg/register). Routing-aware Link/redirect helpers will be set up in plan 1.08 when frontend routing matters."
  - "src/payload.config.ts now sets admin.user = Users.slug = 'users' (D-25 enforcement: no public-create access, all CRUD gated on req.user). Payload-internal `users` table will collide with the Drizzle `users` table when Task 1.04.5 finally runs — collision-handling path (rename slug to cms_users) documented in the plan; first migrate run will reveal whether Payload's table layout actually overlaps."
  - "Frontend layout deliberately omits Header/Footer — plan 1.08 (public-surface scaffold) adds them. layout.tsx renders <main> only so dev mode boots cleanly while letting plan 1.08 own the branding shell."
requirements-completed: [BRAND-01, BRAND-06, PUB-05]
duration: ~30 min
completed: 2026-04-30
---

# Phase 1 Plan 04: i18n + Tailwind v4 + shadcn + Payload Users Summary

Locked the visual + i18n contract every other Phase 1 plan inherits. next-intl v4 wired in single-locale Bulgarian mode (`bg`, `localePrefix='never'` so URLs stay clean). Tailwind v4 CSS-first `@theme` block declares the 9 BRAND-01 color tokens (`--color-accent: #004A79`, `--color-destructive: #E72E4D`, etc.) and the locked 4-size typography scale (14/16/20/28px) directly in `src/styles/globals.css` — no `tailwind.config.js`. shadcn/ui registry initialized with the 9 components D-26 locks (button, input, label, alert, card, checkbox, select, form, input-otp) — no more, no less. `messages/bg.json` pre-populated with every UI-SPEC § Copywriting Contract string under namespaces site/auth/nav/member/legal/footer/cookieBanner/error/destructive/errorsZod/email so plans 1.05–1.13 only consume keys, never add them. Payload `Users` collection created (CMS editorial users — distinct from Drizzle's auth `users` table) with no public-create access (D-25). The actual schema push to Neon (Task 1.04.5) is **deferred** until a Neon project is provisioned — same situation as plan 01-03 Task 1.03.3.

## What Was Built

**Task 1.04.1 — next-intl v4:**
- `src/i18n/routing.ts`: `defineRouting({ locales: ['bg'], defaultLocale: 'bg', localePrefix: 'never' })`
- `src/i18n/request.ts`: `getRequestConfig` with Europe/Sofia tz and dynamic JSON import per requested locale
- `next.config.ts`: wrap chain is now `withNextIntl(withPayload(nextConfig))` (Sentry will be added on top in plan 1.11 per H-6)

**Task 1.04.2 — Tailwind v4 + shadcn:**
- `postcss.config.mjs` enables `@tailwindcss/postcss`
- `src/styles/globals.css` declares `@import "tailwindcss"` + `@theme` block with 9 colors, 4 typography sizes, 3 container widths, 2 font CSS vars (`--font-roboto`, `--font-roboto-slab`), and an OTP-slot rule (tabular-nums + 600 weight per UI-SPEC § Typography rule 2)
- `components.json` configures shadcn (new-york style, slate baseColor, cssVariables, lucide icons)
- `src/lib/utils.ts` exports `cn = twMerge(clsx(...))`
- 9 shadcn components created in `src/components/ui/` via `pnpm dlx shadcn@latest add ... --yes`

**Task 1.04.3 — messages/bg.json + theme test:**
- Every UI-SPEC § Copywriting Contract string under 11 top-level namespaces
- ICU placeholders (`{email}`, `{validityMinutes}`, `{firstName}`, `{date}`, `{year}`, `{supportEmail}`) for runtime interpolation
- Sectors/roles locked per D-09/D-10; 4 consent strings per D-12 (privacyTerms with `<privacyLink>`/`<termsLink>` rich-text tags); newsletter and political-opinion wording verbatim
- `tests/unit/theme.test.ts` rewritten — 13 assertions over CSS tokens (9 colors + 4 sizes), no more `expect.fail` stub

**Task 1.04.4 — Root layout + Payload Users + logo:**
- `src/app/(frontend)/layout.tsx`: Roboto + Roboto_Slab loaded via `next/font/google` with `subsets: ['cyrillic', 'cyrillic-ext', 'latin']` (BRAND-06), wraps children in `NextIntlClientProvider` with `timeZone="Europe/Sofia"`, `<html lang={locale}>` (resolves to `bg`). Metadata produced via `getTranslations('site')` so `pnpm lint:i18n` never sees Cyrillic literals (D-27, B-1 fix).
- `src/collections/Users.ts`: Payload CMS-only Users collection — `slug: 'users'`, `auth: true`, `useAsTitle: 'email'`, `access` denies all CRUD unless `req.user` is set (D-25 lock — no public admin signup)
- `src/payload.config.ts`: registers `Users` in `collections` and sets `admin.user = Users.slug`
- `public/logo-placeholder.svg`: 120×40 navy `#004A79` rect with white "СБ" Roboto Slab text (Q3 — coalition SVG TBD; plan 1.08 swaps in real logo)

**Task 1.04.5 — DEFERRED:** Live `pnpm exec payload migrate` skipped per user choice (option 2 from interactive checkpoint). Resume signal: provision Neon Frankfurt → populate `.env.local` → run `pnpm db:push` (Drizzle plan 01-03's deferred push) → run `CI=true PAYLOAD_MIGRATING=true pnpm exec payload migrate` → verify `psql "$DIRECT_URL" -c "\dt"` shows Drizzle's 5 tables + Payload's `payload_migrations` and `users_*` internal tables. Resolve the slug-collision path (rename `Users.slug` to `cms_users` if Payload reports a duplicate-table error).

## Verification

| Check | Result |
|-------|--------|
| `pnpm typecheck` | exits 0 |
| `pnpm lint:i18n` | exits 0 (no Cyrillic in src/) |
| `pnpm test:unit theme` | 13/13 pass |
| `messages/bg.json` valid JSON, canonical strings present | confirmed (auth.register.cta, auth.otp.title, nav.login, footer.privacy, cookieBanner.acceptAll, error.generic.heading) |
| `src/i18n/routing.ts` declares locales=['bg'], localePrefix='never' | confirmed |
| `next.config.ts` chain | `withNextIntl(withPayload(nextConfig))` |
| 9 shadcn components present (no extras) | confirmed (`ls src/components/ui/ \| wc -l` = 9) |
| Frontend layout uses NextIntlClientProvider + lang={locale} + Cyrillic subsets | confirmed |
| Payload Users access denies anonymous create | confirmed |
| logo-placeholder.svg exists with #004A79 fill | confirmed |
| Live Neon push (Task 1.04.5) | DEFERRED — see key-decisions[0] |

## Deviations from Plan

**[Rule 4 → user-approved deferral] Skipped Task 1.04.5 live Payload migrate**
Found during: Plan 01-04 blocking checkpoint (interactive mode)
Issue: Task 1.04.5 is `checkpoint:human-verify gate=blocking` and requires `PAYLOAD_DATABASE_URL` (= DIRECT_URL) in `.env.local`. No Neon project exists yet (mirrors the deferral plan 01-03 already accepted for `db:push`).
Fix: Per user's interactive-mode option-2 choice ("Skip Task 1.04.5 — continue with later plans"), all code artefacts committed normally. Plan tagged 4-of-5 with the schema push deferred. Both Drizzle and Payload pushes will be executed together when Neon is provisioned.
Files modified: layout, Users collection, payload.config.ts, logo all committed. No DB-side changes attempted.
Verification: SUMMARY tracks this as `key-decisions[0]`. Downstream plans 1.05/1.07/1.09 reference Drizzle types at compile time only — they don't need a live DB to typecheck. Integration tests that require a DB connection will skip when env vars are absent. Plan 1.12 (Fly.io / production setup) MUST run both pushes against production Neon before launch.

**[Rule 5 → minor non-deviation] Skipped `src/components/ui/.gitkeep` creation**
Reason: shadcn add wrote 9 real `.tsx` files into the directory, making `.gitkeep` redundant. The plan's `files_modified` list includes `.gitkeep` only because the directory was empty before this plan. Not a behavioral deviation — git tracks the directory via the real component files.

**[Rule 5 → minor non-deviation] Did not run `pnpm payload generate:types`**
Reason: Payload's type generator requires a working `PAYLOAD_DATABASE_URL`. Skipped because of the same Neon-deferral as Task 1.04.5. `pnpm typecheck` still exits 0 because Payload's collection types resolve from `payload` package types alone (not from the project-specific `payload-types.ts` file the generator would emit). Will run after Neon provisioning.

**[Note — peer-dep warning, not a deviation]**
`@hookform/resolvers@5.2.2` declared `react-hook-form@^7.55.0` as a peer; plan pinned `7.54.2`. pnpm logged the warning but install + shadcn add succeeded. Will be checked again when forms are wired (plan 1.07/1.09); easy fix is to bump RHF to 7.55+ at that time if any incompatibility surfaces.

## Self-Check: PASSED (with deferred checkpoint noted)

All 4 auto tasks (1.04.1–1.04.4) executed and committed atomically. Acceptance criteria for tasks 1–4 verified. Task 1.04.5 deferred per documented user choice.
