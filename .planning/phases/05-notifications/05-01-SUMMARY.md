---
phase: 05-notifications
plan: "01"
subsystem: foundation
tags: [phase-5, foundation, role-gate, logger, env, queue, brevo, tdd]
dependency_graph:
  requires: []
  provides:
    - src/lib/auth/role-gate.ts (assertEditorOrAdmin)
    - src/lib/logger.ts (REDACT extended with 'to'/'recipient_email')
    - src/lib/email/queue.ts (EmailJobKind 7 values + EmailJobPayload 5 Phase 5 fields)
    - src/lib/email/brevo.ts (headers?: Record<string,string>)
    - scripts/check-env.ts (EMAIL_FROM_NEWSLETTER / UNSUBSCRIBE_HMAC_SECRET / SITE_ORIGIN)
  affects:
    - src/app/(payload)/admin/views/attribution/actions.ts (import refactored to use shared role-gate)
    - Wave 2 plans 05-05 (worker), 05-06 (unsubscribe), 05-07 (composer), 05-08 (preferences)
tech_stack:
  added: []
  patterns:
    - Shared role-gate module extracted from attribution actions (D-25 pattern)
    - Pino REDACT extended for newsletter PII fields (D-24 pattern)
    - EmailJobKind forward-declaration for Wave 2 type safety (D-21 pattern)
    - RFC 8058 List-Unsubscribe header injection via optional brevo.ts param (D-14 pattern)
    - Build-time env validation for server-side Phase 5 secrets (Pitfall 8 pattern)
key_files:
  created:
    - src/lib/auth/role-gate.ts
    - tests/unit/role-gate.test.ts
  modified:
    - src/app/(payload)/admin/views/attribution/actions.ts
    - src/lib/logger.ts
    - src/lib/email/queue.ts
    - src/lib/email/brevo.ts
    - scripts/check-env.ts
    - .env.example
    - tests/unit/logger.test.ts
    - tests/unit/queue.test.ts
    - tests/unit/dashboard-role-gate.test.ts
decisions:
  - "Role gate extracted to src/lib/auth/role-gate.ts per D-25; attribution actions.ts now imports from shared module — avoids 4+ duplication in Phase 5 admin Server Actions"
  - "REDACT extended with 'to' and 'recipient_email' per D-24 — newsletter worker logs per-recipient send results without leaking PII"
  - "EmailJobKind extended in-place (not a separate queue) per D-21 — Wave 2 worker branches against stable 7-value union"
  - "Brevo headers param is opt-in — existing Phase 1 transactional callers unchanged; Wave 2 newsletter worker injects RFC 8058 List-Unsubscribe"
  - "check-env.ts restructured to collect all errors before exit, then exit 0 only when both NEXT_PUBLIC_* and Phase 5 server-side checks pass"
metrics:
  duration_seconds: 315
  completed_date: "2026-05-05"
  tasks_completed: 2
  files_modified: 9
---

# Phase 05 Plan 01: Foundation Infrastructure Summary

**One-liner:** Shared role-gate module, Pino PII redact extension, EmailJobKind/Payload forward-declaration, Brevo RFC 8058 headers param, and Phase 5 build-time env validation — all type-safe interfaces that unblock 4 parallel Wave 2 plans.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extract assertEditorOrAdmin + extend Pino REDACT | `fb5081c` | src/lib/auth/role-gate.ts, attribution/actions.ts, src/lib/logger.ts, tests/unit/role-gate.test.ts, tests/unit/logger.test.ts |
| 2 | Extend EmailJobKind/Payload + Brevo headers + env validator | `25f6b32` | src/lib/email/queue.ts, src/lib/email/brevo.ts, scripts/check-env.ts, .env.example, tests/unit/queue.test.ts |

**TDD commits (RED gates):**
- `030d9bb` — failing tests for role-gate + logger
- `b20b7cd` — failing tests for EmailJobKind + Brevo headers + env validator

## Final Shape of Key Types

### EmailJobKind (7 values)

```typescript
export type EmailJobKind =
  | 'register-otp'
  | 'login-otp'
  | 'welcome'
  | 'newsletter-blast'              // fan-out trigger
  | 'newsletter-send-recipient'     // per-recipient sub-job
  | 'newsletter-test'               // single-recipient test send
  | 'unsubscribe-brevo-retry';      // retry for /api/unsubscribe Brevo failure
```

### EmailJobPayload (Phase 5 forward-declared fields)

```typescript
export interface EmailJobPayload {
  to: string; kind: EmailJobKind;
  // Phase 1
  otpCode?: string; expiresAt?: Date; fullName?: string;
  // Phase 5
  newsletterId?: string; userId?: string; topic?: string;
  unsubEmail?: string; delayMs?: number;
}
```

### BrevoSendArgs (with RFC 8058 headers)

```typescript
interface BrevoSendArgs {
  to: { email: string; name?: string };
  subject: string; htmlContent: string; textContent: string;
  from?: { email: string; name?: string };
  headers?: Record<string, string>;  // Phase 5 D-14 — List-Unsubscribe injection
}
```

## Wave 2 Dependency Note

Wave 2 plans (05-05, 05-06, 05-07, 05-08) build against these surfaces. No further edits to `queue.ts` or `brevo.ts` are expected during Phase 5.

## Test Results

- All 126 unit tests pass (19 test files)
- TypeScript typecheck: 0 errors
- 9 new tests added:
  - `role-gate.test.ts`: 3 tests (D-25 role gate shape + attribution import)
  - `logger.test.ts`: 1 test (D-24 REDACT extension)
  - `queue.test.ts`: 7 tests (D-21 EmailJobKind + D-14 Brevo headers + Phase 5 env validator)
- Existing `dashboard-role-gate.test.ts`: 10 tests GREEN (lock-in maintained)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] dashboard-role-gate.test.ts conflicted with role extraction**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** `dashboard-role-gate.test.ts` line 41 expected `async function assertEditorOrAdmin` to be defined inside `actions.ts`. The plan extracts it to a shared module, making the existing test fail.
- **Fix:** Updated `dashboard-role-gate.test.ts` to check for the import from `@/lib/auth/role-gate` instead of an inline definition. The behavioral lock-in (gate is present, called first in both exported actions) is preserved.
- **Files modified:** `tests/unit/dashboard-role-gate.test.ts`
- **Commit:** `fb5081c`

**2. [Rule 2 - Enhancement] check-env.ts restructured to collect all errors before exit**
- **Found during:** Task 2 implementation
- **Issue:** Original `check-env.ts` exited at line 117 on early success before Phase 5 server-side var checks could run. Required restructuring the exit logic to: collect NEXT_PUBLIC_* errors, collect Phase 5 errors, then exit 0 only if both pass.
- **Fix:** Replaced early `process.exit(0)` with `hasErrors` flag; exit 0 only after both check groups pass.
- **Files modified:** `scripts/check-env.ts`
- **Commit:** `25f6b32`

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/lib/auth/role-gate.ts | FOUND |
| tests/unit/role-gate.test.ts | FOUND |
| 05-01-SUMMARY.md | FOUND |
| Commit 030d9bb (RED: role-gate + logger tests) | FOUND |
| Commit fb5081c (GREEN: role-gate + logger impl) | FOUND |
| Commit b20b7cd (RED: queue/brevo/env tests) | FOUND |
| Commit 25f6b32 (GREEN: queue/brevo/env impl) | FOUND |
| 126/126 unit tests passing | PASSED |
| TypeScript typecheck | PASSED |
