# Phase 02 — Gilroy Free Webfont License Verification (A2)

**Verified:** 2026-05-03
**Status:** UNVERIFIED
**Source repo:** https://github.com/repalash/gilroy-free-webfont
**Repo metadata:** null (GitHub API `license` field returns `null`; no SPDX identifier set)

## Evidence

### LICENSE file

Repo has no LICENSE file at root.

Verification — listed all files at `master` branch root via GitHub Contents API
(`https://api.github.com/repos/repalash/gilroy-free-webfont/contents`) and at
`fonts` branch root (`?ref=fonts`):

```
master:
  .gitignore
  Gilroy-Extrabold.css
  Gilroy-Extrabold.eot
  Gilroy-Extrabold.ttf
  Gilroy-Extrabold.woff
  Gilroy-Light.css
  Gilroy-Light.eot
  Gilroy-Light.ttf
  Gilroy-Light.woff
  Readme.md

fonts:
  .gitignore
  Gilroy-Extrabold.css   (358 b)
  Gilroy-Extrabold.eot   (82,448 b)
  Gilroy-Extrabold.ttf   (82,260 b)
  Gilroy-Extrabold.woff  (36,960 b)
  Gilroy-Light.css       (334 b)
  Gilroy-Light.eot       (84,900 b)
  Gilroy-Light.ttf       (84,728 b)
  Gilroy-Light.woff      (38,028 b)
  Readme.md
```

No file named `LICENSE`, `LICENSE.txt`, `LICENSE.md`, `COPYING`, `OFL.txt`, or
similar is present on either branch.

GitHub's auto-detection (`license` field in repo metadata) returned `null`,
meaning GitHub did not detect any well-known license file or SPDX header.

### README excerpt (license-related sentences only)

The repo's only documentation is `Readme.md` (capital "R"). Full content fetched
at verification time. Lines containing "license", "free", "commercial",
"personal", "use", "buy" — quoted verbatim:

> # Gilroy Webfont CDN
>
> CDN links for **free** versions of Gilroy font (Light and Extrabold).
> **Buy the other versions from official source here** —
> https://www.tinkov.info/gilroy.html

The README contains:

- The word "free" — but only as a noun ("free versions"), describing which
  weights are distributed via this CDN wrapper (Light + Extrabold), NOT a
  license grant.
- An explicit pointer to the **commercial source** (tinkov.info/gilroy.html)
  for "the other versions", which strongly implies the upstream font is a
  commercial product authored by Radomir Tinkov, and that this repo merely
  re-hosts the two weights the upstream made publicly downloadable.
- **No** sentence containing "free for commercial use", "free for personal and
  commercial", "MIT", "OFL", "SIL Open Font License", "Apache", "ISC", "BSD",
  "released under", "licensed under", or any other commercial-use grant.

The repo's purpose, as stated by its description and README, is to provide
"CDN links" for jsDelivr / GitHub raw — not to assert or relicense the font.

## Decision

**BLOCKING. Falling back to Manrope ExtraBold from Google Fonts** (full
Cyrillic, OFL-licensed). Update `src/lib/fonts.ts` accordingly in Task 02.01.2
fallback path.

Rationale: per the plan's STEP 1 decision tree, when neither a LICENSE file nor
an explicit commercial statement exists, the status is UNVERIFIED and the safe
path is the Google Fonts OFL fallback. The risk surface for shipping
unlicensed-or-ambiguously-licensed type to a political-advocacy production
site is unacceptable (threat T-02-01-2 in the plan's threat model — IP claim
exposure). The visual delta between Gilroy ExtraBold and Manrope ExtraBold is
small (both are geometric humanist sans), and Manrope's full Cyrillic coverage
also resolves A3 by construction.

This decision is surfaced to the operator via Task 02.01.5
(`checkpoint:decision`). The operator may override to ship Gilroy with
explicit risk acceptance (option A) or defer the typography decision to
coalition counsel (option C).

## Fallback path (if not commercial-clean)

Replace the local `gilroy-extrabold.woff2` / `gilroy-light.woff2` declaration
with Manrope from Google Fonts (next/font/google):

```ts
import { Manrope } from 'next/font/google';

export const gilroy = Manrope({
  weight: ['300', '800'],
  subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
  display: 'swap',
  variable: '--font-gilroy', // KEEP THE NAME so globals.css unchanged
});
```

CSS variable name `--font-gilroy` is preserved deliberately so
`src/styles/globals.css`'s `--font-display` chain does NOT branch.

Manrope's licence: SIL Open Font License v1.1 — verified at
https://fonts.google.com/specimen/Manrope (Google Fonts ships only OFL fonts).

## Sources

- GitHub repo: https://github.com/repalash/gilroy-free-webfont
- GitHub Contents API: https://api.github.com/repos/repalash/gilroy-free-webfont/contents
- GitHub Contents API (fonts branch): https://api.github.com/repos/repalash/gilroy-free-webfont/contents?ref=fonts
- README (master): https://raw.githubusercontent.com/repalash/gilroy-free-webfont/master/Readme.md
- Upstream commercial source flagged in README: https://www.tinkov.info/gilroy.html
- Manrope fallback source: https://fonts.google.com/specimen/Manrope
- Date of fetch: 2026-05-03
