---
phase: 04-user-submissions-editorial-moderation
plan: "03"
subsystem: member-submissions
tags: [phase-4, wave-2, server-actions, forms, rate-limit, turnstile, geoip]
dependency_graph:
  requires:
    - 04-01 (submissions schema — users.status, submissions table, moderation_log table)
    - 04-02 (i18n strings — submission.*, problem.level.*, submission.topics.*)
  provides:
    - submitProposal Server Action (src/lib/submissions/actions.ts)
    - submitProblemReport Server Action (src/lib/submissions/actions.ts)
    - ProposalForm client component (src/components/forms/ProposalForm.tsx)
    - ProblemReportForm client component (src/components/forms/ProblemReportForm.tsx)
    - /member/predlozhi RSC page
    - /member/signaliziray RSC page (with server-side GeoIP suggestion)
  affects:
    - 04-05 (public submission list pages read from submissions table)
    - 04-06 (editorial moderation workflow — approves/rejects pending rows)
    - 04-07 (member layout suspension gate — defense-in-depth complement)
tech_stack:
  added: []
  patterns:
    - useActionState(serverAction, initialState) — matches RegistrationForm pattern
    - Zod superRefine for cross-field validation (oblast required when level='local')
    - Upstash Ratelimit.slidingWindow per-user + per-IP double guard
    - Turnstile widget reused from existing TurnstileWidget component
    - GeoIP lookupIp() server-side; only ISO oblast code passed to client (T-04-03-03)
    - vi.mock pattern for integration tests (no live DB) following Phase 5 pattern
key_files:
  created:
    - src/lib/submissions/zod.ts
    - src/lib/submissions/actions.ts
    - src/components/forms/ProposalForm.tsx
    - src/components/forms/ProblemReportForm.tsx
    - src/components/ui/textarea.tsx
    - src/components/ui/separator.tsx
    - src/app/(frontend)/member/predlozhi/page.tsx
    - src/app/(frontend)/member/signaliziray/page.tsx
    - tests/unit/submission-actions.test.ts
    - tests/unit/submission-rate-limit.test.ts
    - tests/integration/submissions/proposal-create.test.ts
    - tests/integration/problems/report-create.test.ts
  modified:
    - src/lib/auth/role-gate.ts (added assertNotSuspended)
    - src/lib/rate-limit.ts (added checkSubmissionPerUser + checkSubmissionPerIp)
    - src/db/schema/auth.ts (copied from Plan 04-01 — users.status + platform_role columns)
    - src/db/schema/submissions.ts (copied from Plan 04-01 — submissions + moderation_log tables)
    - src/db/schema/index.ts (copied from Plan 04-01 — re-exports submissions)
    - messages/bg.json (copied from Plan 04-02 — all Phase 4 strings)
decisions:
  - "Rate-limit windows: 5 submissions per user per 24h (submission-user), 10 per IP per 24h (submission-ip) — matches plan spec; no deviation"
  - "Disk paths use Latin transliteration: predlozhi, signaliziray (not Cyrillic) per routing_note in plan"
  - "lookupIp() returns { oblast, country } — plan referenced geo?.isoCode but actual interface uses geo.oblast; used geo.oblast in page"
  - "Integration tests use vi.mock (no live DB) — worktree predates Wave 0 test fixtures; mock-based tests are sufficient per plan fallback note"
  - "Worktree was forked before Plans 04-01/02; schema files and bg.json copied from main repo at /Users/emoadm/projects/smbsite"
metrics:
  duration: "~2 hours (continuation from prior session)"
  completed: "2026-05-10T17:12:37Z"
  tasks_completed: 4
  files_created: 12
  files_modified: 6
  tests_added: 20
---

# Phase 04 Plan 03: Member Submission Forms + Server Actions Summary

**One-liner:** Zod-validated submitProposal + submitProblemReport Server Actions with 6-step guard pipeline (auth/emailVerified/suspension/rate-limit/Turnstile/Zod), wired to ProposalForm + ProblemReportForm client components and RSC pages at /member/predlozhi + /member/signaliziray with server-side GeoIP oblast pre-selection.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Zod schemas + assertNotSuspended + rate-limiters | 3c3da57 | src/lib/submissions/zod.ts, role-gate.ts, rate-limit.ts |
| 2 | Server Actions submitProposal + submitProblemReport | 716e9f5 | src/lib/submissions/actions.ts, 6 integration test cases |
| 3 | Client forms ProposalForm + ProblemReportForm | 1da8704 | src/components/forms/ProposalForm.tsx, ProblemReportForm.tsx |
| 4 | RSC pages /member/predlozhi + /member/signaliziray | b67fa68 | src/app/(frontend)/member/predlozhi/page.tsx, signaliziray/page.tsx |

## Verification Results

- `pnpm tsc --noEmit`: 0 errors
- `pnpm lint:i18n` (D-25 Cyrillic lock): PUB-05 OK — no hardcoded Cyrillic in src/
- 20 Plan 04-03 tests pass: 8 unit (Zod schemas), 6 unit (rate-limit smoke), 3 integration (proposal), 3 integration (problem report)

Pre-existing test failures (NOT from this plan):
- `tests/unit/submission-schema.test.ts` — 2 failures: regex pattern mismatch (`pgTable\('moderation_log',` vs multiline format). Pre-dates this worktree.
- `tests/unit/payload-globals.test.ts` — 1 failure: Newsletters collection wiring. Pre-dates this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] GeoIP result field name mismatch**
- **Found during:** Task 4
- **Issue:** Plan specified `geo?.isoCode` but `lookupIp()` returns `{ oblast: string, country: string }` — no `isoCode` field
- **Fix:** Used `geo.oblast` instead of `geo.isoCode` in signaliziray/page.tsx
- **Files modified:** src/app/(frontend)/member/signaliziray/page.tsx
- **Commit:** b67fa68

**2. [Rule 2 - Missing] Worktree dependency gap (Plans 04-01 + 04-02)**
- **Found during:** Task 1 startup
- **Issue:** Worktree was forked at commit 3e052f5, before Plans 04-01 and 04-02 landed on main. Missing: users.status column, submissions table, moderation_log table, all Phase 4 i18n strings.
- **Fix:** Copied files verbatim from main repo at /Users/emoadm/projects/smbsite: src/db/schema/auth.ts, submissions.ts, index.ts, messages/bg.json
- **Commits:** Part of 3c3da57

**3. [Rule 3 - Blocking] Textarea + Separator UI components missing**
- **Found during:** Task 3 (form components needed Textarea for body field)
- **Issue:** src/components/ui/textarea.tsx and separator.tsx not yet in worktree (created by other plans)
- **Fix:** Created both components following shadcn/ui patterns; separator.tsx uses unified `radix-ui` package import (matching radio-group.tsx)
- **Files modified:** src/components/ui/textarea.tsx, separator.tsx
- **Commit:** 1da8704

**4. [Rule 3 - Blocking] Integration tests use vi.mock (no live DB)**
- **Found during:** Task 2
- **Issue:** Wave 0 test fixtures (tests/integration/submissions/_fixtures.ts) not yet created; no live DB in worktree test env
- **Fix:** Used vi.mock pattern (following Phase 5 newsletter-recipient-query.test.ts) per plan's explicit fallback note — "defer the integration tests to a TODO ... or rely on unit tests for shipping verification"
- **Commits:** 716e9f5

## Security Coverage (STRIDE)

| Threat | Status |
|--------|--------|
| T-04-03-01 Sockpuppet spam | Mitigated — 5/user/24h + 10/IP/24h Upstash limiters + Turnstile on every submit |
| T-04-03-02 FormData kind/status injection | Mitigated — kind + status hardcoded in actions.ts; not in Zod schema |
| T-04-03-03 Raw IP to client | Mitigated — only `defaultOblastCode: string \| null` passed; IP stays server-side |
| T-04-03-04 Stack trace leak | Mitigated — all errors return typed `{ ok: false, error: 'submission.error.<key>' }` |
| T-04-03-05 Suspended account via direct RPC | Mitigated — checkAccountStatus() at step 2 of every Server Action |
| T-04-03-06 Local level with no oblast | Mitigated — superRefine + BG-XX regex in problemReportSchema |

## Known Stubs

None — both forms are wired to live Server Actions; GeoIP suggestion is server-side real data (falls back to null gracefully).

## Threat Flags

None — no new network endpoints beyond the two documented Server Actions; both require authenticated session.

## Self-Check: PASSED

Files exist:
- src/lib/submissions/zod.ts: FOUND
- src/lib/submissions/actions.ts: FOUND
- src/components/forms/ProposalForm.tsx: FOUND
- src/components/forms/ProblemReportForm.tsx: FOUND
- src/app/(frontend)/member/predlozhi/page.tsx: FOUND
- src/app/(frontend)/member/signaliziray/page.tsx: FOUND

Commits exist:
- 3c3da57: FOUND (Task 1)
- 716e9f5: FOUND (Task 2)
- 1da8704: FOUND (Task 3)
- b67fa68: FOUND (Task 4)
