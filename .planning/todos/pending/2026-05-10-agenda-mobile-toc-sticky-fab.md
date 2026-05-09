---
created: 2026-05-10
priority: medium
phase: 02.3
tags: [ux, mobile, agenda, polish]
---

# Mobile TOC navigation is uncomfortable on /agenda

## Status
Flagged at Phase 02.3 human-verify approval (2026-05-10). User approved phase shipping but called out the issue.

## Symptom
On mobile, the `<details>` TOC sits at the top of `/agenda` (above the article). After the user clicks a TOC entry and jumps deep into the document (some chapters are 1000+ lines of prose), there is no easy way back to the TOC — you have to scroll all the way up. The page is ~1900 lines of rendered content.

> "mobile TOC is not comfortable. It stays on top and when it parks you deep down the document, scrolling back to TOC is awful"

## Likely fixes (pick one or combine)
- **Floating "Към съдържанието" (back-to-TOC) FAB** that appears after scroll past the TOC — anchors back to `#agenda-toc`. Smallest change, no layout shift.
- **Sticky compact TOC bar** at the top of mobile viewport (collapsed by default; tap to expand into full chapter list). Matches common docs-site UX (Stripe, Vercel docs).
- **Floating chapter-jump dropdown** (sticky `<select>` of chapters) — single-tap navigation, no expanding panel.

## Acceptance
- On a 375×667 viewport, after scrolling past the TOC, the user can return to chapter navigation in ≤2 taps without scrolling to the top of the page.
- Desktop sticky sidebar TOC behavior is unchanged.

## Where to fix
- `src/app/(frontend)/agenda/page.tsx` (TOC block + new sticky element)
- Possibly `src/app/(frontend)/globals.css` for scroll-mt-* if the WR-01 fix lands together

## Related
- WR-01 in `.planning/phases/02.3-coalition-agenda-content-slice-2/02.3-REVIEW.md` (no `scroll-margin-top` on `<h2>`) — close cousin; bundle into one mobile-polish phase.
