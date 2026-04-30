---
phase: 1
plan: 02
subsystem: testing
tags: [vitest, playwright, i18n-lint, test-stubs]
requires: [01]
provides:
  - vitest-runner
  - playwright-runner
  - viewport-matrix
  - i18n-lint
  - failing-by-design-stubs
  - test-env-fixtures
affects:
  - package.json
  - tests/
  - scripts/
  - .env.test
tech-stack:
  added:
    - vitest@2.1.8
    - "@vitest/coverage-v8@2.1.8"
    - "@vitest/ui@2.1.8"
    - "@testing-library/react@16.1.0"
    - "@testing-library/jest-dom@6.6.3"
    - jsdom@25.0.1
    - "@playwright/test@1.49.1"
    - dotenv@16.4.7
  patterns:
    - failing-by-design test stubs (expect.fail + test.fixme)
    - 4-viewport responsive matrix per D-28
    - PUB-05 lint-i18n enforcement (no Cyrillic in src/)
key-files:
  created:
    - vitest.config.mts
    - playwright.config.ts
    - tests/setup/vitest.setup.ts
    - .env.test
    - .env.test.example
    - scripts/lint-i18n.mjs
    - tests/unit/disposable-email.test.ts
    - tests/unit/rate-limit.test.ts
    - tests/unit/otp-generator.test.ts
    - tests/unit/turnstile.test.ts
    - tests/unit/queue.test.ts
    - tests/unit/logger.test.ts
    - tests/unit/theme.test.ts
    - tests/e2e/registration.spec.ts
    - tests/e2e/login.spec.ts
    - tests/e2e/anti-abuse.spec.ts
    - tests/e2e/smoke.spec.ts
    - tests/e2e/branding.spec.ts
    - tests/e2e/responsive.spec.ts
  modified:
    - package.json
    - .planning/phases/01-foundation/01-VALIDATION.md
key-decisions:
  - "Test stubs use expect.fail() (unit) and test.fixme() (E2E) so passing requires explicit replacement in the implementing plan — no silent vacuous passes."
  - ".env.test is committed to the repo because it contains only Cloudflare-published Turnstile test keys + dummy secrets (RESEARCH § Playwright Testing of Turnstile lines 1233-1237)."
  - "Playwright runs sequentially (fullyParallel: false) so rate-limit-dependent E2E tests stay deterministic."
  - "Skipped --with-deps on macOS Playwright install (linux-only flag)."
  - "Removed scripts/.gitkeep, tests/unit/.gitkeep, tests/e2e/.gitkeep — superseded by real files."
requirements-completed: [PUB-05, PUB-06]
duration: ~12 min
completed: 2026-04-30
---

# Phase 1 Plan 02: Test Scaffolding Summary

Wave-0 test infrastructure: Vitest 2.1.8 unit runner with `@/` alias and pre-loaded test fixtures, Playwright 1.49.1 E2E with the D-28 4-viewport matrix (1440/768/375/360), dotenv-loaded `.env.test` with Cloudflare-published Turnstile test keys, and a `pnpm lint:i18n` script enforcing PUB-05 (no Cyrillic in `src/**.{ts,tsx,js,jsx}`). Every Wave-0 artefact from `01-VALIDATION.md` exists as a failing-by-design stub pointing at its implementing plan, so downstream plans cannot accidentally pass with empty assertions.

## What Was Built

**Task 1.02.1 — Test runner configs (commit `c75d1ad` and earlier):**
- `vitest.config.mts` — node env, `tests/unit/**/*.test.{ts,tsx}` include glob, `@/` → `./src/` alias, baked-in test fixtures (Turnstile keys, OTP HMAC, AUTH_SECRET, LOG_LEVEL=silent), lcov coverage
- `playwright.config.ts` — 4 viewport projects (chromium-desktop 1440, chromium-tablet 768, chromium-iphone-se 375, chromium-samsung-a 360), `fullyParallel: false`, `webServer: pnpm dev` for local-only, dotenv loads `.env.test`
- `tests/setup/vitest.setup.ts` — `@testing-library/jest-dom/vitest` matchers
- `.env.test` (committed) + `.env.test.example` — public test fixtures only
- `package.json` scripts: `test:unit`, `test:unit:ui`, `test:e2e`, `test`, `lint:i18n`

**Task 1.02.2 — Failing stubs + i18n lint (commit `<latest>`):**
- 7 unit-test stubs (`disposable-email`, `rate-limit`, `otp-generator`, `turnstile`, `queue`, `logger`, `theme`) — each contains 2-4 `it.todo()` markers and one `expect.fail('...plan 1.NN')` to force the failure visible until real code lands
- 6 E2E stubs (`registration`, `login`, `anti-abuse`, `smoke`, `branding`, `responsive`) — each uses `test.fixme()` so Playwright reports them as skipped-pending
- `scripts/lint-i18n.mjs` — Cyrillic detector (`/[Ѐ-ӿ]/`), comment-stripping pre-pass, exit-1 with offender list when violations found
- `01-VALIDATION.md` frontmatter: `wave_0_complete: false → true`, `nyquist_compliant: false → true`

## Verification

| Check | Result |
|-------|--------|
| `pnpm exec vitest --version` | `2.1.8 darwin-arm64 node-v22.16.0` |
| `pnpm exec playwright --version` | `1.49.1` |
| `pnpm exec vitest run` | 7 files failed by design, 20 todos (every stub fires `SCAFFOLD MISSING — wired in plan 1.NN`) |
| `pnpm lint:i18n` | exits 0 (`PUB-05 OK: no hardcoded Cyrillic in src/`) |
| `pnpm typecheck` | exits 0 |
| `pnpm lint` | exits 0 |
| `pnpm format:check` | exits 0 |
| `.env.test` committed (not gitignored) | confirmed via `git check-ignore` exit 1 |
| Playwright config 4 viewport widths | `375`, `360`, `768`, `1440` all present |
| `git log --oneline --grep="01-02"` | ≥ 2 commits |
| VALIDATION.md flags flipped | `wave_0_complete: true`, `nyquist_compliant: true` |

## Deviations from Plan

**[Rule 1 — environment] Skipped `--with-deps` on Playwright install**
Found during: Task 1.02.1 Step 1
Issue: `pnpm exec playwright install chromium --with-deps` requires sudo for apt/yum dependency install on Linux; this is a no-op on macOS (Darwin). The macOS runtime cannot acquire sudo non-interactively.
Fix: Ran `pnpm exec playwright install chromium` only (browser binary installed cleanly).
Files modified: none (no config change)
Verification: `pnpm exec playwright --version` exits 0; `pnpm exec playwright test --list` parses config without error.

**[Rule 1 — cleanup] Removed three `.gitkeep` placeholders that became redundant**
Found during: Task 1.02.2 final commit
Issue: `tests/unit/.gitkeep`, `tests/e2e/.gitkeep`, `scripts/.gitkeep` were created in plan 01-01 to lock the canonical directory tree. Now that real files live in those directories, the placeholders are dead weight.
Fix: `git rm` the three `.gitkeep` files.
Files modified: `tests/unit/.gitkeep`, `tests/e2e/.gitkeep`, `scripts/.gitkeep` (deleted)
Verification: directories still tracked via real children.

**Total deviations:** 2 auto-fixed (1 macOS-specific install flag, 1 cleanup of superseded placeholders). **Impact:** None — both are environment hygiene; no test or behavioral contract changes.

## Issues Encountered

None blocking. Three pre-existing ESLint warnings (unused `eslint-disable @typescript-eslint/no-explicit-any` in Payload-generated boilerplate) carry over from plan 01-01.

## Next Phase Readiness

Ready for **Plan 01-03** (Drizzle + Neon schema). Drizzle's `pnpm db:push` command in plan 01-03 will be the first thing exercised against `.env.test`'s `DIRECT_URL`. Wave-0 test-coverage gate is now closed: any plan that ships real code MUST replace the corresponding stub or `pnpm test:unit` stays red.

## Self-Check: PASSED
