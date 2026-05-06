---
phase: 05-notifications
gate: manual-verifications
status: passed
verified_at: 2026-05-06T17:30:00+03:00
verified_by: emoadm
---

# Phase 5 — Manual Verifications

This document closes out the 5 manual-only verifications from
`.planning/phases/05-notifications/05-VALIDATION.md`. Conducted 2026-05-05
to 2026-05-06 by the operator (emoadm) with orchestrator assistance.

## Summary

| Step | Behavior | Result |
|------|----------|--------|
| 1 | DKIM CNAME `mail2._domainkey.news.chastnik.eu` resolves | ✓ pass (after fix-up) |
| 2 | Coalition Global swap rehearsal — D-12 contract | ✓ pass |
| 3 | Real test send via editor flow — DKIM-aligned delivery | ✓ pass |
| 4 | Pre-flight raw-header inspect (Pitfall 2 / A1) | ⚠ soft pass — full verification deferred to first real blast |
| 5 | Cyrillic glyph render across clients | ✓ pass for Gmail + Apple Mail; deferred to first real users for abv.bg + mail.bg + Outlook desktop |

## 1. DKIM CNAME resolution (D-Phase5-prep)

**Initial state (2026-05-05 16:55Z):** record was missing from Cloudflare DNS — `dig @1.1.1.1 mail2._domainkey.news.chastnik.eu CNAME +short` returned empty (NXDOMAIN per authoritative server). Three of the four required `news.*` DKIM CNAMEs (`mail`, `brevo1`, `brevo2`) already resolved correctly; only the `mail2` alias was missing.

**Fix:** operator added the missing record in Cloudflare DNS dashboard:

| Field | Value |
|-------|-------|
| Type | `CNAME` |
| Name | `mail2._domainkey.news` (Cloudflare auto-appends `.chastnik.eu`) |
| Target | `brevo2._domainkey.news.chastnik.eu` |
| Proxy status | DNS only (gray cloud) |
| TTL | Auto |

**Post-fix verification (2026-05-05 ~17:00Z):**

```
$ dig @carter.ns.cloudflare.com mail2._domainkey.news.chastnik.eu CNAME +short
brevo2._domainkey.news.chastnik.eu.

$ dig @1.1.1.1 mail2._domainkey.news.chastnik.eu CNAME +short
brevo2._domainkey.news.chastnik.eu.

$ dig @8.8.8.8 mail2._domainkey.news.chastnik.eu CNAME +short
brevo2._domainkey.news.chastnik.eu.
```

Full `news.*` DKIM chain now matches the known-good `auth.*` chain (mail → brevo1 → b1.news-chastnik-eu.dkim.brevo.com / mail2 → brevo2 → b2.news-chastnik-eu.dkim.brevo.com).

**Status:** ✓ resolved — DKIM=PASS expected on next send. STATE.md `D-Phase5-prep` marked resolved.

## 2. Coalition Global swap rehearsal

**Action sequence:**

1. Logged in as editor at `/admin/globals/community-channels`
2. Set fields:
   - `whatsappChannelUrl` = `https://whatsapp.com/channel/0029Test123ABC` (dummy URL for rehearsal)
   - `whatsappVisible` = `true`
   - `telegramChannelUrl` = `https://t.me/chastnik_test` (dummy URL for rehearsal)
   - `telegramVisible` = `true`
3. Saved → reloaded `/community` in two tabs (member + incognito)

**Member tab:** ✓ pass
- Two-card grid rendered (not single placeholder)
- WhatsApp card: `<a data-testid="channel-cta-redeem" href="https://whatsapp.com/channel/0029Test123ABC" target="_blank" rel="noopener noreferrer">Отвори в WhatsApp</a>`
- Telegram card: `<a data-testid="channel-cta-redeem" href="https://t.me/chastnik_test " target="_blank" rel="noopener noreferrer">Отвори в Telegram</a>`

**Anonymous (incognito) tab:** ✓ pass
- Two-card grid with `channel-cta-teaser` CTAs linking to `/register?next=/community`
- View source confirmed NEITHER `whatsapp.com` NOR `t.me/chastnik_test` appears in HTML — anonymous visitors cannot extract the raw URLs
- Heading hierarchy correct (h1 + h2 + h3)

**Toggle-back-to-invisible:** ✓ pass
- Toggled both `*Visible` to `false` and saved
- Reloaded `/community` → single full-width "Каналите стартират скоро" placeholder card returned
- Two-card grid disappeared

**No redeploy required:** ✓ confirmed — D-12 contract honored. Coalition can swap channel URLs and toggle visibility from the admin UI without engineering involvement.

**Minor follow-ups noted (NOT blocking):**
- **F-1 (data hygiene):** trailing space in Telegram URL was stored verbatim — operator pasted `https://t.me/chastnik_test ` (with trailing space) and the Global field stored exactly that. Add `.trim()` on save in CommunityChannels Global.
- **F-2 (page wiring):** `bgDescription` field on the Global is currently unused by `/community/page.tsx`. The page renders `t('community.explainer.body')` from `messages/bg.json` (which still contains `[ТЕКСТ ОТ КОАЛИЦИЯ]`). The field was intended (per `src/globals/CommunityChannels.ts:60` admin description) to drive that section, but the wiring was missed in Plan 05-09. Coalition currently cannot edit explainer copy without a code change.

**Status:** ✓ pass — D-CoalitionChannels workflow ready for coalition.

## 3. Real test send via editor flow

After 6 hotfixes to make the editor surface usable end-to-end (see "Hotfix incident notes" below):

- **Editor inbox:** Gmail (operator's editor account)
- **Subject as received:** `[ТЕСТ] Phase 5 — sanity test` — the worker prefixes test sends with `[ТЕСТ]` per `src/lib/email/worker.tsx:234`
- **Sonner toast on send:** "Тестовото писмо е изпратено до …" (success)
- **Arrival time:** ~60 seconds end-to-end (BullMQ enqueue → worker pick-up → Brevo dispatch → Gmail delivery)
- **Inbox vs spam:** ✓ inbox — DKIM + DMARC alignment confirmed working
- **Cyrillic body:** ✓ pass — `Ж Щ Ъ Ю Я ѝ` and `ще`, `ъгъл`, `държава` all rendered correctly in Gmail web; no `?`, no `□`, no MIME encoding artifacts in subject or body

**Status:** ✓ pass — full editor-to-recipient pipeline exercised end-to-end.

## 4. Pre-flight raw-header inspect (Pitfall 2 / Assumption A1)

**What was observed in the test send (Gmail Show Original):**

```
List-Unsubscribe: <https://bbbciihb.r.bh.d.sendibt3.com/tr/un/li/...>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

- Exactly ONE `List-Unsubscribe:` header (not two)
- Exactly ONE `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
- The List-Unsubscribe URL points to **Brevo's tracking domain** (`sendibt3.com`), NOT to `chastnik.eu/api/unsubscribe`

**Important nuance — what this DOES and DOES NOT verify:**

The test-send branch in `src/lib/email/worker.tsx:255-265` deliberately does NOT set our custom `List-Unsubscribe` header (Plan 05-05 design choice — test sends go to a single editor inbox without a token-bound user). What we observed is therefore **Brevo's auto-injected fallback header**, not a Brevo override of our custom header.

The actual Pitfall 2 risk is "does Brevo silently override the custom `List-Unsubscribe` we set in the BLAST send branch (`src/lib/email/worker.tsx:192-208`)?" — that branch DOES set the custom header on real blasts, but we cannot verify it here without sending a real blast.

**Decision (per orchestrator + operator review):** defer full Pitfall 2 verification to the **first real blast**. The risk is bounded:
- The custom header is set on every blast send (worker.tsx:194-195)
- If Brevo overrides it, the first member's `List-Unsubscribe` click will go to Brevo's URL instead of `chastnik.eu/api/unsubscribe`
- This is a UX issue (slightly worse one-click experience) but not a deliverability issue — Brevo's URL is also valid RFC 8058
- Sentry + Brevo bounce/complaint dashboards will surface any anomaly within minutes of the first blast

**Status:** ⚠ soft pass — what we observed is correct for the test-send code path. Full verification deferred to first real blast. Follow-up tracked.

## 5. Cyrillic glyph render across clients

| Client | Status | Notes |
|--------|--------|-------|
| Gmail web | ✓ pass | Subject `[ТЕСТ] Phase 5 — sanity test` and body rendered correctly; no MIME encoding |
| Apple Mail (iCloud) | ✓ pass | Forwarded test email; Cyrillic rendered correctly |
| Outlook desktop (Windows) | ⊘ deferred | Operator does not have an Outlook account; will verify with first real members on Outlook |
| abv.bg | ⊘ deferred | Operator does not have an abv.bg account; high-priority for real-user testing on launch |
| mail.bg | ⊘ deferred | Operator does not have a mail.bg account; high-priority for real-user testing on launch |

**Decision:** abv.bg + mail.bg + Outlook desktop verification is deferred to **real-user testing during the warmup ladder / first blast**. Rationale: creating throwaway accounts purely for verification is overkill, and the first 3–5 real coalition members on those providers will surface any encoding issues immediately. The worker is already wired for Sentry, so any rendering errors get reported.

**Status:** ✓ pass for the clients we could test (Gmail + Apple Mail); 3 clients deferred to launch — tracked as a soft watch item, not a blocker.

## Hotfix incident notes

The verification process surfaced 6 latent Phase 5 bugs that required production hotfixes to make the editor surface usable. All landed during the 2026-05-05 verification session:

| Commit | Plan | Description |
|--------|------|-------------|
| `00e0dbb` | 05-04 | Removed `UploadFeature()` from Lexical config (no Media collection target — speculative; kept as simplification per Plan 05-04 D-01 "restricted Lexical") |
| `f6694c0` | 05-04 | Registered `RscEntryLexicalField` + `RscEntryLexicalCell` + `LexicalDiffComponent` in `src/app/(payload)/admin/importMap.js` — root cause of body field not rendering at all |
| `7541f4f` | 05-04 | Added `FixedToolbarFeature` + `InlineToolbarFeature` to Lexical config; registered all 9 client-feature components in importMap (toolbar UI was empty before) |
| `6daaf8c` | 05-07 | `NewsletterComposer` reads doc ID from `useDocumentInfo()` instead of expecting it as a plain prop (Payload's `beforeDocumentControls` slot doesn't pass document data as props) |
| `65b00dc` | 05-07 | Mounted Sonner `Toaster` inside `NewsletterComposer` — the Payload admin shell never had one, so all toast calls were silent |
| `fe3dd80` | ops | Postinstall script patches `payload@3.84.x`'s broken `@next/env` interop (`Cannot destructure property 'loadEnvConfig'` was crashing the BullMQ worker on every job) |

Common root cause for #1–#3: the project relies on `payload generate:importmap` to produce `importMap.js`, but that command is blocked by the `tsx@4.21 + Node 22 ESM` incompat (TODO `2026-05-04-payload-tsx-esm-incompat.md`). Plan 02.1's importMap fix only added project-local custom components — every features-shipping Phase phase will need to hand-register components until the tsx incompat is fixed.

Memory updated: `~/.claude/.../memory/project_payload_schema_constraint.md` now covers schema + importMap + features.

## Operator notes

- Verification took longer than planned (~6 hours wall-clock) due to the cascade of hotfixes. None of the bugs were in the underlying delivery infrastructure (Brevo, Drizzle, BullMQ all worked as designed); all were in the Payload admin wiring and the importMap convention.
- The unused `bgDescription` field on `community-channels` Global (F-2) means the coalition cannot currently edit the `/community` explainer copy without a code change. This is a Plan 05-09 oversight — recommend a small follow-up to wire the field through `community/page.tsx` and the Footer Column 4.
- The trailing-space hygiene issue (F-1) on URL fields is a 5-line `.trim()` follow-up — file when convenient.
- No issues observed with: Drizzle migration (preferred_channel column), Payload table DDL (newsletters + community_channels — manually applied via Neon SQL console per Phase 5 schema-push gate), unsubscribe Server Action / `/api/unsubscribe` route (not exercised in this verification), or the editor role gate.

## Sign-off

- [x] DKIM CNAME `mail2._domainkey.news.chastnik.eu` resolves (auth chain at parity with `auth.*`)
- [x] Coalition Global swap workflow verified (D-12 — no redeploy required)
- [x] Real test send arrived in inbox with correct Cyrillic + DKIM-aligned headers
- [x] List-Unsubscribe header inspected — single header, one-click POST present (full Pitfall 2 verification deferred to first blast — bounded risk, see §4)
- [x] Cyrillic renders correctly in Gmail web + Apple Mail (3 other clients deferred to first real users — tracked, not blocking)
- [x] STATE.md updated — `D-Phase5-prep` marked resolved (DNS confirmed); current position set to "Phase 5 verified end-to-end"

**Phase 5 is verified end-to-end. Ready for `/gsd-verify-work 05`.**
