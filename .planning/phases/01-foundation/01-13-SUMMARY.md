---
phase: 1
plan: 13
subsystem: ops
tags: [email-deliverability, dns, dkim, dmarc, brevo, postmaster-tools, warmup, phase-1-signoff, notif-07]
requires: [10, 11, 12]
provides:
  - phase-1-signoff-checklist-with-5-success-criteria
  - operator-warmup-daily-log-skeleton
  - live-dns-evidence-for-chastnik-eu
  - chained-brevo-dkim-pattern-documented
affects:
  - .planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md
  - .planning/phases/01-foundation/01-WARMUP-LOG.md
tech-stack:
  added: []
  patterns:
    - chained Brevo DKIM CNAMEs (4 records per subdomain — alias×2 + hop×2) replacing the older flat 2-CNAME pattern
    - apex DMARC p=quarantine with rua to coalition Gmail; per-subdomain DMARC p=none with rua to Brevo aggregator
    - explicit apex SPF defensive include (not strictly required by Brevo but added as belt-and-braces)
    - 4-week organic warmup ladder (20→50→150→full) tied to Postmaster Tools "High" reputation gate
    - deferred-items section with resolves_phase targets (so future phases inherit the work without losing it)
key-files:
  created:
    - .planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md
    - .planning/phases/01-foundation/01-WARMUP-LOG.md
  modified: []
key-decisions:
  - "Adapted the plan's flat-DKIM template (mail._domainkey.<sub> CNAME mail._domainkey.brevo.com) to Brevo's actual 2025+ chained pattern (alias CNAMEs point to brevo1/brevo2._domainkey.<sub> which then CNAME to b1/b2.<sub>.dkim.brevo.com). 4 CNAMEs per subdomain, total 8 across auth + news. Verified live via dig before writing."
  - "Apex DMARC rua=mailto:emoadm@gmail.com (coalition operator inbox) — matches the live Cloudflare TXT record. Subdomain DMARCs (auth + news) use rua=mailto:rua@dmarc.brevo.com because Brevo's automated authentication wizard provisions those — coalition does NOT manage them."
  - "Pre-ticked all evidence boxes that were already satisfied at plan start: DNS records (live + verified by dig), Brevo authentication (real test send confirmed Gmail SPF/DKIM/DMARC pass), production deploy (chastnik.eu live), Sentry EU + structured logs, Payload admin bootstrapped. Reduces operator workload to the genuinely-pending items (Postmaster enrollment, warmup execution, restore dry-run, sign-off)."
  - "Documented the bootstrap-admin path actually used in production: src/app/api/admin-bootstrap/route.ts (one-shot HTTP route disabled after first call) instead of the OPS-RUNBOOK §2 fly-ssh approach. The runbook procedure was found to hit the payload@3.84 + next@15.3 loadEnv incompatibility (commits fa4be23, 64a0466). The route-based bootstrap is what shipped; runbook §2 should be updated when patch-package fix lands (deferred item #3)."
  - "Section G enumerates 3 deferred items with explicit resolves_phase targets so they cannot be lost across phase boundaries: (1) GHA environment required-reviewer protection (free-plan limitation) → phase 3, (2) Cloudflare WAF $cloudflare_ip_ranges custom rule (free-plan limitation) → phase 2, (3) Payload loadEnv patch-package fix → phase 2. Each item already has an entry in the standalone deferred-items.md / project todo memory."
  - "Treated Task 1.13.1 (D-17 sender-domain decision) as already resolved per project memory + plan 01-12's fly.toml AUTH_URL substitution. No checkpoint pause; substituted chastnik.eu directly into all Task 1.13.2 artifacts."
  - "Treated Task 1.13.3 (final operator sign-off) as intentionally deferred per orchestrator instructions. The checklist itself contains the sign-off line; the operator follows it across the 4-week warmup window. SUMMARY.md + STATE.md mark Phase 1 code-shipping as complete with operator sign-off pending."
patterns-established:
  - "Pattern: deliverability artifacts as operator-facing English (not user-facing Bulgarian) — D-27's bg-only constraint applies to user-visible strings, not to internal ops documentation."
  - "Pattern: pre-tick evidence checkboxes for criteria already satisfied by upstream plans + leave a clear status block at file bottom listing genuinely-pending items. Reduces operator cognitive load on multi-page checklists."
  - "Pattern: 'Deferred items tracked separately' section with resolves_phase tags as a first-class element of phase-closing artifacts (not just runtime todos), so the operator reading the checklist sees what's intentionally NOT done."
requirements-completed: [NOTIF-07]
duration: ~7 min
completed: 2026-04-30
---

# Phase 1 Plan 13: Email deliverability checklist + warm-up log + Phase 1 sign-off authority Summary

**Phase 1 code-shipping complete; operator sign-off and 4-week warmup execution pending — tracked in `01-DELIVERABILITY-CHECKLIST.md` (sign-off authority) and `01-WARMUP-LOG.md` (daily ops log). DNS records and Brevo authentication for `chastnik.eu` are live and verified (Gmail returns SPF/DKIM/DMARC all-PASS for `no-reply@auth.chastnik.eu`); production deploy is live at https://chastnik.eu; the operator follows the checklist over the next 4 calendar weeks while Phase 2 work begins in parallel.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-01T17:33:01Z
- **Completed:** 2026-05-01T17:40:00Z (approx)
- **Tasks executed:** 1 of 3 (Task 1.13.2 auto)
- **Tasks treated as already-done:** Task 1.13.1 (D-17 / sender-domain decision pre-resolved coalition-side, recorded in project memory + plan 01-12 fly.toml)
- **Tasks intentionally deferred:** Task 1.13.3 (operator sign-off — operator follows the checklist over a ~4-calendar-week warmup window)
- **Files created:** 2 (DELIVERABILITY-CHECKLIST.md, WARMUP-LOG.md)
- **Files modified:** 0

## Accomplishments

- **Task 1.13.1 — pre-resolved.** D-17 / Open Decision #5 / RESEARCH Q2 (sender-domain choice) was confirmed coalition-side as `chastnik.eu` and recorded in project memory at `~/.claude/projects/-Users-emoadm-projects-SMBsite/memory/project_sender_domain.md`. Plan 01-12 already substituted `chastnik.eu` into `fly.toml` `AUTH_URL`. No checkpoint pause was needed.
- **Task 1.13.2 — deliverability checklist + warmup log skeleton.** Created `.planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md` with 8 sections (A: DNS records, B: Brevo configuration, C: Postmaster Tools, D: warmup readiness, E: anti-bot/WAF refresh cadence, F: 5 ROADMAP success criteria SC-1..SC-5, G: deferred items tracked separately, H: closing sign-off). Created `.planning/phases/01-foundation/01-WARMUP-LOG.md` with the 4-week daily-row skeleton (28 days), escalation thresholds table, Postmaster reputation interpretation guide, and operator commit procedure.
- **Task 1.13.3 — intentionally deferred.** Per orchestrator instructions, the final operator sign-off does not block plan completion. The sign-off line is in the checklist itself (Section H); the operator executes the warmup ladder over 4 weeks and signs at the end. Phase 1 code-shipping completes today.

## DNS truth-table (live, verified by dig)

All 11 records below were verified live before writing the checklist:

| Record                                  | Type  | Live value                                  |
| --------------------------------------- | ----- | ------------------------------------------- |
| `mail._domainkey.auth.chastnik.eu`      | CNAME | `brevo1._domainkey.auth.chastnik.eu`        |
| `mail2._domainkey.auth.chastnik.eu`     | CNAME | `brevo2._domainkey.auth.chastnik.eu`        |
| `brevo1._domainkey.auth.chastnik.eu`    | CNAME | `b1.auth-chastnik-eu.dkim.brevo.com`        |
| `brevo2._domainkey.auth.chastnik.eu`    | CNAME | `b2.auth-chastnik-eu.dkim.brevo.com`        |
| `mail._domainkey.news.chastnik.eu`      | CNAME | `brevo1._domainkey.news.chastnik.eu`        |
| `mail2._domainkey.news.chastnik.eu`     | CNAME | `brevo2._domainkey.news.chastnik.eu`        |
| `brevo1._domainkey.news.chastnik.eu`    | CNAME | `b1.news-chastnik-eu.dkim.brevo.com`        |
| `brevo2._domainkey.news.chastnik.eu`    | CNAME | `b2.news-chastnik-eu.dkim.brevo.com`        |
| `chastnik.eu`                           | TXT   | `v=spf1 include:spf.brevo.com ~all`         |
| `_dmarc.chastnik.eu`                    | TXT   | `v=DMARC1; p=quarantine; rua=mailto:emoadm@gmail.com; pct=100; adkim=s; aspf=s` |
| `_dmarc.auth.chastnik.eu`               | TXT   | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |
| `_dmarc.news.chastnik.eu`               | TXT   | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |

The plan template assumed flat DKIM (`mail._domainkey.auth.<sender-domain>` → `mail._domainkey.brevo.com`); Brevo's 2025+ wizard issues chained CNAMEs instead, with each of the two DKIM aliases pointing to an intermediate `brevo[12]._domainkey.<sub>` hop that then resolves to the per-domain Brevo signer. The checklist documents this honestly so a future operator running `dig` against the records doesn't think they're misconfigured.

## Brevo smoke test (already passed)

A real transactional email was sent from `no-reply@auth.chastnik.eu` to `emoadm@gmail.com` before this plan ran. Gmail's authentication panel showed all three checks PASS:

```
spf=PASS
dkim=PASS dkim_domain=auth.chastnik.eu
dmarc=PASS
```

Landed in the Promotions tab (acceptable for warmup phase; Section D warmup activity will move it to the Primary tab as engagement signals accumulate). Cyrillic body rendered without artifacts.

## Production deploy (already live)

`https://chastnik.eu` is reachable, served from Fly.io Frankfurt origin via Cloudflare Sofia edge. Sentry EU DSN active (verified by `verify-eu-dsn` job per plan 01-12). Structured pino JSON logs shipping to Better Stack EU per plan 01-11. Payload admin user bootstrapped (id 2, email `emoadm@gmail.com`); the `/api/admin-bootstrap` route used to create that admin is now disabled.

## Task Commits

1. **Task 1.13.2: deliverability checklist + warmup log** — `7c51d43` (docs)

(Tasks 1.13.1 and 1.13.3 produced no commits — see "Tasks executed" above.)

**Plan tracking commit:** added in the final commit below (SUMMARY.md + STATE.md + ROADMAP.md).

## Files Created/Modified

**Created:**
- `.planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md` — 8-section operator checklist (A: DNS, B: Brevo, C: Postmaster, D: warmup, E: refresh cadence, F: 5 success criteria, G: deferred items, H: sign-off). All `<sender-domain>` placeholders interpolated to `chastnik.eu`. DNS section reflects actual chained Brevo CNAME structure (not the plan template's flat structure). Apex DMARC line uses `emoadm@gmail.com` for `rua=`. Pre-ticked items match what's already shipped (DNS, Brevo authentication, production deploy, Sentry, logs, Payload admin).
- `.planning/phases/01-foundation/01-WARMUP-LOG.md` — 4-week skeleton (28 daily rows across 4 weekly sections), trigger-thresholds table (bounce >2%, complaint >0.1%, Postmaster Low/Bad, etc.), Postmaster reputation interpretation guide, daily logging procedure.

**Modified:** none.

## Decisions Made

See `key-decisions` in frontmatter. Most notable:

- **Chained DKIM documented honestly.** Brevo's plan-template-era flat CNAMEs no longer apply; the 4-record-per-subdomain chained structure is now standard. The checklist matches reality so `dig` outputs at verification time look correct to the operator.
- **Apex DMARC rua to operator Gmail.** The coalition runs DMARC reports through `emoadm@gmail.com` (coalition operator inbox), not through Brevo's aggregator. Subdomain DMARCs (Brevo-managed by the wizard) keep their default `rua@dmarc.brevo.com`.
- **Pre-ticked already-satisfied evidence.** Phase 1's earlier plans already shipped the DNS, Brevo auth, production deploy, Sentry EU, structured logs, and Payload admin bootstrap. The checklist credits that work explicitly so the operator's pending list is honest.
- **3 deferred items called out in Section G with `resolves_phase` tags** so they cannot be lost across phase boundaries: (1) GHA environment required-reviewer protection → phase 3, (2) Cloudflare WAF custom rule for non-CF origin blocking → phase 2, (3) Payload loadEnv patch-package fix → phase 2.
- **Bootstrap-admin route deviation noted.** Production bootstrap used `src/app/api/admin-bootstrap/route.ts` (per plan 01-04 fix `fa4be23`) instead of the OPS-RUNBOOK §2 fly-ssh procedure, because the runbook procedure hits the payload@3.84+next@15.3 loadEnv incompatibility. This is a known issue with a deferred patch-package fix.

## Deviations from Plan

- **Adapted DNS template structure to live reality.** Plan template assumed flat 2-CNAME-per-subdomain; live Brevo provisioning issues 4-CNAME chained pattern. Documented the actual structure with verification commands that match. (Rule 1 — bug in the template's source assumptions, not in any code.)
- **DMARC apex rua differs from plan template.** Plan template uses `dmarc-reports@<sender-domain>`; coalition uses `emoadm@gmail.com` (live in Cloudflare TXT). Substituted live value. (Rule 1 — accuracy fix.)
- **Pre-ticked evidence boxes that were already satisfied.** Plan template left every box empty. Pre-ticked the items the operator would otherwise have to re-verify by reading earlier plan summaries. (Rule 2 — operator UX correctness.)
- **Added Section G "Deferred items tracked separately"** beyond the plan's template. Three known-deferred items would otherwise look like missing work to a future reviewer of the checklist. (Rule 2 — auditability correctness.)
- **Documented the bootstrap-admin route deviation** in this SUMMARY (key-decisions block). The OPS-RUNBOOK §2 procedure that the plan references doesn't actually work with the current payload+next versions; the production deploy used a one-shot API route instead. Flagging here so a future plan that touches OPS-RUNBOOK §2 knows to update it.
- **Task 1.13.1 not paused as a checkpoint.** D-17 was already resolved coalition-side (project memory + plan 01-12). Treated as pre-done per orchestrator instructions.
- **Task 1.13.3 not executed.** Final operator sign-off intentionally deferred per orchestrator instructions; the operator follows the checklist over a 4-week warmup window in parallel with Phase 2 development. Plan completion does not block on operator wall-clock time.

## Issues Encountered

None during execution. All artifacts produced, all verification gates passed.

## Self-Check

**Created files exist:**
- `.planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md` — FOUND
- `.planning/phases/01-foundation/01-WARMUP-LOG.md` — FOUND

**Commits exist (verified via `git log --oneline`):**
- `7c51d43` Task 1.13.2 — FOUND

**Verification gates:**
- Plan-stated `<verify><automated>` block executed and printed `PASS: all verification gates satisfied`
- All `<sender-domain>` placeholders eliminated; checklist + warmup log use `chastnik.eu` throughout (grep confirms zero `<sender-domain>` literal in either file)
- DNS section matches live `dig` output (4 CNAMEs per subdomain, chained pattern)
- Apex DMARC `rua=` matches live record (`emoadm@gmail.com`)
- Section G enumerates the 3 deferred items called out in orchestrator runtime notes
- No file deletions in commit `7c51d43`
- No new untracked artifacts (`git status --short` shows only the pre-existing `?? CLAUDE.md`)

## Self-Check: PASSED

## Next Phase Readiness

**Phase 1 code-shipping complete.** All 13 plans have shipped their code/infrastructure/documentation deliverables. The remaining Phase 1 work is operator-time-bound (4-week warmup + final sign-off) and runs in parallel with Phase 2 development per `01-CONTEXT.md` decision D-18 and orchestrator runtime notes.

**Phase 2 (Public Surface + Attribution) is unblocked from a code-shipping perspective.** The only Phase 2 dependency on Phase 1 sign-off is the QR mail-drop launch — which is itself gated on the warmup completion and the 3 deferred items in Section G (Cloudflare paid plan for WAF custom rule, GHA env protection, Payload loadEnv patch). Phase 2 development work can begin immediately.

**Operator's pending list (parallel work):**
1. Add `auth.chastnik.eu` to Postmaster Tools v2 → verify via TXT record
2. Assemble the 50-200-person internal warmup list (≥10 Gmail, ≥5 Abv.bg)
3. Kick off Week 1 of warmup (20 sends/day via real `/register` flow)
4. Update `01-WARMUP-LOG.md` daily
5. Verify `01-DELIVERABILITY-CHECKLIST.md` SC-4 + SC-5 evidence boxes that need actual production hits (Postmaster data, restore dry-run, first nightly backup)
6. Sign Section H at the bottom of the checklist when all unchecked boxes are ticked

## Threat Flags

None new. All threats from the plan's `<threat_model>` are mitigated:

- **T-13-late-domain-decision** — pre-resolved coalition-side; checklist locks `chastnik.eu` throughout.
- **T-13-dmarc-too-strict-too-soon** — apex `p=quarantine` is the current state; Section A explicitly requires Postmaster "High" reputation before week-4 escalation to `p=reject`.
- **T-13-warmup-burst-flag** — Section D enforces D-18 cadence (20→50→150→full). Daily log monitors thresholds; bounce >2% pauses warmup.
- **T-13-synthetic-warmup-detected** — Section D explicitly requires real `/register` flow; rejects Mailwarm/Warmup Inbox by name.
- **T-13-abv-bg-deliverability-miss** — Section D requires ≥5 Abv.bg addresses in week 1; warmup log Abv.bg threshold is >5% bounces.
- **T-13-postmaster-data-empty** — Section D requires ≥10 Gmail addresses in week 1; at 20 sends/day this crosses Postmaster's 100/day threshold by ~day 5.

---
*Phase: 01-foundation*
*Completed: 2026-04-30*
