# Phase 02 — Gilroy Cyrillic Glyph Coverage Audit (A3)

**Audited:** 2026-05-03
**Tool:** Python fontTools 4.62.1 (`TTFont.getBestCmap`)
**Test set:** uppercase А-Я (30 chars) + lowercase а-я (30 chars) + high-risk descenders ж щ ъ ю я per UI-SPEC §3.4

## Source

- Source TTFs: `github.com/repalash/gilroy-free-webfont` (`fonts` branch)
  - `Gilroy-Extrabold.ttf` (82,260 bytes)
  - `Gilroy-Light.ttf` (84,728 bytes)
- Subsetting: `pyftsubset --flavor=woff2 --unicodes='U+0000-007F,U+0400-04FF,U+0500-052F'`
- Output: `public/fonts/gilroy-extrabold.woff2` + `public/fonts/gilroy-light.woff2`

## Source TTF Coverage (pre-subset)

Both source TTFs ship a Latin-extended + Cyrillic glyph set sufficient for Bulgarian. Total cmap codepoints per file: **466**.

| File | Cyrillic block (U+0400-04FF) | Cyrillic Ext-A (U+0500-052F) |
|------|-------------------------------|-------------------------------|
| `Gilroy-Extrabold.ttf` | 94 / 256 | 0 / 48 |
| `Gilroy-Light.ttf`     | 94 / 256 | 0 / 48 |

The U+0500-052F (Cyrillic Extended-A) range is **empty** in both source TTFs. That range covers historical / non-Bulgarian Slavic letters not used in modern Bulgarian, so the gap does not affect this project. Subsetting requested it but the subsetter correctly omits glyphs that don't exist in the source.

## Subsetted woff2 Results

| File | Bytes | Latin (U+0000-007F) | Cyrillic (U+0400-04FF) | Bulgarian А-Я | Bulgarian а-я | High-risk ж щ ъ ю я |
|------|-------|---------------------|-------------------------|---------------|---------------|----------------------|
| `gilroy-extrabold.woff2` | 11,848 | 95 cp | 94 cp | **100%** (none missing) | **100%** (none missing) | **PASS** |
| `gilroy-light.woff2`     | 12,216 | 95 cp | 94 cp | **100%** (none missing) | **100%** (none missing) | **PASS** |

(Both files contain extras the executor verified: `ё`, `Ё`, `№` — i.e., common Russian/Bulgarian punctuation augmentations.)

## Pass criteria

- Uppercase coverage ≥ 90% per UI-SPEC §3.4 → **PASS** (both files at 100%)
- Lowercase ж щ ъ ю я fully covered → **PASS** (both files)

## Decision

**ALL_PASS.** Headlines render entirely in Gilroy for Bulgarian copy. No fallback gaps for the locked Bulgarian glyph set.

Coverage of full Bulgarian alphabet (lowercase а-я + uppercase А-Я + special letter Ѝ-class extensions like ё) is complete; no Roboto fallback is needed at runtime for any character in the language. The 3-tier `--font-display` chain in `globals.css` (`var(--font-gilroy), var(--font-roboto), Georgia, serif`) remains as defensive depth in case a future content surface introduces a glyph outside the subset (e.g., academic transliteration marks), but it should not activate for regular Bulgarian content.

The Cyrillic Extended-A block (U+0500-052F) is empty in source — subsetter request was a no-op for that range. This is acceptable: the block's contents are non-Bulgarian (Macedonian-historical, Komi-historical, etc.) and outside scope.

## Sources

- Generated woff2 files in `public/fonts/`
- UI-SPEC §3.4 Cyrillic & encoding test set
- Source repo: https://github.com/repalash/gilroy-free-webfont (`fonts` branch)
