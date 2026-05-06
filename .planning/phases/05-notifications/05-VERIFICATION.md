---
phase: 05-notifications
gate: gap-closure-verification
status: passed
verified_at: 2026-05-07T01:08:00Z
scope: UAT gaps G1-G4 only (post-gap-closure delta verification; full Phase 5 already signed off in 05-MANUAL-VERIFICATION.md)
plans_in_scope:
  - 05-12 (G1 — worker dotenv + DATABASE_URL guard)
  - 05-13 (G2 BLOCKER — gate-field wiring; G3 cosmetic — Bulgarian register)
  - 05-14 (G4 — Redis eviction policy + startup assertion)
tests_run:
  - tests/unit/start-worker-env.test.ts
  - tests/unit/start-worker-eviction-policy.test.ts
  - tests/unit/newsletter-composer-gate-wiring.test.ts
  - tests/unit/newsletter-i18n-tone.test.ts
  - tests/unit/newsletter-composer-gate.test.tsx
tests_result: 22/22 PASS (5 files, 0 failures, 0 skips)
soft_followups:
  - "G4 production worker boot-log paste (05-OPS-REDIS-EVICTION.md §Startup assertion verification) — deferred to next worker fly deploy; infra-level fix independently verified via Upstash dashboard"
out_of_scope_baseline:
  - "tests/unit/payload-newsletters.test.ts:68 UploadFeature mismatch — pre-existing baseline failure logged in deferred-items.md; UploadFeature was deliberately removed from Newsletters.ts in a prior plan, source-grep test was not updated; not introduced by gap-closure work"
  - "F-1 / F-2 from 05-MANUAL-VERIFICATION.md (CommunityChannels URL trim + bgDescription field unused on /community) — explicitly excluded from gap-closure scope"
---

# Phase 5 — Gap Closure Verification

**Phase Goal (gap-closure scope):** Close the 4 UAT-flagged gaps from `05-UAT.md` (G1 major, G2 BLOCKER, G3 cosmetic, G4 major) so Phase 5's main shipping deliverable — admin-UI newsletter blast send with hardened worker boot — is unblocked end-to-end.

**Scope clarifier:** This run verifies ONLY the gap-closure delta. Phase 5 success criteria (NOTIF-01..06, NOTIF-09) were already signed off pre-gap in `05-MANUAL-VERIFICATION.md` (2026-05-06). The 11 pre-existing plans (05-01..05-11) carry their own SUMMARY.md / MANUAL-VERIFICATION.md / UAT.md sign-offs and are NOT re-verified here.

## Coverage

| Gap | Severity | Plan | Truth status | Source-grep | Tests | Behavior cross-ref |
|-----|----------|------|:-:|:-:|:-:|:-:|
| G1 | major | 05-12 | ✓ VERIFIED | ✓ | 2/2 | ✓ |
| G2 | BLOCKER | 05-13 | ✓ VERIFIED | ✓ | 7/7 (4 source-grep + 3 jsdom mount) | ✓ |
| G3 | cosmetic | 05-13 | ✓ VERIFIED | ✓ | 3/3 | ✓ |
| G4 | major | 05-14 | ✓ VERIFIED | ✓ | 10/10 | ✓ ops doc signed off |

**Score:** 4/4 truths verified. **22/22 gap-closure tests pass.**

## Per-gap verification

### G1 — Worker dotenv load + DATABASE_URL guard (major)

**Truth:** "Standalone BullMQ worker (`pnpm worker`) boots cleanly on a developer's local box without manual env-var sourcing."

**Source verification:**

- `scripts/start-worker.ts` lines 10-12:
  ```ts
  import { config as loadEnv } from 'dotenv';
  loadEnv({ path: '.env.local', override: false });
  loadEnv({ path: '.env', override: false });
  ```
  dotenv-first invariant satisfied: dotenv loaders sit at lines 10-12 (immediately after the file-leading comment block), the first project-relative import (`import IORedis`) is at line 14, and the first `from '../src/'` static import is inside the async `main()` at line 130 — well after the dotenv preamble executes.
- `src/db/index.ts` lines 13-20:
  ```ts
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. ...');
  }
  ```
  Bare non-null assertion `process.env.DATABASE_URL!` removed; explicit guard with actionable error message present.
- `override: false` on both loadEnv calls → Fly-injected production secrets always win over any stray `.env` file (T-05-12-01 mitigation).

**Test verification:**

- `tests/unit/start-worker-env.test.ts` — 2/2 it() blocks PASS in 2ms.
  - Test 1: dotenv loader appears at code-line index < first `from '../src/'` static OR `import('../src/')` dynamic import index. The test was correctly updated to recognise both static and dynamic project imports — necessary because Plan 05-14 introduced an async `main()` with dynamic imports between dotenv and src/* loads.
  - Test 2: literal `'DATABASE_URL is not set'` substring present in `src/db/index.ts`; zero `DATABASE_URL!` non-null assertions in non-comment code.

**Behavior cross-ref:** `05-12-SUMMARY.md` documents the fix as exactly two surgical changes plus a regression gate. The `missing:` action items in `05-UAT.md` G1 (`Add an env-file loader at the top of scripts/start-worker.ts` + `tighten src/db/index.ts to fail fast`) are both addressed verbatim.

**Verdict:** ✓ VERIFIED. Truth satisfied. No follow-ups.

### G2 — SendBlastButton gate-field wiring (BLOCKER)

**Truth:** "Send-blast button in the newsletter composer reflects the actual D-02 gate state — enabling when a fresh test send was performed within 24h with no edits since."

**Source verification:**

- `src/components/payload/NewsletterComposer.tsx` line 4: `import { useDocumentInfo } from '@payloadcms/ui';` ✓
- Lines 71-85: gate fields read from `useDocumentInfo().savedDocumentData` with the documented fallback chain `savedDocumentData → data → initialData → props (last resort)`. Forward-compatible to Payload 4.x (where `savedDocumentData` is deprecated and `data` becomes canonical).
- Line 75: `const persistedLastTestSentAt = persistedData?.lastTestSentAt;`
- Line 76: `const persistedLastEditedAfterTestAt = persistedData?.lastEditedAfterTestAt;`
- Lines 78-85: type-narrowed local resolutions (`resolvedLastTestSentAt`, `resolvedLastEditedAfterTestAt`).
- Lines 180-181: SendBlastButton receives `lastTestSentAt={resolvedLastTestSentAt}` (NOT `props.lastTestSentAt` — the broken pattern). The same pattern that the 6daaf8c hotfix used for `docId` is now applied to the gate fields.
- `src/app/actions/send-blast.ts` is byte-unchanged — defence-in-depth gate logic preserved on the server side (the Server Action re-checks the DB doc on every blast invocation; UI gate is now correctly populated, server gate remains authoritative).

**Test verification:**

- `tests/unit/newsletter-composer-gate-wiring.test.ts` — 4/4 it() blocks PASS in 2ms (source-grep contract: `useDocumentInfo` imported, `savedDocumentData` referenced in non-comment code, `props.lastTestSentAt` not passed directly to SendBlastButton, JSX wiring uses a resolved local identifier).
- `tests/unit/newsletter-composer-gate.test.tsx` — 3/3 jsdom mount scenarios PASS in 65ms:
  - Scenario 1: `savedDocumentData.lastTestSentAt = 1min ago, lastEditedAfterTestAt = false` → button rendered AND `not.toBeDisabled()` ✓ (recent gate, button enabled).
  - Scenario 2: `savedDocumentData = { id only }` (no lastTestSentAt) → button `toBeDisabled()` ✓ (gate=never).
  - Scenario 3: `savedDocumentData.lastTestSentAt = recent, lastEditedAfterTestAt = true` → button `toBeDisabled()` ✓ (gate=invalidated).
- `tests/e2e/admin-newsletter-composer.spec.ts` selectors updated (3 occurrences of `Изпрати рекламата` → `Изпрати бюлетина`) — verified via grep at lines 85, 104, 110.
- `vitest.config.mts` `esbuild.jsx: 'automatic'` added for the first .tsx test in the suite — confirmed by jsdom mount test running cleanly.

**Behavior cross-ref:** `05-13-SUMMARY.md` documents the three-layer regression catch (source-grep + jsdom mount + Playwright E2E). The `missing:` action items in `05-UAT.md` G2 (`Read lastTestSentAt and lastEditedAfterTestAt from useDocumentInfo().savedDocumentData`, `Pass the resolved values (not props) to SendBlastButton`, `Add an integration / e2e test`) are all addressed.

**Verdict:** ✓ VERIFIED. BLOCKER resolved. Phase 5 main shipping deliverable (newsletter blast send via admin UI) is now functional end-to-end through the editor flow.

### G3 — Bulgarian register fix (cosmetic)

**Truth:** "Send-blast button copy reads as a newsletter action, not as 'send advertisement'."

**Source verification:**

- `messages/bg.json` line 477: `"now": "Изпрати бюлетина"` ✓ (was `"Изпрати рекламата"`).
- `messages/bg.json` line 487: `"never": "Изпратете тестово писмо до себе си преди да изпратите бюлетина"` ✓ (was `"...преди да рекламирате"` — caught by audit-while-in-file pass per UAT G3 missing-actions item 2).
- Full-file `grep -c "реклам" messages/bg.json` returns **0** — the entire forbidden stem is absent, including all declensions (рекламата, рекламирате, рекламно, etc.).
- `tests/e2e/admin-newsletter-composer.spec.ts` lines 85, 104, 110 — all three `getByRole` selectors use `Изпрати бюлетина|Планирай изпращане`. No `Изпрати рекламата` matches anywhere in the file.

**Test verification:**

- `tests/unit/newsletter-i18n-tone.test.ts` — 3/3 it() blocks PASS in 2ms:
  - Test 1: `admin.newsletters.actions.sendBlast.now === "Изпрати бюлетина"` exact match.
  - Test 2: `admin.newsletters` namespace recursively scanned — zero `/реклам/i` matches (all declensions caught by the bare-stem regex).
  - Test 3: `email.newsletter` namespace scanned — zero matches. Audit scope wider than just the offending key.

**Behavior cross-ref:** `05-13-SUMMARY.md` documents the tone-lock test extending the Phase 02.1 D-27 vocative-form pattern with the bare stem `реклам`. The `missing:` action items in `05-UAT.md` G3 (`Replace messages/bg.json admin.newsletters.actions.sendBlast.now`, `Audit the rest of admin.newsletters and email.newsletter for similar register slips`) are both addressed.

**Verdict:** ✓ VERIFIED. Cosmetic gap closed; future regression class locked behind tone-lock test.

### G4 — Redis eviction policy + startup assertion (major)

**Truth:** "Redis instance backing BullMQ uses `maxmemory-policy=noeviction`, OR the operator has explicitly accepted the risk via `WORKER_SKIP_EVICTION_ASSERT=1` with audit-log trail — silent degradation is forbidden."

**Source verification:**

- `scripts/start-worker.ts` lines 41-64: pure helper `evaluateEvictionPolicy(input, env)` returns discriminated-union `EvictionCheckOutcome` (`'ok' | 'wrong' | 'unverifiable'`). All four behavior branches deterministically testable without process.exit mocking.
- Lines 66-125: orchestrator `assertNoEviction()` runs one `client.config('GET', 'maxmemory-policy')` against `UPSTASH_REDIS_URL` via short-lived IORedis client (`lazyConnect: true, connectTimeout: 5000, maxRetriesPerRequest: 1`) — does NOT reuse the BullMQ getConnection() singleton (which would hang on a stuck CONFIG GET).
- Three exit/proceed paths verified:
  - Line 98: `kind: 'ok'` → `console.warn('[worker] eviction-assert: noeviction ✓')` + return.
  - Lines 102-110: `kind: 'wrong'` → fatal error log + `process.exit(1)`. **Skip flag does NOT cover this case** — comment at line 107 enforces.
  - Lines 112-124: `kind: 'unverifiable'` → if `WORKER_SKIP_EVICTION_ASSERT === '1'` emit structured `eviction-assert-skipped reason=<JSON> at=<ISO>` warn (line 115) + proceed; otherwise fatal log + `process.exit(1)`. **No silent degradation.**
- Skip-flag references in source: `WORKER_SKIP_EVICTION_ASSERT` appears at lines 29 (comment), 43 (type), 52 (helper read), 62 (helper read), 94 (env passthrough), 107 (operator-facing fatal-message disclaimer), 121 (operator-facing remediation hint). Zero `.env*` or `fly secrets` references — flag is NOT in use anywhere.
- TLS handling at line 77 mirrors the existing `src/lib/email/queue.ts:39` convention (`tls: url.startsWith('rediss://') ? {} : undefined`) — handles both local plain and Upstash TLS uniformly.
- ESM async-main pattern at lines 127-166 — `await assertNoEviction()` gates ALL worker construction (email + attribution) inside the assertion-passed block. Fatal `main().catch` at line 163 covers any unhandled boot error.

**Test verification:**

- `tests/unit/start-worker-eviction-policy.test.ts` — 10/10 it() blocks PASS in 3ms:
  - 5 source-grep tests (maxmemory-policy + noeviction tokens, CONFIG GET invocation, ≥2 process.exit(1) sites, WORKER_SKIP_EVICTION_ASSERT reference, eviction-assert-skipped structured warn).
  - 5 behavior tests on the pure helper (kind=ok, kind=wrong even with skip-flag set, kind=unverifiable+skipped=false, kind=unverifiable+skipped=true, unexpected-shape defence in depth).

**Audit-trail verification (G4-specific dimension):**

- `.planning/phases/05-notifications/05-OPS-REDIS-EVICTION.md` frontmatter:
  - `status: passed` ✓
  - `verified_at: 2026-05-06T22:00:00+03:00` ✓
  - `verified_by: emoadm` ✓
  - `skip_flag_in_use: false` ✓
- All three environments signed off in §Per-environment verification:
  - Local dev (Homebrew Redis): `noeviction` ✓ (default, no action needed).
  - Staging Upstash (smbsite-staging, eu-west-1 Frankfurt, Free tier): `noeviction` ✓ — was `optimistic-volatile`, fix applied 2026-05-06 via dashboard toggle.
  - Production Upstash (smbsite-prod, eu-west-1 Frankfurt, Pay-as-you-go): `noeviction` ✓ — was `optimistic-volatile`, fix applied 2026-05-06 via dashboard toggle. Skip flag explicitly forbidden (`must be no — and CANNOT be`).
- §Sign-off checklist: 4/5 boxes ticked. The unticked item ("Startup-time assertion confirmed in production worker boot log") is the documented soft follow-up — see below.

**Cross-phase coverage confirmed:** Per `src/lib/email/queue.ts:36`, the same `UPSTASH_REDIS_URL` backs the Phase 1 OTP queue. Setting `noeviction` on the production Redis transitively closes a latent silent-job-loss risk in the Phase 1 OTP path that was never explicitly logged. Documented in `05-14-SUMMARY.md` §Cross-Phase Coverage and reaffirmed in `05-OPS-REDIS-EVICTION.md` §Coverage.

**Verdict:** ✓ VERIFIED. Truth satisfied at infra layer + ongoing runtime-assertion enforcement + audit trail. Skip flag NOT in use in any environment.

## Soft follow-ups (NOT blockers)

1. **G4 production worker boot-log paste** — `05-OPS-REDIS-EVICTION.md` §Startup assertion verification still reads `[pending — first deploy carrying scripts/start-worker.ts assertion code (commits f9ba1e5 + 53b355a) has not yet shipped]`. Operator will paste the `[worker] eviction-assert: noeviction ✓` log line into the ops doc after the next worker `fly deploy`. The infra-level policy fix is independently verified via Upstash dashboard; the runtime assertion is defence-in-depth that catches future regressions. Not a blocker for ship.

2. **F-1 (URL trim on CommunityChannels Global)** and **F-2 (`bgDescription` field unused on `/community/page.tsx`)** from `05-MANUAL-VERIFICATION.md` — explicitly out-of-scope for this gap-closure cycle. Tracked in the original manual-verification doc; no new evidence here.

## Pre-existing baseline (out of scope)

- `tests/unit/payload-newsletters.test.ts:68` — UploadFeature mismatch. Test asserts `UploadFeature(` is present in `src/payload/collections/Newsletters.ts`, but the source has a comment (line 98-99) explicitly noting `UploadFeature was originally listed but removed: payload.config.ts has no upload-target collection`. Documented in `.planning/phases/05-notifications/deferred-items.md` as out-of-scope per execute-plan scope-boundary rule. The Newsletters.ts edit predates the gap-closure cycle (commit `00e0dbb` — "fix(05-04): remove UploadFeature() from Newsletters Lexical config"). Belongs to a future Phase-5 follow-up plan that either (a) adds UploadFeature back to the collection per UI-SPEC §5.5.2 or (b) updates the test if upload was deliberately deferred. **Not a verification failure of the gap-closure work.**

## Gap-closure commit chain (on main)

| Plan | Commit | Type | Description |
|------|--------|------|-------------|
| 05-12 | e7d1281 | test | RED — failing source-grep gate for worker dotenv-first invariant |
| 05-12 | 5010945 | fix | GREEN — load .env.local in worker + harden DATABASE_URL guard |
| 05-12 | d4e3286 | docs | 05-12-SUMMARY.md |
| 05-12 | e3137d1 | chore | merge executor worktree |
| 05-13 | 4b25b81 | test | RED — gate-wiring + i18n-tone + jsdom mount tests |
| 05-13 | 25eca2f | fix | GREEN — wire SendBlastButton from useDocumentInfo + correct Bulgarian register |
| 05-13 | da24997 | docs | log pre-existing UploadFeature test mismatch as out-of-scope |
| 05-13 | 7bdb732 | docs | 05-13-SUMMARY.md |
| 05-13 | 01764a5 | chore | merge executor worktree |
| 05-14 | f9ba1e5 | test | RED — eviction-policy assertion source-grep + behavior gate |
| 05-14 | 53b355a | feat | GREEN — maxmemory-policy assertion + ops-doc skeleton |
| 05-14 | ee259f5 | docs | Redis maxmemory-policy operator sign-off |
| 05-14 | e874deb | docs | STATE.md — G4 closed + Phase 1 OTP transitive note |
| 05-14 | 82282a3 | docs | 05-14-SUMMARY.md |

## Verdict

**VERIFICATION PASSED.** All four UAT gaps (G1, G2, G3, G4) closed. 22/22 gap-closure tests green. Three plan SUMMARY.md docs match codebase reality on every claim spot-checked. Phase 5 ready for `/gsd-ship 05` (or merge to release branch). Soft follow-up (G4 production boot-log paste) does not block ship — it's a post-deploy ops note.

---

_Verified: 2026-05-07T01:08:00Z_
_Verifier: Claude (gsd-verifier, goal-backward gap-closure mode)_

## VERIFICATION PASSED
