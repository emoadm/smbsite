# Phase 3: Idea Catalog + Voting - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning (HARD-BLOCKED on external GDPR Art. 9 legal opinion — see `<external_blocker>` below)

<external_blocker>
## EXTERNAL BLOCKER — DO NOT START IMPLEMENTATION UNTIL RESOLVED

Phase 3 captures political-opinion data (recording each member's approve/reject choice tied to a confirmed identity) and is therefore CRITICAL under GDPR Art. 9 (special-category data).

**Open Decision #3 (REQUIREMENTS.md, STATE.md blocker):** External Bulgarian data-protection lawyer must deliver a written opinion confirming the lawful basis for recording political-opinion votes. Two paths the lawyer evaluates:

1. **Art. 9(2)(a) — explicit consent** — Phase 1 D-12 #4 already captures `consents.kind = 'political_opinion'` at registration with placeholder wording. Lawyer may require revised wording before Phase 3 ships; the consent flow updates in lockstep.
2. **Art. 9(2)(d) — not-for-profit-member exception** — viable only if processing stays "strictly for internal member purposes." The decisions in this CONTEXT.md (anonymous public votes, no public name surface) deliberately keep this path open. If the lawyer relies on this exception, public reach of vote data must be re-verified against the ruling.

Coalition commissioned this opinion in parallel with Phase 1-2 development (per STATE.md). Plan-phase, research-phase, and execution-phase work for Phase 3 **must not** start until the opinion is on file at `.planning/legal/art9-opinion.md` (or equivalent path) and any required wording changes have been integrated into the Phase 1 `consents` flow.

**Decisions captured here are valid as planning inputs**; nothing is shipped to production until the lawyer's opinion lands. Two decisions in this CONTEXT.md are explicitly deferred-to-lawyer-confirmation and called out below: D-13 retention and D-04 anonymous-public-vote scope.

</external_blocker>

<domain>
## Phase Boundary

Phase 3 delivers the editorial idea catalog + the binary voting engine + the six-layer anti-abuse stack + the editor's admin surfaces for authoring ideas and reviewing vote-velocity anomalies + the member's dashboard "My Activity" panel + a read-only profile page.

**In scope (14 requirements):** IDEA-01, IDEA-02, IDEA-03, IDEA-04, IDEA-05, IDEA-06, IDEA-07, IDEA-08, MEMB-01, MEMB-02, MEMB-03 (verification only — Phase 5 already shipped `/member/preferences`), EDIT-01, EDIT-02, OPS-04.

**Concretely:**

1. **Public catalog page `/idei`** — server-rendered card grid (1/2/3 columns responsive), 12 cards per page (page-based pagination), topic chip filter (multi-select), 3 sort options (Най-нови / Най-одобрени / Отбор на редактора), editor's-pick badge on cards. Two empty states (platform-empty + filter-empty). No public search in v1.

2. **Public idea detail page `/idei/{slug}`** — full Lexical content render, optional hero image, public-facing approve count + approval %, members-only reject count, threshold-gated reveal (counts hidden until total votes ≥ N=20), 5-minute server-side cache on the displayed counts.

3. **Voting engine** — soft cooling gate (vote casts immediately; the displayed-count query JOINs `users.email_verified_at + INTERVAL ${VOTE_COUNTABLE_INTERVAL}` to filter cooling votes from the count). Two-tier per-user rate-limit (Upstash) — Turnstile required between soft and hard thresholds. One-vote-per-account-per-idea via DB-level UNIQUE on `votes(user_id, idea_id)`. 1-click change + 1-click retract with 5-second toast undo on retract.

4. **Vote audit** — `votes` table (current state, UNIQUE) + `vote_events_log` table (append-only mirror with HMAC-hashed IP/UA/subnet for OPS-04 forensics, fresh-account flag, action enum cast/change/retract). `ON DELETE CASCADE` on member deletion (final retention deferred to Art. 9 lawyer).

5. **Vote-velocity anomaly alerts (OPS-04)** — multi-axis trigger (per-idea velocity, /24-subnet aggregate, fresh-account share). Alert channels: in-admin badge + Sentry event tagged `vote_velocity_anomaly` + editor email via existing BullMQ queue (Phase 1 D-19). Editor manually freezes display or excludes votes; **never** auto-freeze (Pitfall 1 #5). Display-freeze on idea page is silent to public (no banner).

6. **Editor admin surfaces** — `/admin/views/vote-anomalies` (mirrors `/admin/views/attribution` from Phase 2.1) with per-vote forensic table; inline anomaly count badge on Ideas list rows; Ideas edit-screen sidebar with live stats + freeze/unfreeze toggle + recent activity feed.

7. **Ideas Payload collection** — Lexical RTE with the same allowed-blocks whitelist as Newsletters (paragraph, h2, h3, link, ordered/unordered list, image upload via Bunny.net, bold, italic; no code blocks, blockquotes, raw HTML). Status flow: `draft → published → archived`. Slug auto-generated from title (Cyrillic→Latin transliteration, immutable post-publish). Optional hero image. `is_featured` boolean for editor's-pick. Hardcoded 6-topic enum (next-intl labels). "View on site" preview button on draft.

8. **`moderation_log` table (full schema in Phase 3)** — append-only, `(id, action, actor_user_id, target_kind, target_id, target_ids[], note, created_at)`. Phase 3 writes from: bulk vote-exclusion, idea display-freeze/unfreeze. Phase 4 EDIT-06 extends with `user_suspend` / `submission_reject` action enum values (no schema change).

9. **Member dashboard updates** — new "My Activity" panel on `/member` (reverse-chronological list of voted ideas with title, my choice, current approve count, inline retract/change actions; reuses `components/member/Timeline.tsx` pattern). Two new dashboard CTAs: "Разгледай идеи" → `/idei` and "Присъедини се към общността" → `/community` (existing).

10. **Member profile page `/member/profile`** — read-only display of full_name, email, registration date, sector, role, preferred_channel; link to `/member/preferences` for notification toggles (Phase 5 already shipped); GDPR-04 "Изнеси моите данни" button → Phase 6 placeholder page.

**Explicitly NOT in this phase:**
- Member proposals / problem reports (Phase 4)
- Full editorial moderation queue UI (Phase 4 — Phase 3 ships only the moderation_log schema + vote-exclusion writes)
- Account suspension UI (Phase 4 EDIT-06)
- Public catalog full-text search (FEATURES.md row 33 — v1.x deferred)
- Idea-closing / lifecycle states beyond draft/published/archived (deferred to Phase 4 or v2)
- Date-range filter on catalog (sort by date suffices; deferred to v2)
- Idea page comments / discussion threads (PROJECT.md out-of-scope)
- Scheduled-publish for ideas (Newsletters-only pattern; not relevant for catalog ideas)
- Full account self-service (email change, sector/role edit) — deferred to v2
- Device fingerprinting (FingerprintJS) — Pitfall 1 #7 suggestion; v2 deferred
- BULSTAT verification tier — Pitfall 1 #6; V2-VERIFY-01 stays deferred per Phase 1 D-08
- 7-day display-tally hold as default — `VOTE_COUNTABLE_INTERVAL` defaults to `48h` per Decision D-09; ops can flip to `7d` without code change
- GDPR-04 actual data export implementation — Phase 3 ships placeholder only; Phase 6 implements
- Account deletion UI — Phase 6 GDPR-05
- WhatsApp / Telegram cross-promo per-idea (NOTIF-04/05 are Phase 5 channel surface, not per-idea broadcasts)

</domain>

<decisions>
## Implementation Decisions

### Vote Visibility, Names & Result Display
- **D-01:** **Names are anonymous on all public surfaces.** Catalog cards, idea detail pages, and any public surface render only aggregate counts. `user_id` is internally linked for one-vote-per-account enforcement and editor moderation; never exposed publicly. **Resolves Open Decision #1** (REQUIREMENTS.md). The deferred `display_name` column from Phase 1 D-11 stays deferred — it can come back in Phase 4 if proposals/reports require an authored byline (separate decision).
- **D-02:** **Result display layering by viewer role.** Public/anonymous see: approve count + approval % (e.g., "432 одобряват — 83% одобрение"). Logged-in members see ALSO the reject count ("87 не одобряват"). Editors in admin see the full breakdown including raw vote stream. **Resolves IDEA-08.** Pitfall 9 mitigation: public never has a downvote number to weaponize in a screenshot.
- **D-03:** **Threshold-gated result reveal + 5-minute server-side cache.** Counts hidden entirely until total votes ≥ N (default `IDEA_REVEAL_THRESHOLD=20`, planner tunes via env or const). Empty-state copy: "Гласуването е в ход — резултатите ще се покажат след първите %{N} гласа." After threshold, displayed counts come from a server-side query cache with 5-minute TTL (vote write does NOT bust the cache; cache refreshes on next read after expiry). Pitfall 1 #5 mitigation. Vote write is real-time; only the displayed count is delayed.
- **D-04:** **Soft cooling gate (vote casts immediately, displayed-count filters cooling).** IDEA-07's "48-hour cooling period between email confirmation and FIRST ОТЧЕТЕН VOTE" is satisfied via the "отчетен" (counted) reading, not "cast." Vote INSERT happens immediately upon click. The cached-count query JOINs `users.email_verified_at + INTERVAL ${VOTE_COUNTABLE_INTERVAL}` and filters out cooling votes. Member's `/member` "My Activity" panel shows "Гласът ти ще се отчете след %{HH}ч %{MM}м" for cooling votes. **(Note:** lawyer will confirm whether this satisfies the spirit of Art. 9 cooling-period intent; default-safe interpretation.)
- **D-05:** **Member dashboard "My Activity" panel = full list with retract/change actions.** Reverse-chronological list of voted ideas: title (link to `/idei/{slug}`), my choice ("Одобрено от теб" / "Не одобрено от теб"), current public approve count (cached), inline "Отдръпни глас" + "Промени" actions. Reuses `components/member/Timeline.tsx` pattern. **Resolves MEMB-01.** Member's own log is private to them by definition (anonymous publicly).

### Idea Catalog UX & Filters
- **D-06:** **Catalog layout = responsive card grid.** 1 col mobile, 2 cols tablet, 3 cols desktop. Each card renders: title, topic chip, short excerpt (first paragraph), approve % bar (when revealed past threshold), vote count, optional editor's-pick badge. Click card → `/idei/{slug}` detail page. Consistent with Phase 2 / Sinya design language; mobile-first since most SMB owners arrive via QR scan on mobile.
- **D-07:** **Topic enum (locked v1, hardcoded):**
  1. `taxes` → "Данъци"
  2. `labor` → "Трудово законодателство"
  3. `regulation` → "Регулаторни режими"
  4. `financing` → "Финансиране и кредит"
  5. `digitalization` → "Цифровизация"
  6. `other` → "Други"

  Stored as `text` on the `ideas` row (project convention from `auth.ts` sector/role D-09/D-10 and `attribution.ts` self_reported_source — never `pgEnum` because adding values is DDL). Display labels via `next-intl` keys `idea.topic.*`. Adding a topic post-launch = code change + deploy. Coalition revisits if they want a Payload Global later (deferred). **Adds `D-CoalitionIdeaTopicsList` as a coalition deliverable for v1 wording confirmation** (coalition signs off on the 6 names before Phase 3 ships).
- **D-08:** **Filter UX = topic chip multi-select + 3 sort options + editor's-pick badge.** Topic chips at top of `/idei` page (multi-select; click toggles in/out of filter set). Sort dropdown:
  - Най-нови (default, `created_at DESC`)
  - Най-одобрени (`approve_count DESC`, only ideas past reveal threshold; pre-threshold ideas appear after)
  - Отбор на редактора (`is_featured DESC, created_at DESC`)

  Editor's-pick badge rendered on cards (not a separate filter — use the sort to find them). No date-range filter v1. No status toggle v1 (no idea-closing mechanism). **Resolves IDEA-02.**
- **D-09:** **Pagination strategy = page-based, 12 per page.** Server-rendered URL: `/idei?page=N&topic=A,B&sort=newest`. SEO-friendly; keyboard / screen-reader friendly; deep-linkable. Two empty-state components:
  - Platform-empty (no published ideas): "Скоро ще започнем да публикуваме идеи..." + CTA to `/community`.
  - Filter-empty (filter excludes all results): "Нямаме идеи в избраните теми. <button>Нулирай филтъра</button>".

### Anti-Abuse: Cooling Gate, CAPTCHA, Vote-Velocity Alerts
- **D-10:** **`VOTE_COUNTABLE_INTERVAL` env-var knob.** Default `48h`. Allowlisted format regex: `^\d+ (hours|days)$` (sanitized at startup; invalid value = startup fail with structured log per Phase 1 D-21 pattern). Coalition + ops can flip to `7d` (Pitfall 8 #3 hardening) or other values without code redeploy. Documented in OPS-RUNBOOK.
- **D-11:** **CAPTCHA-on-suspicion = two-tier per-user rate limit + Turnstile required between soft and hard.** Reuses Phase 1 D-05 Turnstile + D-07 Upstash patterns. Suggested defaults (planner tunes): soft `5 votes / 60s`, hard `20 votes / 60s`. Below soft: vote passes silently. Soft ≤ rate < hard: server returns "needs Turnstile token"; client renders the challenge; on success, retry vote. ≥ hard: block with "Превишаваш допустимата честота на гласуване. Опитай отново след няколко минути." **Resolves IDEA-06.**
- **D-12:** **Vote-velocity anomaly alert (OPS-04) = multi-axis trigger, manual editor review, never auto-freeze.**
  - **Triggers (any one fires):**
    - Per-idea velocity: `> N1 votes in T1 min on a single idea` (planner-tunable, default 30/10).
    - /24-subnet aggregate: `> N2 votes / T2 min from one /24` (default 20/30).
    - Fresh-account share: `> P% of an idea's recent N3 votes from accounts < VOTE_COUNTABLE_INTERVAL post email_verified_at` (default 50% of last 20 votes).
  - **Alert channels:** in-admin badge on the idea row + Sentry event tagged `vote_velocity_anomaly` + email to editors via existing BullMQ queue (Phase 1 D-19; reuses Phase 5 newsletter worker pipeline).
  - **Editor action:** `/admin/views/vote-anomalies` shows per-vote forensic table; editor can manually click "Замрази отображаването" (sets `idea.display_frozen=true`; cached-count query gates on this; writes `moderation_log` action `idea_display_freeze`) or "Изключи избраните гласове" (bulk select votes from `vote_events_log`; soft-deletes from `votes` table; writes `moderation_log` action `vote_exclude` with `target_ids[]`).
  - **Pitfall 1 #5 explicit:** NEVER auto-freeze. Opponents would game alerts to suppress legitimate ideas. Display-freeze visibility on the public idea page is **silent** (D-23) — no banner, no notice; opponents can't tell which ideas are under review.

### Vote Audit Semantics
- **D-13:** **Two-table model: `votes` (current state, UNIQUE) + `vote_events_log` (append-only).**
  - `votes(id, user_id, idea_id, choice ('approve'|'reject'), created_at, updated_at)`. UNIQUE constraint on `(user_id, idea_id)` enforces IDEA-04 at the DB level. `ON DELETE CASCADE` from users + ideas.
  - `vote_events_log(id, user_id, idea_id, choice ('approve'|'reject'|null), action ('cast'|'change'|'retract'), occurred_at, ip_hash, ua_hash, subnet_hash, fresh_account_at_event boolean)`. Append-only — never UPDATE/DELETE. `ON DELETE CASCADE` from users + ideas.
  - Mirrors Phase 1 D-13 `consents` append-only pattern at one level of indirection. The `votes` table answers "what's the current effective vote per (user, idea)?" cheaply; `vote_events_log` answers "show me the full history" for Art. 9 audit, anomaly forensics, and editor exclude-vote action.
- **D-14:** **Retract = DELETE the `votes` row + INSERT `vote_events_log` with action='retract', choice=null.** Cached-count query stays simple (`SELECT COUNT(*) FROM votes WHERE idea_id=$1 AND choice='approve'`). UNIQUE constraint is full-table UNIQUE (no partial-index complexity). Re-vote after retract = clean INSERT. **Resolves IDEA-05.**
- **D-15:** **`vote_events_log` columns lock NO RAW IP / NO RAW UA.** Aligned with Phase 2.1 D-19 / GDPR-09 strict rule. Three hashed identifiers via HMAC-SHA256 with a server secret (`VOTE_AUDIT_HMAC_SECRET` Fly.io secret + GitHub Actions secret):
  - `ip_hash` — HMAC over the full IPv4/IPv6 string. Used for exact-match aggregation.
  - `subnet_hash` — HMAC over the /24 prefix (IPv4) or /64 prefix (IPv6). Used for OPS-04 subnet-cluster detection without raw IP.
  - `ua_hash` — HMAC over the user-agent string. Used for OPS-04 device-cluster signal.
  - `fresh_account_at_event` — boolean computed at INSERT as `(NOW() - voter.email_verified_at) < VOTE_COUNTABLE_INTERVAL`. Lets OPS-04 fresh-account-share trigger run without re-joining at query time.

  HMAC secret rotation cadence: annual (planner adds OPS-RUNBOOK entry); old hashes still match within the same key epoch (no cross-epoch comparison required for OPS-04 since alerts fire on recent windows).
- **D-16:** **Account-deletion behavior = `ON DELETE CASCADE` on both `votes` and `vote_events_log`.** Default-safe under the strict GDPR Art. 17 reading. **Lawyer confirmation point — flag for Phase 6 GDPR-05:** if Art. 9 lawyer prefers `SET NULL` aggregate-preservation, planner flips with one schema migration (column already nullable on `vote_events_log.user_id` per design). Active-member retention = indefinite (no scheduled prune in v1).

### Ideas Payload Collection & Editor Authoring
- **D-17:** **Ideas collection mirrors Newsletters.** Lexical allowed-blocks: paragraph, h2, h3, link, ordered list, unordered list, image (upload via Payload media collection extended for `image/png|jpeg|svg+xml` per Newsletters D-19), bold, italic. Banned: code blocks, blockquotes, custom blocks, raw HTML. Status enum: `draft → published → archived` (no `scheduled` state; scheduled-publish is a Newsletters-specific pattern). Editor moves `published → archived` to take an idea out of rotation; archived ideas keep `vote_events_log` but disappear from public catalog. Access control: `assertEditorOrAdmin` (Plan 05-01 pattern) — defense-in-depth re-check inside Server Actions.
- **D-18:** **Slug + hero + editor's-pick.**
  - **Slug:** auto-generated from `title` via `slugify-bg` helper (transliterate Cyrillic → Latin, lowercase, hyphenate, dedupe-with-numeric-suffix). Editable in Payload before publish; immutable after publish (kept in URL). 404 redirects via `/idei/{old-slug}` are out of scope v1.
  - **Hero image:** optional `hero` field, single image upload via existing Payload media collection (extended per Newsletters D-19 to accept `image/png|jpeg|svg+xml`); served via Bunny.net CDN. No base64 inline.
  - **Editor's-pick:** simple `is_featured` boolean field on the Ideas row + nullable `featured_order` int for stable tiebreaker among featured ideas. The "Отбор на редактора" sort surfaces `is_featured=true ORDER BY featured_order ASC NULLS LAST, created_at DESC`.
- **D-19:** **Hardcoded topic enum + draft preview button (NO live preview pane).** Topics are hardcoded in code per D-07. Adding a topic = code change + deploy. Coalition can revisit later via a Payload Global (deferred — see `<deferred>`). PREVIEW MECHANISM: a "Виж как изглежда на сайта" button on the Payload edit screen opens `/idei/{slug}?preview=draft` in a new tab; server reads the `preview=draft` query param and gates on editor session (Auth.js role check) before rendering the draft state. Editor sees the catalog card AND the full detail page exactly as they would appear post-publish. No live in-edit preview pane (Newsletters' D-02 pattern is overkill for catalog ideas — no Cyrillic-rendering email pitfall to catch).

### Editor Admin Surfaces
- **D-20:** **Vote-anomaly review = dedicated `/admin/views/vote-anomalies` + inline badges on Ideas list.** Mirrors `/admin/views/attribution` from Phase 2.1. Top-level admin view with table of unresolved anomalies sorted by recency: idea title, trigger type (per-idea velocity / subnet cluster / fresh-account share), event count, first/last detected, status (`unresolved | dismissed | acted`). Filter by trigger + date range. Click row → idea-anomaly detail with the per-vote forensic table (`occurred_at`, `choice`, `ip_hash` truncated for display, `subnet_hash`, `ua_hash`, `fresh_account_at_event`, status). Inline anomaly count badge on Payload's standard Ideas list ("⚠ 3 alerts" column) for ideas with unresolved anomalies. Bulk-action on per-vote table: "Изключи избраните гласове" with confirmation modal (writes `moderation_log` + DELETEs from `votes`; `vote_events_log` unchanged for audit).
- **D-21:** **`moderation_log` table — full schema in Phase 3.** `moderation_log(id uuid PK, action text NOT NULL, actor_user_id uuid REFERENCES users ON DELETE RESTRICT, target_kind text NOT NULL ('idea'|'user'|'votes'|'submission'), target_id uuid, target_ids uuid[], note text, created_at timestamptz NOT NULL DEFAULT NOW())`. Append-only — never UPDATE/DELETE (Phase 1 D-13 / Phase 6 GDPR-07 audit pattern). Phase 3 writes from: editor "Изключи гласове" (`action='vote_exclude'`, `target_kind='votes'`, `target_ids=[...vote_events_log.id]`), editor "Замрази отображаването" (`action='idea_display_freeze'`, `target_kind='idea'`, `target_id=idea.id`), editor "Размрази" (`action='idea_display_unfreeze'`). Phase 4 EDIT-06 ADDS action enum values `user_suspend` / `user_unsuspend` / `submission_reject` without changing the schema.
- **D-22:** **Ideas edit-screen sidebar with live stats + freeze toggle + recent activity feed.** Right-rail (or below the Lexical editor on narrow screens) shows: total votes, approve count, reject count, % approval (computed from cached values; pre-threshold shows "Скрито"), last-5 vote events from `vote_events_log` with action + occurred_at + fresh_account flag, per-idea anomaly badge (links to anomaly detail at `/admin/views/vote-anomalies?idea_id={id}`). Toggle: "Замрази отображаването" / "Размрази" calls a Server Action that flips `idea.display_frozen` and writes `moderation_log`. No live websocket; refresh = new data on view-load. Single-screen idea-health view without leaving the edit context.

### URL Shape, Retract UX & Bulgarian Copy Locks
- **D-23:** **URL shape: top-level `/idei` and `/idei/{slug}`. `/community` stays channels-only.** Member dashboard updates with two CTAs: "Разгледай идеи" → `/idei` and existing "Присъедини се към общността" → `/community` (Phase 5 D-10/D-11 unchanged). Display-freeze on the public idea page is **silent** — no banner, no public indicator. Editors see clear "Замразено от %{name} на %{date}" badge in admin only.
- **D-24:** **Retract / change UX: 1-click both, with 5-second toast undo on retract.** Two buttons displayed always on idea detail: "Одобрявам" / "Не одобрявам". If member already voted, their current choice is rendered selected (filled / accent color). Click the OTHER button → instant change (`vote_events_log` INSERT `action='change'`); brief toast "Гласът ти е променен." Click the CURRENT button → retract (`vote_events_log` INSERT `action='retract'`; `votes` row DELETE); toast "Гласът ти е оттеглен. [Отмени]" with 5-second undo. Toast undo writes another `vote_events_log` INSERT `action='cast'` restoring previous choice — undo IS audit-trailed.
- **D-25:** **Locked Bulgarian copy strings** (final v1 — coalition can revise pre-ship if requested):
  - **Vote buttons** (per IDEA-03 explicit): "Одобрявам" / "Не одобрявам"
  - **Current-choice indicator:** "Одобрено от теб" / "Не одобрено от теб"
  - **Public count:** "%{n} одобряват" + "%{p}% одобрение"
  - **Members-only reject count:** "%{n} не одобряват"
  - **Threshold-gated reveal:** "Гласуването е в ход — резултатите ще се покажат след първите %{N} гласа."
  - **Cooling-display indicator (My Activity):** "Гласът ти ще се отчете след %{HH}ч %{MM}м"
  - **Change toast:** "Гласът ти е променен."
  - **Retract toast:** "Гласът ти е оттеглен. [Отмени]" (5-sec undo)
  - **CAPTCHA-required prompt:** "Моля потвърди, че не си бот." (Turnstile widget appears)
  - **Hard rate-limit error:** "Превишаваш допустимата честота на гласуване. Опитай отново след няколко минути."
  - **Empty-state platform:** "Скоро ще започнем да публикуваме идеи..." + CTA to `/community`
  - **Empty-state filter:** "Нямаме идеи в избраните теми. [Нулирай филтъра]"

  All strings via `next-intl` `t()` (Phase 1 D-27 — no hardcoded Cyrillic in JSX). Vocative-form ban (Phase 1 D-27, Pitfall 10) does not apply here (no template-greeted personalization in voting copy).

### MEMB-02 Member Profile
- **D-26:** **Read-only `/member/profile` page + GDPR-04 placeholder + link to `/member/preferences`.** New route `/member/profile` displays `full_name`, `email`, registration date (`created_at`), `sector` label (resolved from D-09 enum to next-intl), `role` label, `preferred_channel` label (read-only — set in /member/preferences which Phase 5 already shipped). NO inline editing in v1 (full_name self-edit, sector/role change, email change all deferred to v2). GDPR-04 button "Изнеси моите данни" → placeholder page "Тази функция ще бъде достъпна в следваща версия" with Phase 6 marker. Phase 6 GDPR-04 takes over the actual export. Adds a "Профил" link in the `/member` dashboard header alongside existing "Изход" + (Phase 5) "Настройки".

### Claude's Discretion (planner picks)
- Specific velocity-trigger thresholds (D-12) — directional defaults given (30/10, 20/30, 50% of 20); planner tunes against expected warmup volume.
- Exact `IDEA_REVEAL_THRESHOLD` (D-03) value — default N=20; planner can tune.
- Exact soft/hard rate-limit numbers (D-11) — defaults 5/min soft, 20/min hard; planner tunes.
- Slug helper implementation (D-18) — `slugify-bg` is a label, planner picks the npm package or custom impl; needs test for the Cyrillic transliteration table edge cases (Ж→Zh, Ъ→A, Ь→y, Я→Ya, etc.).
- Cache implementation (D-03) — server-side: planner picks between a Postgres-side materialized view refreshed on cron, an Upstash-Redis cache with TTL, or Next.js's `unstable_cache` with revalidate. Choose the simplest that scales to 5-min TTL across the catalog.
- `vote_events_log` index strategy (D-13/D-15) — planner picks indexes for the OPS-04 query patterns: `(idea_id, occurred_at DESC)`, `(subnet_hash, occurred_at)`, `(user_id, occurred_at DESC)`. Avoid over-indexing.
- Anomaly-event status workflow (D-20) — `unresolved | dismissed | acted` is named here; planner decides whether dismissed/acted writes `moderation_log` rows or stays as a status-only column on the anomaly tracker.
- Anomaly tracker storage (D-20) — planner picks between materializing anomalies in a `vote_anomalies(id, idea_id, trigger_type, status, ...)` table vs computing on-demand from `vote_events_log` aggregates. Trade-off: materialized = cheap reads, write-side bookkeeping; on-demand = no extra table, heavier admin queries.
- Featured-order field UX (D-18) — planner picks input shape (numeric input field, drag-to-reorder, etc.) within Payload's collection edit screen.
- Idea autosave-during-draft, version history, role-based publish permission — mirror whatever Newsletters does; planner confirms.
- Sentry tag schema for `vote_velocity_anomaly` events (D-12) — planner picks per-event tags (idea_id, trigger_type, count, etc.).
- HMAC secret rotation procedure (D-15) — planner adds OPS-RUNBOOK entry per the Phase 1 D-21 secret-handling pattern.

### Folded Todos
None — `cross_reference_todos` step found no pending todos for Phase 3.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project north star
- `.planning/PROJECT.md` — Core value, constraints, the WhatsApp/Telegram channel decision, key decisions table including the (now resolved) "Видимост на имената при гласуване" line. **D-01 in this CONTEXT.md resolves Open Decision #1.**
- `.planning/REQUIREMENTS.md` — Phase 3 covers IDEA-01..08, MEMB-01..03, EDIT-01..02, OPS-04. **Open Decisions table** at the bottom: #1 (names visibility) — resolved by D-01; #3 (Art. 9 lawyer opinion) — STILL OPEN, hard-blocks phase ship per `<external_blocker>` above.
- `.planning/ROADMAP.md` § "Phase 3: Idea Catalog + Voting" — Goal, depends-on (Phase 2 + external Art. 9 opinion), 5 success criteria. Plan-phase MUST verify each success criterion against the decisions captured here.
- `.planning/STATE.md` — Phase 3 blocker section, deferred items table (none touch Phase 3 directly except `D-CoalitionLogoSVG` for the `/idei` page header brand bar — read-only dependency).

### Stack
- `CLAUDE.md` — Locked technology stack. Phase 3 introduces no new stack components; reuses Drizzle ORM (vote schema), Payload CMS (Ideas collection + admin views), Auth.js v5 (member session for vote endpoints), Cloudflare Turnstile (CAPTCHA-on-suspicion), Upstash Redis (rate-limit + cache option).

### Pitfalls (mandatory reading for Phase 3 planner)
- `.planning/research/PITFALLS.md` — All 14 pitfalls. Specifically these apply to Phase 3:
  - **Pitfall 1** (Vote integrity / sockpuppet brigading) → drives D-04 cooling, D-11 CAPTCHA, D-12 velocity alerts, D-03 threshold-gated reveal.
  - **Pitfall 2** (GDPR Art. 9 — political opinion as special category) → primary external blocker; drives D-13/D-15/D-16 audit-trail design + the Art. 9 lawyer dependency.
  - **Pitfall 3** (incomplete right-to-erasure) → drives D-15 (no raw IP in logs) and D-16 (cascade-delete vote audit on user deletion).
  - **Pitfall 8** (mass fake registration) → cooling-period inheritance from Phase 1; Pitfall 8 #3 7-day display-tally hold offered as `VOTE_COUNTABLE_INTERVAL` operational dial (D-10).
  - **Pitfall 9** (screenshot smear) → drives D-02 (reject count members-only) + D-23 (silent display-freeze).
  - **Pitfall 12** (doxxing) → reinforces D-01 anonymous-public choice; `display_name` deferred.
  - **Pitfall 13** (DSA compliance) → light-touch in Phase 3 since user-submitted content is Phase 4; the `moderation_log` schema (D-21) lays the audit-log foundation that DSA transparency reports will read in Phase 6+.
  - **Pitfall 14** (broken QR) → not relevant to Phase 3 (already mitigated upstream in Phase 1 D-17 own-domain QR).

### Features context
- `.planning/research/FEATURES.md` — Catalog v1 surface mapped here:
  - Row 32 (Approve / disapprove voting) — drives D-13 votes table.
  - Row 33 (Idea catalog with browsing) — drives D-06/D-08 catalog UX. Search is "v1.x" — explicitly deferred.
  - Row 51 (Vote totals displayed) — drives D-02/D-03.
  - Row 61 (Editor's-pick) — drives D-18 `is_featured`.
  - Row 64 (Editor stats dashboard) — drives D-22 sidebar.
  - Row 65 (Vote anomaly detection) — listed as v2 in FEATURES; OPS-04 brings it forward to v1 as required.
  - Row 78 (Public downvote brigading) — drives D-02 reject-members-only.
  - Row 85 (Weighted voting) — explicitly out of scope; binary approve/reject only.

### Prior phase context (decision inheritance)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-04 (`email_verified_at` column already exists, IDEA-07 forward-prep), D-05 (Turnstile reuse for D-11), D-07 (Upstash rate-limit reuse for D-11), D-11 (`display_name` deferred to Phase 3 — D-01 here keeps it deferred further), D-12 (`consents.kind = 'political_opinion'` already captured), D-13 (consents append-only pattern → D-13/D-21 mirror), D-19 (BullMQ queue reuse for editor anomaly alerts in D-12), D-21 (Sentry EU + structured logs for `vote_velocity_anomaly` events), D-27 (next-intl for all UI strings — applies to D-25 copy locks).
- `.planning/phases/02-public-surface-pre-warmup/02-CONTEXT.md` — Sinya color tokens, footer pattern, layout chrome. Reuse on `/idei` and `/idei/{slug}`.
- `.planning/phases/02.1-attribution-source-dashboard/02.1-CONTEXT.md` — D-19 / GDPR-09 (NO raw IP in Postgres) directly drives D-15 hashed identifiers; `/admin/views/attribution` is the template for `/admin/views/vote-anomalies` (D-20).
- `.planning/phases/05-notifications/05-CONTEXT.md` — D-01 Newsletters Lexical pattern → D-17 Ideas Lexical pattern; D-08 newsletter topic enum (separate from idea topic enum); D-19 Bunny.net image upload extension applies to D-18 hero image; `assertEditorOrAdmin` access pattern from Plan 05-01.

### Schema (existing — Phase 3 EXTENDS, doesn't redesign)
- `src/db/schema/auth.ts` — `users` (notably `email_verified_at` column already there for D-04 cooling join; `full_name`, `sector`, `role` for D-26 profile; `preferred_channel` informational from Phase 5 D-07).
- `src/db/schema/consents.ts` — append-only pattern, `political_opinion` kind (D-13/D-21 mirror this pattern; consent state read at vote-time to verify the member granted political-opinion consent).
- `src/db/schema/attribution.ts` — `attribution_events` table; not directly read by Phase 3 voting (no cross-table coupling chosen — see D-15 alternatives), but the schema convention (text columns over pgEnum, no raw IP) is canonical for new Phase 3 tables.
- `src/db/migrations/` — Drizzle migrations directory; Phase 3 adds new SQL migrations for `votes`, `vote_events_log`, `moderation_log`, plus Ideas-collection columns.

### Payload schema constraint (operational)
- **Memory `project_payload_schema_constraint`:** any new Payload collection / global / field requires manual DDL via Neon SQL because `payload migrate` is blocked by tsx/Node 22 ESM incompat. Phase 3 plan MUST factor in: new Ideas collection + new `display_frozen` boolean + new `is_featured` boolean + new `featured_order` int + new `hero` upload field — all manual DDL via Neon SQL. The Drizzle-managed tables (`votes`, `vote_events_log`, `moderation_log`) follow the normal `pnpm db:generate` + `pnpm db:migrate` pipeline (Phase 2.1 D-Phase21Plan01 fix).

### Legal
- `.planning/legal/attribution-balancing-test.md` — existing legitimate-interest balancing test for Phase 2.1 attribution. Phase 3 needs a separate `art9-opinion.md` from external counsel before ship (the external blocker — see top of this CONTEXT.md).

### To create during Phase 3 (forward refs)
- `.planning/legal/art9-opinion.md` (or equivalent) — external counsel's opinion. Coalition deliverable.
- `src/app/(frontend)/idei/page.tsx` — catalog index.
- `src/app/(frontend)/idei/[slug]/page.tsx` — idea detail.
- `src/app/(frontend)/member/profile/page.tsx` — read-only profile.
- `src/app/(payload)/admin/views/vote-anomalies/page.tsx` — anomaly review.
- `src/collections/Ideas.ts` — Ideas Payload collection.
- `src/db/schema/voting.ts` (or split per table) — `votes`, `vote_events_log`, `moderation_log`.
- `src/lib/voting/` — vote Server Actions, rate-limit + Turnstile gate, cooling-join helpers, slug helper, count-cache wrapper.
- `src/components/idea/` — IdeaCard, IdeaDetail, VoteButtons, VoteCountDisplay, RetractToast.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/collections/Newsletters.ts`** — direct template for `src/collections/Ideas.ts`. Same Lexical configuration (allowed-blocks whitelist), same `assertEditorOrAdmin` access pattern, same admin custom-component registration pattern (importMap.js explicit string registration per Pitfall 7). Hero-image upload uses the same Payload media collection extension.
- **`src/app/(payload)/admin/views/attribution/`** — direct template for `src/app/(payload)/admin/views/vote-anomalies/`. Custom Payload view shape; date-range filter pattern; per-row drill-in pattern.
- **`src/components/member/Timeline.tsx`** — pattern for the member-dashboard "My Activity" panel (D-05).
- **`src/components/preferences/`** — `NewsletterToggleRow.tsx` and `PreferredChannelRadio.tsx` show the existing per-member preference component pattern; D-26 profile page links here, doesn't duplicate.
- **`src/lib/email/queue.ts`** — Phase 1 D-19 BullMQ queue; reused for OPS-04 editor anomaly emails (D-12).
- **`src/lib/turnstile.ts`** — Phase 1 D-05 Turnstile wiring; reused for D-11 CAPTCHA-on-suspicion.
- **`src/lib/rate-limit.ts`** — Phase 1 D-07 Upstash rate-limit wiring; reused + extended for D-11 two-tier per-user vote rate-limit.
- **`src/lib/auth.ts` + `src/lib/auth-utils.ts`** — Auth.js v5 session helpers; reused for vote Server Action gate (`assertEmailVerified`, future `assertEditorOrAdmin` reuse for admin views).
- **`src/lib/zod-i18n.ts`** — Bulgarian Zod error mapper; reused for vote-action form validation.
- **`src/lib/oblast-names.ts`** — not directly used in voting, but the "static enum + next-intl labels" pattern (`text` column + `idea.topic.*` keys) mirrors this file's structure.

### Established Patterns (must follow)
- **All user-facing strings via `next-intl`** (Phase 1 D-27). No hardcoded Cyrillic in JSX. D-25 copy goes through `messages/bg.json`.
- **Server Actions validate with `zod` + `zod-i18n-map`** for all member-facing inputs. Vote action, retract action, change action all follow.
- **`text` column over `pgEnum`** (project convention from `auth.ts` sector/role D-09/D-10 + `attribution.ts` comments). Vote `choice`, `action`, idea `status`, `topic`, `moderation_log.action`, `moderation_log.target_kind` all use `text` with Zod-enforced enum at the API boundary.
- **Append-only audit tables, never UPDATE/DELETE from app code** (Phase 1 D-13 consents, Phase 6 GDPR-07 deletion_log + moderation_log). `vote_events_log` and `moderation_log` follow.
- **No raw IP in Postgres** (Phase 2.1 D-19 / GDPR-09). HMAC-hashed columns only (D-15). Test that asserts no `inet` columns / no `raw_ip` text columns in `vote_events_log` schema (mirror `tests/unit/attribution-schema.test.ts`).
- **`assertEditorOrAdmin` defense-in-depth** (Plan 05-01 pattern) inside every editor-side Server Action AND Payload collection access control (both layers).
- **Worker-startup-time assertion pattern** (Plan 05-14 Redis eviction policy + Phase 1 D-21 secret validation) — applied here for `VOTE_COUNTABLE_INTERVAL` and `VOTE_AUDIT_HMAC_SECRET` validation: invalid value = startup fail with structured log line.

### Integration Points
- **Auth.js session** — vote Server Action reads `session.user.id` + joins `users.email_verified_at` for the cooling-display-suppress query.
- **Payload Users collection** — `role` field already used by `assertEditorOrAdmin`; no schema change needed.
- **`consents` table** — vote Server Action MAY check (planner decides) that the latest `consents` row for `(user_id, kind='political_opinion')` has `granted=true` before INSERTing the vote, as a defense-in-depth gate beyond the registration-time check. Lawyer's opinion may dictate this.
- **Brevo / Phase 5 newsletter pipeline** — D-12 editor anomaly emails reuse the BullMQ queue + the React Email template architecture (Phase 5 D-17). New email template `VoteAnomalyAlert.tsx` (planner adds).
- **Sentry EU** — D-12 `vote_velocity_anomaly` events tagged with `idea_id`, `trigger_type`, `count`. Phase 1 D-21 PII-free logging applies (no email, no full_name in Sentry events).
- **Bunny.net CDN** — D-18 hero image flows through existing Payload media collection upload pipeline.
- **Cloudflare Turnstile** — D-11 invokes the existing client-side widget (Phase 1 D-05) with a different `widgetId` (planner can register a new env-keyed widget if needed) for the vote-rate-limit-soft trigger.

</code_context>

<specifics>
## Specific Ideas

- **Editor's "Изключи избраните гласове" bulk action** (D-20) — confirmation modal must explicitly say "Тази операция е необратима. Гласовете ще бъдат премахнати от резултата, но запазени в одиторския журнал."
- **Vote-button rendered-selected state** (D-24) — the user's current choice button uses `bg-sinya-accent` (Phase 2 token); the un-selected sibling uses outlined ghost variant. Reuse the existing `Button` component with a custom variant or `aria-pressed` attribute.
- **Catalog landing-state hint** (D-09) — when zero ideas exist platform-wide, the empty-state CTA links to `/community` (which Phase 5 already populates with WhatsApp + Telegram channel cards). This keeps the engagement loop alive even before the first idea is published.

</specifics>

<deferred>
## Deferred Ideas

- **Display-name column for proposals/reports authored byline** — `display_name` on `users` stays deferred per Phase 1 D-11; Phase 3 D-01 keeps it deferred since votes are anonymous publicly. Phase 4 (proposals) will revisit when authored content needs a public byline.
- **Idea-closing / lifecycle states beyond draft/published/archived** — would need editor close action or auto-close after N days; deferred to v2 / Phase 4+ scope.
- **Date-range filter on catalog** — overkill for v1 catalog volume; sort by date is sufficient.
- **Public catalog full-text search** — FEATURES.md row 33 marks v1.x; deferred.
- **Device fingerprinting (FingerprintJS)** — Pitfall 1 #7 suggestion; not v1 scope.
- **Public 'verified-business-owner' tier (Pitfall 1 #6, BULSTAT)** — V2-VERIFY-01 stays deferred per Phase 1 D-08.
- **7-day display-tally hold as default** — `VOTE_COUNTABLE_INTERVAL` defaults to `48h` per D-10; ops can flip to `7d` without code change. Hardening dial available, not default.
- **Topic-list Payload Global** — Hardcoded enum in v1 per D-19; coalition revisits later if they want self-service topic addition.
- **Scheduled-publish for ideas** — Newsletters-only pattern; not relevant for catalog ideas.
- **Live in-edit preview pane on Ideas edit screen** — Newsletters' D-02 pattern; deferred since Cyrillic-rendering email pitfall doesn't apply to catalog.
- **Full account self-service** (full_name self-edit, sector/role change, email change with re-verify) — D-26 ships read-only profile only; v2 deferred.
- **Per-idea / per-vote subscription opt-in** — beyond Phase 5 D-08 newsletter_voting topic; deferred to Phase 5+ if requested.
- **WhatsApp / Telegram cross-promo per-idea** — channel-level only (Phase 5); per-idea broadcasts deferred.
- **Account deletion UI** — Phase 6 GDPR-05 owns this; D-26 surfaces a placeholder.
- **GDPR-04 actual data export implementation** — Phase 6 owns; D-26 ships placeholder.
- **Slug 301 redirects on title change** — slug is immutable post-publish per D-18; redirect-from-old-slug deferred.
- **Cross-idea DSA reporting hook** — Pitfall 13; the `moderation_log` schema (D-21) lays the foundation but the visible "Сигнализирай незаконно съдържание" button is Phase 4 / 5 user-content scope, not Phase 3 catalog scope.
- **Forensic snapshot export of vote_events_log for legal/forensic review** — admin CSV export of vote-anomaly forensics; deferred to operational need.

### Reviewed Todos (not folded)
None — `cross_reference_todos` step found no pending todos to review.

</deferred>

---

*Phase: 3-idea-catalog-voting*
*Context gathered: 2026-05-07*
