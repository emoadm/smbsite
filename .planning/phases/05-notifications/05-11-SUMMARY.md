---
plan: 05-11
phase: 05-notifications
status: complete
tasks_complete: 5
tasks_total: 5
note: retroactive — backfilled 2026-05-06 from git history + 05-MANUAL-VERIFICATION.md + 05-UAT.md
---

# Plan 05-11 Summary — Wave 4 close-out (e2e + manual verifications + grep gates)

**Mode:** Mixed — autonomous test work + operator-driven manual verifications.

## What was built

| File | Purpose |
|------|---------|
| `tests/e2e/admin-newsletter-composer.spec.ts` | un-skipped — full editor flow (login → fill subject/preview/topic → Cyrillic body → save → SendBlast disabled → "Изпрати тестово писмо до мен" → Sonner toast → reload → SendBlast enabled → click → post-send Dialog) |
| `tests/e2e/newsletter-preferences.spec.ts` | un-skipped — member preferences flow (OTP login via TEST_OTP_SINK → toggle 4 topics → reload → assert persistence) |
| `tests/e2e/community-page.spec.ts` | un-skipped 3 blocks — anonymous (no raw `whatsapp.com` / `t.me/` in HTML; teaser CTAs to `/register?next=/community`) + member (≥1 redeem CTA with `target=_blank`, `rel=noopener`, real channel href) |
| `tests/e2e/unsubscribe.spec.ts` | un-skipped — 4 reason variants exercised end-to-end |
| `tests/integration/newsletter-recipient-query.test.ts` | extended with live-DB seeded scenarios |
| `tests/unit/newsletter-coalition-placeholder.test.ts` | source-grep gate — fails CI if `[ТЕКСТ ОТ КОАЛИЦИЯ]` appears in `messages/bg.json` (soft gate today; flips to hard before launch) |
| `.planning/phases/05-notifications/05-MANUAL-VERIFICATION.md` | operator sign-off doc for the 5 manual-only items from VALIDATION.md |

## Decisions honored

- **D-Phase5-prep (DKIM)** — `mail2._domainkey.news.chastnik.eu` CNAME added to Cloudflare and verified resolving against authoritative + 1.1.1.1 + 8.8.8.8 (full `news.*` chain at parity with `auth.*`).
- **D-12 (Coalition swap, no redeploy)** — rehearsal with dummy URLs verified that the Global field swap reflects on `/community` and Footer Column 4 with no redeploy.
- **Pitfall 2 / A1 (List-Unsubscribe)** — soft pass on the test-send code path; full verification deferred to first real blast (bounded UX-only risk per §4 of MANUAL-VERIFICATION.md).
- **Cyrillic render gate** — pass on Gmail web + Apple Mail; deferred for Outlook desktop / abv.bg / mail.bg to first real users.
- **Coalition-placeholder gate** — soft gate active in CI today; one-line uncomment promotes to hard gate before launch.

## Notable deviations

1. **6 hotfixes during verification.** The verification process surfaced 6 latent bugs in the Phase 5 admin surface (Lexical `UploadFeature` removal, `RscEntryLexicalField`/`RscEntryLexicalCell`/`LexicalDiffComponent` registrations missing from `importMap.js`, `FixedToolbarFeature` + `InlineToolbarFeature` + 9 client features missing, `NewsletterComposer` reading doc ID from props instead of `useDocumentInfo()`, missing Sonner `Toaster` mount, payload@3.84.x's broken `@next/env` interop crashing the BullMQ worker). All shipped during the 2026-05-05 session — see MANUAL-VERIFICATION.md "Hotfix incident notes".
2. **Common root cause for 3 of the importMap bugs:** `payload generate:importmap` is blocked by the `tsx@4.21 + Node 22 ESM` incompat — every features-shipping Phase will need to hand-register components until the tsx incompat is fixed. Memory updated.
3. **Outlook / abv.bg / mail.bg deferred** to first real users (operator does not have accounts; throwaway-account verification rejected as overkill; Sentry will surface any rendering errors from real users).

## Verification

- 4 Playwright e2e specs un-skipped (`grep -c "test.skip" tests/e2e/admin-newsletter-composer.spec.ts tests/e2e/newsletter-preferences.spec.ts tests/e2e/community-page.spec.ts tests/e2e/unsubscribe.spec.ts` → 0)
- `tests/unit/newsletter-coalition-placeholder.test.ts` — green (placeholder still present in `messages/bg.json`, soft warn emitted)
- DKIM CNAME resolves correctly across 3 resolvers
- Global swap rehearsal — two-card grid with dummy URLs renders; toggle-back-to-invisible reverts to "Каналите стартират скоро" placeholder
- Real test send from editor flow — arrived in Gmail inbox in ~60s with correct Cyrillic + DKIM-aligned headers
- Manual verification doc signed off (verified_at: 2026-05-06T17:30:00+03:00)

## Follow-ups (NOT blocking — tracked)

- **F-1 (data hygiene):** trailing-space in URL fields stored verbatim — add `.trim()` on save in `CommunityChannels` Global. (Out of scope for gap-closure plans 05-12/13/14.)
- **F-2 (page wiring):** `bgDescription` field on `CommunityChannels` Global is unused by `/community/page.tsx` (page renders `t('community.explainer.body')` from `messages/bg.json` which still has `[ТЕКСТ ОТ КОАЛИЦИЯ]`). Plan 05-09 oversight — recommend a small follow-up to wire the field through. (Out of scope for gap-closure plans 05-12/13/14.)
- **Pitfall 2 full verification** deferred to first real blast — gated on Plan 05-13 fix (SendBlastButton wiring) per UAT test 15.

## UAT outcome (separate from this plan, but consequence of it)

`05-UAT.md` ran 15 user-observable tests against the verified end-to-end build:
- **Pass:** 12
- **Issue:** 2 (worker dev-env env-file load — major; SendBlastButton wiring — blocker)
- **Blocked:** 1 (test 15 — full Pitfall 2 List-Unsubscribe verification — blocked on test 4 fix)
- **Cosmetic noted:** 1 (`Изпрати рекламата` register slip)
- **Major fixed-at-infra during UAT:** Redis `maxmemory-policy` flipped from `optimistic-volatile` to `noeviction` on prod + staging Upstash dashboards.

These 4 outcomes flow into gap-closure plans 05-12 / 05-13 / 05-14.

## Commits

- `977ff7a` — test(05-11): un-skip 4 e2e specs + add coalition-placeholder soft gate
- `c2d666a` — docs(05): manual verification sign-off + STATE.md update
- `263031a` — test(05): UAT partial — 12 pass, 2 issues, 1 blocked

## Notes for downstream plans

- **Plans 05-12 / 05-13 / 05-14 (gap-closure)** remediate the 4 UAT gaps: G1 worker env, G2 SendBlastButton wiring, G3 Bulgarian register, G4 Redis eviction policy assertion + ops doc.
- **First real blast** unlocks UAT test 15 (Pitfall 2 full verification).
- **Coalition-placeholder hard-gate flip** is the last gate before public launch.
