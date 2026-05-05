---
phase: 05-notifications
plan: "02"
subsystem: unsubscribe-lib, schema
tags: [phase-5, hmac, unsubscribe, drizzle-schema, consent-kinds, tdd]
dependency_graph:
  requires: []
  provides:
    - "src/lib/unsubscribe/hmac.ts — signUnsubToken + verifyUnsubToken (D-16 substrate)"
    - "users.preferred_channel nullable text column (D-07)"
    - "CONSENT_KINDS 8-entry const with newsletter_* topics (D-08)"
    - "src/db/migrations/0002_panoramic_ink.sql — ALTER TABLE users ADD COLUMN preferred_channel text"
  affects:
    - "05-06 unsubscribe route (Wave 2) — imports signUnsubToken/verifyUnsubToken"
    - "05-08 preferences page (Wave 2) — imports ConsentKind, uses preferred_channel"
    - "05-10 schema push (Wave 3) — applies 0002_panoramic_ink.sql to live Neon"
tech_stack:
  added: []
  patterns:
    - "HMAC-SHA256 unsubscribe tokens (node:crypto only, no JWT library)"
    - "Lazy env-var getter (Pitfall 8 guard)"
    - "TDD — RED commit then GREEN commit per task"
key_files:
  created:
    - src/lib/unsubscribe/hmac.ts
    - tests/unit/unsubscribe-hmac.test.ts
    - tests/unit/newsletter-schema.test.ts
    - src/db/migrations/0002_panoramic_ink.sql
    - src/db/migrations/meta/0002_snapshot.json
  modified:
    - src/db/schema/auth.ts
    - src/db/schema/consents.ts
    - src/db/migrations/meta/_journal.json
decisions:
  - "Migration path: drizzle.config.ts outputs to src/db/migrations/ not src/migrations/ — test adapted accordingly (deviation from plan template)"
  - "HMAC token uses base64url(JSON({uid,iat})).base64url(sig) format — no JWT library ensures no alg:none attack surface"
  - "CONSENT_KINDS is text[] const (not DB enum) — appending values is code-only, zero DB migration for consents table"
metrics:
  duration: "4 minutes"
  completed_date: "2026-05-05T02:20:45Z"
  tasks_completed: 2
  files_changed: 8
requirements:
  - NOTIF-02
  - NOTIF-03
---

# Phase 05 Plan 02: HMAC Unsubscribe Library + Drizzle Schema Extensions Summary

HMAC-SHA256 stateless unsubscribe token library with 90-day TTL + lazy secret getter; Drizzle schema extended with users.preferred_channel (nullable text) and CONSENT_KINDS expanded to 8 entries (4 new newsletter topics + legacy newsletter); migration 0002_panoramic_ink.sql generated and committed.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 05.02.1 | HMAC sign/verify lib + 14 unit tests | dc0c996 | src/lib/unsubscribe/hmac.ts, tests/unit/unsubscribe-hmac.test.ts |
| 05.02.2 | Drizzle schema extensions + migration + 6 schema tests | 8dfbb84 | src/db/schema/auth.ts, src/db/schema/consents.ts, src/db/migrations/0002_panoramic_ink.sql, tests/unit/newsletter-schema.test.ts |

## HMAC Token Format (D-16)

```
Format: base64url(JSON({uid, iat})).base64url(sig)
Algorithm: HMAC-SHA256 via node:crypto.createHmac
TTL: 90 days via iat claim (milliseconds since epoch)
Constant-time compare: timingSafeEqual (length-check before call)
Secret: lazy SECRET() getter — module never crashes when env unset
```

## Final CONSENT_KINDS Array (8 entries)

```typescript
export const CONSENT_KINDS = [
  'privacy_terms',
  'cookies',
  'newsletter',                  // legacy D-09 backward compat
  'newsletter_general',          // Phase 5 D-08
  'newsletter_voting',           // Phase 5 D-08
  'newsletter_reports',          // Phase 5 D-08
  'newsletter_events',           // Phase 5 D-08
  'political_opinion',
] as const;
```

## users Table Change (D-07)

Added 1 nullable text column. No .notNull() constraint — existing members retain NULL until they set a preference.

```sql
-- Migration 0002_panoramic_ink.sql
ALTER TABLE "users" ADD COLUMN "preferred_channel" text;
```

Note: Wave 3 plan 05-10 [BLOCKING] applies this migration to live Neon.

## Test Results

- `tests/unit/unsubscribe-hmac.test.ts` — 14 tests, all GREEN
- `tests/unit/newsletter-schema.test.ts` — 6 tests, all GREEN
- Full regression suite — 135 tests across 20 files, all GREEN
- `pnpm typecheck` — passes; UnsubVerifyResult discriminated union exported; ConsentKind has 8 members

## Deviations from Plan

### Auto-corrected Issues

**1. [Rule 1 - Bug] Migration directory path mismatch in test**
- **Found during:** Task 05.02.2 — `drizzle.config.ts` outputs to `src/db/migrations/` but plan template specified `src/migrations/`
- **Fix:** Updated `tests/unit/newsletter-schema.test.ts` to scan `src/db/migrations/` (the actual drizzle-kit output directory)
- **Files modified:** tests/unit/newsletter-schema.test.ts
- **Commit:** 8dfbb84

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. HMAC library is pure compute (no I/O). Schema additions are additive (no breaking changes to trust boundaries). Nothing new to flag beyond the plan's existing threat model entries (T-05-02-01 through T-05-02-05).

## Known Stubs

None. Both deliverables are complete implementations consumed directly by downstream Wave 2 plans.

## Self-Check: PASSED
