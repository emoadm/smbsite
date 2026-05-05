---
plan: 05-05
phase: 05-notifications
status: complete
tasks_complete: 2
tasks_total: 2
---

# Plan 05-05 Summary — Newsletter Worker

**Mode:** Inline orchestrator execution (subagent retries hit Bash permission denial; orchestrator has direct Bash access).

## What was built

| File | Purpose |
|------|---------|
| `src/lib/newsletter/recipients.ts` | Drizzle DISTINCT-ON query (D-05/D-09 backward compat) — `getNewsletterRecipients(topic)` + `getCurrentTopicState(userId, topic)` |
| `src/lib/email/worker.tsx` | Extended processor switch with 4 new cases (newsletter-blast, newsletter-send-recipient, newsletter-test, unsubscribe-brevo-retry) |
| `tests/integration/newsletter-recipient-query.test.ts` | 9 tests — SQL shape (DISTINCT ON, both CTEs, email_verified guard) + brevoBlocklist/brevoUnblock contracts |
| `tests/unit/newsletter-headers.test.ts` | 9 source-grep contracts — RFC 8058 headers, EMAIL_FROM_NEWSLETTER, signUnsubToken, cancel-race, sentinel unsub URL, log redaction |
| `tests/integration/newsletter-worker.test.ts` | 4 switch routing checks — 4 new cases present + 5 imports + Phase 1 cases preserved + React import comment preserved |

## Key files created

- `src/lib/newsletter/recipients.ts` (94 LOC)
- `tests/integration/newsletter-recipient-query.test.ts` (134 LOC)
- `tests/unit/newsletter-headers.test.ts` (60 LOC)
- `tests/integration/newsletter-worker.test.ts` (33 LOC)

## Key files modified

- `src/lib/email/worker.tsx` — added 4 imports, 4 new switch cases, updated return type to `{ messageId } | { fannedOut }`. Phase 1 cases byte-identical.

## Decisions honored

- **D-05** — Recipient query at DISPATCH time, not compose time (one sub-job enqueued per matched recipient).
- **D-09** — Backward-compat: explicit topic-row revoke wins over legacy `kind='newsletter'` blanket grant.
- **D-14** — Brevo blocklist sync via inline-await with retry queue (`unsubscribe-brevo-retry` handler).
- **D-20** — `EMAIL_FROM_NEWSLETTER` (newsletter@news.chastnik.eu) used for newsletter sends; transactional sender preserved for OTP/welcome.
- **D-24** — Per-recipient log payload uses `{ user_id, newsletterId, brevo_message_id }` only — no email/PII (REDACT also covers `to` from Plan 05-01).
- **NOTIF-02 / RFC 8058** — Both `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers explicit on per-recipient send (Pitfall 2 — overrides Brevo auto-injection).
- **Pitfall 3** — `newsletter-blast` and `newsletter-send-recipient` both re-check `doc.status === 'cancelled'` to defeat compose-time / dispatch-time race.

## Notable deviations

1. **brevo-sync.ts not recreated.** Plan 05-06 already shipped `brevoBlocklist` (POST /v3/contacts) + `brevoUnblock` (PUT /v3/contacts/{email}) as a Rule-3 blocking dependency. The signature already matches what 05-05 needs; the existing implementation is reused as-is. Tests in `newsletter-recipient-query.test.ts` cover both helpers against the actual implementation (PUT for unblock, not the POST-with-emailBlacklisted=false form sketched in the plan template).
2. **Payload collection cast via `as never`.** The `newsletters` slug is not in the auto-generated Payload types until Wave 3 schema push completes. `findByID({ collection: 'newsletters' as never, ... })` keeps `tsc --noEmit` green; will be replaced by proper typing post Wave 3.
3. **`renderLexicalToHtml` is synchronous.** No `await` before its call in worker.tsx (matches its actual return type from `src/lib/newsletter/lexical-to-html.ts`).
4. **Inline `loadT` retained in worker.tsx.** Plan suggested optionally importing from `i18n-direct.ts` but kept the inline copy — behavior is identical; deduplication is non-functional churn.

## Verification

- `pnpm typecheck` — clean
- `pnpm test:unit` — 249/249 pass across 30 files (was 227 before this plan; +22 new tests across 3 new files; existing 227 unchanged)
- `grep -c "DISTINCT ON" src/lib/newsletter/recipients.ts` → 2 ✓
- `grep -c "case 'newsletter-blast'\|case 'newsletter-send-recipient'\|case 'newsletter-test'\|case 'unsubscribe-brevo-retry'" src/lib/email/worker.tsx` → 4 ✓
- `grep "List-Unsubscribe\|List-Unsubscribe-Post\|List-Unsubscribe=One-Click" src/lib/email/worker.tsx` → all three present ✓

## Notes for downstream plans

- **Plan 05-07 (composer Server Actions)**: `addEmailJob({ kind: 'newsletter-blast' | 'newsletter-test', newsletterId, ... })` — worker is ready.
- **Plan 05-06 (unsubscribe route)**: `addEmailJob({ kind: 'unsubscribe-brevo-retry', unsubEmail })` — retry path is wired.
- **Plan 05-11 (e2e)**: full Brevo round-trip happens in a manual fixture; this plan locks the SQL shape + header shape contracts.

## Commits

- `9e8f841` — feat(05-05): recipient query lib with DISTINCT ON precedence (D-05/D-09)
- `9861f91` — feat(05-05): newsletter worker — 4 switch branches with RFC 8058 headers
