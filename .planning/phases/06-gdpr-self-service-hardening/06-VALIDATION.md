---
phase: 06
slug: gdpr-self-service-hardening
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-15
plan_count: 15
---

# Phase 06 — Validation Strategy

Per-phase validation contract for feedback sampling during execution.

Sampling continuity is established by Plan 06-01 (Wave 0). Every Wave 1..4 plan
verification surface has a corresponding test scaffold landed before the
production code that fills it.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (unit)** | Vitest 2.1.8 (existing) |
| **Framework (E2E)** | Playwright 1.49.1 (existing) |
| **Framework (a11y)** | @axe-core/playwright 4.11.3 (installed in Plan 06-12) |
| **Framework (load)** | k6 (Hetzner runner, external; Plan 06-14) |
| **Config files** | `vitest.config.ts`, `playwright.config.ts`, `.lighthouserc.json` |
| **Quick run command** | `pnpm test:unit` |
| **Full suite command** | `pnpm test:unit && pnpm exec playwright test tests/e2e/a11y --project=chromium-desktop` |
| **a11y-only command** | `pnpm exec playwright test tests/e2e/a11y --project=chromium-desktop` |
| **Estimated runtime (unit)** | ~30s |
| **Estimated runtime (a11y E2E, 8 specs)** | ~2-4 min |

---

## Sampling Rate

- **After every task commit:** `pnpm test:unit` (Vitest, < 30s)
- **After every plan wave merge:** `pnpm test:unit` + `pnpm exec playwright test tests/e2e/a11y tests/e2e/data-rights --reporter=line` (~3-5min)
- **Before `/gsd:verify-work`:** Full suite green + Lighthouse PR green
- **Phase ship:** Full suite green + 4 operator-signed gate documents (DDL-APPLY, A11Y-AUDIT, OPS-RUNBOOK, LOAD-TEST-RUN)
- **Max feedback latency:** ~30s for unit tests; ~5min for full a11y + data-rights E2E

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 0 | — | T-06-01-01 | Test scaffolding (no runtime) | unit | `pnpm test:unit` | ❌ W0 creates | ⬜ pending |
| 06-01-02 | 01 | 0 | — | — | Playwright spec discovery | E2E listing | `pnpm exec playwright test --list` | ❌ W0 creates | ⬜ pending |
| 06-01-03 | 01 | 0 | — | — | VALIDATION map populated | docs | `grep -c 'nyquist_compliant: true' 06-VALIDATION.md` | ❌ W0 creates | ⬜ pending |
| 06-02-01 | 02 | 1 | GDPR-04/05/07/08 | T-06-02-01..06 | DDL idempotent + REVOKEs | source-grep | `grep -c 'REVOKE' src/db/migrations/0004_phase06_gdpr_hardening.sql` | ❌ W0 creates | ⬜ pending |
| 06-02-02 | 02 | 1 | — | T-06-02-05 | Operator apply gate sign-off | manual | (operator fills 06-DDL-APPLY.md) | ❌ W0 creates | ⬜ pending |
| 06-03-01 | 03 | 1 | GDPR-07/08 | T-06-03-01/02 | Drizzle schema mirror + no-PII | unit | `pnpm test:unit -- deletion-log-schema cookie-consents-schema` | ❌ W0 stubs | ⬜ pending |
| 06-03-02 | 03 | 1 | — | — | users + consents column extensions | typecheck | `pnpm typecheck` | ✅ baseline | ⬜ pending |
| 06-04-01 | 04 | 2 | GDPR-04 | T-06-04-01..06 | Bunny signed-URL known-good vector | unit | `pnpm test:unit -- bunny-signed-url` | ❌ W0 stub | ⬜ pending |
| 06-05-01 | 05 | 2 | GDPR-04 | T-06-05-01..07 | Bundle shape + format_version | unit | `pnpm test:unit -- export-bundle-shape` | ❌ W0 stub | ⬜ pending |
| 06-05-02 | 05 | 2 | GDPR-04 | — | Email render plainText regression | unit | `pnpm test:unit -- email-worker-text-content` | ✅ existing | ⬜ pending |
| 06-06-01 | 06 | 2 | GDPR-05/06/07/08 | T-06-06-01..08 | Cascade order + tx boundary | unit (source-grep) | `pnpm test:unit -- deletion-cascade` | ❌ W0 stubs | ⬜ pending |
| 06-06-02 | 06 | 2 | GDPR-07 | T-06-06-04 | Boot-time has_table_privilege assertion | unit | `pnpm test:unit -- start-worker-deletion-log-assertion` | ❌ W0 stubs | ⬜ pending |
| 06-06-03 | 06 | 2 | — | — | users-no-delete grep guard | unit | `pnpm test:unit -- users-no-delete` | ❌ W0 creates (passing) | ⬜ pending |
| 06-07-01 | 07 | 3 | GDPR-04/05 | T-06-07-01..06 | Zod typed-confirm + rate-limit | unit | `pnpm test:unit -- data-rights-zod data-rights-rate-limits` | ❌ new in 06-07 | ⬜ pending |
| 06-07-02 | 07 | 3 | — | — | 0004 amendment (export_requested_at) | source-grep | `grep -c 'export_requested_at' src/db/migrations/0004_phase06_gdpr_hardening.sql` | ❌ amended in 06-07 | ⬜ pending |
| 06-08-01 | 08 | 3 | GDPR-04 | T-06-08-01..03 | DataRightsCard renders on /member/preferences | E2E (fixme) | `pnpm exec playwright test export-request.spec.ts` | ❌ W0 stub | ⬜ pending (fixme) |
| 06-09-01 | 09 | 3 | D-09 / GDPR-09 | T-06-09-01..05 | /api/cookie-consent route invariants | unit (source-grep) | `pnpm test:unit -- cookie-consent-route cookie-consents-schema consents-region-populate` | ❌ W0 stubs | ⬜ pending |
| 06-10-01 | 10 | 3 | GDPR-05 | T-06-10-01..05 | Typed-confirm + grace lockout E2E | E2E (fixme) | `pnpm exec playwright test deletion-typed-text.spec.ts grace-period-lockout.spec.ts` | ❌ W0 stubs | ⬜ pending (fixme) |
| 06-11-01 | 11 | 3 | GDPR-05 | T-06-11-01..04 | Cancel-deletion OTP E2E | E2E (fixme) | `pnpm exec playwright test cancel-deletion.spec.ts` | ❌ W0 stub | ⬜ pending (fixme) |
| 06-12-01 | 12 | 4 | BRAND-04 | T-06-12-01/02 | axe-core 6 core flows pass WCAG 2.1 AA | E2E | `pnpm exec playwright test tests/e2e/a11y/` | ❌ W0 stubs | ⬜ pending |
| 06-12-02 | 12 | 4 | BRAND-04 | — | Lighthouse CI accessibility ≥ 0.95 | CI | `.github/workflows/lighthouse.yml` | ✅ extended | ⬜ pending |
| 06-12-03 | 12 | 4 | BRAND-04 | — | 06-A11Y-AUDIT.md operator sign-off | manual | (operator fills) | ❌ Plan 06-12 creates | ⬜ pending |
| 06-13-01 | 13 | 4 | BRAND-05 | — | VideoPlayer vttSrc renders track | unit | `pnpm test:unit -- video-player-vtt` | ❌ W0 stubs | ⬜ pending |
| 06-13-02 | 13 | 4 | — | T-06-13-01..03 | deploy.yml Cloudflare purge step | source-grep | `grep -c 'purge_cache' .github/workflows/deploy.yml` | ❌ Plan 06-13 creates | ⬜ pending |
| 06-13-03 | 13 | 4 | — | — | 06-OPS-RUNBOOK.md operator sign-offs (6 sections) | manual | (operator fills) | ❌ Plan 06-13 creates | ⬜ pending |
| 06-14-01 | 14 | 4 | — | T-06-14-01..03 | k6 load-test thresholds pass on staging | external (Hetzner) | `k6 run phase6-extension.js` | ❌ Plan 06-14 creates | ⬜ pending |
| 06-14-02 | 14 | 4 | GDPR-05/06 | — | Art.17(3) erasure balancing test draft | manual (counsel review) | (D-LawyerTrack — outside Phase 6) | ❌ Plan 06-14 creates | ⬜ pending |
| 06-15-01 | 15 | 4 | all | T-06-15-01 | Phase verification doc + STATE/ROADMAP updates | docs | `grep -c '✅' 06-VERIFICATION.md` | ❌ Plan 06-15 creates | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

(All authored by Plan 06-01.)

- [ ] `tests/unit/deletion-log-schema.test.ts` — REVOKE + no-PII + boot-assertion stubs
- [ ] `tests/unit/deletion-cascade.test.ts` — 11 cascade-step source-grep stubs
- [ ] `tests/unit/export-bundle-shape.test.ts` — 5 JSON shape stubs
- [ ] `tests/unit/bunny-signed-url.test.ts` — 5 signing-vector stubs
- [ ] `tests/unit/cookie-consents-schema.test.ts` — 4 schema + anon_id stubs
- [ ] `tests/unit/consents-region-populate.test.ts` — 2 GeoIP populate stubs
- [ ] `tests/unit/video-player-vtt.test.ts` — 3 VTT subtitle stubs
- [ ] `tests/unit/start-worker-deletion-log-assertion.test.ts` — 3 boot-assert stubs
- [ ] `tests/unit/users-no-delete.test.ts` — grep guard (runs as passing immediately, NOT skipped)
- [ ] `tests/e2e/a11y/*.spec.ts` × 8 — 1 stub per spec
- [ ] `tests/e2e/data-rights/*.spec.ts` × 4 — N stubs per spec per UI flow

Framework install: none in Wave 0. `@axe-core/playwright@4.11.3` lands in Plan 06-12 Wave 4.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bunny Storage Zone region = EU (Falkenstein) | GDPR-09 | App cannot enforce CDN region; relies on operator config in Bunny dashboard | 06-OPS-RUNBOOK.md §1 — operator confirms primary region |
| Cloudflare API token + zone ID secrets configured | D-15 | GH Actions secrets; cannot read programmatically from code | 06-OPS-RUNBOOK.md §2 — operator sets + confirms |
| Brevo API key `contacts:delete` scope | GDPR-06 | Brevo dashboard config | 06-OPS-RUNBOOK.md §3 — operator manual smoke |
| CookieYes HMAC outcome | T-06-09-01 | CookieYes dashboard config + decision recording | 06-OPS-RUNBOOK.md §5 — yes/no + details |
| D-CookieVaryCacheRule A1 verification | D-16 | Prod curl probe against Cloudflare cache headers | 06-OPS-RUNBOOK.md §6 — verified/falsified |
| Day-30 cascade end-to-end smoke | GDPR-05/06 | Time-based behavior; cannot fully unit-test | Operator runs staging fixture: create user → request-deletion → fast-forward BullMQ job delay → verify tombstone + Brevo DELETE called |
| 06-A11Y-AUDIT.md critical+serious fixes shipped | BRAND-04 | Findings non-deterministic; operator must inspect axe JSON + confirm coverage | 06-A11Y-AUDIT.md — operator fills commit SHAs + sign-off |
| 06-LOAD-TEST-RUN.md thresholds passed | D-14 | k6 run on Hetzner runner against staging; cleanup checklist | 06-LOAD-TEST-RUN.md — operator fills + signs |
| D-LawyerTrack — privacy-policy text counsel review | GDPR-05/06 | Counsel review out-of-scope for Phase 6 ship; launch-activation blocker | `.planning/legal/erasure-balancing-test.md` — counsel signs separately |
| D-CoalitionVideoSubtitles — actual .vtt files | BRAND-05 | Coalition content delivery | Coalition delivers; replaces `public/demo.vtt` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 (Plan 06-01) covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (unit) / < 5min (E2E + a11y)
- [ ] `nyquist_compliant: true` set in frontmatter (above)

**Approval:** pending Plan 06-01 ship + operator confirmation of test scaffolds running clean.
