---
phase: 02
plan: 01
subsystem: design-tokens-typography
tags: [tailwind-v4, fonts, typography, branding, accessibility, gdpr]
requires: []
provides:
  - "Sinya canonical color tokens via @theme block (foundation for all Phase 2 components)"
  - "Self-hosted Gilroy ExtraBold + Light woff2 with verified Bulgarian Cyrillic coverage"
  - "src/lib/fonts.ts module abstracting next/font/local + next/font/google (re-usable across layouts)"
  - "Skip-to-content link as first focusable child of <body> (WCAG 2.1)"
  - "Typography ramp expanded from 4 to 8 sizes + 4 leading tokens"
  - "scroll-padding-top: 5rem + prefers-reduced-motion fallback"
affects:
  - src/styles/globals.css
  - src/lib/fonts.ts
  - src/app/(frontend)/layout.tsx
  - public/fonts/
tech-stack:
  added:
    - "next/font/local for self-hosted woff2 (Gilroy)"
    - "fonttools 4.62.1 + brotli + zopfli (build-time only — woff2 generation, not runtime)"
  patterns:
    - "next/font CSS variable hookup via html className (already in use for Roboto)"
    - "@theme block in globals.css as Tailwind v4 token source of truth"
    - "Mechanical font swap path documented in fonts.ts header (Gilroy → Manrope OFL)"
key-files:
  created:
    - .planning/phases/02-public-surface-pre-warmup/02-FONT-GLYPH-AUDIT.md
    - public/fonts/gilroy-extrabold.woff2
    - public/fonts/gilroy-light.woff2
    - src/lib/fonts.ts
  modified:
    - src/app/(frontend)/layout.tsx
    - src/styles/globals.css
decisions:
  - "Gilroy license UNVERIFIED but operator-accepted (decision a-gilroy-anyway, 2026-05-03) — Manrope fallback path mechanically documented in fonts.ts header"
  - "Cyrillic coverage 100% on both Gilroy weights (uppercase А-Я + lowercase а-я + ё Ё №) — Roboto fallback chain stays as defensive depth"
  - "Phase 1 backcompat alias --color-accent retained as alias of --color-primary so Footer text-accent className continues working without JSX edit"
  - "Phase 1 destructive #E72E4D → #DC2626, success #009F54 → #059669, sky #00B7ED → #3AC7FF retuned for AA contrast on white per UI-SPEC §4.6"
metrics:
  duration: "~25 minutes (continuation from STEP 2 onward)"
  completed: 2026-05-03
  tasks: 5
  files-changed: 6
  commits: 3
---

# Phase 02 Plan 01: Tailwind v4 token retune + Gilroy webfont setup Summary

**One-liner:** Self-hosted Gilroy ExtraBold + Light webfont via `next/font/local`, full Sinya canonical color/typography tokens in Tailwind v4 `@theme`, skip-to-content link with `--font-gilroy` variable preserved across mechanical Manrope fallback path.

## What Shipped

This plan resumed from Task 02.01.1 STEP 2 onward. STEP 1 (license verification, A2 resolution) was completed by the previous executor and resolved by operator decision `a-gilroy-anyway` recorded in `02-FONT-LICENSE.md`. The remaining work delivered:

1. **Generated Gilroy woff2 files** from the canonical free-distribution source (`github.com/repalash/gilroy-free-webfont`, `fonts` branch) by subsetting the source TTFs through `pyftsubset` to Latin + Cyrillic + Cyrillic Ext (U+0000-007F + U+0400-04FF + U+0500-052F).
   - `public/fonts/gilroy-extrabold.woff2`: **11,848 bytes** (11.8 KB)
   - `public/fonts/gilroy-light.woff2`: **12,216 bytes** (12.2 KB)
   - Both files validated as `Web Open Font Format (Version 2)` via the `file` utility.

2. **Audited Cyrillic glyph coverage (A3)** — `02-FONT-GLYPH-AUDIT.md` documents the per-file coverage results. **Both weights have 100% Bulgarian coverage**: full uppercase А-Я (30 chars, none missing), full lowercase а-я (30 chars, none missing), high-risk descenders ж щ ъ ю я all present, plus ё Ё №. Decision: **ALL_PASS** — no Roboto fallback needed for any Bulgarian glyph at runtime.

3. **Created `src/lib/fonts.ts`** as a clean module exporting `gilroy` (next/font/local with weights 800 + 300, ascent/descent/line-gap overrides matched to Roboto for low CLS, fallback chain → roboto → Georgia → serif, preload enabled) and `roboto` (next/font/google, weights 400 + 600, cyrillic + cyrillic-ext + latin subsets). The file ships a load-bearing **SECURITY/LEGAL header block** at the top documenting:
   - Source repo: `github.com/repalash/gilroy-free-webfont`
   - License status: UNVERIFIED — operator-accepted via decision `a-gilroy-anyway` (2026-05-03)
   - Risk reference: `.planning/phases/02-public-surface-pre-warmup/02-FONT-LICENSE.md` § "Operator Decision (2026-05-03)"
   - Fallback path: mechanical swap to Manrope ExtraBold (OFL via Google Fonts), preserving `--font-gilroy` variable so `globals.css` stays unchanged

4. **Updated `src/app/(frontend)/layout.tsx`** with surgical edits:
   - Replaced `import { Roboto, Roboto_Slab } from 'next/font/google'` with `import { roboto, gilroy } from '@/lib/fonts'`
   - Removed inline `Roboto(...)` + `Roboto_Slab(...)` declarations (now in fonts.ts)
   - Updated html className: `${roboto.variable} ${gilroy.variable}` (dropped `${robotoSlab.variable}`)
   - Added skip-to-content link as first focusable child of `<body>` inside `<NextIntlClientProvider>`, using the `a11y.skipToContent` key (already in `messages/bg.json` from plan 02-02)
   - Added `id="main-content"` to the existing `<main>` element

5. **Replaced the entire `@theme` block in `src/styles/globals.css`** verbatim from UI-SPEC §4.3 + §3.3:
   - Full Sinya canonical color tokens: `--color-primary` #004A79, `--color-secondary` #3AC7FF, full neutral ramp, `--color-card`, `--color-popover`, `--color-muted`, `--color-input`, `--color-ring`, `--color-hero-overlay`
   - Phase 1 backcompat: `--color-accent` retained as alias of `--color-primary` (Footer's `text-accent` className unchanged)
   - Retunes: destructive #E72E4D → #DC2626, success #009F54 → #059669, sky #00B7ED → #3AC7FF
   - Typography ramp 4 → 8 sizes (`--text-xs` 0.8125rem through `--text-6xl` 3.75rem) + 4 leading tokens
   - Containers: added `--container-prose: 768px` and `--container-wide: 1280px`
   - `--font-display` 3-tier fallback chain: `var(--font-gilroy), var(--font-roboto), Georgia, serif`
   - `scroll-behavior: smooth` + `scroll-padding-top: 5rem` on `html` (UI-SPEC §10.4)
   - `@media (prefers-reduced-motion: reduce)` block (UI-SPEC §10.3, WCAG 2.1)
   - `[data-slot="input-otp-slot"]` rule preserved unchanged (UI-SPEC §3.5)

6. **Verified A4 (Dockerfile public/ copy)** — `Dockerfile:35` already contains `COPY --from=builder /app/public ./public`, confirmed by `grep -n "COPY.*public" Dockerfile`. No Dockerfile modification needed.

7. **Verified production build + smoke test** — `pnpm build` succeeded with the new tokens and fonts (after sourcing `.env.test` for Auth/DB env). The build emitted both Gilroy woff2 files into `.next/static/media/` (hashed filenames `07d3500855e2e940-s.p.woff2` for ExtraBold and `171e7334234b78c9-s.p.woff2` for Light, both with `-s.p.` preload-marked extension confirming `preload: true` in fonts.ts is honored). MD5 hashes verified byte-for-byte identical to the source files in `public/fonts/`. `pnpm start` smoke test: server boots in 2s; `curl /` returns HTML (currently 307 redirects to /register which is expected Phase 1 behavior); HTML preload-references both Gilroy hashed woff2 files; direct fetch of the hashed font URL returns HTTP 200 with `content-type: font/woff2` and `content-length: 11848` (matching source byte size).

## Tasks Completed

| Task | Description | Commit |
| ---- | ----------- | ------ |
| 02.01.1 STEP 1 | License verification (A2) — RESOLVED by previous executor + operator decision `a-gilroy-anyway` | (pre-existing in 50cd59b + 2cdd3b9) |
| 02.01.1 STEP 2 | Generate Gilroy woff2 (subset to Latin + Cyrillic + Cyrillic Ext via pyftsubset) | bd4a3e3 |
| 02.01.1 STEP 3 | Cyrillic glyph audit (A3) — `02-FONT-GLYPH-AUDIT.md` | bd4a3e3 |
| 02.01.2 | `src/lib/fonts.ts` + `(frontend)/layout.tsx` skip-to-content + main id | b6460ac |
| 02.01.3 | `src/styles/globals.css` retune (Sinya canonical + 8-size ramp + reduced-motion + scroll behavior) | 305d734 |
| 02.01.4 | A4 Dockerfile verify (no change needed) + `pnpm build` smoke test (passed) | (verification-only, no file changes) |
| 02.01.5 | Operator decision checkpoint — RESOLVED by `a-gilroy-anyway` (no file changes) | (pre-existing in 2cdd3b9) |

## Verification Results

All plan-level acceptance criteria pass:

- ✅ `public/fonts/gilroy-extrabold.woff2` — 11,848 bytes (> 10 KB), valid woff2 format, MD5 `9d56ca42046652d7b0fe2ef8b7412f36`
- ✅ `public/fonts/gilroy-light.woff2` — 12,216 bytes (> 10 KB), valid woff2 format, MD5 `aef651a6a8827d1f53902dd4c1d4b5c7`
- ✅ `02-FONT-LICENSE.md` Status line: `UNVERIFIED — operator-accepted risk` with Operator Decision section
- ✅ `02-FONT-GLYPH-AUDIT.md` exists with results table and `## Decision` section (ALL_PASS)
- ✅ `src/lib/fonts.ts` exports both `gilroy` and `roboto`; contains `'../../public/fonts/gilroy-extrabold.woff2'` substring
- ✅ `src/app/(frontend)/layout.tsx` no longer contains `Roboto_Slab` (removed); contains `from '@/lib/fonts'`, `gilroy.variable`, `id="main-content"`, `href="#main-content"` with `sr-only focus:not-sr-only` classes
- ✅ `src/styles/globals.css` contains all retuned palette tokens, all 8 text sizes, all 4 leading tokens, all 5 container widths, scroll-padding-top, reduced-motion media query, OTP slot rule preserved
- ✅ `pnpm typecheck` exits 0
- ✅ `pnpm build` exits 0 (with `.env.test` env populated)
- ✅ `.next/static/media/` contains both Gilroy hashed woff2 files
- ✅ Dockerfile `COPY --from=builder /app/public ./public` (line 35) — A4 verified
- ✅ `pnpm start` smoke test: HTML served, font URLs preloaded, direct font fetch returns 200 OK font/woff2

## Deviations from Plan

### None — plan executed exactly as written

The continuation prompt requested STEP 2 onward; all five tasks ran cleanly per the plan. Three minor execution-environment notes (not deviations from the plan content):

1. **`fonttools` was not installed** in the system Python at start; install ran cleanly via `pip3 install --user fonttools brotli zopfli`. The plan named this as Path A and it worked on first attempt; Path B (transfonter.org manual fallback) was not needed.
2. **`pyftsubset` printed `WARNING: FFTM NOT subset` for both source TTFs.** This is benign — `FFTM` is a FontForge timestamp metadata table the subsetter doesn't understand, and dropping it has no functional effect on the rendered font.
3. **`pnpm build` required NEXT_PUBLIC_* env vars** (TURNSTILE_SITE_KEY, COOKIEYES_SITE_KEY) plus AUTH_SECRET/DATABASE_URL/etc. for the page-data-collection pass on dynamic routes. Sourced from `.env.test` (which the project already maintains for CI). This is a pre-existing build-environment constraint, not a plan deviation; the relevant env contract is enforced by `scripts/check-env.ts`.

### Auth gates encountered

None.

### Threat surface scan

No new security-relevant surface introduced beyond what the plan's `<threat_model>` already enumerated. The Gilroy IP-claim threat (T-02-01-2) is the documented operator-accepted risk; the woff2 files do not introduce additional network/file-access surface.

## Known Stubs

None. All deliverables are real (verified woff2 files with verified Cyrillic coverage; real CSS tokens; real font module; layout edits; passing build).

The `[ТЕКСТ ОТ КОАЛИЦИЯ]` placeholders that exist in `messages/bg.json` are intentional placeholders for coalition-authored hero/agenda copy — they belong to plan 02-02 / coalition external dependency, not to this plan, and will be filled in at content-finalization time.

## TDD Gate Compliance

This plan is `tdd: false` per its frontmatter; no RED/GREEN/REFACTOR sequence required. Verification was done via `pnpm typecheck`, `pnpm build`, `pnpm start` smoke test, and per-task automated grep-based acceptance criteria.

## Self-Check: PASSED

- ✅ FOUND: public/fonts/gilroy-extrabold.woff2 (11848 bytes)
- ✅ FOUND: public/fonts/gilroy-light.woff2 (12216 bytes)
- ✅ FOUND: src/lib/fonts.ts
- ✅ FOUND: src/app/(frontend)/layout.tsx (modified)
- ✅ FOUND: src/styles/globals.css (modified)
- ✅ FOUND: .planning/phases/02-public-surface-pre-warmup/02-FONT-GLYPH-AUDIT.md
- ✅ FOUND: commit bd4a3e3 (woff2 + glyph audit)
- ✅ FOUND: commit b6460ac (fonts.ts + layout.tsx)
- ✅ FOUND: commit 305d734 (globals.css)
- ✅ pnpm typecheck exits 0
- ✅ pnpm build exits 0 (with .env.test populated)
- ✅ pnpm start smoke test: font URLs return HTTP 200 font/woff2 with byte-exact match to source
