---
phase: 05-notifications
plan: "04"
subsystem: payload-cms
tags: [phase-5, payload-cms, newsletters-collection, community-channels-global, lexical-features, tdd]
dependency_graph:
  requires: []
  provides:
    - Newsletters Payload CollectionConfig (src/collections/Newsletters.ts)
    - CommunityChannels Payload GlobalConfig (src/globals/CommunityChannels.ts)
    - payload.config.ts registering both surfaces
  affects:
    - Wave 2 plan 05-07 (composer Server Actions read/write Newsletters)
    - Wave 2 plan 05-09 (community page reads CommunityChannels Global)
    - Wave 3 plan 05-10 (Payload boot — auto-DDL creates new tables)
tech_stack:
  added: []
  patterns:
    - Payload CollectionConfig with restricted Lexical RTE feature set
    - Payload GlobalConfig with public read / editor-only update access split
    - TDD RED/GREEN cycle for Payload schema lock-in tests (no live DB boot)
key_files:
  created:
    - src/collections/Newsletters.ts
    - src/globals/CommunityChannels.ts
    - tests/unit/payload-newsletters.test.ts
    - tests/unit/payload-globals.test.ts
  modified:
    - src/payload.config.ts
decisions:
  - "BoldFeature / ItalicFeature used (not BoldTextFeature / ItalicTextFeature) — exact names from @payloadcms/richtext-lexical@3.84.1 exports confirmed via index.d.ts grep"
  - "importMap.js left untouched per plan spec — custom field components are Plan 05-07 responsibility"
  - "Lexical feature restriction: Paragraph, Heading(h2/h3), Link, Lists (ordered/unordered), Upload, Bold, Italic only; BlockquoteFeature/code blocks/custom blocks excluded (greppable lock)"
metrics:
  duration: "4 minutes"
  completed_date: "2026-05-05"
  tasks_completed: 2
  files_changed: 5
---

# Phase 05 Plan 04: Payload Schema — Newsletters Collection + CommunityChannels Global

**One-liner:** Payload CollectionConfig for newsletter authoring (8 fields, restricted Lexical, D-02 hook, role gate) + GlobalConfig for WhatsApp/Telegram channel URLs (5 fields, public read), both registered in payload.config.ts.

## What Was Built

### Task 05.04.1 — Newsletters Collection (commit 3bd7ba1)

`src/collections/Newsletters.ts` — Payload `CollectionConfig` implementing D-01..D-05, D-25.

**Fields manifest:**
| Field | Type | Notes |
|-------|------|-------|
| subject | text, required, max 200 | Admin useAsTitle |
| previewText | textarea, max 90 | D-02 / UI-SPEC §5.4.1 inbox preview |
| topic | select, 4 options, default newsletter_general | newsletter_general / newsletter_voting / newsletter_reports / newsletter_events |
| body | richText (Lexical restricted) | ParagraphFeature, HeadingFeature(h2/h3), LinkFeature, UnorderedListFeature, OrderedListFeature, UploadFeature, BoldFeature, ItalicFeature — no BlockquoteFeature / code blocks / custom blocks |
| scheduledAt | date, optional | pickerAppearance: dayAndTime |
| status | select, 6 options, default draft | draft / scheduled / sending / sent / failed / cancelled; readOnly in admin |
| lastTestSentAt | date, readOnly | D-02 pre-send gate: last test blast timestamp |
| lastEditedAfterTestAt | checkbox, default false, readOnly | D-02: flips true on any editable-field change post-test |

**Access policy (D-25):** `isEditorOrAdmin` guard on all 4 ops (read/create/update/delete) — checks singular `role` field (`['admin','editor'].includes(role)`).

**beforeChange hook:** Detects edits to `[subject, previewText, topic, body, scheduledAt]` after a test send, sets `lastEditedAfterTestAt = true` — this invalidates the Plan 05-07 Send Server Action's 24h gate.

**Tests:** 7 unit tests covering slug, access policy (all 4 ops × 4 user types), field types, topic enum (4 values), status enum (6 values + default), Lexical restriction (greppable lock), beforeChange hook presence.

### Task 05.04.2 — CommunityChannels Global + payload.config.ts (commit 5a5314c)

`src/globals/CommunityChannels.ts` — Payload `GlobalConfig` implementing D-12.

**Fields manifest:**
| Field | Type | Default | Notes |
|-------|------|---------|-------|
| whatsappChannelUrl | text | — | https://whatsapp.com/channel/... |
| whatsappVisible | checkbox | false | D-12: flag defaults off until coalition delivers URL |
| telegramChannelUrl | text | — | https://t.me/... |
| telegramVisible | checkbox | false | D-12: flag defaults off |
| bgDescription | textarea | — | community.explainer.body coalition copy |

**Access policy:** `read: () => true` (public — RSC reads per-request); `update: isEditorOrAdmin` (D-25).

`src/payload.config.ts` — 4 net additions: 2 import statements, `collections: [Users, Newsletters]`, `globals: [CommunityChannels]`. Phase 02.1 attribution view registration (`/views/attribution`) is BYTE-IDENTICAL (Pitfall 7).

**Tests:** 9 unit tests covering slug, public read, editor/admin update gate, all 5 field types/defaults, payload.config import assertions, collections/globals registration, attribution view preservation.

## Deviations from Plan

### Auto-discovered Differences

**1. [Rule 1 - Bug] Lexical feature names diverge from plan template**
- **Found during:** Task 05.04.1 pre-implementation verification
- **Issue:** Plan template used `BoldTextFeature` / `ItalicTextFeature` which do NOT exist in `@payloadcms/richtext-lexical@3.84.1`. Actual exports are `BoldFeature` / `ItalicFeature`.
- **Fix:** Used correct names from package `index.d.ts` (grep verified). Imports and `features()` body updated accordingly.
- **Files modified:** `src/collections/Newsletters.ts`
- **Commit:** 3bd7ba1
- **Decision documented:** Yes (frontmatter `decisions` field)

None — plan executed as written (aside from the factory name correction above).

## TDD Gate Compliance

Both tasks followed RED/GREEN TDD cycle:
- **Task 1 RED:** Test file `payload-newsletters.test.ts` committed → fails (module not found)
- **Task 1 GREEN:** `Newsletters.ts` created → 7 tests pass
- **Task 2 RED:** Test file `payload-globals.test.ts` committed → fails (module not found)
- **Task 2 GREEN:** `CommunityChannels.ts` + `payload.config.ts` edit → 9 tests pass

All 131 unit tests pass after completion (0 regressions across 20 test files).

## Wave Dependencies

- **BLOCKING → Wave 3 plan 05-10:** Payload boot must happen for these tables to be auto-DDL'd in PostgreSQL. No live DB migration runs in this plan (auto-DDL is the project pattern per RESEARCH §A7).
- **Plan 05-07 (Wave 2):** Composer Server Actions build directly against `Newsletters` collection. Plan 05-07 is also responsible for extending `importMap.js` with any custom field components — this plan deliberately leaves it untouched.
- **Plan 05-09 (Wave 2):** Community page RSC reads `CommunityChannels` Global. `whatsappVisible`/`telegramVisible` default to `false` — the page renders the "Каналите стартират скоро" placeholder until coalition delivers URLs via admin UI.
- **Drizzle migration (Plan 05-02):** `users.preferred_channel` column migration also applies in Wave 3 alongside the Payload auto-DDL.

## Known Stubs

None. Both schema files are fully wired. `whatsappVisible`/`telegramVisible` defaulting to `false` is intentional per D-12 — not a stub, but a deployment-time configuration.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: elevation-of-privilege | src/collections/Newsletters.ts | All 4 CRUD ops gated — mitigated (T-05-04-01, lock-in test covers it) |
| threat_flag: elevation-of-privilege | src/globals/CommunityChannels.ts | Update gated — mitigated (T-05-04-02) |
| threat_flag: content-injection | src/collections/Newsletters.ts | Restricted Lexical feature set — mitigated (T-05-04-04, greppable lock) |

## Self-Check: PASSED

Files verified:
- `src/collections/Newsletters.ts` — FOUND
- `src/globals/CommunityChannels.ts` — FOUND
- `tests/unit/payload-newsletters.test.ts` — FOUND
- `tests/unit/payload-globals.test.ts` — FOUND
- `src/payload.config.ts` — FOUND (modified)

Commits verified:
- 3bd7ba1 — FOUND (Newsletters collection + tests)
- 5a5314c — FOUND (CommunityChannels Global + payload.config + tests)

All 131 unit tests: PASSED
TypeScript typecheck: PASSED
