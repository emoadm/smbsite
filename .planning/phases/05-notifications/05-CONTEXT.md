# Phase 5: Notifications - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the newsletter sending pipeline + GDPR-compliant unsubscribe + member-facing notification preferences + visible site links to the coalition's WhatsApp Channel and Telegram. Concretely:

1. **Newsletter authoring** — a Payload `Newsletters` collection with Lexical RTE + structured fields (subject, preview-text, sections), live HTML preview, mandatory test-send-to-self before broadcast, optional `scheduledAt` for delayed dispatch.
2. **Newsletter sending** — async via the existing Phase 1 BullMQ queue (`src/lib/email/queue.ts`). Editor's `Send` request returns immediately; worker fans out per-recipient sends through Brevo. Recipient list = all members whose latest `consents` row for the message's topic has `granted = true` (per-topic suppression honored).
3. **Member preferences** — new authenticated route `/member/preferences` with: 4 per-topic newsletter toggles, preferred off-site channel (informational), persisted to the existing `consents` table.
4. **One-click unsubscribe** — RFC 8058 List-Unsubscribe + List-Unsubscribe-Post header on every newsletter; footer link calls a public `/api/unsubscribe` route. Click flips ALL 4 topics to `granted=false`, lands on a confirmation page with a resubscribe-via-/member/preferences link.
5. **Off-site community surface** — new public page `/community` (preview-vs-redeem: anonymous see teaser, members see real URLs) + footer links from every page. URLs sourced from a Payload Global so the coalition can swap them post-launch without a deploy.
6. **Email template architecture** — single Sinya-branded master template (Gilroy ExtraBold + Roboto + Sinya tokens) rendered via React Email; per-newsletter content slot renders the Lexical AST.
7. **Brevo sync** — opt-in/opt-out events propagate to Brevo's contact list within the same request via the API; BullMQ retries handle transient failures.

**In scope (7 requirements):** NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06, NOTIF-09.

**Explicitly NOT in this phase:**
- WhatsApp Business API two-way messaging (forbidden by Meta for political parties — PROJECT.md)
- WhatsApp Channels broadcast composer (Meta UI is the composer — we just link to the channel)
- Telegram bot or two-way messaging (only a link to the public channel)
- Recipient targeting filters by oblast / sector / role / source (deferred — see `<deferred>`)
- Cadence preferences (e.g., weekly / monthly user-side throttle) (deferred)
- Per-topic per-message unsub from the email footer link (deferred — granular control lives on /member/preferences)
- GDPR data export, account deletion UI, audit-table reads (Phase 6)
- Confirmed double opt-in by default (conditional fallback — see D-13 below)

</domain>

<decisions>
## Implementation Decisions

### Newsletter Composer (NOTIF-09)

- **D-01:** Authoring surface = **Payload Lexical RTE inside a `Newsletters` collection**. Structured fields: `subject` (text, required), `previewText` (text, ~90 chars), `topic` (select — one of the 4 enum values from D-08), `body` (Lexical RTE), `scheduledAt` (date, optional), `status` (draft / scheduled / sending / sent / failed). Lexical AST is rendered to HTML via React Email at send time. Editors get bold / italic / links / headings / lists; no raw HTML access. Locks brand consistency — editors cannot break the template.

- **D-02:** Pre-send safety = **mandatory test-send + live HTML preview**. The composer view embeds a live preview pane that renders the React Email output as the editor types (debounced). The `Send blast` action is GATED — disabled until `lastTestSentAt` is within 24 hours of the current draft state (any field edit invalidates it). `Send test to me` button enqueues a one-recipient email job to the editor's own admin email; once delivered, the gate unlocks. Catches Cyrillic encoding bugs, broken merge fields, and bad CTA links before they reach the live list.

- **D-03:** Recipient targeting in v1 = **blast-all-with-topic-respect**. No editor-side oblast / sector / role / source filters. Recipient query: `users` JOIN latest `consents` per (user, kind=`newsletter_${topic}`) WHERE `granted = true`. Each newsletter targets exactly one of the 4 topics (chosen at compose time); the per-topic suppression IS the v1 filter mechanism. Filters are deferred to a future phase (see `<deferred>`).

- **D-04:** Send timing = **send-now + schedule-send**. The composer's `scheduledAt` field is optional; empty = immediate `Send` enqueue, filled = BullMQ delayed-job enqueue at the timestamp. Admin UI for in-flight scheduled sends shows a `Cancel scheduled` action that removes the delayed job before it fires. Worker uses BullMQ's native `delay` option (no separate cron loop).

- **D-05:** Recipient-list snapshotting = **at dispatch time, not at compose time**. When the worker picks up the job, it queries the live `users` ⨝ `consents` set and emits one per-recipient sub-job per match. Late opt-ins between schedule and dispatch get included; late opt-outs are honored. Trade-off: editor cannot "lock the audience" at compose moment, but GDPR-cleaner — we never send to someone who opted out between compose and send.

### Member Preferences UX

- **D-06:** Surface = **dedicated `/member/preferences` page** under the existing `(frontend)/member/` route group. Authenticated only (re-uses the Phase 1 auth middleware). Linked from a "Настройки" card on `/member` dashboard (added next to the existing welcome banner + timeline + community CTA card).

- **D-07:** Page contents = **4 per-topic newsletter toggles + preferred off-site channel (informational) + language (locked to bg, displayed for v2 forward-prep)**. Each toggle toggle commits a new `consents` row with the appropriate topic kind (D-08) and `granted = on/off`; reading the latest row per (user, kind) gives the current state. The "preferred channel" radio (`whatsapp` / `telegram` / `none`) is purely informational in v1 — stored on the `users` row as a new nullable text column for future targeting; doesn't gate any current behavior.

- **D-08:** Newsletter topic enum (locked Bulgarian contract — like ATTR-06's source enum):
  1. `newsletter_general` → "Общи обявявания"
  2. `newsletter_voting` → "Нови гласувания"
  3. `newsletter_reports` → "Отчети по инициативи"
  4. `newsletter_events` → "Покани за събития"

  Stored in `consents.kind` (extends Phase 1's `CONSENT_KINDS` const). Display labels via next-intl keys `member.preferences.topics.*` and `admin.newsletters.topics.*`.

- **D-09:** Default per-topic state at registration = **all 4 topics granted**. The single `newsletter` checkbox at registration (Phase 1 D-12 wording stays untouched) writes 4 simultaneous `consents` rows on opt-in (one per topic, all `granted=true`). Member can opt out of specific topics on `/member/preferences` later. Honors Phase 1's "single newsletter checkbox" while enabling per-topic granularity. Phase 1's existing `kind='newsletter'` rows are honored as a blanket grant for backward compat — see `<code_context>` for the read-time reconciliation pattern.

### Off-Site Channel Surface (NOTIF-04 / NOTIF-05)

- **D-10:** Link surface = **dedicated `/community` page + footer links from every page**. The footer links sit alongside the existing footer-grid columns from Phase 2 D-Footer. The `/community` page lives at `(frontend)/community/page.tsx` and presents the WhatsApp Channel as a preview block + the Telegram Channel as a preview block + a "Защо и двете?" explainer paragraph (broadcast-only WhatsApp policy from PROJECT.md, two-way Telegram).

- **D-11:** Page audience model = **public preview-vs-redeem**. Anonymous visitors see `/community` with a teaser ("Регистрирай се за да получиш линковете към каналите"). Authenticated members see the actual `https://whatsapp.com/channel/...` and `https://t.me/...` URLs. Anonymous-side teaser preserves the registration funnel discipline; member-side render rewards the conversion. Implementation: server-side check on `auth()` session; render-time conditional. Footer links use the same conditional render — anonymous visitors see them disabled / pointing to `/community`; members see direct external links.

- **D-12:** URL storage = **Payload CMS `CommunityChannels` Global**. Single-row Payload Global (not a collection — one URL pair, never multiple). Fields: `whatsappChannelUrl` (text, optional) + `whatsappVisible` (bool, default false), `telegramChannelUrl` (text, optional) + `telegramVisible` (bool, default false), `bgDescription` (textarea — Bulgarian copy for the /community page intro). Pre-D-CoalitionChannels-resolution, both `*Visible` are false; the `/community` page renders "Каналите стартират скоро" placeholders. Coalition swaps URLs from `/admin/globals/community-channels` without a redeploy. Mirrors the Phase 2 placeholder mechanism for D-CoalitionChannels.

### Opt-In / Unsubscribe Semantics

- **D-13:** Opt-in flow v1 = **single opt-in (current pipeline) with conditional fallback to double opt-in**. Members are added to the live newsletter list when (a) they checked the newsletter box at registration and (b) they verified email via OTP — both already required in Phase 1. The OTP verification IS the email-validity proof; no separate "confirm subscription" email. **Fallback:** if Brevo's complaint rate or Postmaster Tools reputation drops below the warmup threshold (>= 0.3% complaint rate over a 7-day rolling window), planner adds a confirmation-email step before the first send. The fallback code path is designed-but-not-defaulted so the switch is a config flag, not a feature build.

- **D-14:** One-click unsubscribe UX = **immediate unsub + confirmation page**. RFC 8058 List-Unsubscribe + List-Unsubscribe-Post headers on every newsletter (Gmail/Yahoo 2024 requirement; NOTIF-02). Footer link points to `/api/unsubscribe?token={hmac}` — server validates the token, INSERTs `consents` rows with `granted=false` for ALL 4 topics, propagates the suppression to Brevo via the API call (await; if it fails, BullMQ retry queue picks it up), then redirects to a confirmation page (`/unsubscribed`) with a "Размислих си" resubscribe button (links to `/member/preferences`) and link to /community for off-site channel alternatives. No login required for the unsub click itself.

- **D-15:** Unsub scope = **all topics (full opt-out)**. The footer link unsubscribes the member from ALL 4 newsletter topics in one click. The confirmation page invites them to resubscribe to specific topics on `/member/preferences`. Aligns with Gmail/Yahoo's "one-click = stop hearing from this sender" interpretation; reduces spam-flag risk during warmup. Per-topic granularity exists ON `/member/preferences` — the email footer link is the firehose-off switch.

- **D-16:** Unsub token = **HMAC-signed payload `(user_id, issued_at)` with 90-day TTL**, signed with a server-side secret (`UNSUBSCRIBE_HMAC_SECRET` Fly.io secret). No DB-stored token table needed; server validates on click. 90-day window matches typical email retention; expired tokens land on a "Линкът е изтекъл; влезте в /member/preferences" page rather than 404.

### Email Template Architecture

- **D-17:** Template strategy = **single Sinya-branded master template via React Email** (`src/lib/email/templates/NewsletterEmail.tsx`). Gilroy ExtraBold via Google Fonts CDN fallback (web-font in email is best-effort — degrades gracefully to system stack on Outlook desktop). Sinya color tokens hard-coded as inline CSS variables (React Email's CSS-in-JS pattern). The template wraps a content slot that renders the Lexical AST (`RichText` component with explicit allowed-blocks list). Same template for all 4 topics — topic distinction is cosmetic (header chip color + footer category line); no separate per-topic React component.

- **D-18:** Cyrillic + Outlook compat (NOTIF-06 success criterion #3) = **explicit charset declaration + tested glyph set**. `Content-Type: text/html; charset=utf-8` set explicitly in the React Email component; `<meta charset>` in the `<head>`. Test send before merge MUST render Ж, Щ, Ъ, Ю, Я, ѝ correctly in: Gmail web, Outlook desktop (Windows mail.app), Apple Mail, Bulgarian webmail (abv.bg, mail.bg). Phase 1 D-27 tone gate (no vocative `Уважаеми`/`Уважаема`) applies — extends the existing tests/unit/queue.test.ts pattern.

- **D-19:** Image hosting = **Bunny.net CDN** (already provisioned per CLAUDE.md). Newsletter inline images uploaded via Payload's media collection → stored on Bunny → React Email references the public Bunny URL. No base64 inline (bloats payload, breaks Outlook). Editor uploads from the composer; Payload media collection extends to accept `image/png|jpeg|svg+xml`.

### Carry-forward Locks (Not Re-litigated Here)

- **D-20:** Sender domain = `news.chastnik.eu` (Phase 1 D-16 / D-17). Transactional path stays on `auth.chastnik.eu`. **BLOCKING:** `mail2._domainkey.news.chastnik.eu` CNAME must be added in Cloudflare DNS before first send (existing `D-Phase5-prep` deferred item).

- **D-21:** All outbound email goes through the existing BullMQ + Upstash Redis queue (Phase 1 D-19). Newsletter sends extend `EmailJobKind` enum in `src/lib/email/queue.ts` rather than introducing a new queue.

- **D-22:** Bulgarian-only via next-intl (Phase 1 D-27). All new strings (composer labels, /member/preferences UI, /community copy, email subject lines, footer text) live in `messages/bg.json`. Tone-lock vitest pattern from Phase 02.1 D-27 extended to the new namespaces (`auth.preferences`, `community`, `email.newsletter`, `admin.newsletters`).

- **D-23:** Sinya brand tokens + Gilroy ExtraBold + Roboto body apply to email templates (Phase 2 D-04..D-08).

- **D-24:** Pino REDACT (Phase 1 D-21 / Phase 02.1 D-19) extended for the newsletter worker logs — recipient email addresses MUST be redacted in structured logs (`'to'` field added to REDACT array if not already present). Per-recipient send results logged as `{user_id_pseudonymous, status, brevo_message_id}` only.

- **D-25:** Admin role gate (Phase 02.1 D-13) — Newsletter compose / send + CommunityChannels Global require `role IN ('admin','editor')`. Reuse the `assertEditorOrAdmin()` Server Action defense-in-depth pattern from Phase 02.1.

### Claude's Discretion

The following are not user-decided; planner picks during plan-phase:

- Exact Drizzle schema choice for per-topic consents — extend `CONSENT_KINDS` array with 4 new values (cleanest with existing append-only model) vs add a `topic` discriminator column. **Recommendation:** extend the const array; preserves the audit semantics.
- Lexical → React Email rendering library or hand-rolled walker. Payload 3.x ships a Lexical-to-HTML converter; planner evaluates whether it fits or whether a custom walker is needed for our React Email block set.
- BullMQ retry/backoff for newsletter sends — defaults: `attempts: 5` (matches transactional, since deliverability matters), exponential backoff with 30s base.
- Brevo contacts API sync timing — inline-await on opt-in (D-13 ships members to Brevo immediately) vs queued sub-job. Default: queued sub-job for retry safety.
- Live preview rendering technology — server-side React Email render via a Server Action that returns sanitized HTML (debounced) vs in-iframe client-side render. Recommendation: Server Action; matches the dashboard pattern from Phase 02.1 plan 07.
- Composer's `scheduledAt` upper bound — 30 days, 90 days, no cap. Default: 30 days.
- Test-send 24-hour gate window (D-02) — 24h is the recommended starting point; planner can tune.
- Newsletter draft autosave cadence — Payload 3.x ships drafts as native; configure debounce.
- HMAC unsubscribe secret rotation strategy — defer; Phase 6 covers credential rotation broadly.
- Whether the existing welcome email (Phase 1 `WelcomeEmail.tsx`) should be re-rendered through the new master template for visual consistency. Recommendation: yes, but as a no-op refactor in a single commit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project north star
- `.planning/PROJECT.md` — Core value, channel decisions (WhatsApp Channels broadcast-only + Telegram link), GDPR posture, sender architecture.
- `.planning/REQUIREMENTS.md` — Authoritative v1 requirements. Phase 5 covers NOTIF-01..06 + NOTIF-09. NOTIF-07 (warmup) and NOTIF-08 (queue) already DONE in Phase 1.
- `.planning/ROADMAP.md` § "Phase 5: Notifications" — Phase goal + 4 success criteria. The 4 SCs are: (1) async editor blast, (2) one-click unsubscribe with same-session ESP sync, (3) Cyrillic in Gmail + Outlook desktop, (4) WhatsApp + Telegram links + member channel preference. Plan-phase MUST verify each.
- `.planning/STATE.md` — Deferred items: `D-Phase5-prep` (mail2._domainkey CNAME) and `D-CoalitionChannels` (URL handoff).

### Stack
- `CLAUDE.md` — Stack lock: Brevo (transactional + newsletter), React Email 3.x, Bunny.net CDN, Upstash Redis (BullMQ rate-limit + queue), Payload CMS 3 (Newsletters collection + CommunityChannels Global). Deliverability section + DMARC/SPF/DKIM 2026 link is Phase 5 prerequisite reading.

### Prior phase decisions (carry-forward — read top-to-bottom)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-12 (registration newsletter checkbox wording), D-13 (consents append-only audit table), D-16/D-17 (sender domain split: `news.chastnik.eu` for newsletter, `auth.chastnik.eu` for transactional), D-18 (warmup ladder), D-19 (BullMQ + Brevo queue), D-21 (no PII in logs), D-27 (next-intl + nominative greetings).
- `.planning/phases/02-public-surface-pre-warmup/02-CONTEXT.md` — D-04..D-08 (Sinya tokens + Gilroy + Roboto — applies to email templates), D-09 (/member dashboard layout — preferences card + community CTA card both attach here).
- `.planning/phases/02.1-attribution-source-dashboard/02.1-CONTEXT.md` — D-10 (self-reported source enum — referenced for future newsletter targeting decisions, NOT used in v1), D-13 (Payload custom view + role gate pattern — newsletter composer reuses), D-19 (Pino REDACT extension pattern — applies to newsletter worker logs).
- `.planning/phases/02.1-attribution-source-dashboard/02.1-LEARNINGS.md` — Patterns: forbidden-token grep test, tone-lock vitest pattern, greppable enum lock-in test, fire-and-forget enqueue, Drizzle onConflictDoUpdate. Lessons: build-time env vars at module-eval time, Payload importMap shadow routing, RSC multipart for k6 → Server Action POSTs.

### Pitfalls (mandatory reading for planner)
- `.planning/research/PITFALLS.md` — Specifically these apply to Phase 5:
  - **Pitfall 5** (email deliverability — sender reputation) → drives D-13 (single opt-in v1 with double-opt-in fallback), D-14 (RFC 8058 one-click), D-17 (Sinya master template + Outlook test).
  - **Pitfall 6** (QR launch surge) → drives D-21 (queue reuse — no synchronous sends), D-04 (BullMQ delayed jobs handle scheduled sends).
  - **Pitfall 10** (Bulgarian encoding + vocative) → drives D-18 (charset + glyph test) + D-22 (next-intl + tone gate).
  - **Pitfall 11** (lawful basis) → drives D-09 (default-granted opt-in honors Phase 1 D-12 wording — no retroactive basis swap).

### Code references for planner
- `src/lib/email/queue.ts` — Existing BullMQ producer. Extend `EmailJobKind` enum to include `newsletter-blast` + `newsletter-test`. Reuse the IORedis singleton.
- `src/lib/email/worker.tsx` — Existing Brevo sender worker. Newsletter handler is a new `kind` branch in the worker switch.
- `src/lib/email/templates/` — `OtpEmail.tsx`, `WelcomeEmail.tsx` are pattern analogs for `NewsletterEmail.tsx`.
- `src/db/schema/consents.ts` — `CONSENT_KINDS` const + `consents` table. Extend the const with 4 new newsletter topic values; the table itself needs no schema change.
- `src/db/schema/auth.ts` — `users` table. Add nullable `preferred_channel` text column (`whatsapp` | `telegram` | `none` | NULL).
- `src/components/forms/RegistrationForm.tsx` — Existing registration form. Phase 5 does NOT modify form fields (D-12 wording untouched); only the post-submit handler changes (writes 4 topic rows when newsletter checkbox is checked).
- `src/app/(frontend)/member/page.tsx` — Existing /member welcome page. Phase 5 ADDS a "Настройки" card alongside the welcome banner + timeline.
- `src/payload.config.ts` — Phase 02.1 added a custom view; Phase 5 adds (a) `Newsletters` collection (`src/collections/Newsletters.ts`), (b) `CommunityChannels` Global (`src/globals/CommunityChannels.ts`), and likely (c) extends the importMap (per the Phase 02.1 lesson about importMap shadow routing — be explicit).
- `messages/bg.json` — All new strings land here. New top-level namespaces: `member.preferences`, `community`, `email.newsletter`, `admin.newsletters`, `unsubscribe`.

### To create during Phase 5 (forward refs)
- `src/collections/Newsletters.ts` — Payload collection definition.
- `src/globals/CommunityChannels.ts` — Payload Global definition.
- `src/lib/email/templates/NewsletterEmail.tsx` — React Email master template.
- `src/lib/email/newsletter/{queue,worker,recipients,brevo-sync}.ts` — newsletter-specific module split (mirrors `src/lib/attribution/{queue,worker}.ts` from Phase 02.1).
- `src/app/(frontend)/member/preferences/page.tsx` — Member preferences page.
- `src/app/(frontend)/community/page.tsx` — Public community page (preview-vs-redeem).
- `src/app/api/unsubscribe/route.ts` — One-click unsubscribe Node-runtime endpoint.
- `src/lib/unsubscribe/hmac.ts` — HMAC sign + verify helpers.
- `tests/unit/newsletter-*.test.ts` — Topic enum lock-in, tone gate, REDACT extension, recipient query parameterization.
- `tests/integration/unsubscribe-route.test.ts` — Token validation + suppression INSERT.
- `tests/e2e/newsletter-preferences.spec.ts` — Member toggles + persistence + ESP sync.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/lib/email/queue.ts`** (BullMQ producer): extends with `newsletter-blast` and `newsletter-test` kinds; producer signature stays compatible.
- **`src/lib/email/worker.tsx`** (Brevo sender): adds `case 'newsletter-blast'` branch; same Brevo API client, same retry policy with `attempts: 5`.
- **`src/lib/email/templates/{Otp,Welcome}Email.tsx`** (React Email components): patterns for the new `NewsletterEmail.tsx` master template — including the existing `<Body>` structure, footer pattern, Bulgarian subject conventions.
- **`src/db/schema/consents.ts`**: existing append-only audit table. Phase 5 extends `CONSENT_KINDS` array with 4 new newsletter-topic values (`newsletter_general`, `newsletter_voting`, `newsletter_reports`, `newsletter_events`). No table-shape changes.
- **`src/components/forms/RegistrationForm.tsx`**: Phase 5 leaves the form fields unchanged; only the `register` Server Action writes 4 topic-consent rows when the newsletter checkbox is checked (replacing the single `kind='newsletter'` row from Phase 1).
- **`src/app/(frontend)/member/page.tsx`** (Phase 2 welcome page): Phase 5 ADDS two cards — "Настройки" (links to /member/preferences) and "Общностни канали" (links to /community). Existing welcome banner + timeline stay.
- **Payload custom-view + role-gate pattern from Phase 02.1**: composer view uses the same `assertEditorOrAdmin()` defense-in-depth across page-component AND Server Action layers.
- **MainContainer + footer + nav components from Phase 2**: /community + /member/preferences pages reuse the existing layout shell.

### Established Patterns
- **Append-only consents (Phase 1 D-13)**: every preference toggle INSERTs a new row; reads use `latest-per-(user, kind)` query. Phase 5 inherits this — never UPDATE or DELETE.
- **Single-checkbox-multi-row registration** (new, established by Phase 5 D-09): when user checks the newsletter box at registration, the `register` Server Action writes 4 simultaneous `consents` rows (one per topic). Read-time reconciliation: a row with `kind='newsletter'` (Phase 1 grant pre-Phase-5) is treated as a blanket grant for all 4 topics until superseded by an explicit topic-row INSERT. Backward compat for existing Phase 1 registrants.
- **Forbidden-token grep test (Phase 02.1 D-19 lineage)**: `tests/unit/newsletter-template.test.ts` greps the master template source for forbidden tokens (e.g. `Уважаем`, `console.log`, `dangerouslySetInnerHTML`).
- **Tone-lock vitest (Phase 02.1 D-27 lineage)**: `tests/unit/newsletter-i18n.test.ts` asserts every `email.newsletter.*` and `member.preferences.*` key resolves to a non-empty Bulgarian string AND no vocative forms.
- **Pino REDACT extension**: add `'to'` and `'recipient_email'` to the REDACT array in `src/lib/logger.ts` if not already present.
- **Fire-and-forget patterns from Phase 02.1**: opt-in/opt-out Brevo sync uses `void brevoSync(...).catch(/* enqueue retry */)` so request path stays sub-200ms.
- **Payload importMap explicit registration (Phase 02.1 lesson)**: any new `Newsletters` admin component must be registered in `src/app/(payload)/admin/importMap.js` AND match the `Component` path in `payload.config.ts` exactly — sibling `page.tsx` files cause shadow routing.

### Integration Points
- **`src/app/actions/register.ts`** — modify the consent-write branch: when `data.newsletter_optin === true`, INSERT 4 rows (one per `newsletter_*` topic) instead of one `newsletter` row. Existing `consents` writes for `privacy_terms` / `cookies` / `political_opinion` unchanged.
- **`src/middleware.ts`** — does NOT touch newsletter or unsubscribe routes (matcher already excludes `api/`). The unsubscribe route is Node-runtime, fire-and-forget on the Brevo sync.
- **`src/lib/email/queue.ts`** — extend `EmailJobKind` and `EmailJobPayload`. The queue itself stays the same Upstash instance.
- **`messages/bg.json`** — 4 new top-level namespaces (`member.preferences`, `community`, `email.newsletter`, `admin.newsletters`), 1 new flat namespace (`unsubscribe`).
- **`src/payload.config.ts`** — register `Newsletters` collection + `CommunityChannels` Global.

</code_context>

<specifics>
## Specific Ideas

- Editors should NOT be able to break the email template via formatting tricks; the Lexical RTE allowed-blocks list is restrictive (paragraph, heading-2, heading-3, link, list, image — no raw HTML, no custom blocks).
- The /community page's "Защо и двете?" explainer paragraph is a real content beat (broadcast-only WhatsApp policy is a coalition story, not a footnote) — coalition writes the copy; placeholder ships.
- The "Настройки" card on /member dashboard is the discoverability hook for the preferences page. Without it, members who didn't register yesterday will never find the prefs page.
- Live preview pane is non-negotiable — editors must see what the email will look like (especially Bulgarian renders) before any send. Phase 5 cannot ship without it.

</specifics>

<deferred>
## Deferred Ideas

- **Recipient targeting filters (oblast / sector / role / source)** — composer-side filters to send to subsets of subscribers. Punted from Phase 5 D-03 to a future phase. Rationale: v1 has one editor + warmup-list-sized recipient set; filters are premature optimization. Revisit when audience > 1000 + multiple editors active.
- **Cadence preferences (weekly / monthly / important-only per member)** — punted from Phase 5 D-07 (M2 question). Rationale: throttle logic at queue dispatch is medium scope; v1's send rhythm (~weekly) doesn't justify it. Members can opt-out per-topic instead.
- **Per-topic per-message unsubscribe from email footer link** — punted from Phase 5 D-15. Granular control lives on /member/preferences only; one-click footer link is full opt-out. Rationale: ESP "one-click" semantics + warmup deliverability discipline.
- **Confirmed (double) opt-in by default** — punted from Phase 5 D-13. Single opt-in ships in v1; double opt-in is a designed-but-not-defaulted fallback flag. Revisit if Brevo complaint rate >= 0.3% during weeks 2-4 of warmup.
- **WhatsApp Business API two-way messaging** — out of scope per PROJECT.md (forbidden by Meta for political parties).
- **Telegram bot / two-way Telegram messaging** — Phase 5 only links to a public channel; no bot.
- **Bulgaria-map SVG visualization for newsletter open-rate by oblast** — out of scope; possible Phase 6+ analytics work.
- **Per-member language preference UI on /member/preferences** — D-07 surfaces a language radio that's locked to bg in v1; mechanism is forward-prep for v2 multilingual support.
- **D-Phase5-prep (`mail2._domainkey.news.chastnik.eu` CNAME)** — operator-side DNS task already tracked in STATE.md; must complete before first newsletter send.
- **D-CoalitionChannels (WhatsApp Channel + Telegram URLs)** — coalition deliverable already tracked in STATE.md. Phase 5 ships with Payload Global placeholder mechanism so coalition can swap URLs without a deploy.
- **Master-template re-render of existing Phase 1 emails (welcome / OTP)** — Claude's discretion; nice-to-have refactor for visual consistency, not Phase 5 scope.

</deferred>

---

*Phase: 5-notifications*
*Context gathered: 2026-05-04*
