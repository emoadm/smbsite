---
phase: 04-user-submissions-editorial-moderation
plan: "02"
subsystem: i18n
tags: [phase-4, wave-1, i18n, d-25-string-lock, foundation]
dependency_graph:
  requires: []
  provides:
    - "messages/bg.json Phase 4 string registry (submission.*, problem.*, dsa.*, admin.queue/moderation/suspended, email.submissionStatus/suspended)"
    - "tests/unit/i18n-phase-04-strings.test.ts Wave 0 string-presence guard"
  affects:
    - "Phase 04-03 (proposal + problem forms — consume submission.* keys)"
    - "Phase 04-06 (moderation queue UI — consumes admin.queue/moderation keys)"
    - "Phase 04-07 (status-change email worker — consumes email.submissionStatus.*/email.suspended keys)"
tech_stack:
  added: []
  patterns:
    - "D-25 string-lock: all Phase 4 Bulgarian strings entered bg.json before any source file references them"
    - "D-C1 uniqueness invariant: canonical anonymous attribution strings enforced by test"
key_files:
  created:
    - tests/unit/i18n-phase-04-strings.test.ts
  modified:
    - messages/bg.json
decisions:
  - "Placed new top-level keys (problem, submission) alphabetically between existing keys for operator readability; dsa placed before attribution (d < p < s)"
  - "admin.queue, admin.moderation, admin.suspended added as siblings to existing admin.newsletters (not nested inside it)"
  - "email.submissionStatus and email.suspended added as siblings to existing email.registerOtp, email.loginOtp, email.welcome, email.newsletter"
metrics:
  completed_date: "2026-05-10"
  duration_minutes: 15
  tasks_completed: 2
  files_changed: 2
---

# Phase 4 Plan 02: Phase 4 i18n String Registry — Summary

**One-liner:** Locked all Phase 4 Bulgarian strings into messages/bg.json across 5 new/extended namespaces and guarded the registry with a 7-test Wave 0 unit test enforcing D-C1 uniqueness and ICU placeholder correctness.

## What Was Built

### Task 1: Extend messages/bg.json with Phase 4 string namespaces

Added 3 new top-level keys and extended 2 existing top-level keys:

**New top-level `submission`** (88 string entries):
- `submission.proposals.*` — public proposals page copy (7 keys)
- `submission.proposal.*` — proposal submission form (10 keys including nested fields)
- `submission.myProposals.*` — member's own proposals list (5 keys)
- `submission.problem.*` — problem report form (9 keys including nested fields)
- `submission.myProblems.*` — member's own problem reports list (5 keys)
- `submission.status.*` — status badge labels (4 keys; verbatim UI-SPEC §S5)
- `submission.error.*` — error messages with ICU placeholder `{n}` (3 keys)
- `submission.gate.*` — unverified + suspended member gates (2 keys)
- `submission.topics.*` — 7-topic taxonomy (7 keys, single source of truth)

**New top-level `problem`** (11 string entries):
- `problem.heatmap.*` — public heat-map page copy (9 keys including nested table columns)
- `problem.anonymousByline` — canonical D-C1 string "Анонимен сигнал" (1 key)
- `problem.level.*` — local/national level labels (2 keys)

**New top-level `dsa`** (10 string entries):
- `dsa.report.*` — DSA Art.16 reporting form (10 keys including nested categories)

**Extended existing `admin`** (21 string entries):
- `admin.queue.*` — moderation queue page, tabs, filters, columns, actions (20 keys)
- `admin.moderation.*` — approve/reject/suspend/override dialog copy (16 keys)
- `admin.suspended.*` — suspended-account page (2 keys)

**Extended existing `email`** (6 string entries):
- `email.submissionStatus.approved.{subject,body}` — approval notification template
- `email.submissionStatus.rejected.{subject,body}` — rejection notification template
- `email.suspended.{subject,body}` — account suspension notification template

**Registry stats:**
- New top-level keys added: 3 (`submission`, `problem`, `dsa`)
- Extended top-level keys: 2 (`admin`, `email`)
- Total string entries added: ~136
- bg.json size: 30,416 bytes → 41,919 bytes (+11,503 bytes, +37.8%)
- bg.json lines: ~586 → 774 (+188 lines)

### Task 2: Wave 0 string-presence test

Created `tests/unit/i18n-phase-04-strings.test.ts` with 7 test blocks:

1. **Every required key resolves** — asserts all 113 required key paths in REQUIRED_KEYS list resolve to non-empty strings
2. **D-C1 canonical attribution strings** — "Член на коалицията" appears exactly once; "Анонимен сигнал" appears exactly once
3. **D-C1 banned variants absent** — "Анонимен член", "Гражданин", "Потребител" do not appear
4. **Rate-limit ICU placeholder** — `submission.error.rateLimit` contains `{n}`
5. **Email template ICU placeholders** — approved/rejected bodies contain `{fullName}`, `{title}`, `{note}` as required
6. **Topic taxonomy completeness** — exactly 7 keys exist under `submission.topics`
7. **Status badge verbatim match** — pending/approved/rejected match UI-SPEC §S5 exactly

All 7 tests pass. Full suite: 364 tests across 44 files — all pass.

## Deviations from Plan

None — plan executed exactly as written. All strings match UI-SPEC §Copywriting Contract row-for-row; no copy was reworded during implementation.

## Known Stubs

None — this plan adds only string data to bg.json; no UI components or data-fetching stubs.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. The threat mitigations T-04-02-01 through T-04-02-04 are all implemented as planned:

- T-04-02-01: D-C1 uniqueness guard in test (2 assertions) + lint:i18n layer
- T-04-02-02: ICU placeholder assertions in test for approved/rejected email bodies
- T-04-02-03: Status badge verbatim-match assertions in test
- T-04-02-04: JSON.parse smoke check verified; lint:i18n passes

## Self-Check

| Check | Result |
|-------|--------|
| messages/bg.json exists | FOUND |
| tests/unit/i18n-phase-04-strings.test.ts exists | FOUND |
| 04-02-SUMMARY.md exists | FOUND |
| Task 1 commit 1ec8ff8 | FOUND |
| Task 2 commit e6b1934 | FOUND |

## Self-Check: PASSED
