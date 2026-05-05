---
plan: 05-08
phase: 05-notifications
status: complete
tasks_complete: 2
tasks_total: 2
---

# Plan 05-08 Summary — Member Preferences + Register D-09 Extension

**Mode:** Inline orchestrator execution.

## What was built

| File | Purpose |
|------|---------|
| `src/app/actions/save-preferences.ts` | saveTopicPreference (INSERT consents) + savePreferredChannel (UPDATE users.preferred_channel) |
| `src/app/actions/register.ts` | D-09 extension: 1 legacy `kind: 'newsletter'` row → 4 topic rows (`newsletter_general/voting/reports/events`) |
| `src/components/preferences/NewsletterToggleRow.tsx` | Per-topic Switch with optimistic save + Sonner toast |
| `src/components/preferences/PreferredChannelRadio.tsx` | RadioGroup wrapping 3 channel options with optimistic save |
| `src/app/(frontend)/member/preferences/page.tsx` | RSC page — 3 cards (email toggles + channel radio + locked-bg language) |
| `src/app/(frontend)/member/page.tsx` | Dashboard grid upgraded to 4 cards: agenda + faq + preferences + community |
| `messages/bg.json` | Added `member.welcome.cards.preferences` + `member.welcome.cards.community` keys |
| shadcn primitives | Added `switch.tsx` + `radio-group.tsx` via shadcn CLI |
| `tests/unit/save-preferences-action.test.ts` | 9 source-grep contracts (use server / auth / consents-INSERT-only / users-UPDATE-OK / TopicEnum lock / no email in logs) |
| `tests/unit/register-newsletter-rows.test.ts` | 6 source-grep contracts (4 newsletter_* rows / 4× checkbox-derived granted / no legacy `kind: 'newsletter'` / Phase 1 rows preserved) |
| `tests/e2e/newsletter-preferences.spec.ts` | Playwright .skip()'d full-flow scaffold for Wave 4 |
| `tests/unit/unsubscribe-hmac.test.ts` | Fix: tampered-sig test rewritten to replace 5 contiguous chars (was: single-char flip at padding boundary; intermittent false-pass) |

## Decisions honored

- **D-07** — `users.preferred_channel` UPDATEd in place; not append-only audit material. Channel options: whatsapp / telegram / none / null.
- **D-09** — register.ts writes 4 topic rows simultaneously from the single `consent_newsletter` checkbox; legacy `kind: 'newsletter'` is read-time backward compat only (Plan 05-05). New registrants never get a `kind: 'newsletter'` row.
- **D-13** — Append-only on consents: saveTopicPreference INSERTs every flip; never UPDATEs/DELETEs consents.
- **D-22** — All copy through messages/bg.json (`member.preferences.*`, `member.welcome.cards.preferences/community`). Zero hardcoded Bulgarian literals in components.
- **D-24** — Logs use `user_id` key; REDACT covers email/to.
- **NOTIF-01** — Granular topic toggles per UI-SPEC §5.1 layout (4 Switch rows, divide-y).
- **NOTIF-03** — Optimistic UI flow: switch flips immediately on click; Sonner toast confirms on success; revert on error.

## Notable deviations

1. **No auth() redirect in preferences/page.tsx.** The (frontend)/member/ layout (`src/app/(frontend)/member/layout.tsx`) handles redirect-to-login + redirect-to-OTP; the page only calls auth() to read the user id, then assumes session exists. Per plan instruction.
2. **Existing register tests not modified.** The existing tests/unit/register-attribution.test.ts and other register-* tests do not assert `kind === 'newsletter'`; they cover ATTR fields. No changes needed.
3. **POLICY_VERSION centralized.** Same string `'2026-04-29'` in register.ts and save-preferences.ts; no shared constant — version bumps require a coordinated update across both files.
4. **HMAC test flake fix included.** The pre-existing `tests/unit/unsubscribe-hmac.test.ts` "tampered sig" case occasionally false-passed when the single-char flip at the padding boundary decoded to the same byte. Rewrote it to replace 5 contiguous characters in the sig — guarantees a real byte difference. Re-ran 3 times; clean.

## Verification

- `pnpm typecheck` — clean
- `pnpm test:unit` — 303/303 pass across 34 files (was 288 after 05-07; +15 new tests across 2 new files)
- `grep -c "newsletter_general\|newsletter_voting\|newsletter_reports\|newsletter_events" src/app/actions/register.ts` → 4
- `grep -E "kind:\s*['\"]newsletter['\"]\s*," src/app/actions/register.ts` → empty (legacy single row removed)
- `grep -q "db.update(consents)\|db.delete(consents)" src/app/actions/save-preferences.ts` → empty (D-13 lock)

## Notes for downstream plans

- **Plan 05-11 (Wave 4 e2e)**: un-skip `tests/e2e/newsletter-preferences.spec.ts` after Wave 3 schema push.
- **Plan 05-09 (community page)**: independent surface; references the same /community route the preferences page links to.

## Commits

- `e438593` — feat(05-08): saveTopicPreference + savePreferredChannel + register D-09 extension
- `8607f57` — feat(05-08): /member/preferences page + dashboard cards + 2 client components
