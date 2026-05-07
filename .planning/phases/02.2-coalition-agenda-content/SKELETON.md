---
phase: 02.2-coalition-agenda-content
slice: walking-skeleton
created: 2026-05-08
---

# Walking Skeleton — Coalition Agenda Content (slice 1 of 2)

This document records the architectural decisions made for slice 1 of the
coalition agenda integration so that Phase 02.3 (final slice) can extend
without renegotiating any of them.

## User story (locked in ROADMAP.md)

> **As a** visitor,
> **I want to** read the coalition's manifesto and first policy chapter via the /agenda page,
> **so that** I can decide whether to register and join the platform.

## End-to-end stack — thinnest possible slice

```
Browser (visitor)
   ↓ GET /agenda
Next.js App Router (frontend route group)
   ↓ ISR cache (revalidate = 3600)
src/app/(frontend)/agenda/page.tsx
   ↓ renders
   ├── <MainContainer width="prose"> (768px column from Phase 2)
   ├── <SectionEyebrow> (existing, unchanged)
   ├── <h1> Програма (from messages/bg.json: agenda.title)
   ├── <Alert> draftAlert (KEPT in slice 1; removed in Phase 02.3)
   ├── <TableOfContents items={TOC_ITEMS} /> (existing, unchanged — sticky on md+, <details> on mobile)
   └── <article className="prose prose-slate prose-lg">
        ├── <section id="manifest">       — НИЕ СМЕ СИНЯ БЪЛГАРИЯ!
        ├── <section id="desen-konsensus">— ДЕСЕН КОНСЕНСУС ЗА УПРАВЛЕНИЕ НА ДЪРЖАВАТА
        └── <section id="ikonomika">      — Икономика
   ↑
   raw text source: .planning/coalition/agenda-raw.txt (lines 1-318 in slice 1)
```

## Architectural decisions (binding for slice 2)

### D-S1.1 — Content medium: hardcoded JSX in page.tsx

**Decision:** Coalition agenda body is hardcoded JSX inside
`src/app/(frontend)/agenda/page.tsx`. No MDX, no rich-text key in
`messages/bg.json`, no Payload `Globals.Agenda` collection.

**Rationale considered:**
- MDX would require `@next/mdx` setup + a markdown-to-JSX pipeline. Overkill
  for a one-shot content paste; coalition is unlikely to want a markdown
  editing workflow when they have the original PDF.
- Payload Globals would force the Phase 1 `payload migrate` blocker (see
  user memory: tsx/Node 22 ESM incompat → manual DDL via Neon SQL) to be
  resolved before agenda content can ship. Wrong dependency direction.
- A rich-text key in `bg.json` would push the entire ~12k-word agenda
  through next-intl's message loader; loader is happy with that, but the
  coalition isn't editing JSON files.

JSX gives us: zero new dependencies, immediate paste-and-ship, full Tailwind
`prose` styling, native anchor IDs for the TOC, and Phase 02.3 just adds
more sections in the same file.

### D-S1.2 — i18n linter approach: file-level exemption

**Decision:** Add `src/app/(frontend)/agenda/page.tsx` to the
`EXEMPT_FILES` array in `scripts/lint-i18n.mjs`. No per-line
`// i18n-allow:` pragmas.

**Rationale:** Slice 1 alone introduces ~50-80 lines of Bulgarian JSX;
slice 2 will multiply that ~10×. Per-line pragmas would dwarf the content
and make PR diffs unreadable. File-level exemption mirrors the precedent
set by `src/lib/oblast-names.ts` (proper-noun lookup table — file-level
exemption justified because the file's *purpose* is to hold Bulgarian
strings).

The exemption is content-specific (the agenda page is a coalition-authored
political document, not chrome). It does NOT generalize to other public
pages — `/`, `/faq`, `/legal/*` continue to load all strings via
`next-intl` and remain subject to PUB-05.

### D-S1.3 — Table of Contents shape

**Decision:** Three locked anchors in slice 1, more added in slice 2.

```ts
const TOC_ITEMS = [
  { id: 'manifest',         label: 'Манифест' },
  { id: 'desen-konsensus',  label: 'Десен консенсус' },
  { id: 'ikonomika',        label: 'Икономика' },
];
```

Slice 2 (Phase 02.3) appends entries — the anchor format is `kebab-case-cyrillic-transliterated-to-latin` (per the existing project convention; section labels themselves stay in Bulgarian, only the URL fragment is ASCII for browser+linker compatibility).

### D-S1.4 — Draft banner persistence

**Decision:** Keep the `<Alert>` "Програмата е в процес на финализиране."
banner during slice 1. Phase 02.3 final slice removes it (and the
`agenda.body` placeholder key in `messages/bg.json`).

**Rationale:** The agenda is intentionally incomplete after slice 1.
Removing the draft marker would mislead visitors who reach the bottom of
the Икономика chapter and see no further content. The marker stays until
the agenda is actually complete.

### D-S1.5 — Anchor-drift guard

**Decision:** A unit test (`tests/unit/agenda-toc-anchors.test.ts`) parses
the page.tsx source with regex and asserts every `TOC_ITEMS` id has a
matching `<h2 id="…">` in the same file. Phase 02.3 extends the test or
relaxes the locked-anchor assertion as it adds entries.

**Rationale:** Hardcoded JSX + manually-maintained TOC array is the most
likely place for drift (someone renames an anchor and forgets the TOC, or
vice versa). Cheap, fast, deterministic test catches it before review.

### D-S1.6 — Verification gate is human-visual, not Playwright

**Decision:** Slice 1 ships with manual operator visual verification
(checkpoint:human-verify task). No Playwright spec for agenda content
correctness in this slice.

**Rationale:** The page is intentionally incomplete — a Playwright
"agenda renders correctly" assertion is meaningless until Phase 02.3
finishes the content. The anchor-drift unit test covers the only
mechanical risk (TOC ↔ heading mismatch); content fidelity is human work.

Phase 02.3 should add a Playwright spec asserting (a) TOC has N entries,
(b) each link scrolls to the matching section, (c) draftAlert is gone.

## What slice 2 (Phase 02.3) inherits without renegotiation

- The hardcoded-JSX-in-page.tsx model (D-S1.1)
- The file-level i18n linter exemption (D-S1.2)
- The TOC anchor naming convention and the test that guards it (D-S1.3, D-S1.5)
- The `MainContainer width="prose"` 768px column (already locked by
  UI-SPEC §5.3 in Phase 2)
- The `prose prose-slate prose-lg` Tailwind typography stack

What slice 2 must do that slice 1 didn't:

- Append all remaining chapters from `agenda-raw.txt` line 319 onward
- Append corresponding TOC entries (probably 9-10 more)
- Update the locked-anchor assertion in `agenda-toc-anchors.test.ts`
  (or relax it to "contains at least slice 1 anchors" + add slice 2
  entries to a separate `expect.arrayContaining(...)` block)
- Remove the `<Alert>` draftAlert (D-S1.4 reverses)
- Remove the `agenda.body` key from `messages/bg.json` (cleanup; nothing
  reads it after slice 1)
- Add a Playwright e2e spec asserting end-to-end agenda completeness
  (D-S1.6 reverses — automated coverage is appropriate once content is
  complete)
