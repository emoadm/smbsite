---
phase: 04-user-submissions-editorial-moderation
plan: "06"
subsystem: editorial-moderation
tags: [phase-4, wave-3, editorial, moderation-queue, payload-admin, server-actions, append-only]
dependency_graph:
  requires:
    - 04-01 (submissions schema — submissions table, moderation_log table)
    - 04-02 (i18n strings — admin.queue.*, admin.moderation.*)
    - 04-03 (role-gate.ts — assertNotSuspended; users.status column)
  provides:
    - "approveSubmission Server Action (src/lib/submissions/admin-actions.ts)"
    - "rejectSubmission Server Action (src/lib/submissions/admin-actions.ts)"
    - "fetchModerationQueue query (src/lib/submissions/admin-queries.ts)"
    - "ModerationQueueView RSC root (/admin/views/moderation-queue)"
    - "QueueTable Client Component (Tabs + Table + Badge + Button)"
    - "ReviewDialog Client modal (Accordion + Textarea + approve/reject CTAs)"
    - "ConfirmActionDialog reusable nested confirm dialog"
    - "assertSuperEditor() gate (src/lib/auth/role-gate.ts)"
    - "Users.ts super_editor option (Payload admin_users role select)"
  affects:
    - "04-07 (suspension handler — uses assertSuperEditor; email worker resolves submitter from submissionId)"
    - "04-05 (public proposals page — reads from submissions WHERE status='approved')"
tech_stack:
  added:
    - "shadcn/ui table.tsx (created manually — not in main repo or worktree)"
    - "shadcn/ui badge.tsx, separator.tsx, textarea.tsx (copied from main repo)"
  patterns:
    - "Direct bg.json import in Payload admin RSC (no next-intl Provider)"
    - "db.transaction() double-write: UPDATE submissions + INSERT moderation_log"
    - "Drizzle WHERE status='pending' race-safe atomic transition"
    - "Post-transaction addEmailJob enqueue (won't rollback on email failure)"
    - "Manual importMap.js registration (payload generate:importmap BLOCKED by tsx/Node 22 ESM)"
key_files:
  created:
    - src/lib/submissions/admin-actions.ts
    - src/lib/submissions/admin-queries.ts
    - src/app/(payload)/admin/views/moderation-queue/ModerationQueueView.tsx
    - src/app/(payload)/admin/views/moderation-queue/QueueTable.tsx
    - src/app/(payload)/admin/views/moderation-queue/ReviewDialog.tsx
    - src/app/(payload)/admin/views/moderation-queue/ConfirmActionDialog.tsx
    - src/app/(payload)/admin/views/moderation-queue/actions.ts
    - src/components/ui/table.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/separator.tsx
    - src/components/ui/textarea.tsx
    - src/db/schema/submissions.ts
    - tests/unit/moderation-queue-role-gate.test.ts
    - tests/unit/moderation-actions.test.ts
    - tests/integration/admin/moderation-actions.test.ts
  modified:
    - src/lib/auth/role-gate.ts (assertEditorOrAdmin extended + assertSuperEditor added)
    - src/collections/Users.ts (super_editor option added)
    - src/app/(payload)/admin/views/attribution/AttributionView.tsx (EDIT-07 role gate fix)
    - tests/unit/dashboard-role-gate.test.ts (updated for new 3-tier gate)
    - src/lib/email/queue.ts (3 new EmailJobKind values)
    - src/db/schema/auth.ts (users.status + platform_role copied from main repo)
    - src/db/schema/index.ts (added submissions export)
    - src/payload.config.ts (moderationQueue view registration)
    - src/app/(payload)/admin/importMap.js (4 new component registrations)
    - messages/bg.json (copied from main repo with Phase 4 strings)
decisions:
  - "actor_user_id stored as NULL when Payload admin_users.id has no matching application users.id row — accepted per T-04-06-05; Plan 04-07 ops runbook documents dual-identity provisioning"
  - "Integration tests use vi.mock (mocked DB) — Wave-0 fixtures unavailable in worktree; follows Plan 04-03 precedent"
  - "table.tsx created manually from shadcn pattern — not yet in main repo or worktree"
  - "moderation-actions.test.ts strips comment lines before asserting no db.update/delete(moderation_log) calls to avoid matching the constraint documentation comment"
metrics:
  completed_date: "2026-05-10"
  duration_minutes: 90
  tasks_completed: 4
  files_created: 15
  files_modified: 10
---

# Phase 4 Plan 06: Editorial Moderation Queue — Summary

**One-liner:** Payload admin moderation queue with approve + reject Server Actions using transactional double-write to submissions + moderation_log, role gate extended to super_editor (EDIT-07 closed), and 4 Client Components registered in importMap.js for the Payload admin shell.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Extend role gates — add super_editor everywhere | 432ff99 | role-gate.ts, Users.ts, AttributionView.tsx, moderation-queue-role-gate.test.ts |
| 2 | approveSubmission + rejectSubmission Server Actions | b7b5937 | admin-actions.ts, admin-queries.ts, queue.ts, moderation-actions.test.ts |
| 3 | Moderation queue Payload custom view — RSC root + Client components | 237cff0 | ModerationQueueView.tsx, QueueTable.tsx, ReviewDialog.tsx, ConfirmActionDialog.tsx |
| 4 | Wire moderation-queue into payload.config.ts + importMap.js | 0b08e97 | payload.config.ts, importMap.js |

## Must-Have Truths Status

| Truth | Status |
|-------|--------|
| Editor/super_editor sees /admin/views/moderation-queue with Tabs interface | IMPLEMENTED — RSC role gate + QueueTable with 3 Tabs |
| Approve action: transactional UPDATE submissions + INSERT moderation_log | IMPLEMENTED — db.transaction() double-write, WHERE status='pending' |
| Reject action: Zod minLength 5 note + transactional UPDATE + INSERT log | IMPLEMENTED — rejectSchema.note.min(5), same tx pattern |
| EDIT-07: attribution view role gate extended to super_editor | IMPLEMENTED — line 57 of AttributionView.tsx updated |
| Client components in importMap.js; ModerationQueueView in payload.config.ts | IMPLEMENTED — 8 refs in importMap.js, moderationQueue entry in config |

## Actor User ID Wiring (T-04-06-05)

**Status: NULL (deferred to Plan 04-07)**

The `moderation_log.actor_user_id` FK references `users.id` (application users table) with `ON DELETE RESTRICT`. The Payload admin_users.id is a separate identity from the application users.id. Phase 4 ships with `actor_user_id = NULL` when no matching row exists in the application users table.

Plan 04-07 ops runbook must document the dual-identity provisioning requirement: editorial users must exist in BOTH `admin_users` (for Payload login) AND `users` (for moderation_log.actor_user_id FK). Until that provisioning is done, the moderation_log rows show NULL for actor_user_id.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree dependency gap — schema files missing**
- **Found during:** Task 2 (TypeScript error on submissions/moderation_log imports)
- **Issue:** Worktree forked at commit 3e052f5, before Plans 04-01/02/03 landed. Missing: `src/db/schema/submissions.ts`, `src/db/schema/index.ts` export, `src/db/schema/auth.ts` `users.status`/`platform_role` columns
- **Fix:** Copied files from main repo at `/Users/emoadm/projects/smbsite` (same approach as Plan 04-03)
- **Files modified:** src/db/schema/submissions.ts (created), src/db/schema/index.ts, src/db/schema/auth.ts
- **Commits:** b7b5937

**2. [Rule 3 - Blocking] bg.json missing Phase 4 strings in worktree**
- **Found during:** Task 3 (TypeScript type error — `admin.queue` key not found in bg.json)
- **Issue:** Worktree bg.json was 587 lines (pre-Plan-04-02); needed the 774-line version with admin.queue.*, admin.moderation.* strings
- **Fix:** Copied messages/bg.json from main repo
- **Files modified:** messages/bg.json
- **Commit:** 237cff0

**3. [Rule 3 - Blocking] table.tsx shadcn component missing**
- **Found during:** Task 3 (QueueTable.tsx imports from @/components/ui/table)
- **Issue:** table.tsx was not in the worktree or the main repo
- **Fix:** Created table.tsx from scratch following shadcn/ui patterns (Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption)
- **Files modified:** src/components/ui/table.tsx (created)
- **Commit:** 237cff0

**4. [Rule 3 - Blocking] badge.tsx, separator.tsx, textarea.tsx missing from worktree**
- **Found during:** Task 3 (component imports)
- **Issue:** These components exist in main repo but not in worktree
- **Fix:** Copied from main repo
- **Files modified:** src/components/ui/badge.tsx, separator.tsx, textarea.tsx
- **Commit:** 237cff0

**5. [Rule 1 - Bug] dashboard-role-gate.test.ts regression**
- **Found during:** Task 1 full test suite run
- **Issue:** `tests/unit/dashboard-role-gate.test.ts` line 18 asserted `['admin','editor']` which broke when AttributionView was extended to `['admin','editor','super_editor']`
- **Fix:** Updated assertion to match new 3-tier gate; added descriptive comment noting Phase 4 EDIT-07 extension
- **Files modified:** tests/unit/dashboard-role-gate.test.ts
- **Commit:** 432ff99

**6. [Rule 1 - Bug] moderation-actions.test.ts regex matched comment line**
- **Found during:** Task 2 unit test run (GREEN phase)
- **Issue:** `expect(src).not.toMatch(/db\.(update|delete)\(moderation_log\)/)` matched the constraint documentation comment on line 14 of admin-actions.ts
- **Fix:** Updated test to strip comment lines before checking (split + filter lines not starting with `//`)
- **Files modified:** tests/unit/moderation-actions.test.ts
- **Commit:** b7b5937

**7. [Rule 3 - Blocking] Integration test mock required for drizzle-orm operators**
- **Found during:** Task 2 integration test run
- **Issue:** `eq(submissions.id, ...)` called with real schema objects in the mock context caused TypeError
- **Fix:** Added `vi.mock('@/db/schema', ...)` and `vi.mock('drizzle-orm', ...)` to the integration test; follows Plan 04-03 vi.mock precedent (Wave-0 fixtures unavailable in worktree)
- **Files modified:** tests/integration/admin/moderation-actions.test.ts
- **Commit:** b7b5937

## Security Coverage (STRIDE)

| Threat | Status |
|--------|--------|
| T-04-06-01 Non-editor reaches queue via direct URL | Mitigated — RSC role gate before fetchModerationQueue + Server Action re-check |
| T-04-06-02 Race condition: two editors approve same submission | Mitigated — WHERE status='pending' + .returning() atomic check |
| T-04-06-03 moderation_log row tampered after fact | Mitigated — DB REVOKE (Plan 04-01 Task 5) + zero db.update/delete(moderation_log) in code |
| T-04-06-04 ReviewDialog leaks PII to non-editor | Mitigated — role-gated view + Server Action re-check |
| T-04-06-05 actor_user_id NULL due to dual-identity gap | Accept — documented above; Plan 04-07 resolves |
| T-04-06-06 Burst approvals saturate email queue | Accept — BullMQ+Brevo absorbs bursts; rate limit in Plan 04-07 |
| T-04-06-07 Client-side dismiss-label bypass | Accept — dialogs are UX, not security boundary; Server Actions are idempotent |

## Known Stubs

**1. Email notification payload is minimal** — `approveSubmission` and `rejectSubmission` enqueue `addEmailJob` with `to: ''` and `userId: submissionId` (overloaded). The Plan 04-07 worker handler must resolve `submitter.email` and `submission.title` from DB using `userId`. The `submissionTitle`, `moderatorNote` fields are declared in `EmailJobPayload` but not populated here.

**2. actor_user_id = NULL** — see T-04-06-05 section above. This is intentional Phase 4 behavior pending Plan 04-07 ops runbook.

## Threat Flags

None — no new network endpoints beyond the two Server Actions (approveSubmission, rejectSubmission). Both require Payload admin authentication via assertEditorOrAdmin(). The moderation queue view is gated behind Payload admin login.

## Self-Check

| Check | Result |
|-------|--------|
| src/lib/submissions/admin-actions.ts exists | FOUND |
| src/lib/submissions/admin-queries.ts exists | FOUND |
| src/app/(payload)/admin/views/moderation-queue/ModerationQueueView.tsx exists | FOUND |
| src/app/(payload)/admin/views/moderation-queue/QueueTable.tsx exists | FOUND |
| src/app/(payload)/admin/views/moderation-queue/ReviewDialog.tsx exists | FOUND |
| src/app/(payload)/admin/views/moderation-queue/ConfirmActionDialog.tsx exists | FOUND |
| Task 1 commit 432ff99 | FOUND |
| Task 2 commit b7b5937 | FOUND |
| Task 3 commit 237cff0 | FOUND |
| Task 4 commit 0b08e97 | FOUND |
| pnpm tsc --noEmit: 0 errors | PASSED |
| 369 tests, all pass | PASSED |

## Self-Check: PASSED
