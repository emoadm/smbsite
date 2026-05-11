---
phase: quick-260511-0nx
plan: 01
status: complete
type: execute
wave: 1
depends_on: [260511-04m]
requirements:
  - QUICK-260511-0nx-CF-RAY-BYPASS
tags: [playwright, ci, middleware, cf-ray, e2e]
key-files:
  modified:
    - playwright.config.ts
commits:
  - f242920
remaining-gate: task-2-ci-human-verify
---

# Quick 260511-0nx: Playwright cf-ray header bypass — Summary

**One-liner:** Added `extraHTTPHeaders: { 'cf-ray': 'playwright-ci-bypass' }` to the Playwright `use` block so CI Playwright traffic carries the cf-ray presence header required by `src/middleware.ts`, clearing the ~37 page-load-class 403 failures observed on PR #2 CI run 25639963750.

## What changed

| File | Change |
| ---- | ------ |
| `playwright.config.ts` | One new field (`extraHTTPHeaders: { 'cf-ray': 'playwright-ci-bypass' }`) plus a five-line explanatory comment inserted in the `use` block immediately after `baseURL`. No other section touched. |

Exact `use` block after the change (lines 11–22):

```typescript
use: {
  baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
  // Bypass the cf-ray casual-probe gate in src/middleware.ts for CI traffic.
  // The middleware does a presence check only (no format validation); a
  // clearly synthetic value keeps log inspection obvious. See quick task
  // 260511-0nx for rationale and D-CloudflareIPAllowlist for the real
  // network-layer auth boundary tracked separately.
  extraHTTPHeaders: { 'cf-ray': 'playwright-ci-bypass' },
  trace: 'on-first-retry',
  actionTimeout: 5_000,
},
```

## Why

PR #2 CI run `25639963750` failed 40 of 54 Playwright tests with `page.goto: expecting 200, got 403`. Root cause: `src/middleware.ts:48` enforces a presence check on the `cf-ray` header in `NODE_ENV === 'production'`; CI runs the standalone server via `pnpm start:standalone` (which sets `NODE_ENV=production`), and Playwright requests originated without that header, so the middleware short-circuited every page load to `403 Forbidden` before the route ever rendered.

The gate is documented as a **soft, casual-probe signal** (see `src/middleware.ts:23–33` security note and `D-CloudflareIPAllowlist` in STATE.md deferred items). The real origin-IP boundary is enforced by Fly.io's network ACL plus the obscurity of the internal hostname — not by this header. Adding a synthetic value in Playwright config therefore mimics what Cloudflare's edge does in real traffic without weakening any real boundary.

### Value choice rationale

Used `'playwright-ci-bypass'` (a clearly synthetic value) rather than a forged-looking real Cloudflare cf-ray (e.g. `8a1b2c3d-LHR`). If this config ever leaked into production logs, the synthetic value makes it immediately recognizable as CI test traffic rather than a forged real request. The middleware does presence-only validation (no format check), so any non-empty string passes — choosing the obvious one is a maintenance-readability win at zero functional cost.

## Files NOT modified (constraint-verified)

| File | Why protected |
| ---- | ------------- |
| `src/middleware.ts` | The cf-ray gate is the contract; fix lives on the test-client side. |
| `next.config.ts` | `output: 'standalone'` must remain — Fly.io Docker requires it. |
| `.github/workflows/ci.yml` | CI job already inherits everything it needs. |
| `package.json` | `start:standalone` script from 260511-04m stays as-is. |
| Anything under `tests/e2e/` | Per-test header overrides not needed; `use.extraHTTPHeaders` is global. |
| `playwright.config.ts` `projects[]`, `webServer` block | Not in scope; only the `use` block was edited. |

## Verification results

Plan's `<verify><automated>` block — all PASS:

| Check | Result |
| ----- | ------ |
| `node -e` use-block parser script | OK — `extraHTTPHeaders cf-ray bypass present in use block with required comment references` |
| `grep extraHTTPHeaders playwright.config.ts` | line 18 present |
| `grep "output: 'standalone'" next.config.ts` | line 9 unchanged |
| `grep start:standalone package.json` | line 14 unchanged |
| `grep cf-ray gate src/middleware.ts` | line 48 unchanged |
| `pnpm typecheck` | exit 0 (no errors) |

## Setup deviation (Rule 3 — blocking issue)

The agent worktree was spawned from base commit `3e052f5` — strictly older than the plan's prerequisite (260511-04m landed on `gsd/phase-04-user-submissions-editorial-moderation` at `3b484b8`, plan dispatch at `d4c14ae`). Effects:

- `package.json` lacked `start:standalone` (would fail the plan's grep guard)
- `playwright.config.ts` was at the pre-04m shape (`pnpm start` instead of `pnpm start:standalone`)
- The plan file itself (`260511-0nx-PLAN.md`) wasn't reachable from the worktree HEAD

Recovery: ran `git merge --ff-only gsd/phase-04-user-submissions-editorial-moderation` on the per-agent branch (`worktree-agent-ac82c48e114cfb6e1`). This is a forward-only operation — adds 5 commits, removes none, no force, no `reset --hard`, no `update-ref` of protected refs, not on the destructive-git prohibition list. After the fast-forward, HEAD = `d4c14ae` and Task 1's edit landed cleanly on top as commit `f242920`.

Also ran `pnpm install --frozen-lockfile` because `node_modules` was absent in the new worktree (required for `pnpm typecheck` to execute). Lockfile unchanged.

## Task 2 status — OPEN

Task 2 is a `checkpoint:human-verify` requiring a push of this branch and operator inspection of the resulting PR #2 CI run. Expected delta vs. run `25639963750`:

- 403-class page-load failures resolved across: landing, branding, agenda, unsubscribe, login, registration, attribution, anti-abuse, community-page (public surface), legal-visual-regression, proposals-public, cookie-consent, dsa-notice-and-action, responsive, smoke, typography, newsletter-preferences (public surface).
- Approximate run total moves from `14 passed / 40 failed` toward `~50+ passed / ~3 failed`.

## Remaining expected failures (NOT in scope here)

Three specs need env vars (`E2E_EDITOR_EMAIL`, `E2E_MEMBER_EMAIL`, `TEST_OTP_SINK`) that aren't set in CI — separately tracked:

- `admin-newsletter-composer` (member-flow portion)
- `community-page` (member-flow portion only)
- `newsletter-preferences` (member-flow portion only)

## Forward links

- Pairs with quick task `260511-04m-fix-playwright-standalone-webserver` — that fixed `pnpm start:standalone` so port 3000 binds; this fixes what the standalone server returns to Playwright clients.
- Real network-layer auth boundary: tracked as `D-CloudflareIPAllowlist` in STATE.md deferred items (Fly.io `internal_port` allow-list against Cloudflare's documented IP ranges).
- Env-var hard-fail bug for the 3 remaining specs: tracked separately.

## Self-Check: PASSED

- `playwright.config.ts` line 18 contains `extraHTTPHeaders: { 'cf-ray': 'playwright-ci-bypass' }` — verified.
- Commit `f242920` exists on `worktree-agent-ac82c48e114cfb6e1` — verified via `git log --oneline -1`.
- `pnpm typecheck` exit 0 — verified.
- Files not modified (`src/middleware.ts`, `next.config.ts`, `package.json`, `.github/workflows/ci.yml`, anything under `tests/`) — verified via `git show --stat f242920` showing only `playwright.config.ts`.
