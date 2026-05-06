---
status: partial
phase: 05-notifications
source:
  - 05-01-SUMMARY.md
  - 05-02-SUMMARY.md
  - 05-03-SUMMARY.md
  - 05-04-SUMMARY.md
  - 05-05-SUMMARY.md
  - 05-06-SUMMARY.md
  - 05-07-SUMMARY.md
  - 05-08-SUMMARY.md
  - 05-09-SUMMARY.md
started: 2026-05-06T13:14:54.000Z
updated: 2026-05-06T20:44:56.000Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing paused — 1 item outstanding (test 15 blocked on test 4 fix)]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running app/worker. Drop ephemeral state (BullMQ keys in dev Redis, .next cache). `pnpm dev` boots the Next.js app with no errors, and the BullMQ worker launches without the loadEnvConfig crash. `curl -i http://localhost:3000/` returns 200. The Drizzle migration 0002_panoramic_ink.sql and Payload auto-DDL (newsletters, community_channels) are present in the live DB.
result: issue
reported: |
  `pnpm worker` crashes on cold start with:
    TypeError: Cannot read properties of undefined (reading 'includes')
        at drizzleNeon (src/db/index.ts:14:29)
  Root cause: `scripts/start-worker.ts` does not load .env.local, so process.env.DATABASE_URL is undefined when src/db/index.ts evaluates `url.includes('localhost')`. Production (Fly.io) is unaffected because Fly injects env vars from secrets; this is a dev-time gap that surfaced for the first time in Phase 5 (newsletter test-send is the first dev workflow that meaningfully exercises the worker locally).
severity: major

### 2. Editor opens Newsletter Composer
expected: Login as editor → /admin/collections/newsletters → "Create new". The composer surface renders above the document controls (D-04 beforeDocumentControls) with a Lexical body editor that has visible Fixed + Inline toolbars (Bold, Italic, H2/H3, Link, Lists, Upload), a subject field, a 90-char preview-text textarea, a topic select (4 options), and a scheduledAt picker. No empty-toolbar rendering bug (the importMap fix from 7541f4f).
result: pass

### 3. Editor sends test send
expected: With a valid newsletter draft (subject + body in Cyrillic, topic chosen), click "Изпрати тестово". A Sonner toast appears: "Тестовото писмо е изпратено до …". Within ~60s the editor's inbox receives an email with subject prefixed `[ТЕСТ]`, Cyrillic glyphs (Ж Щ Ъ Ю Я ѝ; ще, ъгъл, държава) render correctly with no `?` or `□`, body matches what was authored.
result: pass

### 4. 24h pre-blast gate enforced
expected: Send-blast CTA ("Изпрати рекламата" / "Планирай изпращане") in the composer reflects gate state. After a recent test send with no edits, the CTA enables. Otherwise it's disabled with a Tooltip explaining gate_never / gate_expired / gate_invalidated.
result: issue
reported: |
  After a successful test send (test 3 passed; mail arrived in inbox), the blast button is still disabled. Tooltip on hover: "Изпрати първо тестово писмо" — i.e., gate is still `never`. The doc has an ID and a saved test was performed, so lastTestSentAt should be populated, but the UI component reads it as undefined.

  Also: the button copy "Изпрати рекламата" reads as "Send the advertisement" in Bulgarian — wrong register for a political-advocacy newsletter. Better: "Изпрати бюлетина" (Send the newsletter) or "Изпрати на абонатите" (Send to subscribers). messages/bg.json key admin.newsletters.actions.sendBlast.now.
severity: blocker

### 5. Member preferences page renders
expected: Login as a member → /member/preferences. Three cards visible: (1) "Имейл теми" with 4 Switch rows for newsletter_general / voting / reports / events labelled per `bg.member.preferences`; (2) "Предпочитан канал" with RadioGroup of 3 options (WhatsApp / Telegram / без канал); (3) Bulgarian language card locked. All copy from messages/bg.json, no English.
result: pass

### 6. Topic toggle saves optimistically
expected: Flip the newsletter_voting Switch off. The UI updates immediately (no spinner-locked state), Sonner toast confirms "Запазено". DB shows a new INSERT row in `consents` with `kind='newsletter_voting', granted=false` (append-only — old row preserved). Refreshing the page shows the toggle in the new state.
result: pass

### 7. Preferred channel saves
expected: Select Telegram in the channel RadioGroup. Optimistic update + Sonner toast. DB shows `users.preferred_channel='telegram'` (UPDATE in place — D-07). Selecting "без канал" stores NULL or 'none' depending on schema; reloading reflects the choice.
result: pass

### 8. /community page — anonymous, both channels visible
expected: With CommunityChannels Global having `whatsappVisible=true, telegramVisible=true` and real URLs set, visit `/community` in incognito (anonymous). Two-card grid renders. Each card has a CTA labeled per `bg.community.*` linking to `/register?next=/community`. View-source confirms NEITHER `whatsapp.com` NOR `t.me/...` raw URLs appear in the HTML response — anonymous visitors cannot extract the channel destinations (D-11).
result: pass

### 9. /community page — member, both channels visible
expected: Same Global state, logged in as member. Two-card grid. CTAs link directly to the external URLs (`https://whatsapp.com/channel/...`, `https://t.me/...`) with `target="_blank" rel="noopener noreferrer"` and `data-testid="channel-cta-redeem"`. Bulgarian h1 + h2 + h3 hierarchy intact.
result: pass

### 10. Coalition visibility toggle (no redeploy)
expected: As editor at `/admin/globals/community-channels`, set both `whatsappVisible` and `telegramVisible` to `false`, save. Reload `/community` — the two-card grid is replaced with a single full-width "Каналите стартират скоро" placeholder card. Toggle one back to `true` → only that card returns. No redeploy required (D-12 contract).
result: pass

### 11. Footer Column 4 conditional links
expected: Footer column 4 renders the SAME conditional logic as `/community`. Anonymous: links route to `/community` (no raw URLs in HTML). Member with both visible: external WhatsApp/Telegram links. Both invisible: "Каналите стартират скоро" copy or hidden column. Toggling visibility in the Global is reflected on next page load with no redeploy.
result: pass

### 12. One-click unsubscribe (RFC 8058 POST + GET)
expected: Use a valid HMAC token from a real test-send footer link. POST `/api/unsubscribe?token=...` (mailbox-provider one-click) returns 303 to `/unsubscribed`. DB shows 4 new `consents` rows (newsletter_general/voting/reports/events) with `granted=false`, and Brevo blocklist API was called (or `unsubscribe-brevo-retry` queued on Brevo failure — DB write is source of truth). GET behaves identically (footer-link path).
result: pass
note: Verified via scripts/test-unsub.ts. GET + POST each returned 303 → /unsubscribed; 8 new consent rows total (4 per request × 2 requests, two distinct granted_at timestamps ~700ms apart), all granted=false, all 4 topic kinds present in each batch. Brevo blocklist round-trip not directly checked but route spec falls through to `unsubscribe-brevo-retry` queue on Brevo failure (DB write is source of truth).

### 13. /unsubscribed page variants
expected: (a) `/unsubscribed` — success: CheckCircle2 + success heading + CTA to `/member/preferences` + community link. (b) `/unsubscribed?reason=expired` — same as success + Alert with expired heading/body. (c) `/unsubscribed?reason=bad-sig` — invalid heading + login CTA `/login?next=/member/preferences`. (d) `/unsubscribed?reason=malformed` — same as bad-sig. Page is force-dynamic, robots noindex, all copy from `bg.unsubscribe.*`.
result: pass

### 14. New registration writes 4 newsletter consent rows
expected: Register a new account with the `consent_newsletter` checkbox ticked. After verification, DB `consents` table shows 4 rows for that user with `kind` in (newsletter_general, newsletter_voting, newsletter_reports, newsletter_events) and `granted=true`, and ZERO rows with the legacy `kind='newsletter'` (D-09: legacy is read-time backward-compat only; new registrants get the granular set).
result: pass
note: Verified via scripts/test-register.ts against fresh post-Phase-5 registrant (uid 1e6c3260-f66e-4ec4-a544-45c6ddc20e55, registered 2026-05-06T20:39:45Z). 4 distinct newsletter_* topics, all granted=true with timestamps tied to registration moment, zero legacy `kind='newsletter'` rows. D-09 extension confirmed working end-to-end.

### 15. List-Unsubscribe header on first real blast (deferred)
expected: After the first real blast goes out, "Show Original" in Gmail confirms a single `List-Unsubscribe: <https://chastnik.eu/api/unsubscribe?token=...>` (NOT Brevo's sendibt3.com tracking domain) and a single `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. This validates Pitfall 2 / Assumption A1 — Brevo does not silently override our explicit header on the BLAST send branch (worker.tsx:192-208). The test-send branch uses Brevo's auto-injected fallback, so this can only be verified end-to-end on a real blast.
result: blocked
blocked_by: prior-phase
reason: Gated by test 4 (SendBlastButton broken — gate fields not read from useDocumentInfo). No real blast can be triggered from the admin UI until that fix lands. Manual verification §4 has already soft-passed the test-send branch's auto-injected Brevo header; full Pitfall 2 verification deferred to first real blast post-fix. Bounded risk per manual verification reasoning (Brevo's fallback is also valid RFC 8058; UX-only impact, not deliverability).

## Summary

total: 15
passed: 12
issues: 2
pending: 0
skipped: 0
blocked: 1

## Gaps

- truth: "Standalone BullMQ worker (`pnpm worker`) boots cleanly on a developer's local box without manual env-var sourcing"
  status: failed
  reason: "User reported: `pnpm worker` crashes with TypeError: Cannot read properties of undefined (reading 'includes') at src/db/index.ts:14 — DATABASE_URL is undefined because scripts/start-worker.ts does not load .env.local. Production unaffected (Fly secrets); dev-only gap surfaced in Phase 5 because newsletter test-send is the first dev workflow that exercises the worker locally."
  severity: major
  test: 1
  root_cause: "scripts/start-worker.ts has no dotenv import — process.env is empty in the standalone worker process unless the operator manually sources .env.local before invoking pnpm worker"
  artifacts:
    - path: "scripts/start-worker.ts"
      issue: "missing env-file load before importing worker modules that read process.env at module-eval time (src/db/index.ts, src/lib/email/brevo.ts, etc.)"
    - path: "src/db/index.ts:14"
      issue: "url.includes() called against process.env.DATABASE_URL! without a defensive check; non-null assertion lies when env not loaded"
  missing:
    - "Add an env-file loader at the top of scripts/start-worker.ts (e.g., `import 'dotenv/config'` with explicit path or `dotenv.config({ path: '.env.local' })`); OR change the package.json `worker` script to `node --env-file=.env.local --import tsx scripts/start-worker.ts`"
    - "Optionally: tighten src/db/index.ts to fail fast with a clear 'DATABASE_URL not set' error instead of a confusing TypeError"
  debug_session: ""

- truth: "Send-blast button in the newsletter composer reflects the actual D-02 gate state — enabling when a fresh test send was performed within 24h with no edits since"
  status: failed
  reason: "User reported: after a successful test send (Sonner toast + email arrived in inbox), the blast button stays disabled with tooltip 'Изпрати първо тестово писмо' (= gate is `never`). The newsletter doc has a saved ID, but SendBlastButton receives `lastTestSentAt = undefined` and `lastEditedAfterTestAt = undefined`. Same bug class as the original Phase 5 hotfix in commit 6daaf8c which fixed `props.newsletterId` always-undefined by reading from useDocumentInfo() — that hotfix stopped at the ID and missed the gate fields."
  severity: blocker
  test: 4
  root_cause: "Payload's admin.components.edit.beforeDocumentControls slot does NOT pass document data as plain React props. NewsletterComposer.tsx reads newsletterId from useDocumentInfo() (the 6daaf8c hotfix), but lastTestSentAt and lastEditedAfterTestAt are still passed as props (lines 41-42 + 152-154) which are always undefined → SendBlastButton.computeGate() first branch returns 'never' → button permanently disabled → Phase 5's main shipping deliverable (newsletter blast send) is non-functional via the admin UI. The server-side sendBlast Server Action also re-checks the gate against the DB doc, so the gate logic is fine end-to-end; only the UI prop wiring is broken."
  artifacts:
    - path: "src/components/payload/NewsletterComposer.tsx:41-58, 149-156"
      issue: "lastTestSentAt and lastEditedAfterTestAt read from `props` but Payload's beforeDocumentControls slot does not populate document fields as props (only useDocumentInfo() does)"
    - path: "src/components/payload/SendBlastButton.tsx:37-45"
      issue: "computeGate() correctly handles undefined → 'never', but never receives real values"
    - path: "node_modules/@payloadcms/ui/dist/providers/DocumentInfo/types.d.ts"
      issue: "useDocumentInfo() exposes `savedDocumentData?: Data` which contains the persisted doc fields including lastTestSentAt and lastEditedAfterTestAt"
  missing:
    - "In NewsletterComposer.tsx, read `lastTestSentAt` and `lastEditedAfterTestAt` from `useDocumentInfo().savedDocumentData` (or `initialData` as fallback) instead of from `props`. Mirror the existing `docInfo?.id` pattern at line 55-58."
    - "Pass the resolved values (not props) to SendBlastButton at lines 152-154."
    - "Add an integration / e2e test that mounts the composer in a Payload admin context with a saved test send and asserts the button is enabled — current tests are source-grep contracts and missed this because the props were merely declared, never observed at runtime."
  debug_session: ""

- truth: "Send-blast button copy reads as a newsletter action, not as 'send advertisement'"
  status: failed
  reason: "User noted: messages/bg.json key admin.newsletters.actions.sendBlast.now = 'Изпрати рекламата' which translates as 'Send the advertisement'. реклама = advertisement/ad — wrong register for a political-advocacy newsletter platform. Misleading for editors and inconsistent with the rest of the editorial flow (collection is Newsletters, button is in newsletter composer)."
  severity: cosmetic
  test: 4
  root_cause: "messages/bg.json copy choice during Plan 05-03 (i18n namespace creation) — likely a transliteration / translation slip. The `actions.sendBlast.scheduled` value 'Планирай изпращане' (Schedule sending) is correct in register; only the `.now` value is off."
  artifacts:
    - path: "messages/bg.json key admin.newsletters.actions.sendBlast.now"
      issue: "'Изпрати рекламата' should be 'Изпрати бюлетина' or 'Изпрати на абонатите'"
  missing:
    - "Replace messages/bg.json admin.newsletters.actions.sendBlast.now with 'Изпрати бюлетина' (or operator-preferred wording)."
    - "Audit the rest of admin.newsletters and email.newsletter for similar register slips while in the file."
  debug_session: ""

- truth: "Redis instance backing BullMQ uses `maxmemory-policy noeviction` so newsletter / attribution jobs cannot be silently dropped under memory pressure"
  status: failed
  reason: "User reported: BullMQ prints `IMPORTANT! Eviction policy is optimistic-volatile. It should be \"noeviction\"` (4×, once per worker connection — email + attribution × 2 connections each) and the worker terminal appears to hang after the warnings (likely idle-blocking on BLPOP, not a deadlock — needs confirmation by enqueueing a job)."
  severity: major
  test: 1
  root_cause: "Redis instance (Upstash free tier default is `optimistic-volatile`, or local Redis without explicit config) is configured with an eviction policy that allows TTL'd keys to be dropped. BullMQ uses TTLs on job locks/state, so eviction can corrupt or lose jobs. BullMQ explicitly warns but does NOT refuse to start — meaning prod could silently drop newsletter sends if memory pressure spikes."
  artifacts:
    - path: "Redis instance config (Upstash dashboard / redis.conf / CONFIG SET)"
      issue: "maxmemory-policy is `optimistic-volatile`; BullMQ requires `noeviction`"
    - path: "scripts/start-worker.ts"
      issue: "no startup-time eviction-policy assertion; warning is informational only — operators can miss it and ship to prod with unsafe Redis config"
  missing:
    - "Set `maxmemory-policy=noeviction` on the Redis instance backing BullMQ (Upstash dashboard → Eviction toggle, OR `redis-cli CONFIG SET maxmemory-policy noeviction` for local + persist in redis.conf)"
    - "Verify the same on staging + production Upstash instances (Phase 1 may also be affected — OTP queue uses the same Redis) — record current policy in 05-SCHEMA-PUSH.md or an ops doc"
    - "Optionally: add a startup-time assertion in scripts/start-worker.ts that runs `CONFIG GET maxmemory-policy` and exits with a clear error if not `noeviction` (turn warning into hard fail)"
  debug_session: ""
