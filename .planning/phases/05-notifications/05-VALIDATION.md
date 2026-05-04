---
phase: 5
slug: notifications
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit + integration), Playwright (E2E) — already installed |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `pnpm test:unit` |
| **Full suite command** | `pnpm test && pnpm test:e2e` |
| **Estimated runtime** | ~60s unit, ~3min E2E |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit -- <relevant test file>`
- **After every plan wave:** Run `pnpm test` (all unit + integration)
- **Before `/gsd-verify-work`:** Full suite (`pnpm test && pnpm test:e2e`) must be green
- **Max feedback latency:** 60 seconds for unit, 5 minutes for full suite

---

## Per-Task Verification Map

> Populated by gsd-planner during plan-phase. Each task references a test in this map.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | NOTIF-XX | T-05-XX | TBD | unit / integration / E2E | TBD | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> Files that must exist before any task in Wave 1 can produce a green run. Populated from RESEARCH.md Validation Architecture.

- [ ] `tests/unit/newsletter-template.test.ts` — forbidden-token grep on master template + Cyrillic glyph render assertion (Ж, Щ, Ъ, Ю, Я, ѝ) + explicit charset declaration check
- [ ] `tests/unit/newsletter-i18n.test.ts` — tone-lock vitest extending Phase 02.1 pattern to namespaces `member.preferences`, `community`, `email.newsletter`, `admin.newsletters`, `unsubscribe`
- [ ] `tests/unit/newsletter-topic-enum.test.ts` — greppable enum lock-in for the 4 newsletter topic values
- [ ] `tests/unit/newsletter-redact.test.ts` — Pino REDACT extension covers `to`, `recipient_email`
- [ ] `tests/unit/unsubscribe-hmac.test.ts` — sign + verify round-trip, expired token, tampered token, base64url encoding edge cases
- [ ] `tests/integration/newsletter-recipient-query.test.ts` — Drizzle query with seed users covering: explicit topic grant, explicit topic revoke, legacy `kind='newsletter'` blanket grant, no consent (excluded)
- [ ] `tests/integration/unsubscribe-route.test.ts` — token validation + 4 consents revoke INSERTs + Brevo suppression sync (mocked Brevo client)
- [ ] `tests/integration/newsletter-worker.test.ts` — BullMQ enqueue → worker picks up → Brevo client called with correct headers (List-Unsubscribe, List-Unsubscribe-Post)
- [ ] `tests/e2e/newsletter-preferences.spec.ts` — member toggles each topic + persistence + member dashboard "Настройки" card linkage
- [ ] `tests/e2e/community-page.spec.ts` — anonymous teaser vs member real-URLs + footer link conditional
- [ ] `tests/e2e/admin-newsletter-composer.spec.ts` — Lexical RTE write + live preview + test-send gate + Send blast (mocked Brevo)

*If none of the above test files exist yet: gsd-planner should add a Wave 0 plan that creates the test scaffolding.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cyrillic glyphs render correctly in Outlook desktop (Windows mail.app) | NOTIF-06 SC#3 | No headless Outlook desktop renderer exists; must visually verify in real client | Editor sends a test newsletter to a Windows-Outlook test inbox; verify Ж, Щ, Ъ, Ю, Я, ѝ render with no `?` or `□` glyphs and no charset corruption |
| Cyrillic glyphs render correctly in abv.bg + mail.bg | NOTIF-06 SC#3 | Bulgarian-domain webmail clients have no automated test harness | Editor sends test newsletter to a real abv.bg + mail.bg inbox; visually inspect for tofu / encoding artifacts |
| Brevo `List-Unsubscribe` header present in delivered message | NOTIF-02 SC#2 | Brevo's API documents header acceptance but production behavior of header injection vs override is the MEDIUM-confidence area logged as Assumption A1 in RESEARCH.md | After first test-send to editor's own inbox: open Gmail "Show Original" and confirm `List-Unsubscribe: <https://chastnik.eu/api/unsubscribe?token=...>, <mailto:...>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` are both present. Pre-flight gate before first production blast. |
| Coalition swaps WhatsApp / Telegram URLs in Payload Global without redeploy | NOTIF-04 / NOTIF-05 | Confirms operator workflow is real, not just theoretically supported | Coalition admin opens `/admin/globals/community-channels`, edits both URLs, sets `*Visible=true`, saves; reload `/community` and verify URLs render without app rebuild |
| DKIM CNAME `mail2._domainkey.news.chastnik.eu` resolves before first send | D-Phase5-prep / NOTIF-06 | DNS prerequisite that lives outside the codebase | Before first production blast: `dig mail2._domainkey.news.chastnik.eu CNAME` must return Brevo's value; Postmaster Tools shows DKIM=PASS on a test send |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`--watch`, `--ui`, etc.) in any automated command
- [ ] Feedback latency < 60s for unit-bound tasks
- [ ] Manual-only verifications documented above are flagged in their plan tasks (`autonomous: false`)
- [ ] `nyquist_compliant: true` set in frontmatter (after gsd-planner populates the Per-Task map)

**Approval:** pending
