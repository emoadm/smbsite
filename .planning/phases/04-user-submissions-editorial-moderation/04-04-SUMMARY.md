---
phase: 04-user-submissions-editorial-moderation
plan: 04
subsystem: ui
tags: [drizzle, next-intl, shadcn, owner-isolation, member-views, idor-prevention]

requires:
  - phase: 04-01
    provides: submissions + moderation_log schema; auth.ts status/platform_role columns
  - phase: 04-02
    provides: messages/bg.json submission.* / admin.queue.* / problem.* string namespaces

provides:
  - getMyProposals(userId) and getMyProblems(userId) Drizzle queries with submitter_id WHERE-clause filter
  - SubmissionStatusCard RSC component with UI-SPEC §S5 badge classes
  - /member/predlozheniya page (PROP-03 — member proposal status list)
  - /member/signali page (PROB-05 — member problem report status list)
  - shadcn Badge component
  - Unit test asserting grep-level WHERE-clause invariants (6 tests)
  - Integration test validating owner-isolation at query-call level (4 tests)

affects:
  - 04-06 (moderator note written by rejectSubmission; shown here in rejection blockquote)
  - 04-03 (submitProposal/submitProblem Server Actions redirect to these pages)
  - 04-07 (suspended-account gate in member layout uses same auth() pattern)

tech-stack:
  added:
    - "shadcn Badge component (class-variance-authority, new-york style)"
  patterns:
    - "Owner-isolation at query layer: submitter_id filter in Drizzle WHERE, never from request input"
    - "Discriminated-union RSC prop: { kind: 'proposal'; row: MyProposalRow } | { kind: 'problem'; row: MyProblemRow }"
    - "Grep-level WHERE-clause invariant tests (vitest readFileSync pattern per Pitfall 5)"
    - "Integration test with vi.mock DB (no live-DB fixture) — validates query argument shape"
    - "force-dynamic on per-user member pages (prevents CDN cache serving stale status)"

key-files:
  created:
    - src/lib/submissions/queries.ts
    - src/components/submissions/SubmissionStatusCard.tsx
    - src/components/ui/badge.tsx
    - src/app/(frontend)/member/predlozheniya/page.tsx
    - src/app/(frontend)/member/signali/page.tsx
    - tests/unit/submission-access.test.ts
    - tests/integration/submissions/owner-isolation.test.ts
  modified:
    - messages/bg.json (brought forward from 04-02 — see deviations)
    - src/db/schema/auth.ts (brought forward from 04-01)
    - src/db/schema/index.ts (brought forward from 04-01)
    - src/db/schema/submissions.ts (brought forward from 04-01)

key-decisions:
  - "Integration test uses vi.mock DB pattern (no live-DB fixture), consistent with existing codebase integration tests; live-DB test deferred to when _fixtures.ts helper exists"
  - "Badge component created manually (shadcn pattern) since npx shadcn add is unavailable in worktree without node_modules"
  - "topic cast 'as taxes' in SubmissionStatusCard is sound — Zod boundary in 04-03 enforces valid topic enum values at submission time"

patterns-established:
  - "Owner-isolation pattern: all member query functions accept userId from session.user.id only (never request params)"
  - "No submitter_id in select() result — paranoid invariant ensuring no PII drill-down from query to component"

requirements-completed: [PROP-03, PROB-05]

duration: 30min
completed: 2026-05-10
---

# Phase 04 Plan 04: Member Status Views + Owner Isolation Summary

**Per-user proposal/problem status pages with owner-isolation enforced at Drizzle query layer, UI-SPEC §S5 badge variants, and 10-test suite proving cross-user reads are impossible**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-05-10T19:57:00Z
- **Completed:** 2026-05-10T20:05:00Z
- **Tasks:** 3 (+ 1 deviation fix commit)
- **Files modified:** 11

## Accomplishments

- Per-user Drizzle queries (getMyProposals + getMyProblems) with load-bearing `where(eq(submissions.submitter_id, userId))` filter — submitter_id never echoed back to caller
- SubmissionStatusCard RSC component with exact UI-SPEC §S5 badge classes (pending/approved/rejected) and rejection note blockquote layout
- Two member status pages (/member/predlozheniya + /member/signali) with force-dynamic, empty states, and CTAs back to submission forms
- 10-test suite: 6 unit grep-invariants + 4 vi.mock integration tests validating owner isolation at query-argument level

## Task Commits

Each task was committed atomically:

1. **Task 1: Per-user Drizzle queries** — `b32af47` (feat)
2. **Task 2: SubmissionStatusCard component** — `14fa8bd` (feat)
3. **Task 3: RSC pages + integration test** — `f569b64` (feat)
4. **Deviation: 04-01/04-02 dependency files** — `e1334ee` (chore)

## Files Created/Modified

- `src/lib/submissions/queries.ts` — getMyProposals + getMyProblems with owner-isolation
- `src/components/submissions/SubmissionStatusCard.tsx` — RSC status card, UI-SPEC §S5 badge variants
- `src/components/ui/badge.tsx` — shadcn Badge component (new-york style, cva)
- `src/app/(frontend)/member/predlozheniya/page.tsx` — PROP-03 member proposal status list
- `src/app/(frontend)/member/signali/page.tsx` — PROB-05 member problem report status list
- `tests/unit/submission-access.test.ts` — 6 grep-invariant tests for WHERE-clause correctness
- `tests/integration/submissions/owner-isolation.test.ts` — 4 vi.mock isolation tests

## Decisions Made

- Integration test pattern uses `vi.mock('@/db')` consistent with existing project integration tests; no live-DB fixture exists yet — owner isolation is additionally guaranteed by the grep-level unit tests and the Drizzle WHERE-clause structure
- Badge component manually created (official shadcn new-york pattern) since `npx shadcn add` cannot run in a git worktree without a local node_modules
- `tTopic(props.row.topic as 'taxes')` cast in SubmissionStatusCard is sound: Zod in Plan 04-03 enforces that topic is one of 7 enum values at the API boundary, so the runtime cast is always valid

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Brought forward 04-01 + 04-02 dependency files to worktree**
- **Found during:** Task 2 preparation (checking schema imports)
- **Issue:** Worktree was branched from commit `3e052f5` (before 04-01 and 04-02 landed on main). The worktree's `messages/bg.json` was missing `submission.*`, `admin.queue.*`, and `problem.*` namespaces (04-02). `src/db/schema/submissions.ts` was entirely absent (04-01). `src/db/schema/auth.ts` was missing `status` and `platform_role` columns (04-01 D-A1/D-A2). `src/db/schema/index.ts` was missing `export * from './submissions'`.
- **Fix:** Copied 4 files from main branch (commit `1ec8ff8` / `9a14090` state) to worktree. No changes were made — files are bit-for-bit identical to their main-branch versions.
- **Files modified:** `messages/bg.json`, `src/db/schema/submissions.ts`, `src/db/schema/auth.ts`, `src/db/schema/index.ts`
- **Verification:** All 43 test files (356 tests) pass after fix; `submission.topics.taxes` and `submission.status.rejectionNotePrefix` keys confirmed present in bg.json
- **Committed in:** `e1334ee`

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking)
**Impact on plan:** Required to satisfy plan's `depends_on: [01, 02]` constraint. No scope creep — files unchanged from upstream.

## Integration Test Status

- **owner-isolation.test.ts:** PASSED (4 tests) — uses vi.mock pattern; validates WHERE-clause argument shape at query-call level
- **Live-DB test with seedActiveMember():** Deferred — Wave 0 did not ship `tests/integration/submissions/_fixtures.ts` helper. The grep-based unit tests + vi.mock integration tests are the current verification gates.

## UI Drift from UI-SPEC §S5/§S6

No drift. Implementation matches spec exactly:
- Badge class strings: `bg-warning/10 text-warning border border-warning/20`, `bg-success/10 text-success border border-success/20`, `bg-destructive/10 text-destructive border border-destructive/20`
- Rejection note: `border-l-2 border-muted pl-3 text-sm text-muted-foreground italic` with `font-semibold not-italic` prefix
- Status text from locked `submission.status.*` keys in bg.json
- Empty state CTAs link to `/member/predlozhi` (proposals) and `/member/signaliziray` (problems)

## Issues Encountered

None beyond the worktree dependency gap handled by Rule 3.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 04-04 provides the read-side of the member submission loop. Plan 04-03 (submit) redirects to these pages; Plan 04-06 (moderation actions) writes moderator_note and status changes that render here.
- The `SubmissionStatusCard` and `Badge` components are ready for reuse in any future submission surface.

## Self-Check

- [x] `src/lib/submissions/queries.ts` exists with `getMyProposals` and `getMyProblems`
- [x] `src/components/submissions/SubmissionStatusCard.tsx` exists
- [x] `src/components/ui/badge.tsx` exists
- [x] `src/app/(frontend)/member/predlozheniya/page.tsx` exists
- [x] `src/app/(frontend)/member/signali/page.tsx` exists
- [x] `tests/unit/submission-access.test.ts` — 6 tests PASSED
- [x] `tests/integration/submissions/owner-isolation.test.ts` — 4 tests PASSED
- [x] All 43 test files (356 tests) PASSED in worktree
- [x] Commits `b32af47`, `14fa8bd`, `f569b64`, `e1334ee` exist in worktree history

---
*Phase: 04-user-submissions-editorial-moderation*
*Completed: 2026-05-10*
