/**
 * Font module — next/font integration for Phase 2 typography.
 *
 * ============================================================
 * SECURITY / LEGAL NOTICE — Gilroy Free Webfont (UNVERIFIED)
 * ============================================================
 *
 * Source repo:    github.com/repalash/gilroy-free-webfont
 * License status: UNVERIFIED — operator-accepted via decision
 *                 `a-gilroy-anyway` recorded 2026-05-03.
 * Risk reference: see `.planning/phases/02-public-surface-pre-warmup/
 *                 02-FONT-LICENSE.md` § "Operator Decision (2026-05-03)".
 *
 * The upstream repo has no LICENSE file, no SPDX identifier, and the
 * README explicitly redirects to a commercial source (Tinkov / Monotype)
 * for "the other versions". The "free" claim refers to which weights
 * are distributed, NOT to a commercial-use grant. The operator
 * accepted this risk for v1 brand-fidelity continuity with the
 * sinyabulgaria.bg coalition assets.
 *
 * Tracked as deferred item: D-GilroyLicenseRisk (STATE.md).
 *
 * Fallback path (mechanical swap if challenge surfaces):
 *   1. Replace the `localFont` block below with `Manrope` from
 *      `next/font/google`:
 *
 *        import { Manrope } from 'next/font/google';
 *        export const gilroy = Manrope({
 *          weight: ['300', '800'],
 *          subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
 *          display: 'swap',
 *          variable: '--font-gilroy', // KEEP THE NAME
 *        });
 *
 *   2. Delete `public/fonts/gilroy-extrabold.woff2`
 *      and `public/fonts/gilroy-light.woff2`.
 *   3. The `--font-gilroy` CSS variable name in `globals.css` is
 *      preserved deliberately so this swap is mechanical and the
 *      `--font-display` chain does not change.
 *   4. Manrope is OFL-licensed (SIL Open Font License v1.1) and
 *      ships with full Cyrillic via Google Fonts.
 *
 * ============================================================
 *
 * IMPLEMENTATION NOTES
 * - The relative path `../../public/fonts/...` is relative to THIS FILE,
 *   not the project root (Next.js documents this for next/font/local —
 *   RESEARCH §3 Pitfall 8). DO NOT move src/lib/fonts.ts without
 *   updating these paths.
 * - `display: 'swap'` shows fallback text immediately and swaps to
 *   Gilroy when ready (FOUT, not FOIT) — UI-SPEC §3.1.
 * - ascent/descent overrides match Roboto's metrics to minimize CLS
 *   on the swap (RESEARCH §3 Pattern 4).
 */

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
  // Match metrics to Roboto to minimize CLS on swap.
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
