---
quick_id: 260514-k4x
plan: 01
status: complete
tags: [bugfix, email, brevo, phase-04.1, smoke-3, regression-lock]
files_changed:
  - src/lib/email/worker.tsx
  - tests/unit/email-worker-text-content.test.ts
commits:
  - hash: b22669c
    type: fix
    subject: "fix(email-worker): render plain-text body for Phase 4 emails [260514-k4x]"
  - hash: 1428dc5
    type: test
    subject: "test(email-worker): lock 260514-k4x regression with 3 render + 3 source asserts"
diff_stat: "2 files changed, +163 -6"
requirements:
  - QUICK-260514-k4x-01  # Email worker no longer sends empty textContent to Brevo
  - QUICK-260514-k4x-02  # Regression locked-in by a unit test covering all 3 Phase 4 email kinds
verification:
  - "pnpm tsc --noEmit → exit 0"
  - "vitest run tests/unit/email-worker-text-content.test.ts → 6/6 pass"
  - "vitest run tests/unit/newsletter-template.test.ts → 11/11 pass (no collateral damage)"
  - "grep -E \"textContent:\\s*(''|\\\"\\\")\" src/lib/email/worker.tsx → 0 matches"
  - "grep -cE \"render\\(...,\\s*\\{ plainText: true\" src/lib/email/worker.tsx → 8 matches (3 Phase 1 + 2 Phase 5 + 3 Phase 4)"
  - "git diff src/lib/email/brevo.ts (HEAD~2..HEAD) → empty (client unchanged by design)"
  - "Mutation test: temporarily injecting `textContent: ''` makes source-level test fail; restored cleanly"
duration_minutes: 12
completed: "2026-05-14T14:40:06Z"
---

# Quick 260514-k4x: Phase 5 Worker textContent Regression Fix

## One-line Outcome

Replaced `textContent: ''` in the three Phase 4 email-worker handlers (`submission-status-approved`, `submission-status-rejected`, `user-suspended`) with a real plain-text rendering of the same React Email element used for `htmlContent`, unblocking Brevo delivery and locking the regression with a 6-test Vitest suite.

## What Changed

### `src/lib/email/worker.tsx` (commit `b22669c`)

Three handlers transformed identically — the React Email element is now hoisted into a `const emailElement` and rendered twice (HTML + `{ plainText: true }`), mirroring the existing OTP / welcome / newsletter pattern at lines 61-78, 178-192, 259-267.

| Handler                          | Old (line range) | Fix                                                                                                                                       |
| -------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `submission-status-approved`     | 323-342          | `<SubmissionStatusEmail variant="approved" />` → `emailElement` const → `emailHtml = render(emailElement)` + `emailText = render(emailElement, { plainText: true })` → `textContent: emailText` |
| `submission-status-rejected`     | 366-386          | same shape, `variant="rejected"` + `moderatorNote`                                                                                        |
| `user-suspended`                 | 391-407          | `<AccountSuspendedEmail t={tEmail} fullName reason />` → same hoist-then-render-twice                                                     |

No other handler, type, queue shape, or template was touched. `src/lib/email/brevo.ts` is byte-for-byte unchanged (verified by `git diff HEAD~2 HEAD -- src/lib/email/brevo.ts` → empty).

### `tests/unit/email-worker-text-content.test.ts` (commit `1428dc5`, new file, 151 LOC)

Two `describe` blocks, six `it` tests:

**`Phase 4 email worker — textContent must be non-empty (Brevo 400 regression 260514-k4x)`** (render-level):

1. `SubmissionStatusEmail` `variant="approved"` produces a non-empty plain-text string; output has no `<html>` / `<body>` tags.
2. `SubmissionStatusEmail` `variant="rejected"` plain-text contains the Cyrillic `moderatorNote` ('Дубликат на предложение #42'), proving UTF-8 round-trips through the plain-text renderer.
3. `AccountSuspendedEmail` plain-text contains the Cyrillic `reason` ('Многократно нарушаване на правилата на общността').

**`Phase 4 email worker — source-level regression lock`** (text grep against `src/lib/email/worker.tsx`):

4. Zero `textContent: ''` / `""` literals anywhere in the file.
5. At least 3 calls to `render(..., { plainText: true })` (floor — actual is 8).
6. All three case labels (`'submission-status-approved'`, `'submission-status-rejected'`, `'user-suspended'`) still present in the switch.

Note: the plan asked for 5 tests; this ships 6. I split the plan's "Test 4" (two assertions inside one `it`) into two separate `it` blocks so a future failure produces a self-describing test name. Total assertion coverage is identical to the plan; the count delta is presentational only.

## t() Stub Pattern

The two templates we drive both call `t('body', vars)` with **different** vars per variant — `SubmissionStatusEmail` passes `{ fullName, title, note? }`, `AccountSuspendedEmail` passes `{ fullName, reason }`. Rather than carry a per-template body string, the stub's `'body'` branch echoes every interpolated var verbatim into the output as `key: value` lines. This keeps the test focused on "the plain-text renderer round-trips the variant-specific data" rather than i18n copy correctness (which belongs to a separate i18n test).

All other keys (`subject`, `cta`, `memberFooter`, `supportNote`) fall back to a small Bulgarian-token map; missing keys return the key itself. Mirrors `tests/unit/newsletter-template.test.ts:24`.

## Verification Gates (all green)

| Gate                                                         | Result                                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `pnpm tsc --noEmit`                                          | exit 0                                                                                |
| `vitest run tests/unit/email-worker-text-content.test.ts`    | 6/6 pass                                                                              |
| `vitest run tests/unit/newsletter-template.test.ts`          | 11/11 pass (no collateral damage)                                                     |
| `grep -E "textContent:\\s*(''\|\"\")" src/lib/email/worker.tsx` | 0 matches (exit 1)                                                                    |
| `grep -cE "render\\(...,\\s*\\{ plainText: true" src/lib/email/worker.tsx` | 8 matches (3 Phase 1 + 2 Phase 5 + 3 Phase 4 — exactly as plan predicted)             |
| `git diff HEAD~2 HEAD -- src/lib/email/brevo.ts`             | empty (client unchanged by design)                                                    |
| Mutation test (manual)                                       | Reverting fix to `textContent: ''` makes Test 4 fail; restoring fix makes it pass. Lock confirmed effective. |

## Deviations from Plan

None. Every plan instruction was followed:
- Inline edit at all 3 call sites with identical hoist-then-render-twice shape — ✓
- No new helper function — ✓
- `src/lib/email/brevo.ts` unchanged — ✓
- All other handlers untouched — ✓
- Test wrapped in two describe blocks with the `260514-k4x` ID in the label — ✓
- Test count is 6 instead of 5 (presentational split of plan's Test 4 into two `it` blocks — see "What Changed" above). Functional coverage matches the plan exactly.

## Recovery Note (no impact on commits, recorded for future reference)

Early in execution, the Edit tool was called with an absolute path (`/home/emoadm/projects/SMBsite/src/lib/email/worker.tsx`) which resolved to the **main repo**, not the worktree. The first three Edit calls silently wrote to the main repo (which then had a dirty `M src/lib/email/worker.tsx` against `main`). Caught immediately when the in-worktree `grep` still showed the un-edited file. Recovery: re-applied the same Edits using the **relative path** `src/lib/email/worker.tsx` (which resolves correctly against the worktree cwd) and ran `git checkout -- src/lib/email/worker.tsx` in the main repo to discard the accidental write. The two committed commits are correct and contain exactly the intended changes. The `<task_commit_protocol>` step 0b absolute-path safety guidance in the executor system prompt is the right preventive — relative paths inside a worktree are the safe default.

## Follow-up Risk

The Brevo client (`src/lib/email/brevo.ts`) still accepts an empty-string `textContent` without complaining — it forwards whatever it receives. A future quick task could add a defensive `if (!args.textContent) throw new Error(...)` guard there, but that is deliberately NOT done here because:

1. It would mask future call-site regressions of this exact shape rather than surface them as a clear "this template's plain-text renderer returned empty" stack trace.
2. The source-level test added in commit `1428dc5` already catches the regression at the call site, which is the structurally correct layer.
3. Out of scope for a hotfix that must ship to unblock Smoke 3.

If the operator later wants belt-and-suspenders on this surface, the Brevo client is the natural place — but it should be a `throw` (loud failure), not a silent default to whitespace.

## Next Steps

**Operator resumes Phase 04.1 Smoke 3 after Fly redeploy lands.** The commits `b22669c` + `1428dc5` are on `worktree-agent-a87f202e89a6b75a2` based at `b1610006` (the pre-dispatch planning commit). The parent orchestrator will land these on the appropriate branch (`gsd/phase-04-user-submissions-editorial-moderation` per STATE.md or main, as decided by the Phase 04.1 flow).

Operational verification (OUT OF SCOPE for this quick task, performed by operator):

- Operator submits a test proposal via `emoadm+test5@gmail.com`.
- Operator approves the proposal from a super_editor account.
- Operator confirms in Fly worker logs that the next `submission-status-approved` job completes (not `failed ... Brevo send failed: 400`).
- Operator confirms the test recipient receives the approval email and that the email has a non-empty plain-text part (visible in Gmail "show original" or any client's view-source view).

## Self-Check: PASSED

- `src/lib/email/worker.tsx` exists and is modified (8 `plainText: true` renders, 0 empty `textContent`).
- `tests/unit/email-worker-text-content.test.ts` exists (151 lines, 6 tests across 2 describe blocks).
- Commit `b22669c` exists in git log.
- Commit `1428dc5` exists in git log.
- Both commits are on `worktree-agent-a87f202e89a6b75a2` based at `b1610006` (per pre-dispatch instructions).
