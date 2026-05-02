---
quick_id: 260502-lhc
type: execute
mode: quick
autonomous: true
files_modified:
  - playwright.config.ts
  - .planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md
---

<objective>
Two unrelated, atomic fixes shipped as one quick task with two commits.

1. **CI regression (introduced in plan 01-12, commit `1e37665`)**: `playwright.config.ts:34-41`
   sets `webServer` to `undefined` when `process.env.CI` is truthy, on the (incorrect) assumption
   that CI starts the server explicitly. `.github/workflows/ci.yml` does no such thing — after
   `pnpm build` it runs `pnpm test:e2e --project=chromium-desktop` directly, so all 21
   Playwright specs fail with `ECONNREFUSED localhost:3000`. CI has never been green on `main`
   despite the deliverability checklist line 193 claiming it was. Fix: make Playwright always
   provide a `webServer` block — `pnpm start` in CI (CI has built `.next/` already), `pnpm dev`
   locally. Single source of truth for boot.

2. **Inaccurate evidence in Phase 1 deliverability checklist**: line 40 marks the
   `mail2._domainkey.news.chastnik.eu` DKIM CNAME as `[x] added [x] verified`, but
   `dig CNAME mail2._domainkey.news.chastnik.eu +short` returns empty (record not in DNS).
   The other three news.* DKIM CNAMEs (`mail`, `brevo1`, `brevo2`) DO resolve. Fix: uncheck
   both boxes and add a note that this single record is intentionally deferred until before
   Phase 5 (newsletter sender) first send — non-blocking for Phase 1 because `news.*` is the
   Phase 5 newsletter sender, not the Phase 1 transactional path (which uses `auth.*`).

Purpose: turn the CI red into green so future PRs gate on real signal, and stop the checklist
from claiming evidence that does not exist (would silently corrupt Phase 5 readiness).

Output:
- `playwright.config.ts` always boots a local server (mode-aware command).
- `.planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md` line 40 reflects DNS reality
  with a forward-pointing deferral note keyed to Phase 5.

**STATE.md is intentionally NOT modified by these tasks.** The orchestrator writes the Deferred
Items row + the quick-task table row in step 7 of the quick workflow.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
@playwright.config.ts
@.github/workflows/ci.yml
@package.json
@.planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md

<interfaces>
<!-- Key facts the executor needs without re-deriving them. -->

From `package.json` scripts:
- `"build": "tsx scripts/check-env.ts && next build"` — runs prebuild env validator, then build.
- `"start": "next start"` — boots the production server on port 3000 (default Next.js port).
- `"dev": "next dev"` — dev server on port 3000.
- `"test:e2e": "playwright test"`.

From `.github/workflows/ci.yml` (job-level `env:` block, lines 25-38):
- `DATABASE_URL`, `DIRECT_URL`, `PAYLOAD_DATABASE_URL`, `PAYLOAD_SECRET`, `AUTH_SECRET`,
  `AUTH_URL=http://localhost:3000`, `OTP_HMAC_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`,
  `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_COOKIEYES_SITE_KEY` are all already exported at job
  level → automatically inherited by every step including `pnpm test:e2e` → `pnpm start`.
- The build step (`pnpm build`) runs BEFORE `pnpm test:e2e`, so `.next/` is on disk by the
  time Playwright launches `pnpm start`.
- The `Playwright smoke` step already sets `PLAYWRIGHT_BASE_URL=http://localhost:3000`.

Current `playwright.config.ts:34-41`:
```ts
webServer: process.env.CI
  ? undefined // CI starts the server explicitly before invoking playwright
  : {
      command: 'pnpm dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 60_000,
    },
```

Replacement shape (always-on, mode-aware):
```ts
webServer: {
  command: process.env.CI ? 'pnpm start' : 'pnpm dev',
  url: 'http://localhost:3000',
  // In CI we want a clean boot; locally we reuse a long-running dev server.
  reuseExistingServer: !process.env.CI,
  // CI cold-start (next start on a built .next/) needs more headroom than dev HMR.
  timeout: 120_000,
},
```

From `.planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md`:
- Lines 35-42 are the "News subdomain" DKIM table. Line 40 is the offending row.
- Line 39 (`mail._domainkey.news.chastnik.eu`) and lines 41-42 (`brevo1`, `brevo2`) DO resolve
  via dig — keep as `[x] added [x] verified`.
- Line 106 already states: "Sender domain `news.chastnik.eu` authenticated (newsletter sender;
  configure in Brevo when Phase 5 ships, DNS already in place)" — that wording becomes
  inaccurate and should be tightened in the same edit (DNS is *partially* in place).
- Line 176 in Section F SC-4 says "DKIM chain ×4 for `news.chastnik.eu`" — also needs to
  reflect that one of the four is intentionally deferred. Adjust to "×3 currently; ×4 by
  Phase 5".
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Always boot a webServer in playwright.config.ts (fix CI ECONNREFUSED)</name>
  <files>playwright.config.ts</files>
  <action>
    Replace the `webServer:` block (currently lines 34-41) with a single always-on entry that
    chooses the command based on `process.env.CI`:

    ```ts
    webServer: {
      command: process.env.CI ? 'pnpm start' : 'pnpm dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    ```

    Rationale (keep as a brief inline comment above the block, replacing the misleading "CI
    starts the server explicitly" comment):
    "Always boot a local server. In CI, `pnpm build` has already produced `.next/` so `pnpm start`
    is the production-equivalent boot; locally `pnpm dev` keeps HMR. All required env vars
    (`DATABASE_URL`, `AUTH_SECRET`, `OTP_HMAC_KEY`, Turnstile keys, etc.) are inherited from
    the GitHub Actions job-level `env:` block."

    Do NOT modify `.github/workflows/ci.yml` — the existing flow becomes correct once
    Playwright manages the server. Constraint: keep the CI workflow change minimal — the
    contract is "Playwright owns server lifecycle in both modes".

    Do NOT touch any other file. No script changes, no env-var additions, no new dependencies.

    Commit the change as a single atomic commit:
    `fix(ci): playwright always provides webServer (pnpm start in CI, pnpm dev locally)`

    Body should reference: regression introduced in commit 1e37665 / plan 01-12; symptom was
    21 Playwright specs failing with ECONNREFUSED localhost:3000; fix puts server lifecycle
    back under Playwright's control in both modes.
  </action>
  <verify>
    <automated>
      # 1. File-shape check: webServer is unconditional (not gated on `process.env.CI ? undefined`)
      grep -v '^\s*//' playwright.config.ts | grep -c "process.env.CI ? undefined"  # must be 0
      grep -c "command: process.env.CI ? 'pnpm start' : 'pnpm dev'" playwright.config.ts  # must be 1

      # 2. Typecheck still clean
      pnpm typecheck

      # 3. Local end-to-end: simulate CI boot mode against a fresh build.
      #    (Executor: skip if .env.test missing the required keys; that is a developer-machine
      #    setup gap, not a regression. Note skip in commit body.)
      pnpm build
      CI=1 pnpm exec playwright test --project=chromium-desktop --reporter=list

      # 4. After push, confirm the GitHub Actions CI run on the branch is green.
      #    The executor must wait for the run to complete and confirm green before declaring done.
      #    Use: `gh run list --branch <branch> --limit 1` then `gh run view <id>`.
    </automated>
  </verify>
  <done>
    - `playwright.config.ts` `webServer` block is unconditional (never `undefined`); command
      switches on `process.env.CI`.
    - `pnpm typecheck` passes.
    - Local `CI=1 pnpm exec playwright test --project=chromium-desktop` boots the server and
      exits 0 (or skipped with documented env-gap reason — not an undefined-server failure).
    - GitHub Actions `CI` workflow run on the branch completes green (all steps including
      "Playwright smoke" green). The commit SHA of this fix is the green commit.
    - No other files modified.
  </done>
</task>

<task type="auto">
  <name>Task 2: Correct news.* mail2 DKIM checkbox + add Phase 5 deferral note</name>
  <files>.planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md</files>
  <action>
    Three coordinated edits in the same file, single commit.

    **Edit A — line 40 (the inaccurate checkbox):**

    Current (line 40):
    ```
    | DKIM alias 2 | CNAME | `mail2._domainkey.news.chastnik.eu`     | `brevo2._domainkey.news.chastnik.eu`         | [x] added [x] verified  |
    ```

    Replace with:
    ```
    | DKIM alias 2 | CNAME | `mail2._domainkey.news.chastnik.eu`     | `brevo2._domainkey.news.chastnik.eu`         | [ ] added [ ] verified  |
    ```

    (Status column now reads `[ ] added [ ] verified` — both boxes empty.)

    **Edit B — insert a deferral note immediately AFTER the news subdomain DKIM table (after
    line 42, before the blank line that precedes the `### SPF (apex)` heading on line 44):**

    Add the following two lines (preserve a blank line on each side so Markdown renders the
    blockquote cleanly):

    ```
    > **Note (D-Phase5-prep):** `mail2._domainkey.news.chastnik.eu` not yet added — non-blocking for
    > Phase 1 (news.* is the Phase 5 newsletter sender, not the Phase 1 transactional path which
    > uses auth.*). Must be added in Cloudflare DNS before Phase 5 first send. Tracked in STATE.md
    > Deferred Items table with `resolves_phase: 5`.
    ```

    **Edit C — tighten the two downstream references that imply news.* is fully verified:**

    1. Line 106 currently reads:
       ```
       - [ ] Sender domain `news.chastnik.eu` authenticated (newsletter sender; configure in Brevo when Phase 5 ships, DNS already in place)
       ```
       Replace with:
       ```
       - [ ] Sender domain `news.chastnik.eu` authenticated (newsletter sender; configure in Brevo when Phase 5 ships, DNS partially in place — `mail2._domainkey.news` deferred to pre-Phase-5)
       ```

    2. Line 176 (Section F, SC-4) currently reads:
       ```
       - [x] DNS records from Section A all green (DKIM chain ×4 for `auth.chastnik.eu`, ×4 for `news.chastnik.eu`, apex SPF, apex + 2 sub DMARCs)
       ```
       Replace with:
       ```
       - [x] DNS records from Section A all green for the Phase 1 transactional path (DKIM chain ×4 for `auth.chastnik.eu`, ×3 currently for `news.chastnik.eu` — `mail2._domainkey.news` deferred to pre-Phase-5, apex SPF, apex + 2 sub DMARCs)
       ```

    Do NOT touch STATE.md — the orchestrator handles that in step 7. Do NOT touch any other
    file (no ROADMAP change, no Phase 5 plan stub).

    Commit the change as a single atomic commit:
    `docs(phase-01): correct news mail2 DKIM checkbox + add Phase 5 deferral note`

    Body should explain: dig confirms `mail2._domainkey.news.chastnik.eu` not in DNS;
    intentional deferral until before Phase 5 newsletter first send; checklist tightened to
    reflect partial news.* DNS state in three places (table row, Section B follow-up, SC-4
    success criterion).
  </action>
  <verify>
    <automated>
      # 1. The offending line is gone
      grep -c "mail2._domainkey.news.chastnik.eu.*\[x\] added \[x\] verified" \
        .planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md  # must be 0

      # 2. New unchecked row exists
      grep -c "mail2._domainkey.news.chastnik.eu.*\[ \] added \[ \] verified" \
        .planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md  # must be 1

      # 3. Deferral note inserted
      grep -c "D-Phase5-prep" .planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md  # must be 1
      grep -c "resolves_phase: 5" .planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md  # must be 1

      # 4. Section B line 106 tightened
      grep -c "DNS partially in place" .planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md  # must be 1

      # 5. SC-4 SC-4 line tightened (×3 for news, not ×4)
      grep -c "×3 currently for \`news.chastnik.eu\`" \
        .planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md  # must be 1

      # 6. STATE.md not touched in this task
      git diff --name-only HEAD | grep -q "STATE.md" && echo "FAIL: STATE.md was modified" && exit 1 || true

      # 7. DNS reality check (record still intentionally absent)
      dig CNAME mail2._domainkey.news.chastnik.eu +short  # expected: empty output
    </automated>
  </verify>
  <done>
    - Line 40 status column reads `[ ] added [ ] verified` (both unchecked).
    - Deferral note (with `D-Phase5-prep` and `resolves_phase: 5`) appears immediately after
      the news subdomain DKIM table.
    - Line 106 (Section B) and line 176 (Section F SC-4) reflect partial news.* DNS state.
    - `dig CNAME mail2._domainkey.news.chastnik.eu +short` returns empty (record intentionally
      not added — verification is that the document matches reality).
    - STATE.md NOT modified by this task (orchestrator step 7 owns the Deferred Items row).
    - No other files modified.
  </done>
</task>

</tasks>

<verification>
- Both commits are atomic, on the same branch, in order: Task 1 first (CI fix unblocks future
  green-CI gating), Task 2 second (doc correction).
- `pnpm typecheck` passes.
- GitHub Actions CI run on the branch is green for the FIRST time on `main` history (current
  history has zero green runs per problem brief).
- `dig CNAME mail2._domainkey.news.chastnik.eu +short` returns empty AND the checklist now
  matches that reality.
- No drift into adjacent concerns: no edits to ci.yml steps, deploy.yml, package.json, ROADMAP,
  STATE.md, or any other file.
</verification>

<success_criteria>
1. Pushing the branch triggers a CI run that goes green end-to-end (all steps including
   `Playwright smoke (chromium-desktop)`). Operator confirms via `gh run view`.
2. `01-DELIVERABILITY-CHECKLIST.md` no longer contains a falsely-checked DKIM row, AND has a
   forward-pointing deferral note that surfaces the missing record before Phase 5 begins.
3. Two atomic commits exist on the branch: one `fix(ci):` and one `docs(phase-01):`.
4. STATE.md is untouched by the executor (orchestrator updates it in step 7 of the quick
   workflow with the Deferred Items row + quick-task ledger row).
</success_criteria>

<output>
After both tasks complete, the orchestrator's step 6/7 will:
- Write `260502-lhc-SUMMARY.md` in this directory.
- Append a STATE.md row in the quick-tasks ledger.
- Append a STATE.md Deferred Items row tracking the missing `mail2._domainkey.news` CNAME with
  `resolves_phase: 5`.

Executor must NOT pre-empt those writes.
</output>
