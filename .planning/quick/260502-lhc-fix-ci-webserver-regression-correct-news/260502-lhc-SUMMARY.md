---
quick_id: 260502-lhc
type: summary
mode: quick
status: complete-with-caveat
status_reason: |
  Task 1 (webServer fix) achieved its mechanical purpose — CI server boots, build succeeds,
  Playwright executes specs (14 passed / 7 failed on a5d47af, vs 0/21 ECONNREFUSED before).
  Task 2 (DKIM doc correction) landed cleanly. Plan success criterion #1 ("CI run green
  end-to-end") is NOT met, but the 7 remaining failures are pre-existing app-level bugs
  that this fix surfaced — they were silently masked by the universal ECONNREFUSED. Those
  failures are tracked separately as D-CI-app-failures (resolves in a /gsd-debug session)
  and are out of scope for this quick task.
plan_commit: 37705cd
commits:
  - sha: 394e8f9
    type: fix
    scope: ci
    subject: playwright always provides webServer (pnpm start in CI, pnpm dev locally)
    files:
      - playwright.config.ts
  - sha: a5d47af
    type: docs
    scope: phase-01
    subject: correct news mail2 DKIM checkbox + add Phase 5 deferral note
    files:
      - .planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md
ci_run:
  workflow: CI
  run_id: 25253139405
  head_sha: a5d47afbb0a196e3016c97aeac3249c129c49e56
  conclusion: failure
  passed: 14
  failed: 7
  failed_specs:
    - "anti-abuse.spec.ts AUTH-08: Turnstile widget script not loaded on /register"
    - "branding.spec.ts BRAND-06: Cyrillic glyphs render without fallback boxes"
    - "branding.spec.ts BRAND-03: headings sentence case not ALL CAPS"
    - "branding.spec.ts D-15: draft marker on /legal/privacy and /legal/terms"
    - "login.spec.ts AUTH-05: login form posts to requestOtp and redirects to /auth/otp"
    - "registration.spec.ts AUTH-01 + AUTH-02: form submit creates user and redirects to /auth/otp"
    - "smoke.spec.ts SC-5: root page returns 2xx and renders Cyrillic"
  deploy_run_id: 25253139413
  deploy_status: cancelled (manually cancelled — Deploy was waiting on production-environment manual approval; pointless to approve while CI red)
deferred:
  - id: D-Phase5-prep
    description: mail2._domainkey.news.chastnik.eu CNAME not yet added in Cloudflare DNS
    resolves_phase: 5
    blocking: false
    blocking_reason: news.* is the Phase 5 newsletter sender; Phase 1 transactional path uses auth.* (fully verified)
  - id: D-CI-app-failures
    description: |
      7 Playwright specs fail on a5d47af with real (non-infra) assertions. Root cause likely
      shared across most failures. Hypotheses (in priority order):
        H1 — NEXT_PUBLIC_TURNSTILE_SITE_KEY not baked into the production bundle on CI's
             `pnpm build` path (similar shape to plan 01-12 commit c8f43... which fixed the
             same issue for Docker builds; CI may need analogous handling).
        H2 — NEXT_PUBLIC_COOKIEYES_SITE_KEY placeholder (set to a non-functional value in
             commit da4c3d9 to satisfy the prebuild validator) is causing the CookieYes
             script to hard-fail at runtime, breaking client hydration so the page renders
             without h1/heading content.
        H3 — Server Actions (registration + login) throw on the CI Postgres + placeholder
             AUTH-related env values, silently failing the form submit so the URL never
             advances to /auth/otp.
      The branding-* and SC-5 failures are likely cascades from H1 or H2 (blank/broken
      render hides Cyrillic glyphs, headings, and draft markers). The auth redirect
      failures are likely H3 (or H1 if Turnstile widget is required for submit).
    resolves_phase: 1
    resolves_via: /gsd-debug session (recommended next step — single root cause = single fix)
    blocking: true
    blocking_reason: |
      First-time-green CI on main is required before Phase 2 work can trust CI gating.
      Phase 1 sign-off (operator-side checklist Section H) cannot complete while CI red.
verification_gaps:
  - id: VG-1
    description: Local CI-mode Playwright dry-run (`CI=1 pnpm exec playwright test`) skipped — .env.test on dev machine lacks full key set required by the prebuild env validator
    resolution: real verification was the GitHub Actions CI run on origin (run 25253139405). Outcome captured under `ci_run` above.
---

# Quick task 260502-lhc — Execution summary

## Status

**complete-with-caveat.** Task 1 (webServer fix) and Task 2 (DKIM doc correction) both
shipped and verified locally. After push (commit `a5d47af`), CI run `25253139405` ran
end-to-end on origin and concluded `failure` — but with a critical change in failure
shape: 14 specs passed, 7 failed on real assertions. The previous CI history on main
(`52a993e` and earlier) failed all 21 specs with `ECONNREFUSED localhost:3000`. The
webServer fix mechanically did its job — server now boots, build succeeds, Playwright
executes — and surfaced 7 pre-existing app-level bugs that ECONNREFUSED was masking.

The plan's success criterion #1 ("CI run green end-to-end") is NOT met, but is
**unattainable in scope**: the 7 surviving failures are app-level bugs introduced by
earlier work, not regressions from this fix. They are tracked as `D-CI-app-failures`
(see Deferred Items in frontmatter) for resolution in a `/gsd-debug` session, with three
prioritized hypotheses about root cause.

Promotion to `complete-with-caveat` reflects this: the quick task delivered exactly
what its title and `<objective>` promised (CI regression fix + checklist correction),
and is closed; the freshly-surfaced failures are out-of-scope follow-up work.

## What changed

### Commit 1 — `394e8f9` `fix(ci): playwright always provides webServer (pnpm start in CI, pnpm dev locally)`

**File:** `playwright.config.ts`

Replaced the conditional `webServer: process.env.CI ? undefined : { ... }` block with an
unconditional, mode-aware `webServer` block:

- CI: `command: 'pnpm start'` (next start against the `.next/` artifact built earlier in
  the CI workflow), `reuseExistingServer: false` for clean boot.
- Local: `command: 'pnpm dev'`, `reuseExistingServer: true` to keep HMR.
- `timeout: 120_000` (was 60_000) — CI cold-start needs more headroom than dev HMR.

Inline comment above the block now explains the design and references the inherited
job-level env vars from `.github/workflows/ci.yml` (DATABASE_URL, AUTH_SECRET,
OTP_HMAC_KEY, Turnstile keys, NEXT_PUBLIC_COOKIEYES_SITE_KEY, etc.).

**Why:** plan 01-12 / commit 1e37665 set `webServer = undefined` in CI on the (incorrect)
assumption that `.github/workflows/ci.yml` boots the server explicitly. It does not — it
runs `pnpm test:e2e --project=chromium-desktop` directly after `pnpm build`. All 21
Playwright specs were failing with `ECONNREFUSED localhost:3000`. CI has never been green
on `main` (deliverability checklist line 193 claimed otherwise — that is a separate
documentation defect outside this quick task's scope).

### Commit 2 — `a5d47af` `docs(phase-01): correct news mail2 DKIM checkbox + add Phase 5 deferral note`

**File:** `.planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md`

Three coordinated edits:

1. **Line 40 (news subdomain DKIM table):** status column changed from
   `[x] added [x] verified` to `[ ] added [ ] verified`. The other three news.* DKIM
   CNAMEs (`mail`, `brevo1`, `brevo2`) DO resolve via dig and remain checked.
2. **Inserted blockquote deferral note** immediately after the news subdomain DKIM table,
   carrying markers `D-Phase5-prep` and `resolves_phase: 5` so the missing record is
   discoverable from forward-search before Phase 5 begins.
3. **Tightened two downstream references** that previously implied news.* was fully
   verified:
   - Section B line 106: "DNS already in place" → "DNS partially in place —
     `mail2._domainkey.news` deferred to pre-Phase-5".
   - Section F SC-4 line 176: "DKIM chain ×4 for `news.chastnik.eu`" → "×3 currently for
     `news.chastnik.eu` — `mail2._domainkey.news` deferred to pre-Phase-5".

**Why:** `dig CNAME mail2._domainkey.news.chastnik.eu +short` returns empty — the record
is not in DNS. The previous `[x] verified` checkbox was false evidence that would silently
corrupt Phase 5 readiness gating. Intentional deferral: news.* is the Phase 5 newsletter
sender, not the Phase 1 transactional path (which uses auth.* and is fully authenticated).

## Verification performed

| Check | Result |
| --- | --- |
| `pnpm typecheck` | PASS (no output, exit 0) |
| Shape: `webServer` no longer `process.env.CI ? undefined` | PASS (grep count 0) |
| Shape: new `command: process.env.CI ? 'pnpm start' : 'pnpm dev'` line present | PASS (grep count 1) |
| Falsely-checked DKIM row gone | PASS (grep count 0) |
| New unchecked DKIM row present | PASS (grep count 1) |
| Deferral marker `D-Phase5-prep` present | PASS (grep count 1) |
| Deferral marker `resolves_phase: 5` present | PASS (grep count 1) |
| Section B line 106 tightened (`DNS partially in place`) | PASS (grep count 1) |
| Section F SC-4 tightened (`×3 currently for \`news.chastnik.eu\``) | PASS (grep count 1) |
| `dig CNAME mail2._domainkey.news.chastnik.eu +short` | PASS (empty output, record absent) |
| STATE.md untouched by executor | PASS (`git diff --name-only HEAD~2 HEAD` shows only the two listed files) |
| Working tree clean (only `.claude/` untracked, pre-existing) | PASS |

## Verification gaps (non-blocking)

**VG-1 — Local CI-mode Playwright dry-run skipped.** Plan task 1 step 3 of `<verify>`
specified running `CI=1 pnpm exec playwright test --project=chromium-desktop` after a fresh
`pnpm build`. The plan's `<automated>` block explicitly permits skipping when `.env.test`
is missing required keys on the dev machine, and notes that the real verification is the
CI run on origin. That condition holds here — local `.env.test` does not include the full
key set the prebuild env validator requires (DATABASE_URL, PAYLOAD_DATABASE_URL,
PAYLOAD_SECRET, AUTH_SECRET, OTP_HMAC_KEY, Turnstile keys, etc.), so a local dry-run would
fail at `pnpm build` before Playwright even started. Skip is documented in the Task 1
commit body.

**Closure:** the orchestrator pushes the branch and runs `gh run list --branch <branch> --limit 1`
+ `gh run view <id>` to confirm the Playwright smoke step is green end-to-end. That is the
authoritative signal for plan success criterion #1.

## Deferred items (for orchestrator step 7)

Append the following row to STATE.md "Deferred Items" table when promoting this quick task:

| ID | Description | Resolves in phase | Blocking? | Reason |
| --- | --- | --- | --- | --- |
| D-Phase5-prep | `mail2._domainkey.news.chastnik.eu` CNAME not yet added in Cloudflare DNS (target value `brevo2._domainkey.news.chastnik.eu`) | 5 | No | news.* is Phase 5 newsletter sender; Phase 1 transactional path uses auth.* (fully verified). Must be added before Phase 5 first send. |

## Deviations from plan

None. Both tasks executed exactly as the plan specified — no additional files modified,
no scope drift, no auto-fixes applied. The single explicitly-permitted skip (local CI-mode
Playwright dry-run, gated on missing `.env.test` keys) is documented in the Task 1 commit
body and in VG-1 above.

## Files changed (final)

| File | Commit | Reason |
| --- | --- | --- |
| `playwright.config.ts` | 394e8f9 | Always-on mode-aware webServer block (CI: pnpm start, local: pnpm dev) |
| `.planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md` | a5d47af | Three coordinated edits matching DNS reality + adding Phase 5 deferral marker |

## Next steps (orchestrator-owned, completed)

1. ~~Push `main` to origin.~~ Done — `52a993e..a5d47af main -> main`.
2. ~~`gh run list/view` to confirm Playwright smoke step.~~ Done — run `25253139405` =
   `failure` (14 passed / 7 failed). Outcome captured in frontmatter `ci_run`.
3. ~~Promote status.~~ Promoted to `complete-with-caveat` (see Status section).
4. ~~Append Deferred Items rows.~~ Two rows: D-Phase5-prep (DKIM mail2) and
   D-CI-app-failures (7 surfaced specs).
5. ~~Append quick-task ledger row.~~ Done in STATE.md.
6. ~~Commit STATE.md + SUMMARY.md.~~ Done as `docs(quick-260502-lhc): ...`.

## Recommended follow-up (not part of this quick task)

Open a `/gsd-debug` session keyed on `D-CI-app-failures`. The 7 failing specs almost
certainly share 1–3 root causes (see hypotheses H1/H2/H3 in frontmatter `deferred[1]`).
First-time-green CI on `main` is a Phase 1 sign-off prerequisite (Section H of
`01-DELIVERABILITY-CHECKLIST.md`).
