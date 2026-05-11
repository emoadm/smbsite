---
phase: 4
slug: user-submissions-editorial-moderation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-10
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Test categories (unit / integration / E2E / manual) are derived from `04-RESEARCH.md` § Validation Architecture; the planner must cite each row's `Test Type` and `Automated Command` in PLAN.md task `<verification>` blocks.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit + integration via `tests/integration/**`) + Playwright (`@playwright/test`) for E2E |
| **Config file** | `vitest.config.ts` (existing — Phase 2/3) + `playwright.config.ts` (existing — Phase 3) |
| **Quick run command** | `pnpm test:unit -- --run --changed` |
| **Full suite command** | `pnpm test && pnpm test:e2e` |
| **Estimated runtime** | ~120s (unit ~15s, integration ~25s, E2E ~80s for Phase 4 surfaces) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit -- --run --changed`
- **After every plan wave:** Run `pnpm test` (unit + integration)
- **Before `/gsd-verify-work`:** `pnpm test && pnpm test:e2e` must be green
- **Max feedback latency:** 120 seconds

---

## Per-Requirement Verification Map

> Mapping is requirement-first; the planner refines this into per-task rows when PLAN.md is written. Each row anchors at minimum one automated verification command.

| Requirement | Behavior | Test Type | Automated Command | Wave 0 Dep |
|-------------|----------|-----------|-------------------|------------|
| PROP-01 | Member can submit a proposal (title, description, topic) | integration | `pnpm vitest run tests/integration/submissions/proposal-create.test.ts` | yes |
| PROP-02 | Approved proposal appears in public catalog and is votable | E2E | `pnpm playwright test e2e/proposals/approved-public-vote.spec.ts` | yes |
| PROP-03 | Member can see status of own submissions only | integration | `pnpm vitest run tests/integration/submissions/owner-isolation.test.ts` | yes |
| PROP-04 | Rejected submission visible only to submitter with moderator note | integration | `pnpm vitest run tests/integration/submissions/rejected-visibility.test.ts` | yes |
| PROB-01 | Member can submit problem report with mandatory level + region tag | integration | `pnpm vitest run tests/integration/problems/report-create.test.ts` | yes |
| PROB-02 | Problem report enters moderation queue (not public) | integration | `pnpm vitest run tests/integration/problems/queue-isolation.test.ts` | yes |
| PROB-03 | Approved problem appears on public heat-map (`/проблеми`) | E2E | `pnpm playwright test e2e/problems/heatmap-density.spec.ts` | yes |
| PROB-04 | Local-level problem requires municipality/region selector | unit | `pnpm vitest run tests/unit/problems/zod-region-required.test.ts` | no |
| PROB-05 | Heat-map suppresses oblasts with insufficient data (D-D2) | unit | `pnpm vitest run tests/unit/problems/density-threshold.test.ts` | no |
| EDIT-03 | Editor can publish/edit agitation pages from admin panel | E2E | `pnpm playwright test e2e/admin/pages-publish.spec.ts` | yes |
| EDIT-04 | Editor can review queue and approve/reject with note | E2E | `pnpm playwright test e2e/admin/moderation-queue.spec.ts` | yes |
| EDIT-05 | Editor can suspend a member account with documented reason | integration | `pnpm vitest run tests/integration/admin/suspend-member.test.ts` | yes |
| EDIT-06 | Editor can send ad-hoc newsletters from admin | manual | (see Manual-Only) | no |
| EDIT-07 | All moderation actions are append-only in moderation_log | integration | `pnpm vitest run tests/integration/admin/moderation-log-immutable.test.ts` | yes |

### Cross-cutting Behavioral Checks

| Behavior | Test Type | Automated Command |
|----------|-----------|-------------------|
| Suspended member is rejected at session validation (auth gate) | integration | `pnpm vitest run tests/integration/auth/suspended-account-gate.test.ts` |
| `moderation_log` rejects UPDATE/DELETE at the DB level | integration | `pnpm vitest run tests/integration/db/moderation-log-revoke.test.ts` |
| Rate-limit (Upstash) trips at threshold for submission Server Actions | integration | `pnpm vitest run tests/integration/rate-limit/submission-burst.test.ts` |
| Cloudflare Turnstile token verified on submit | integration | `pnpm vitest run tests/integration/security/turnstile-verify.test.ts` |
| DSA Article 16 reporting form produces acknowledgement + queue row | E2E | `pnpm playwright test e2e/dsa/notice-and-action.spec.ts` |
| `bg.json` keys for Phase 4 are present and resolved | unit | `pnpm vitest run tests/unit/i18n/phase-04-strings.test.ts` |

---

## Wave 0 Requirements

- [ ] `tests/integration/submissions/` — directory + shared fixtures (member factory, queue seed)
- [ ] `tests/integration/problems/` — directory + density helpers
- [ ] `tests/integration/admin/` — directory + editor/super_editor session helpers
- [ ] `tests/integration/auth/suspended-account-gate.test.ts` — fixture for suspended-status user
- [ ] `tests/integration/db/moderation-log-revoke.test.ts` — verifies `REVOKE UPDATE, DELETE` is in effect on the live DB role
- [ ] `tests/integration/rate-limit/` — Upstash test client (mock or local fakeredis)
- [ ] `tests/integration/security/turnstile-verify.test.ts` — Turnstile mock with success + failure tokens
- [ ] `e2e/admin/moderation-queue.spec.ts` — Payload admin login + role-gate fixture
- [ ] `e2e/proposals/approved-public-vote.spec.ts` — full-flow fixture (submit → approve → vote)
- [ ] `e2e/problems/heatmap-density.spec.ts` — fixture seeds 28 oblasts with deterministic counts
- [ ] `e2e/dsa/notice-and-action.spec.ts` — DSA report submission + email-acknowledgement check
- [ ] Open-license SVG choropleth asset of Bulgaria oblasts at `public/maps/bg-oblasts.svg` (Q2 from research — does not currently exist; sourcing is a Wave 0 task) — referenced by `tests/unit/problems/density-threshold.test.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ad-hoc newsletter actually sends via Brevo and lands in an inbox | EDIT-06 | Sending real email from CI is brittle and risks list contamination. Brevo API call is integration-tested with a mock; the real-send is a one-time human verification. | 1) Login as `editor`. 2) Navigate to Newsletters in Payload admin. 3) Compose a test campaign, address it to a single internal seed-list of 3 internal team addresses (allow-listed in Brevo). 4) Send. 5) Confirm receipt within 10 minutes for ≥2 of 3 inboxes. 6) Document in phase VERIFICATION.md. |
| Visual review of `/проблеми` heat-map gradient on real device | PROB-03 | Color-blind / contrast checks need human eye; CI cannot judge "does the gradient communicate density?" | 1) Open `/проблеми` on a 1920x1080 desktop and a 390x844 mobile. 2) Verify Tier 1–4 colors per UI-SPEC §Color match `--color-secondary` (Tier 1/2) and `--color-primary` (Tier 3/4). 3) Verify `prefers-reduced-motion` disables any tile transitions. 4) Verify suppressed oblasts render with the `Недостатъчно данни` tooltip. |

---

## Validation Sign-Off

- [ ] All tasks have `<verification>` block referencing one of the rows above OR depend on a Wave 0 task
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (SVG asset, role-gate fixtures, immutability test)
- [ ] No watch-mode flags (no `--watch`, no `--ui`)
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter (after Wave 0 lands and per-task rows are filled)

**Approval:** pending — to be set to `approved YYYY-MM-DD` once /gsd-execute-phase Wave 0 completes.
