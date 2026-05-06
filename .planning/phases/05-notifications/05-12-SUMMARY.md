---
phase: 05-notifications
plan: 12
subsystem: dev-env
tags: [phase-5, gap-closure, dev-env, worker, dotenv, remediates-uat-g1]
gap_closure: true
remediates:
  - uat_gap: G1
    truth: "Standalone BullMQ worker (`pnpm worker`) boots cleanly on a developer's local box without manual env-var sourcing"
    severity: major
    test: 1
requires:
  - dotenv@16.4.7 (devDep, already installed; no new install)
provides:
  - "scripts/start-worker.ts dev-time .env.local autoload BEFORE any project import"
  - "src/db/index.ts fail-fast DATABASE_URL guard with actionable error message"
  - "tests/unit/start-worker-env.test.ts source-grep regression gate"
affects:
  - "Local-dev BullMQ worker boot path (pnpm worker, pnpm worker:dev)"
  - "Production worker boot path on Fly.io — verified byte-equivalent (dotenv no-ops with no .env files in /app)"
tech_stack_added: []
patterns:
  - "side-effect dotenv import as the first executable code in tsx-run scripts"
  - "explicit env-var guard that throws Error(`<NAME> is not set ...`) instead of bare non-null assertion"
key_files:
  created:
    - tests/unit/start-worker-env.test.ts
  modified:
    - scripts/start-worker.ts
    - src/db/index.ts
decisions:
  - "Use two explicit `loadEnv({ path: ... })` calls (.env.local + .env) instead of single-line `import 'dotenv/config'` — explicit paths are greppable and resolve the project's dev convention (.env.local) in addition to the dotenv default (.env)"
  - "`override: false` on every loadEnv call so Fly-injected production secrets always win over any stray file"
  - "Replace `process.env.DATABASE_URL!` with explicit if-guard + Error throw — defence-in-depth against future regressions, also aligns with the project pattern (env-validator gates already use this style)"
metrics:
  duration_seconds: ~600
  completed: 2026-05-06
  loc_added: ~30
  loc_removed: 1
  tasks_completed: 1
  files_modified: 3
  commits: 2
---

# Phase 5 Plan 12: Worker dotenv Bootstrap + DATABASE_URL Guard Summary

**One-liner:** dotenv-first env load in `scripts/start-worker.ts` + explicit `DATABASE_URL is not set` guard in `src/db/index.ts`, locked behind a source-grep regression gate, closes UAT G1 (`pnpm worker` cold-start TypeError).

## What Was Built

Phase 5 Plan 12 closes UAT Gap **G1** — the dev-time worker cold-start crash where `pnpm worker` threw `TypeError: Cannot read properties of undefined (reading 'includes')` at `src/db/index.ts:14` because no module loaded `.env.local` before the first project import.

The fix is two surgical changes plus a test that locks the contract:

1. **`scripts/start-worker.ts`** (3 → 38 lines): added a 12-line preamble that imports `dotenv`'s `config` function and invokes it twice — once for `.env.local` (project dev convention), once for `.env` (dotenv default) — both with `override: false`. ES-module evaluation order guarantees these side effects run before `import { startWorker as startEmailWorker } from '../src/lib/email/worker'`, which transitively triggers `src/db/index.ts` module load.

2. **`src/db/index.ts`**: replaced the silent `const url = process.env.DATABASE_URL!` non-null assertion with an explicit `if (!url) throw new Error('DATABASE_URL is not set. ...')` guard. The error message names the env var (no value leak — value is `undefined` when the guard fires anyway) and gives actionable remediation hints for both dev (`.env.local`) and prod (`fly secrets set`).

3. **`tests/unit/start-worker-env.test.ts`** (78 LOC, new): two source-grep assertions that lock the invariants. Test 1 reads `scripts/start-worker.ts`, strips comments/shebangs, and asserts the first dotenv-loader line index is strictly less than the first `from '../src/...'` import line index. Test 2 reads `src/db/index.ts`, asserts the literal `DATABASE_URL is not set` substring exists, and asserts zero `DATABASE_URL!` non-null-assertion patterns in non-comment code.

## Why This Matters

The worker is the first dev workflow in this project that meaningfully exercises the standalone tsx-run entrypoint. Phase 5's newsletter test-send dispatch is the first plan that produces a Phase-5-specific job onto the queue, so manual dev verification (operator runs `pnpm worker` locally to drain the queue and watch logs) is now part of the routine flow. UAT G1 surfaced the gap because `next dev` (which loads `.env.local` automatically via `@next/env`) was masking the defect for every preceding dev workflow — the standalone worker was the first context that didn't get free env loading.

The DATABASE_URL guard is defence-in-depth. The same TypeError class would surface on any future regression (env-validator gap, missing Fly secret rotation, accidental dotenv removal). The explicit guard converts a stack-trace-only failure into a one-line actionable message naming the missing var and the two places to set it.

The source-grep gate prevents future contributors from quietly reintroducing the bug — any PR that adds a project-relative import above the dotenv block, or restores the bare `DATABASE_URL!` assertion, fails CI before merge.

## Production Invariant

Verified during planning and reaffirmed at implementation:

- Fly.io worker container has no `.env` or `.env.local` file in `/app`.
- `dotenv.config({ path: ... })` returns silently with `{ error: <ENOENT> }` when no file is present — no throw, no env-var modification.
- Fly secrets are injected into `process.env` before the Node process starts, i.e. before any user code (including dotenv) runs.
- `override: false` on every loadEnv call means: even if a stray `.env` were ever shipped into `/app`, Fly secrets would still win.

Net production effect: the two new dotenv calls each perform one `fs.stat()` syscall that returns ENOENT, then return. Cumulative cost is sub-millisecond.

## Decisions Made

- **Two explicit `loadEnv({ path })` calls vs. single-line `import 'dotenv/config'`** — the single-line variant resolves only `.env`, not `.env.local`. The project's dev convention (per the `.env.example` filename) is `.env.local`. Two explicit calls make the resolution order obvious and don't depend on dotenv's auto-config behaviour.
- **`override: false` on every call** — guarantees Fly-injected secrets win over any file contents (threat model T-05-12-01, tampering mitigation).
- **Explicit `if (!url) throw` guard instead of zod / env-validator wrapper** — `src/db/index.ts` is already the canonical DB factory and runs at module load; importing a heavier env-validator here would create a circular concern. A two-line throw is the smallest correct fix and matches how other module-load guards in the codebase are written.

## Verification

| Check | Result |
|------|--------|
| `pnpm test:unit -- tests/unit/start-worker-env.test.ts` | **2/2 pass** (RED-then-GREEN proven) |
| `grep -c "dotenv" scripts/start-worker.ts` | 2 occurrences |
| First `from '../src/` import line in start-worker.ts | line 14 (after dotenv preamble at line 10-12) |
| `grep -v '^\s*//' src/db/index.ts | grep -v '^\s*\*' | grep -c "DATABASE_URL!"` | 0 (none in non-comment code) |
| `grep -c "DATABASE_URL is not set" src/db/index.ts` | 1 |
| `pnpm typecheck` | clean |
| Full `pnpm test:unit` suite | **325/326 pass** — the single remaining failure (`payload-newsletters.test.ts > UploadFeature`) is **pre-existing baseline noise**, confirmed via `git stash --include-untracked` then re-run on baseline. Out of scope per scope-boundary rule. |

## Deferred Issues

**Not introduced by this plan; pre-existing baseline failure.**

- `tests/unit/payload-newsletters.test.ts > Phase 5 D-01 — Newsletters Payload collection > body field uses lexicalEditor with restricted features` expects an `UploadFeature(` token in `src/payload/collections/Newsletters.ts`, but the source contains no UploadFeature reference. This was failing on baseline (`e3ace12`) before any change in this plan and is unrelated to G1's worker cold-start. It belongs to a future Phase-5 follow-up plan that either (a) adds UploadFeature to the Newsletters collection per UI-SPEC §5.5.2 or (b) updates the test if upload was deliberately deferred. **Not closed here** because (a) it is outside this plan's `<files_modified>` scope, (b) closing it would inflate the diff and obscure the G1 fix, and (c) the per-plan fix-attempt limit (≤3) is reserved for issues this task introduced.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| e7d1281 | test | RED — add failing source-grep gate for worker dotenv-first invariant |
| 5010945 | fix  | GREEN — load .env.local in worker + harden DATABASE_URL guard |

## Threat Flags

None. This plan is a correctness/devex fix; no new trust boundary, no new external input, no new schema. The plan's own threat model (T-05-12-01 to T-05-12-03) was satisfied by `override: false` (T-01), value-omitting error message (T-02), and verified production no-op (T-03).

## Deviations from Plan

None — plan executed exactly as written. RED-then-GREEN TDD cycle followed; both source edits are byte-for-byte the snippets recommended in the plan's `<action>` block. Test file matches the contract sketched in the plan (with minor formatter-driven prettier whitespace tweaks).

## Self-Check: PASSED

- [x] FOUND: tests/unit/start-worker-env.test.ts
- [x] FOUND: scripts/start-worker.ts (modified)
- [x] FOUND: src/db/index.ts (modified)
- [x] FOUND commit: e7d1281 (RED)
- [x] FOUND commit: 5010945 (GREEN)
- [x] All grep invariants pass
- [x] tests/unit/start-worker-env.test.ts → 2/2 pass
