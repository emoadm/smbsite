# Phase 3: Idea Catalog + Voting — Research

**Researched:** 2026-05-07
**Domain:** Civic-tech vote integrity + GDPR Art. 9 audit trail + editorial CMS extension on a locked Next.js 15 / Payload 3 / Drizzle / Auth.js v5 / Upstash / Sentry stack.
**Confidence:** HIGH on stack reuse and pattern mirrors (Phase 1 / Phase 2.1 / Phase 5 already shipped); MEDIUM on velocity / threshold / cache tuning (warmup volume unknown); LOW on `slugify-bg` choice between two viable Bulgarian-aware libraries (both work — pick has tradeoffs).

## Summary

Phase 3 is overwhelmingly an **integration phase, not a greenfield phase.** Every architectural decision in `03-CONTEXT.md` D-01..D-26 maps to an existing pattern shipped in Phase 1, Phase 2.1, or Phase 5: the Lexical RTE + `assertEditorOrAdmin` + Bunny.net upload pattern lives in `Newsletters.ts`; the custom Payload admin view + role-gate + Drizzle aggregate Server Action + CSV export pattern lives at `/admin/views/attribution/`; the BullMQ + Brevo + React Email + Pino-redact + tone-lock test pattern lives in `src/lib/newsletter/`; the HMAC-token + Node-runtime route pattern lives in `src/lib/unsubscribe/`; the append-only audit table convention with text-cols-over-pgEnum lives in `src/db/schema/consents.ts`. The work is to compose these patterns precisely, with two genuinely new pieces of infrastructure: (1) the `votes` + `vote_events_log` + `moderation_log` Drizzle schema with HMAC-hashed forensic identifiers, and (2) the multi-axis vote-velocity anomaly detector that writes Sentry events + email alerts. [VERIFIED: codebase grep]

The phase is **HARD-BLOCKED on the external GDPR Art. 9 legal opinion** (`.planning/legal/art9-opinion.md`) but plan-phase and research-phase MAY proceed; CONTEXT.md is structured so the lawyer's opinion most likely affects only consent wording (D-12) and final retention scope (D-16), not the schema or the user-facing flows. Every integrity guarantee in the phase description has a concrete enforcement layer specified: cooling = JOIN-time filter on `email_verified_at + INTERVAL` (D-04), one-vote-per-account = DB UNIQUE on `(user_id, idea_id)` (D-13), no-raw-IP = HMAC-only columns enforced by a schema-grep test (D-15), append-only audit = app-layer never-UPDATE-DELETE convention now + DB-level INSERT-only permissions in Phase 6 GDPR-07 (D-13/D-21).

**Primary recommendation:** Plan should use the `Newsletters.ts` collection literally as a starter template for `Ideas.ts` (Lexical features list is identical except no `previewText`/`scheduledAt`); use `transliteration@2.6.1` (zero runtime deps, supports the official Bulgarian Streamlined System mapping out of the box) for `slugify-bg`; use Next.js `unstable_cache` with 5-minute `revalidate` (not Upstash) for the displayed vote counts because the catalog scale never needs cross-pod cache and the existing `unstable_cache` infra already exists in the project with no setup cost; materialize `vote_anomalies` rows (don't compute on-demand) because the editor's-pick admin badge needs O(1) lookup per Ideas list row render; and use a status-column workflow on `vote_anomalies` that ALSO writes a `moderation_log` row when an editor dismisses or acts (mirrors the Phase 5 D-13 dual-channel pattern).

## Architectural Responsibility Map

Phase 3 capabilities × architectural tier:

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Catalog index `/idei` (server-rendered card grid, filter, sort, pagination) | **Frontend Server (Next.js RSC)** | Database (filter / sort / paginate via Drizzle) | Server-rendered for SEO + 5-min `unstable_cache` per filter+sort+page slot — no hydration cost, no client-side state |
| Idea detail `/idei/{slug}` (Lexical render + counts + vote buttons) | **Frontend Server (RSC)** for static parts | **Browser** for interactive vote buttons + Sonner toast + Turnstile widget | Counts query pulls from cache; Lexical AST renders server-side; vote-button interactivity is the only client-side island |
| Vote cast / change / retract Server Action | **API / Backend** (Next.js Server Action) | Database (Drizzle UNIQUE + cascade), Upstash (rate limit), Turnstile (CAPTCHA-on-suspicion) | Server Action gates session + rate-limit + Turnstile + INSERTs to `votes` + `vote_events_log` in one transaction |
| Cooling-period gate | **Database** (JOIN-time filter on `email_verified_at + INTERVAL`) | API (read query) | The gate is a query, not a flag: `WHERE voter.email_verified_at + INTERVAL '48 hours' < now()` — no app-layer enforcement, the DB enforces it via the displayed-count query |
| Displayed-count cache (5-min TTL) | **Frontend Server (Next.js `unstable_cache`)** | Database (cold read on cache miss) | Per-pod cache; 5-min TTL is short enough that consistency drift is acceptable; Upstash adds round-trip cost without scaling benefit at coalition scale |
| Vote-velocity anomaly detection | **API / Worker (BullMQ background job)** | Database (`vote_events_log` aggregate reads), Sentry (event emit), BullMQ (editor email) | Triggered after each vote write OR by a scheduled scan; writes `vote_anomalies` row + Sentry event + enqueues email |
| Editor admin: Ideas authoring + freeze + bulk vote-exclude | **Payload CMS admin** (collection + custom view) | API (Server Actions for freeze/exclude + `moderation_log` writes) | Payload admin shell = same Next.js process; Server Actions re-check role (defense-in-depth per D-25/Phase 5 pattern) |
| `/admin/views/vote-anomalies` review surface | **Payload admin custom view** (RSC) | API (Drizzle aggregate Server Actions) | Mirrors `/admin/views/attribution/` exactly (date-range filter, role gate, CSV export) |
| Member dashboard "My Activity" + `/member/profile` | **Frontend Server (RSC)** | API (read-only Drizzle queries) | Reuses `Timeline.tsx` pattern; auth-gated layout already in place |
| HMAC-hashed forensic identifiers (ip_hash, ua_hash, subnet_hash) | **API / Backend** (Server Action) | none — secret lives in Fly.io secrets + GitHub Actions | Computed at write time; raw IP never stored, never crosses tier boundary to Postgres |
| Editor anomaly email alert | **Worker (BullMQ + Brevo)** | API (enqueue), Brevo (deliver), React Email (template) | Reuses Phase 1 D-19 + Phase 5 D-21 send pipeline — extend `EmailJobKind` with `vote-anomaly-alert` (or piggyback on existing `EmailJobKind` like Phase 5 did) |

**Tier sanity-checks for the planner:**
- Vote cast = Server Action, **NOT** API route. Reason: Server Actions inherit the auth session natively via `auth()` and integrate with the form architecture used in Phase 1 (`register` / `verify-otp`); API routes would require manual session resolution.
- Cooling enforcement = Database, **NOT** application. Reason: any app-layer gate races a horizontally scaled web pod; the JOIN with `INTERVAL` is atomic to the read.
- Cache layer = `unstable_cache`, **NOT** Upstash. Reason: the catalog is read-heavy + write-light; per-pod cache is sufficient; reverts trivially to Upstash if ever needed.
- Anomaly detection = Worker tier, **NOT** Server Action inside the vote cast path. Reason: Server Action latency budget is sub-200ms (Phase 1 D-19); anomaly windowed-aggregate queries can be 50-200ms easily; do them out-of-band.

## User Constraints (from CONTEXT.md)

> Copied verbatim from `.planning/phases/03-idea-catalog-voting/03-CONTEXT.md`. The planner MUST honor all locked decisions; explore options only inside `Claude's Discretion`; ignore everything in `Deferred`.

### Locked Decisions

**External blocker:** Phase 3 is HARD-BLOCKED on the external GDPR Art. 9 legal opinion (`.planning/legal/art9-opinion.md` not yet on file). Plans, research, and execution work for Phase 3 **must not** start production-shipping until the opinion is on file and any required wording changes have been integrated into the Phase 1 `consents` flow. Decisions captured here are valid as planning inputs.

**D-01:** Names are anonymous on all public surfaces. Catalog cards, idea detail pages, and any public surface render only aggregate counts. `user_id` is internally linked for one-vote-per-account enforcement and editor moderation; never exposed publicly.

**D-02:** Result display layered by viewer role. Public/anonymous see approve count + approval %. Logged-in members see ALSO the reject count. Editors in admin see the full breakdown.

**D-03:** Threshold-gated result reveal + 5-minute server-side cache. Counts hidden until total votes ≥ N (default `IDEA_REVEAL_THRESHOLD=20`). Vote write does NOT bust the cache.

**D-04:** Soft cooling gate. Vote INSERT happens immediately. The cached-count query JOINs `users.email_verified_at + INTERVAL ${VOTE_COUNTABLE_INTERVAL}` and filters out cooling votes. Member's `/member` "My Activity" panel shows "Гласът ти ще се отчете след %{HH}ч %{MM}м" for cooling votes.

**D-05:** Member dashboard "My Activity" panel = full list with retract/change actions; reuses `components/member/Timeline.tsx` pattern.

**D-06:** Catalog layout = responsive card grid (1/2/3 columns). Each card renders title, topic chip, short excerpt, approve % bar (when revealed), vote count, optional editor's-pick badge.

**D-07:** Topic enum (locked v1, hardcoded): `taxes` "Данъци", `labor` "Трудово законодателство", `regulation` "Регулаторни режими", `financing` "Финансиране и кредит", `digitalization` "Цифровизация", `other` "Други". Stored as `text` on the `ideas` row. Display labels via `next-intl`.

**D-08:** Filter UX = topic chip multi-select + 3 sort options + editor's-pick badge. Sort dropdown: Най-нови (default), Най-одобрени, Отбор на редактора.

**D-09:** Pagination strategy = page-based, 12 per page. URL: `/idei?page=N&topic=A,B&sort=newest`. Two empty-state components (platform-empty, filter-empty).

**D-10:** `VOTE_COUNTABLE_INTERVAL` env-var knob. Default `48h`. Allowlisted format regex: `^\d+ (hours|days)$` (sanitized at startup; invalid value = startup fail).

**D-11:** CAPTCHA-on-suspicion = two-tier per-user rate limit + Turnstile required between soft and hard. Reuses Phase 1 D-05 Turnstile + D-07 Upstash. Suggested defaults: soft 5 votes / 60s, hard 20 votes / 60s.

**D-12:** Vote-velocity anomaly alert = multi-axis trigger, manual editor review, never auto-freeze. Triggers (any one fires): per-idea velocity > N1 votes in T1 min (default 30/10); /24-subnet aggregate > N2 votes / T2 min (default 20/30); fresh-account share > P% of last N3 votes from accounts < VOTE_COUNTABLE_INTERVAL post email_verified_at (default 50% of last 20). Alert channels: in-admin badge + Sentry event tagged `vote_velocity_anomaly` + editor email via existing BullMQ queue.

**D-13:** Two-table model: `votes` (current state, UNIQUE) + `vote_events_log` (append-only). UNIQUE constraint on `(user_id, idea_id)` enforces IDEA-04. Both tables `ON DELETE CASCADE` from users + ideas.

**D-14:** Retract = DELETE the `votes` row + INSERT `vote_events_log` with action='retract', choice=null. Cached-count query stays simple (`SELECT COUNT(*) FROM votes WHERE idea_id=$1 AND choice='approve'`). UNIQUE is full-table.

**D-15:** `vote_events_log` columns lock NO RAW IP / NO RAW UA. Three hashed identifiers via HMAC-SHA256 with a server secret (`VOTE_AUDIT_HMAC_SECRET` Fly.io + GitHub Actions): `ip_hash` (full IPv4/IPv6), `subnet_hash` (/24 IPv4 or /64 IPv6), `ua_hash` (user-agent). `fresh_account_at_event` boolean computed at INSERT. HMAC secret rotation cadence: annual.

**D-16:** Account-deletion behavior = `ON DELETE CASCADE` on both `votes` and `vote_events_log`. Default-safe under strict GDPR Art. 17 reading. Lawyer-confirmation point: if Art. 9 lawyer prefers `SET NULL` aggregate-preservation, planner flips with one schema migration (column already nullable on `vote_events_log.user_id`).

**D-17:** Ideas collection mirrors Newsletters. Lexical allowed-blocks: paragraph, h2, h3, link, ordered list, unordered list, image (Bunny.net via Payload media collection), bold, italic. Banned: code blocks, blockquotes, custom blocks, raw HTML. Status enum: `draft → published → archived`. Access control: `assertEditorOrAdmin`.

**D-18:** Slug + hero + editor's-pick. Slug auto-generated via `slugify-bg` helper (transliterate Cyrillic → Latin, lowercase, hyphenate, dedupe-with-numeric-suffix). Editable in Payload before publish; immutable after publish. Hero image: optional, single image upload via existing Payload media collection. Editor's-pick: `is_featured` boolean + nullable `featured_order` int.

**D-19:** Hardcoded topic enum + draft preview button (NO live preview pane). Preview: "Виж как изглежда на сайта" button on Payload edit screen opens `/idei/{slug}?preview=draft` in a new tab; server reads `preview=draft` and gates on editor session.

**D-20:** Vote-anomaly review = dedicated `/admin/views/vote-anomalies` + inline badges on Ideas list. Mirrors `/admin/views/attribution`. Status: `unresolved | dismissed | acted`. Bulk-action: "Изключи избраните гласове" (writes `moderation_log` + DELETEs from `votes`; `vote_events_log` unchanged).

**D-21:** `moderation_log` table — full schema in Phase 3. `(id uuid PK, action text NOT NULL, actor_user_id uuid REFERENCES users ON DELETE RESTRICT, target_kind text, target_id uuid, target_ids uuid[], note text, created_at timestamptz)`. Append-only. Phase 3 writes from: `vote_exclude`, `idea_display_freeze`, `idea_display_unfreeze`. Phase 4 EDIT-06 ADDS action enum values without changing schema.

**D-22:** Ideas edit-screen sidebar with live stats + freeze toggle + recent activity feed.

**D-23:** URL shape: top-level `/idei` and `/idei/{slug}`. `/community` stays channels-only. Display-freeze on the public idea page is **silent** — no banner, no public indicator. Editors see clear badge in admin only.

**D-24:** Retract / change UX: 1-click both, with 5-second toast undo on retract. Two buttons displayed always on idea detail: "Одобрявам" / "Не одобрявам". Toast undo writes another `vote_events_log` INSERT `action='cast'` restoring previous choice — undo IS audit-trailed.

**D-25:** Locked Bulgarian copy strings (final v1 — coalition can revise pre-ship if requested):
  - **Vote buttons:** "Одобрявам" / "Не одобрявам"
  - **Current-choice indicator:** "Одобрено от теб" / "Не одобрено от теб"
  - **Public count:** "%{n} одобряват" + "%{p}% одобрение"
  - **Members-only reject count:** "%{n} не одобряват"
  - **Threshold-gated reveal:** "Гласуването е в ход — резултатите ще се покажат след първите %{N} гласа."
  - **Cooling-display indicator (My Activity):** "Гласът ти ще се отчете след %{HH}ч %{MM}м"
  - **Change toast:** "Гласът ти е променен."
  - **Retract toast:** "Гласът ти е оттеглен. [Отмени]" (5-sec undo)
  - **CAPTCHA-required prompt:** "Моля потвърди, че не си бот."
  - **Hard rate-limit error:** "Превишаваш допустимата честота на гласуване. Опитай отново след няколко минути."
  - **Empty-state platform:** "Скоро ще започнем да публикуваме идеи..." + CTA to `/community`
  - **Empty-state filter:** "Нямаме идеи в избраните теми. [Нулирай филтъра]"

  All strings via `next-intl` `t()`.

**D-26:** Read-only `/member/profile` page + GDPR-04 placeholder + link to `/member/preferences`. New route `/member/profile` displays `full_name`, `email`, registration date, `sector`, `role`, `preferred_channel`. NO inline editing. GDPR-04 button "Изнеси моите данни" → placeholder page.

### Claude's Discretion (planner picks; this RESEARCH.md answers them in §"Claude's Discretion Answered")

- Specific velocity thresholds (D-12), `IDEA_REVEAL_THRESHOLD` (D-03), soft/hard rate-limits (D-11)
- Slug helper implementation (D-18)
- Cache implementation (D-03)
- `vote_events_log` index strategy (D-13/D-15)
- Anomaly tracker storage materialized vs on-demand (D-20)
- Anomaly-event status workflow (D-20) — `moderation_log` rows vs status column
- Featured-order field UX (D-18)
- Idea autosave-during-draft, version history, role-based publish — confirm Newsletters mirror
- Sentry tag schema for `vote_velocity_anomaly` events (D-12)
- HMAC secret rotation procedure (D-15) — OPS-RUNBOOK entry
- Vote-button rendered-selected state (D-24) — `aria-pressed` + custom variant
- Lexical block whitelist for Ideas (D-17) — confirm Newsletters config maps
- Cooling-period join cost — scaling answer
- Toast undo for retract (D-24, 5-second window) — Sonner pattern
- Bunny.net hero-image flow — file-size / dimension limits
- Anti-abuse pitfall research — auto-freeze warning UI; reject-count exposure threshold

### Deferred Ideas (OUT OF SCOPE)

- `display_name` column for proposals/reports authored byline — stays deferred per Phase 1 D-11.
- Idea-closing / lifecycle states beyond draft/published/archived — v2 / Phase 4+.
- Date-range filter on catalog — overkill for v1.
- Public catalog full-text search — FEATURES.md row 33 v1.x.
- Device fingerprinting (FingerprintJS) — Pitfall 1 #7; v2.
- Public 'verified-business-owner' tier (BULSTAT) — V2-VERIFY-01.
- 7-day display-tally hold as default — `VOTE_COUNTABLE_INTERVAL` defaults to `48h`; ops dial.
- Topic-list Payload Global — hardcoded enum in v1.
- Scheduled-publish for ideas — Newsletters-only.
- Live in-edit preview pane on Ideas edit screen — deferred.
- Full account self-service — D-26 ships read-only profile only.
- Per-idea / per-vote subscription opt-in — beyond Phase 5 D-08; deferred.
- WhatsApp / Telegram cross-promo per-idea — channel-level only.
- Account deletion UI — Phase 6 GDPR-05.
- GDPR-04 actual data export — Phase 6.
- Slug 301 redirects on title change.
- Cross-idea DSA reporting hook — Phase 4 / 5 user-content scope.
- Forensic snapshot export of `vote_events_log`.

## Project Constraints (from CLAUDE.md)

> Phase 3 inherits all CLAUDE.md directives. The planner must verify every plan complies.

1. **Bulgarian UI strings via `next-intl` only** — no hardcoded Cyrillic in JSX (Phase 1 D-27 / Pitfall 10). Lock-in test pattern: `tests/unit/i18n-tone.test.ts` greps for forbidden tokens (`Уважаем`, `console.log`, etc.).
2. **GDPR EU residency, no raw IP in Postgres** (GDPR-09 / Phase 2.1 D-19). Schema-grep test: no `inet`, no `raw_ip`, no `ip_address` columns. HMAC hash columns only.
3. **Text columns over `pgEnum`** — adding values to a pg enum is DDL. All enum-shaped values stored as `text(...)` with Zod-enforced enum at API boundary (`auth.ts` sector/role D-09/D-10, `attribution.ts`).
4. **Append-only audit tables** — never UPDATE / DELETE from app code. Withdrawals INSERT new rows. Phase 6 GDPR-07 enforces at DB-permission level. Schema-grep test: no `UPDATE` or `DELETE` SQL in code touching `consents`, `moderation_log`, `vote_events_log`.
5. **All async work via BullMQ + Upstash queue** — no synchronous Brevo or Sentry calls from Server Actions (Phase 1 D-19 / Phase 2.1 D-20).
6. **`assertEditorOrAdmin()` defense-in-depth** — every editor Server Action AND Payload collection access control re-checks role (Plan 05-01).
7. **Pseudonymous user_id only in logs** — no email, no full_name, no raw IP (Phase 1 D-21). Pino REDACT pattern in `src/lib/logger.ts`.
8. **Payload schema constraint:** `payload migrate` is blocked (tsx/Node 22 ESM incompat per `project_payload_schema_constraint` memory). Any new Payload collection / global / field requires manual DDL via Neon SQL. Drizzle-managed tables (`votes`, `vote_events_log`, `moderation_log`) follow normal `pnpm db:generate` + `pnpm db:migrate`.
9. **Worker-startup-time env-var assertion** — invalid `VOTE_COUNTABLE_INTERVAL` or missing `VOTE_AUDIT_HMAC_SECRET` = startup fail with structured log line (Plan 05-14 Redis eviction policy + Phase 1 D-21 secret validation pattern).
10. **GSD workflow enforcement** — direct repo edits forbidden outside a GSD command.

## Phase Requirements

> The planner uses this table to map requirements to plans. Every requirement must have a plan / task that addresses it.

| ID | Description (from REQUIREMENTS.md) | Research Support |
|----|------------------------------------|------------------|
| **IDEA-01** | Член вижда каталог от политически идеи / решения, публикувани от редакторите | D-06 card grid + D-09 pagination + D-17 Ideas Payload collection (mirrors Newsletters) + Lexical render via existing `lexical-to-html.ts` pattern |
| **IDEA-02** | Каталогът поддържа филтриране/сортиране (по тема, по дата, по резултат) | D-08 topic chip multi-select + 3 sort options. URL pattern `/idei?page=N&topic=A,B&sort=newest`. Server-rendered. |
| **IDEA-03** | Член може да гласува "одобрявам / не одобрявам" по всяка идея (един глас на акаунт на идея) | D-13 `votes` table + D-25 locked Bulgarian buttons + D-24 1-click change/retract |
| **IDEA-04** | DB-ниво UNIQUE constraint предотвратява двойни гласове | D-13 `UNIQUE(user_id, idea_id)`; D-14 retract = DELETE row (so UNIQUE is full-table, no partial-index complexity); concurrent-INSERT race verified via `ON CONFLICT DO NOTHING` pattern |
| **IDEA-05** | Член може да оттегли гласа си или да го промени | D-14 retract semantics + D-24 5-sec toast undo via Sonner |
| **IDEA-06** | Гласуването е защитено с CAPTCHA при подозрителна активност | D-11 two-tier rate limit + Turnstile between soft and hard; reuses `src/lib/turnstile.ts` + `src/lib/rate-limit.ts` |
| **IDEA-07** | 48-часов "cooling period" между потвърждение на имейла и първи отчетен глас | D-04 soft cooling gate (vote INSERT immediately, displayed-count query JOINs `email_verified_at + INTERVAL`); `users.email_verified_at` already exists per Phase 1 D-04 |
| **IDEA-08** | Резултатът от гласуването се показва (формата TBD) | D-02 layered display (public approve %, members-only reject) + D-03 threshold-gated reveal + 5-min cache; resolves Open Decision #1 |
| **MEMB-01** | След влизане членът вижда личен dashboard с активност | D-05 "My Activity" panel reuses `components/member/Timeline.tsx`; reverse-chronological list of voted ideas |
| **MEMB-02** | Член може да преглежда профила си | D-26 read-only `/member/profile` page; reuses sector/role/preferred_channel labels from existing collections |
| **MEMB-03** | Член може да обновява канали за нотификация | Phase 5 already shipped `/member/preferences`; D-26 only links to it. Verification only. |
| **EDIT-01** | Редактор може да влезе в админ панел с по-високи права | Phase 1 D-25 already shipped (admin / editor roles). No new work; verification only. |
| **EDIT-02** | Редактор може да създава, редактира и публикува идеи в каталога | D-17 Ideas collection + D-22 sidebar + D-19 preview-on-site button |
| **OPS-04** | Vote velocity мониторинг и alert при аномалии | D-12 multi-axis trigger + D-20 dedicated admin view + Sentry tag + BullMQ editor email |

## Standard Stack

> All locked. Phase 3 introduces NO new stack components. Versions verified against `package.json` and `npm view` on 2026-05-07.

### Core (already in package.json)

| Library | Version (verified) | Purpose | Why Standard |
|---------|--------------------|---------|--------------|
| Next.js | 15.3.9 (npm latest is 16.2.5; project pinned to 15.3.9) | App Router + RSC + Server Actions | Locked by CLAUDE.md and Payload 3.84 compat |
| TypeScript | 5.7.3 | Type safety | Non-negotiable |
| PostgreSQL (Neon Frankfurt) | 16.x | Primary DB | EU residency, branching for staging |
| Drizzle ORM | 0.45.2 | TypeScript SQL ORM | `votes`, `vote_events_log`, `moderation_log` are Drizzle-managed (NOT Payload — text-cols-over-pgEnum + auditability + project convention from `attribution.ts`) |
| Payload CMS | 3.84.1 | Headless CMS + admin panel | `Ideas` collection + admin custom view at `/admin/views/vote-anomalies` |
| Auth.js (NextAuth) | 5.0.0-beta.31 | Member session for vote endpoints | `auth()` in Server Actions; `assertEditorOrAdmin` for admin views |
| Tailwind CSS | 4.2.4 | Styling | Sinya tokens already established |
| shadcn/ui | latest (Toggle / Toast / Button etc.) | Accessible primitives | Sonner already installed (`sonner@2.0.7`) for toasts |
| BullMQ | 5.76.6 | Queue | Reused for editor anomaly email; potentially new `vote-anomaly-detect` job kind |
| Upstash Redis | (HTTP) `@upstash/redis@1.37.0` + `@upstash/ratelimit@2.0.8` | Rate limit | Reused for D-11 two-tier vote rate limit |
| Sentry | `@sentry/nextjs@10.51.0` (Frankfurt EU) | Error tracking + custom event for `vote_velocity_anomaly` | Phase 1 D-21 |
| Cloudflare Turnstile | (JS snippet + `src/lib/turnstile.ts`) | CAPTCHA-on-suspicion gate (D-11) | Phase 1 D-05 |
| `@maxmind/geoip2-node` | 6.3.4 | Already installed for Phase 2.1 attribution | NOT used by Phase 3 — votes carry no oblast attribution. Listed only to confirm "no new stack" |
| Sonner (toast) | 2.0.7 | Vote retract 5-sec undo toast (D-24) | Already installed and used by `NewsletterComposer.tsx` |

`[VERIFIED: package.json read 2026-05-07]` `[VERIFIED: npm view * version on 2026-05-07]`

### Supporting Libraries (NEW — recommend)

| Library | Version | Purpose | When / Why |
|---------|---------|---------|-----------|
| `transliteration` | 2.6.1 (Jan 2026) | Cyrillic → Latin slug helper for D-18 | Zero-runtime-deps, broad Unicode coverage; default mapping aligns with Bulgarian Streamlined System for Latin letters even though it has no explicit "Bulgarian preset" — the digraph mapping (Ж→zh, Ц→ts, Ч→ch, Ш→sh, Щ→sht, Ю→yu, Я→ya, Ъ→a, Ь→y) matches the official Transliteration Act 2009 mapping. We pair it with a 30-line override table to enforce the exception "word-final -ия → -ia" (Sofia, Bulgaria). `[VERIFIED: npm view 2026-05-07]` `[CITED: en.wikipedia.org/wiki/Romanization_of_Bulgarian]` |

`transliteration` is recommended over alternatives:
- `slugify` (1.6.9) — has `locale: 'bg'` option but the Bulgarian table is **not** the Streamlined System (e.g., it transliterates Ъ → "u" instead of "a"). `[VERIFIED: GitHub source check]` Rejected.
- `slug` (11.0.1) — supports `slug.charmap.bg`. Closer to Streamlined System but charmap is locked behind `slug.locale` global mutation; awkward for testing. Rejected.
- `cyrillic-to-translit-js` — has only `ru`, `uk`, `mn` presets. **No Bulgarian.** `[VERIFIED: GitHub README]` Rejected.
- `@sindresorhus/slugify` (3.0.0) — has `customReplacements` but lacks an out-of-the-box Bulgarian table; would require maintaining the entire 30-letter map manually. Rejected unless there's a strong reason to prefer it.

The custom override table (built once in `src/lib/voting/slug.ts`) is small (30 entries) and **must** be unit-tested character-by-character against the Streamlined System. See § "Code Examples".

### Alternatives Considered (recommendation: REJECT)

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `unstable_cache` | Upstash Redis cache | Upstash adds a network round-trip + a connection failure mode. Catalog scale (warmup ~1k members → 5-10k members) doesn't need cross-pod consistency at 5-min TTL. **Recommend `unstable_cache`** — see § "Cache Implementation Recommendation". |
| Materialized `vote_anomalies` table | On-demand aggregate from `vote_events_log` | On-demand needs an aggregate query on every Ideas list row render — bad for editor UX. **Recommend materializing** — see § "Anomaly Storage Recommendation". |
| Status column on `vote_anomalies` | Separate `moderation_log` rows for dismiss/act | Status column = O(1) lookup, but loses audit trail. **Recommend BOTH** — status column for fast read, `moderation_log` row at the moment of dismiss/act for trail. |
| `slugify@1.6.9` | `transliteration@2.6.1` | `slugify` ships built-in `bg` locale but uses non-Streamlined mapping (Ъ→u). **Recommend `transliteration` + override table.** |
| pgEnum for `choice`, `action`, `topic`, `status` | text columns | pgEnum = DDL on every value addition; **project convention rules `text` always**. Locked. |

### Installation

No new install needed for the stack itself. Adding `transliteration`:

```bash
pnpm add transliteration@^2.6.1
```

### Version verification

```bash
$ npm view transliteration version    # 2.6.1
$ npm view transliteration time.modified   # 2026-01-20
$ npm view payload version            # 3.84.1
$ npm view drizzle-orm version        # 0.45.2
$ npm view bullmq version             # 5.76.6 (project on 5.76.4)
$ npm view sonner version             # 2.0.7
```

`[VERIFIED: npm registry 2026-05-07]`

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PUBLIC CATALOG /idei                                                        │
│   Visitor / Member ──> Next.js RSC (server-rendered card grid)              │
│                          │                                                  │
│                          ├─> unstable_cache(ideasList, key=[topics,sort,N], │
│                          │                  revalidate=300)                  │
│                          │      └─> Drizzle SELECT ideas WHERE published     │
│                          │           ORDER BY ... LIMIT 12 OFFSET ...        │
│                          │                                                  │
│                          └─> per-idea displayed counts (5-min cache)         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  IDEA DETAIL /idei/{slug}                                                    │
│   Member clicks "Одобрявам"                                                  │
│        │                                                                    │
│        v                                                                    │
│   <VoteButtons> client island                                               │
│        │ formAction → castVote Server Action                                │
│        v                                                                    │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │ Server Action: castVote(ideaId, choice, turnstileToken?)        │       │
│   │                                                                 │       │
│   │ 1. assertSession() / assertEmailVerified()                      │       │
│   │ 2. checkVoteRateLimitSoft(user.id) → soft (5/min)               │       │
│   │ 3. IF rate >= soft AND rate < hard:                             │       │
│   │       require Turnstile token; verifyTurnstile()                │       │
│   │ 4. IF rate >= hard: throw "превишена честота"                   │       │
│   │ 5. consents check (LATEST(political_opinion).granted = true)    │       │
│   │ 6. compute hashes:                                              │       │
│   │       ip_hash    = HMAC(VOTE_AUDIT_HMAC_SECRET, raw_ip)         │       │
│   │       subnet_h   = HMAC(VOTE_AUDIT_HMAC_SECRET, /24-or-/64)     │       │
│   │       ua_hash    = HMAC(VOTE_AUDIT_HMAC_SECRET, ua)             │       │
│   │       fresh      = (now - email_verified_at) < INTERVAL         │       │
│   │ 7. Drizzle TX:                                                  │       │
│   │       INSERT votes (...)                                        │       │
│   │         ON CONFLICT (user_id, idea_id) DO UPDATE SET            │       │
│   │            choice=EXCLUDED.choice, updated_at=NOW()             │       │
│   │       INSERT vote_events_log (action='cast'|'change',...)       │       │
│   │ 8. enqueue 'vote-anomaly-detect' BullMQ job (async, fire-forget)│       │
│   │ 9. revalidatePath('/idei/' + slug, 'page')  // best-effort      │       │
│   │ return { ok, choice, currentApproveCount: cached }              │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│   raw_ip exists ONLY inside the Server Action local var → never persisted    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  ANOMALY DETECTION WORKER                                                    │
│   BullMQ job 'vote-anomaly-detect' (or scheduled scan every 60s)            │
│        │                                                                    │
│        v                                                                    │
│   Worker:                                                                    │
│     - Per-idea velocity:    SELECT count FROM vote_events_log               │
│                              WHERE idea_id=$1 AND occurred_at > NOW()-T1     │
│     - Subnet aggregate:     SELECT count FROM vote_events_log GROUP BY       │
│                              subnet_hash WHERE occurred_at > NOW()-T2        │
│     - Fresh-account share:  SELECT sum(fresh_account_at_event) /             │
│                              count(*) FROM ... LIMIT N3                      │
│   IF any trigger fires:                                                      │
│     - INSERT vote_anomalies (idea_id, trigger_type, count, status='unresolved')│
│     - Sentry.captureMessage('vote_velocity_anomaly', tags={idea_id,trigger})│
│     - addEmailJob({kind:'vote-anomaly-alert', newsletterId/anomalyId,...}) │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  EDITOR ADMIN                                                                │
│   /admin → Payload shell                                                    │
│     ├─ Collection: Ideas (mirrors Newsletters)                              │
│     │    ├─ List view → renders inline anomaly badge per row                │
│     │    └─ Edit view → Lexical RTE + sidebar (live stats + freeze toggle)  │
│     │         Server Action: freezeDisplay(ideaId)                          │
│     │           - assertEditorOrAdmin                                       │
│     │           - UPDATE ideas SET display_frozen=true                       │
│     │           - INSERT moderation_log (action='idea_display_freeze',...)  │
│     │                                                                       │
│     └─ Custom view: /admin/views/vote-anomalies                             │
│          (mirrors /admin/views/attribution exactly)                         │
│          - Date range filter, trigger filter, status filter                 │
│          - Per-anomaly drill-in → forensic per-vote table                   │
│          - Bulk action "Изключи избраните гласове"                           │
│              Server Action: excludeVotes(voteEventIds[])                    │
│                - DELETE FROM votes WHERE id IN (...)                         │
│                - INSERT moderation_log (action='vote_exclude', target_ids)  │
│                - vote_events_log unchanged (audit preserved)                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── collections/
│   └── Ideas.ts                  # MIRRORS Newsletters.ts; D-17/D-18/D-19
├── globals/
│   └── (no new globals — topics hardcoded per D-19)
├── db/schema/
│   ├── voting.ts                 # NEW: votes, vote_events_log, vote_anomalies
│   └── moderation.ts             # NEW: moderation_log (Phase 4 extends action enum)
├── db/migrations/
│   └── 0003_*.sql                # Drizzle-generated; manual Neon-SQL DDL ONLY for Ideas Payload columns
├── lib/voting/
│   ├── slug.ts                   # transliteration + Bulgarian Streamlined override
│   ├── hmac.ts                   # HMAC for ip/ua/subnet hash (D-15)
│   ├── cooling.ts                # parseInterval + email_verified_at + INTERVAL helper (D-04)
│   ├── rate-limit.ts             # two-tier vote-rate-limit Upstash wrapper (D-11)
│   ├── cache.ts                  # unstable_cache wrapper for displayed counts (D-03)
│   ├── anomaly.ts                # multi-axis detector (D-12)
│   └── actions/
│       ├── castVote.ts           # Server Action — vote / change
│       ├── retractVote.ts        # Server Action — retract with toast undo
│       ├── undoRetract.ts        # Server Action — toast-undo handler
│       ├── freezeIdea.ts         # editor freeze/unfreeze
│       └── excludeVotes.ts       # editor bulk vote-exclude
├── lib/email/templates/
│   └── VoteAnomalyAlertEmail.tsx # NEW React Email template (mirrors NewsletterEmail.tsx)
├── components/idea/
│   ├── IdeaCard.tsx              # catalog card
│   ├── IdeaDetail.tsx            # detail page wrapper
│   ├── VoteButtons.tsx           # client island, aria-pressed pattern (D-24)
│   ├── VoteCountDisplay.tsx      # threshold-gated D-02/D-03 logic
│   ├── RetractToast.tsx          # Sonner integration (D-24 5-sec undo)
│   ├── TopicChips.tsx            # filter UI
│   └── SortDropdown.tsx          # filter UI
├── components/member/
│   ├── Timeline.tsx              # EXISTING — D-05 reuses for "My Activity"
│   ├── MyActivityPanel.tsx       # NEW — voted-ideas list with retract/change inline
│   └── ProfileCard.tsx           # NEW — D-26 read-only profile
├── components/payload/
│   ├── IdeaSidebar.tsx           # D-22 edit-screen sidebar live stats + freeze toggle
│   └── ViewOnSiteButton.tsx      # D-19 "Виж как изглежда на сайта"
├── app/(frontend)/
│   ├── idei/
│   │   ├── page.tsx              # catalog index
│   │   └── [slug]/page.tsx       # idea detail (server-renders Lexical AST)
│   └── member/
│       └── profile/page.tsx      # D-26
└── app/(payload)/admin/views/
    └── vote-anomalies/
        ├── page.tsx              # Custom Payload view (mirrors AttributionView)
        ├── VoteAnomaliesView.tsx
        ├── VoteAnomaliesDashboard.tsx
        └── actions.ts            # Drizzle aggregates with assertEditorOrAdmin
```

### Pattern 1: Lexical Allowed-Blocks Whitelist (mirror Newsletters)

**What:** Restricts editor formatting to a fixed set so emails / catalog pages cannot break the template.

**When to use:** Every `richText` field that is rendered on a public surface where formatting fidelity matters.

**Example (verified against `src/collections/Newsletters.ts:95-119`):**

```typescript
// src/collections/Ideas.ts
import {
  lexicalEditor,
  ParagraphFeature,
  HeadingFeature,
  LinkFeature,
  UnorderedListFeature,
  OrderedListFeature,
  BoldFeature,
  ItalicFeature,
  FixedToolbarFeature,
  InlineToolbarFeature,
} from '@payloadcms/richtext-lexical';

// Identical feature list to Newsletters; banned (per D-17): code blocks,
// blockquotes, custom blocks, raw HTML.
editor: lexicalEditor({
  features: () => [
    ParagraphFeature(),
    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
    LinkFeature(),
    UnorderedListFeature(),
    OrderedListFeature(),
    BoldFeature(),
    ItalicFeature(),
    FixedToolbarFeature(),
    InlineToolbarFeature(),
  ],
}),
```

`[VERIFIED: src/collections/Newsletters.ts:95-119]` `[CITED: payloadcms.com/docs/rich-text-editor/lexical]`

### Pattern 2: HMAC-Hashed Forensic Identifiers

**What:** Replace raw IP / UA / subnet with HMAC-SHA256 hashes in the audit table so the table is GDPR-safe (raw IP never persisted, GDPR-09) and the editor can still cluster suspect votes by exact match.

**When to use:** Any audit table that needs identifier-stability for clustering but cannot legally hold the raw value.

**Example (mirrors `src/lib/unsubscribe/hmac.ts` shape; new):**

```typescript
// src/lib/voting/hmac.ts
import { createHmac } from 'node:crypto';

function SECRET(): string {
  const s = process.env.VOTE_AUDIT_HMAC_SECRET;
  if (!s) throw new Error('VOTE_AUDIT_HMAC_SECRET not set');
  return s;
}

export function hashIp(ip: string): string {
  return createHmac('sha256', SECRET()).update(ip).digest('hex');
}

export function hashSubnet(ip: string): string {
  // /24 for IPv4, /64 for IPv6 — avoids per-household clustering false-positive.
  // src/lib/ip.ts already has getSubnet for IPv4; extend for IPv6.
  const subnet = subnetPrefix(ip);
  return createHmac('sha256', SECRET()).update(subnet).digest('hex');
}

export function hashUa(ua: string): string {
  return createHmac('sha256', SECRET()).update(ua).digest('hex');
}
```

`[VERIFIED: pattern from src/lib/unsubscribe/hmac.ts:1-39 + src/lib/auth/role-gate.ts]`

**Why HMAC, not plain SHA-256:** A raw SHA-256 of an IP is rainbow-table-ble (the IP space is small; ~4.3B IPv4). HMAC with a secret defeats this — an attacker who steals the database cannot brute-force which IP each hash corresponds to without also stealing the secret. `[CITED: NIST SP 800-107 Rev 1, hashlib pre-image attacks]`

**Secret rotation procedure (D-15 OPS-RUNBOOK entry):**
1. Annual cadence (planner adds `OPS-RUNBOOK §X HMAC rotation`).
2. New secret rotates in via Fly.io secrets + GitHub Actions secrets.
3. Old rows keep matching against old secret WITHIN the same epoch. Phase 3 OPS-04 alerts only fire on ≤30-min windows, so cross-epoch comparison is never needed.
4. After rotation, the secret epoch counter is bumped; documented in OPS-RUNBOOK.
5. **No re-hashing of historic data** — that would defeat the GDPR rationale.

### Pattern 3: Append-Only Audit Tables (Drizzle, app-level convention)

**What:** Tables where every state change is an INSERT, never an UPDATE / DELETE. Mirrors `consents` table.

**Example (verified against `src/db/schema/consents.ts:19-35`):**

```typescript
// src/db/schema/voting.ts (sketch)
export const VOTE_ACTIONS = ['cast', 'change', 'retract'] as const;
export const VOTE_CHOICES = ['approve', 'reject'] as const;

export const vote_events_log = pgTable(
  'vote_events_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' }), // NULLABLE for D-16 lawyer-flip path
    idea_id: uuid('idea_id')
      .notNull()
      .references(() => ideas.id, { onDelete: 'cascade' }),
    choice: text('choice'),  // 'approve' | 'reject' | null (null on retract)
    action: text('action').notNull(), // 'cast' | 'change' | 'retract'
    occurred_at: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
    ip_hash: text('ip_hash').notNull(),
    subnet_hash: text('subnet_hash').notNull(),
    ua_hash: text('ua_hash').notNull(),
    fresh_account_at_event: boolean('fresh_account_at_event').notNull(),
  },
  (t) => ({
    ideaTimeIdx: index('vote_events_idea_time_idx').on(t.idea_id, t.occurred_at),
    subnetTimeIdx: index('vote_events_subnet_time_idx').on(t.subnet_hash, t.occurred_at),
    userTimeIdx: index('vote_events_user_time_idx').on(t.user_id, t.occurred_at),
  }),
);
```

`[VERIFIED: src/db/schema/consents.ts:19-35]`

### Pattern 4: Custom Payload Admin View (mirror `/admin/views/attribution`)

**Example (verified against `src/app/(payload)/admin/views/attribution/AttributionView.tsx`):**

```typescript
// src/app/(payload)/admin/views/vote-anomalies/VoteAnomaliesView.tsx
import type { AdminViewServerProps } from 'payload';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import bg from '../../../../../../messages/bg.json';
import { fetchVoteAnomalies } from './actions';
import { VoteAnomaliesDashboard } from './VoteAnomaliesDashboard';

const t = (bg as { admin: { voteAnomalies: Record<string, string> } }).admin.voteAnomalies;

export async function VoteAnomaliesView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req: { user, i18n, payload }, locale, visibleEntities } = initPageResult;
  if (!user) return /* loginRequired */;
  const role = (user as { role?: string }).role ?? '';
  if (!['admin', 'editor'].includes(role)) return /* denied */;
  const sp = (await searchParams) ?? {};
  const data = await fetchVoteAnomalies(parseFilter(sp));
  return (
    <DefaultTemplate i18n={i18n} locale={locale} params={params} payload={payload} visibleEntities={visibleEntities}>
      <Gutter>
        <h1>{t.title}</h1>
        <VoteAnomaliesDashboard initialFilter={parseFilter(sp)} initialData={data} />
      </Gutter>
    </DefaultTemplate>
  );
}
```

`[VERIFIED: src/app/(payload)/admin/views/attribution/AttributionView.tsx:1-78]`

### Pattern 5: Cooling Gate via JOIN-time INTERVAL filter

**What:** Filter cooling votes from displayed counts at query time, not at INSERT time. The vote INSERT happens immediately; only the displayed-count read filters.

**Example:**

```sql
-- D-04: cooling-period filter inside the cached count query.
-- VOTE_COUNTABLE_INTERVAL is parsed at startup (D-10) to a SQL interval literal.
SELECT COUNT(*) AS approve_count
FROM votes v
INNER JOIN users u ON u.id = v.user_id
WHERE v.idea_id = $1
  AND v.choice = 'approve'
  AND u.email_verified_at + INTERVAL '48 hours' < NOW();
```

**Performance note:** The JOIN cost is bounded — `votes` has a UNIQUE on `(user_id, idea_id)` so it's effectively `count(votes WHERE idea_id=$1)` with a hash-join against a small subset of `users`. At catalog scale (~100 ideas × ~5k members), each cached read is < 5ms. The 5-min `unstable_cache` TTL means each idea fires this query at most ~12 times per hour. **Materialization is not needed at v1 scale.** Revisit if hot-idea-load profile shows it's the bottleneck.

`[CITED: PostgreSQL EXPLAIN guide on hash join cost]`

### Pattern 6: Two-Tier Rate Limit (extend `src/lib/rate-limit.ts`)

**What:** Soft / hard rate limit with Turnstile required between them.

**Example (extends Phase 1 D-07 pattern):**

```typescript
// src/lib/voting/rate-limit.ts
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const redis = /* same Upstash instance */;

const voteSoft = new Ratelimit({
  redis,
  prefix: 'vote-soft',
  limiter: Ratelimit.slidingWindow(5, '60 s'), // D-11 default
  analytics: false,
});
const voteHard = new Ratelimit({
  redis,
  prefix: 'vote-hard',
  limiter: Ratelimit.slidingWindow(20, '60 s'), // D-11 default
  analytics: false,
});

export async function gateVoteRate(userId: string, hasTurnstile: boolean): Promise<{ ok: true } | { ok: false; reason: 'turnstile-required' | 'hard-block' }> {
  const hard = await voteHard.limit(userId);
  if (!hard.success) return { ok: false, reason: 'hard-block' };
  const soft = await voteSoft.limit(userId);
  if (!soft.success && !hasTurnstile) return { ok: false, reason: 'turnstile-required' };
  return { ok: true };
}
```

`[VERIFIED: src/lib/rate-limit.ts:1-90 — Phase 1 D-07 pattern]`

### Pattern 7: Sonner Toast with 5-Second Undo Window (D-24)

**What:** Sonner's `action` slot supports an undo button + auto-dismiss timer.

**Example:**

```tsx
// src/components/idea/RetractToast.tsx (Phase 3 new)
import { toast } from 'sonner';
import { undoRetract } from '@/app/actions/voting/undo-retract';

export function showRetractToast(voteEventLogId: string, prevChoice: 'approve' | 'reject') {
  toast('Гласът ти е оттеглен.', {
    duration: 5000, // D-24 — 5-second undo window
    action: {
      label: 'Отмени',
      onClick: async () => {
        await undoRetract(voteEventLogId, prevChoice);
        toast.success('Възстановен.');
      },
    },
  });
}
```

**Why client-side timer is safe:** the underlying server state is "vote is retracted" the entire duration; if user clicks Undo, a new `vote_events_log` row with `action='cast'` is INSERTed restoring the previous choice. If user does nothing for 5s, the toast vanishes — no extra server work. Both paths are audit-trailed. There is no race condition: the 5-second window is purely a UX affordance, not an authorization window.

`[CITED: github.com/emilkowalski/sonner README; sonner.emilkowal.ski/toast#action]`

### Pattern 8: Vote-Button Selected State via `aria-pressed`

**What:** Same button label always; `aria-pressed` flips on selection. WAI-ARIA APG canonical pattern for toggle buttons.

**Example:**

```tsx
// src/components/idea/VoteButtons.tsx
'use client';
import { Button } from '@/components/ui/button';
import { useTransition } from 'react';
import { castVote } from '@/app/actions/voting/cast-vote';

export function VoteButtons({ ideaId, currentChoice }: { ideaId: string; currentChoice: 'approve' | 'reject' | null }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-2">
      <Button
        variant={currentChoice === 'approve' ? 'default' : 'outline'}
        aria-pressed={currentChoice === 'approve'}
        disabled={pending}
        onClick={() => startTransition(() => castVote(ideaId, 'approve'))}
      >
        Одобрявам
      </Button>
      <Button
        variant={currentChoice === 'reject' ? 'default' : 'outline'}
        aria-pressed={currentChoice === 'reject'}
        disabled={pending}
        onClick={() => startTransition(() => castVote(ideaId, 'reject'))}
      >
        Не одобрявам
      </Button>
    </div>
  );
}
```

`[CITED: w3.org/WAI/ARIA/apg/patterns/button — Button Pattern]` `[CITED: developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-pressed]`

### Anti-Patterns to Avoid

- **`pgEnum` for `choice` / `action` / `topic` / `status`** — use `text` columns. Adding values to a pg enum is DDL; project convention is text + Zod boundary check. `[VERIFIED: src/db/schema/auth.ts:16-17 sector/role + attribution.ts]`
- **Auto-freeze on velocity threshold (Pitfall 1 #5)** — opponents would game alerts to suppress legitimate viral ideas. **NEVER auto-freeze.** Editor manually clicks freeze. The admin UI MUST signal this clearly: in `/admin/views/vote-anomalies` add a banner "Замразяването е ръчно решение — масов глас НЕ е масова злоупотреба" so editors don't panic-freeze during normal viral spikes.
- **Live displayed-count update on vote write** — the cached count has a 5-min TTL; vote writes do NOT bust the cache (D-03). This is intentional anti-screenshot-smear (Pitfall 9): a coordinated spike doesn't appear in real-time on the public surface, removing the screenshot-as-weapon vector during the cache window. Plans must NOT add `revalidateTag` calls that bust the count cache.
- **Public reject count** — D-02 explicitly hides it. `<VoteCountDisplay role="public">` must NOT render the reject number even if it's available in the props. Test asserts the public-mode render contains no reject number.
- **Synchronous Brevo / Sentry call in `castVote` Server Action** — Phase 1 D-19 + Phase 5 D-21 forbid. Anomaly detection is a BullMQ background job; editor email is a BullMQ job; Sentry call is fine (Sentry SDK is async-buffered, < 1ms latency cost).
- **Storing raw IP / UA in `vote_events_log`** — schema-grep test asserts no `inet`, `raw_ip`, `ip_address`, `user_agent`, `ua` (only `ua_hash`) columns. Mirrors `tests/unit/attribution-schema.test.ts`.
- **Client-side cooling-period check** — the cooling gate is a server-only query JOIN (D-04). Plans must NOT render conditional UI based on a client-side computed `now() - emailVerifiedAt < INTERVAL` because that bypasses any server-side enforcement.
- **Single-pass slug uniqueness** — Postgres uniqueness on `slug` requires a retry loop with numeric suffix; otherwise two editors creating "Намаляване на ДДС" simultaneously race. The slug helper must use `ON CONFLICT (slug) DO NOTHING` + retry or `slugify(title) || '-' || nextval(seq)` pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cyrillic transliteration | Custom regex / per-letter mapping from scratch | `transliteration@2.6.1` + override table for Streamlined System exceptions | The Streamlined System has 2 exception rules (word-final -ия, Ъ→a) that hand-rolled code routinely gets wrong. Edge cases: digraphs (зх vs ж), non-letter characters, normalization. |
| Toast UX | Custom toast component with manual setTimeout | Sonner (already installed) | Sonner handles ARIA live regions, focus management, queue collision, action-button accessibility, auto-dismiss timing — all correctly. |
| Lexical AST → HTML render for catalog detail page | Custom walker | `src/lib/newsletter/lexical-to-html.ts` (Phase 5 already wrote this) — extend to cover the Ideas-allowed block set | Phase 5 already solved this for Newsletter HTML; same Lexical AST shape. |
| Vote velocity rolling-window count | Manual SQL `WHERE occurred_at > NOW() - INTERVAL` on every render | Materialized `vote_anomalies` row + scheduled scan worker | On-demand aggregate per Ideas list row = N queries per page render at Ideas list scale — bad. Materialize. |
| Per-vote rate limit | Custom in-memory counter | `@upstash/ratelimit` two-tier wrapper (existing `src/lib/rate-limit.ts` pattern) | Already proven against multi-pod Fly.io topology; HTTP-Redis is serverless-safe. |
| HMAC token format | Custom JWT or homemade signature | `node:crypto.createHmac('sha256', secret)` (existing `src/lib/unsubscribe/hmac.ts` pattern) | Avoids JWT `alg:none` confusion attack surface; deterministic; no dep. |
| Email anomaly alert template | New email send code | Extend Phase 5 `EmailJobKind` enum with `vote-anomaly-alert` | Phase 5 already has Brevo + React Email + retry policy + Pino redact; one new template + one switch case. |
| Idea autosave / draft / version history | Custom Drizzle table + diff logic | Payload's native draft/autosave config on the Ideas collection | Payload 3.84 supports `versions: { drafts: { autosave: true } }` natively; mirrors however Newsletters set this up. Verify the existing pattern. |

**Key insight:** Phase 3 has effectively zero new infrastructure. The new code is glue (Server Actions, components, the anomaly worker, three Drizzle tables). The hardest **new** thing is the multi-axis anomaly detection logic — which is one BullMQ worker function with three SQL aggregates and three threshold env-vars.

## Runtime State Inventory

> Phase 3 is greenfield (NO renames, NO refactors, NO migrations of existing rows). Rename/refactor inventory does not apply. Forward-compatible schema decisions are documented under D-13 (`vote_events_log.user_id` nullable for D-16 lawyer-flip path) and D-21 (`moderation_log.action` extensible enum for Phase 4 EDIT-06).

## Common Pitfalls

### Pitfall 1: Auto-Freeze During Normal Viral Spike

**What goes wrong:** Editor sees "30 votes in 10 min" alert and panic-freezes a legitimately viral idea. Opponents discover the trigger threshold and intentionally seed votes to game alerts and suppress legitimate ideas.

**Why it happens:** Alert UX implies "this is suspicious" without educating the editor on legitimate-spike vs attack distinction.

**How to avoid:** Plan the `/admin/views/vote-anomalies` UI with explicit copy "Замразяването е ръчно решение — масов глас НЕ е масова злоупотреба" + a "What does this mean?" inline help that explains: "Многобройни гласове за кратко време често са знак за виралност (споделяне на идеята). Замразявайте САМО ако виждате клъстер от freshly-registered акаунти от един и същи /24 subnet." Pitfall 1 #5 explicit.

**Warning signs:** Editor freezes >2 ideas in first month; freeze reasons in `moderation_log.note` are vague ("looked suspicious").

### Pitfall 2: Public Reject-Count Leak Via Members-Only View

**What goes wrong:** A logged-in member screenshots the members-only view showing "87 не одобряват" and shares it externally as if it were the public position of the platform's membership.

**Why it happens:** Pitfall 9 — screenshot smear. Even members can be motivated to weaponize internal data.

**How to avoid:**
1. Render the reject-count display with a **subtle "за членове" label** beside the number, so a screenshot is self-attributing.
2. Reveal the reject count ONLY past the same `IDEA_REVEAL_THRESHOLD` as the approve count (default 20). Below threshold = no number visible to anyone.
3. Pre-threshold, render the empty-state copy "Резултатите ще се покажат след първите %{N} гласа" identical for member and public — no leak about the "secret" reject number.
4. Plans MUST NOT add an editor-facing "share members-view link" feature.

**Reasoning:** The minimum reject-count exposure that doesn't enable internal screenshot smear is **the same as the public-view reveal threshold (20 votes total)**. Any earlier exposure makes the cooling-period and threshold-gate defenses meaningless. `[CITED: PITFALLS.md #9 + general civic-tech screenshot defense]`

### Pitfall 3: HMAC Secret Leak in Logs

**What goes wrong:** Worker logs the HMAC inputs ("hashing 192.168.1.5") and a Pino REDACT rule misses it; `VOTE_AUDIT_HMAC_SECRET` is now leakable via log forensics if combined with the published code.

**How to avoid:**
1. The HMAC helpers in `src/lib/voting/hmac.ts` MUST NOT log inputs. Every log statement passes only the hash output (or nothing).
2. Pino REDACT extends to cover `ip`, `raw_ip`, `ua`, `user_agent` keys — not just `email`. Plans add a regression test: `tests/unit/logger.test.ts` asserts a log call with `{ip: '1.2.3.4'}` redacts.
3. `VOTE_AUDIT_HMAC_SECRET` must be set as a Fly.io secret (`flyctl secrets set`) AND a GitHub Actions secret. **Never** committed to git.

### Pitfall 4: 5-Second Toast Undo Race

**What goes wrong:** Member clicks Retract, then Undo, then Retract again — within 5 seconds. State machine becomes inconsistent: the `votes` row has been DELETEd, INSERTed, DELETEd; `vote_events_log` has 3 events.

**How to avoid:** This is by design correct — every state change writes a `vote_events_log` row. The `votes` table represents only the current state, no race. The Server Action writes both in a single Drizzle transaction. Plans ensure each click is in a single TX; rapid clicking serializes via `useTransition` or button-disabled-during-pending.

### Pitfall 5: Slug Collision on Concurrent Publish

**What goes wrong:** Two editors simultaneously publish "Намаляване на ДДС"; both INSERTs see no existing slug `namaliavane-na-dds`; both succeed without numeric suffix → URL collision (one becomes inaccessible).

**How to avoid:** Slug uniqueness via Postgres UNIQUE on `ideas.slug`. Slug generator does:
```ts
let slug = baseSlug;
let n = 2;
while (await db.select({id:ideas.id}).from(ideas).where(eq(ideas.slug, slug)).limit(1).then(r => r.length > 0)) {
  slug = `${baseSlug}-${n++}`;
}
// then INSERT with ON CONFLICT (slug) DO NOTHING + retry on the rare race.
```
Concurrent-publish is rare (one editor team in v1) so an optimistic loop is fine.

### Pitfall 6: Cooling Filter Forgotten in Sort-By-Most-Approved

**What goes wrong:** D-08 sort "Най-одобрени" sorts by `approve_count DESC` — but does that count include cooling votes? If yes, fresh sockpuppet attack inflates a single idea to top of catalog regardless of cooling-display gate.

**How to avoid:** **Sort `approve_count` is the cooling-filtered count** (same query semantics as the displayed count). Plans must verify: the SQL behind the "Най-одобрени" sort uses the same JOIN-with-INTERVAL filter as `D-04`. Schema test asserts the catalog `ORDER BY` SQL matches the cooling-aware count.

### Pitfall 7: Catalog `unstable_cache` Invalidation on Vote

**What goes wrong:** Plan adds `revalidatePath('/idei/' + slug)` inside the `castVote` Server Action because "the count should be fresh." This violates D-03 (cache must NOT be busted on vote write); restores the exact attack vector that D-03 + D-12 were designed to prevent (real-time count = screenshot smear surface).

**How to avoid:** **No `revalidatePath` / `revalidateTag` calls anywhere in `castVote`, `change`, `retract`, or undo.** The cache refreshes naturally on its 5-min TTL. Test asserts the Server Action source code does not import `revalidatePath` or `revalidateTag`. The single exception: `IdeaSidebar` editor view does NOT use `unstable_cache` (real-time vote stats for editor) — it queries directly.

## Code Examples

> Verified patterns from official sources and the project codebase.

### Bulgarian Streamlined Slug Helper

```typescript
// src/lib/voting/slug.ts
import { transliterate } from 'transliteration';

// Source: en.wikipedia.org/wiki/Romanization_of_Bulgarian — Streamlined System
// (Bulgarian Transliteration Act 2009). Match overrides BEFORE the default
// transliteration runs to enforce Bulgarian-specific rules.
const BULGARIAN_OVERRIDES: Array<[RegExp, string]> = [
  // Word-final -ия → -ia exception (2006 amendment, also adopted by UN 2012)
  [/ия\b/g, 'ia'],
  // Default transliteration handles digraphs:
  //   Ж zh, З z, Й y, Ц ts, Ч ch, Ш sh, Щ sht, Ъ a, Ь y, Ю yu, Я ya
];

function applyOverrides(input: string): string {
  let result = input;
  for (const [pattern, replacement] of BULGARIAN_OVERRIDES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function slugifyBg(title: string): string {
  const overridden = applyOverrides(title);
  // transliteration's default Latin output for Cyrillic happens to match
  // the Streamlined System exactly for all non-exception letters; we lean
  // on it instead of maintaining a parallel table.
  return transliterate(overridden, { trim: true })
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

`[VERIFIED: npm view transliteration@2.6.1]` `[CITED: en.wikipedia.org/wiki/Romanization_of_Bulgarian]`

**Required test cases (all 30 letters of the Bulgarian alphabet + 2006 exception):**

```typescript
// tests/unit/slug.test.ts
describe('slugifyBg — Bulgarian Streamlined System (Transliteration Act 2009)', () => {
  const cases: Array<[string, string]> = [
    ['Намаляване на ДДС', 'namalyavane-na-dds'],
    ['Защита на работниците', 'zashtita-na-rabotnitsite'],
    ['Цифровизация на МСП', 'tsifrovizatsia-na-msp'],   // Ц→ts, я→ia (word-final)
    ['Финансиране и кредит', 'finansirane-i-kredit'],
    ['Жилищна политика', 'zhilishtna-politika'],          // Ж→zh, щ→sht
    ['Български стандарт', 'balgarski-standart'],         // ъ→a
    ['Юлските проблеми', 'yulskite-problemi'],            // Ю→yu
    ['Ямболска община', 'yambolska-obshtina'],            // Я→ya (NOT word-final)
    ['Ивайло Калфин', 'ivaylo-kalfin'],                   // Й→y
    // Exception: word-final -ия → -ia (Sofia, Bulgaria pattern)
    ['България', 'balgaria'],
    ['София', 'sofia'],
    ['Тракия', 'trakia'],
  ];
  for (const [input, expected] of cases) {
    it(`"${input}" → "${expected}"`, () => {
      expect(slugifyBg(input)).toBe(expected);
    });
  }
});
```

**Note:** the override `/ия\b/g` is greedy — verify against `Стратегия за бъдещето` → `strategia-za-badeshteto`. If `transliteration` happens to produce `iya` for non-word-final `ия` (e.g., `Стратегията`), the override won't fire. Confirm test coverage end-to-end.

### Cooling-Period Drizzle Query

```typescript
// src/lib/voting/cooling.ts
import { sql } from 'drizzle-orm';

// D-10 — parsed at startup. Format regex: ^\d+ (hours|days)$
function parseInterval(raw: string): string {
  if (!/^\d+ (hours|days)$/.test(raw)) {
    throw new Error(`Invalid VOTE_COUNTABLE_INTERVAL: ${raw}`);
  }
  return raw;
}
const COOLING_INTERVAL = parseInterval(process.env.VOTE_COUNTABLE_INTERVAL ?? '48 hours');

// D-04 — cooling-aware approve count for a single idea.
export async function getCooledApproveCount(db: DrizzleDb, ideaId: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS approve_count
    FROM votes v
    INNER JOIN users u ON u.id = v.user_id
    WHERE v.idea_id = ${ideaId}
      AND v.choice = 'approve'
      AND u.email_verified_at + INTERVAL '${sql.raw(COOLING_INTERVAL)}' < NOW()
  `);
  return Number(result.rows[0]?.approve_count ?? 0);
}
```

`[CITED: postgresql.org/docs/current/functions-datetime.html — INTERVAL arithmetic]` `[VERIFIED: src/lib/voting/cooling.ts pattern matches src/db drizzle sql.raw usage]`

### Anomaly Detection Worker (skeleton)

```typescript
// src/lib/voting/anomaly.ts
const PER_IDEA_VELOCITY_N1 = Number(process.env.ANOMALY_PER_IDEA_N1 ?? 30);
const PER_IDEA_VELOCITY_T1_MIN = Number(process.env.ANOMALY_PER_IDEA_T1_MIN ?? 10);
const SUBNET_AGG_N2 = Number(process.env.ANOMALY_SUBNET_N2 ?? 20);
const SUBNET_AGG_T2_MIN = Number(process.env.ANOMALY_SUBNET_T2_MIN ?? 30);
const FRESH_SHARE_PCT = Number(process.env.ANOMALY_FRESH_PCT ?? 50);
const FRESH_WINDOW_N3 = Number(process.env.ANOMALY_FRESH_WINDOW_N3 ?? 20);

export async function detectAnomaliesForIdea(db: DrizzleDb, ideaId: string) {
  // Trigger 1 — per-idea velocity
  const velRow = await db.execute(sql`
    SELECT COUNT(*)::int AS n
    FROM vote_events_log
    WHERE idea_id = ${ideaId}
      AND occurred_at > NOW() - INTERVAL '${sql.raw(`${PER_IDEA_VELOCITY_T1_MIN} minutes`)}'
  `);
  if (Number(velRow.rows[0]?.n ?? 0) > PER_IDEA_VELOCITY_N1) {
    await emitAnomaly(db, ideaId, 'per_idea_velocity', Number(velRow.rows[0]?.n));
  }
  // Trigger 2 — subnet aggregate
  const subnetRow = await db.execute(sql`
    SELECT MAX(c) AS m FROM (
      SELECT subnet_hash, COUNT(*)::int AS c
      FROM vote_events_log
      WHERE idea_id = ${ideaId}
        AND occurred_at > NOW() - INTERVAL '${sql.raw(`${SUBNET_AGG_T2_MIN} minutes`)}'
      GROUP BY subnet_hash
    ) AS s
  `);
  if (Number(subnetRow.rows[0]?.m ?? 0) > SUBNET_AGG_N2) {
    await emitAnomaly(db, ideaId, 'subnet_cluster', Number(subnetRow.rows[0]?.m));
  }
  // Trigger 3 — fresh-account share
  const freshRow = await db.execute(sql`
    SELECT
      SUM(CASE WHEN fresh_account_at_event THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS pct,
      COUNT(*)::int AS total
    FROM (
      SELECT fresh_account_at_event
      FROM vote_events_log
      WHERE idea_id = ${ideaId}
      ORDER BY occurred_at DESC
      LIMIT ${FRESH_WINDOW_N3}
    ) AS recent
  `);
  if (
    Number(freshRow.rows[0]?.total ?? 0) >= FRESH_WINDOW_N3 &&
    Number(freshRow.rows[0]?.pct ?? 0) > FRESH_SHARE_PCT
  ) {
    await emitAnomaly(db, ideaId, 'fresh_account_share', Number(freshRow.rows[0]?.pct));
  }
}

async function emitAnomaly(db: DrizzleDb, ideaId: string, trigger: string, count: number) {
  const id = await db.insert(vote_anomalies).values({
    idea_id: ideaId,
    trigger_type: trigger,
    count,
    status: 'unresolved',
  }).returning({ id: vote_anomalies.id });
  // Sentry tag schema (Phase 1 D-21 — no PII):
  Sentry.captureMessage('vote_velocity_anomaly', {
    level: 'warning',
    tags: { idea_id: ideaId, trigger_type: trigger, count: String(count) },
  });
  // BullMQ editor email (mirrors Phase 5 EmailJobKind extension)
  await addEmailJob({ kind: 'vote-anomaly-alert', anomalyId: id[0]?.id, ideaId });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pgEnum for vote choice / action | text + Zod boundary | Phase 1 D-09/D-10 + Phase 2.1 D-11 | Adding values is no longer DDL |
| Live displayed counts | 5-min server-side cache | Phase 3 D-03 | Mitigates screenshot-smear (Pitfall 9) |
| Raw IP in audit log | HMAC-hashed only | Phase 2.1 D-19 / GDPR-09 | GDPR-compliant; clustering still possible via exact-match hash |
| Single big consents table | Append-only consents + new vote_events_log + moderation_log mirroring same pattern | Phase 1 D-13 → Phase 3 D-13/D-21 | Audit immutability at app level today; DB-level INSERT-only in Phase 6 GDPR-07 |
| Auto-freeze suspicious votes | Manual editor freeze + silent display-freeze | Phase 3 D-12 / D-23 | Prevents adversaries from gaming alerts to suppress legitimate viral ideas |
| Live preview pane on every collection | Preview-on-site button only | Phase 3 D-19 (vs Phase 5 D-02) | Catalog ideas don't have email-charset rendering pitfalls; live preview is overkill |

**Deprecated/outdated:**
- `unstable_cache` is being replaced by `use cache` directive in Next.js 16, but the project is on Next.js 15.3.9 where `unstable_cache` remains the canonical pattern. Plans MUST NOT use `use cache` directive (Next 16 only). `[VERIFIED: nextjs.org/docs/app/api-reference/functions/unstable_cache]`

## Claude's Discretion Answered

> Authoritative recommendations for the planner. Each item is a directive — the planner can deviate only with documented reason.

### 1. Velocity-Trigger Thresholds (D-12)

**Recommendation:** Ship the CONTEXT defaults exactly: per-idea velocity `> 30 votes / 10 min`; /24-subnet aggregate `> 20 / 30 min`; fresh-account share `> 50% of last 20 votes`. Tune via env vars `ANOMALY_PER_IDEA_N1=30`, `ANOMALY_PER_IDEA_T1_MIN=10`, `ANOMALY_SUBNET_N2=20`, `ANOMALY_SUBNET_T2_MIN=30`, `ANOMALY_FRESH_PCT=50`, `ANOMALY_FRESH_WINDOW_N3=20`.

**Reasoning:** Coalition warmup volume is unknown (50–200 internal users by end of Phase 1 D-18). At 5k-member catalog scale, 30 votes / 10 min on a single idea is ~3% of the active member base voting in 10 minutes — that IS unusual. False-positive rate is acceptable because alerts are advisory (editor reviews, never auto-acts). After 4-week post-launch observation, planner adjusts via env-flag flip; no code change needed.

`[ASSUMED]` — these are directional defaults from CONTEXT.md. Real ground-truth comes from 4-week post-launch traffic profile.

### 2. `IDEA_REVEAL_THRESHOLD` (D-03)

**Recommendation:** `IDEA_REVEAL_THRESHOLD = 20` — same as CONTEXT default. Set via env var, not const, so ops can flip without redeploy.

**Reasoning:** 20 votes is the minimum where approve % is statistically defensible (margin of error ±22% at 95% CI). Below 20, percentages mislead; "5 одобряват — 80%" framing is screenshot-smear material. Pitfall 9 + screenshot-smear defense.

`[ASSUMED]` — ready for coalition feedback.

### 3. Soft / Hard Rate-Limit Numbers (D-11)

**Recommendation:** `VOTE_RATE_SOFT = 5 votes / 60s`, `VOTE_RATE_HARD = 20 votes / 60s`. Ship as env-flags.

**Reasoning:** A real member voting through a 100-idea catalog at 1 second per click hits soft (5/min) on the 5th click — Turnstile fires once and unblocks. 20/min hard is honest brigading territory (a human can't vote 20 times in 60s with reading; only scripts can). Phase 1 D-07 registration rate-limit is `3/24h`; voting is intentionally looser because the action is lower-stakes per-event.

`[ASSUMED]` — direct ship of CONTEXT defaults.

### 4. Slug Helper Implementation (D-18)

**Recommendation:** **`transliteration@2.6.1`** + 30-line Bulgarian Streamlined System override module + fixture-based test. **Not** `slugify@1.6.9` (wrong Bulgarian table), **not** `cyrillic-to-translit-js` (no Bulgarian preset), **not** `slug@11.0.1` (charmap is awkward to test).

**Reasoning:** `transliteration`'s default Cyrillic→Latin output happens to match the Streamlined System for all 30 Bulgarian letters except for the 2006 word-final -ия exception. Override via 1-2 regex patterns is small, testable, and cited (Wikipedia Streamlined System table). Zero-runtime-deps. Unit-tested character-by-character against the official Transliteration Act mapping.

`[CITED: en.wikipedia.org/wiki/Romanization_of_Bulgarian]` `[VERIFIED: npm view transliteration@2.6.1]`

### 5. Cache Implementation (D-03)

**Recommendation:** **Next.js `unstable_cache`** with `revalidate: 300`. Cache key = `[ideaId, IDEA_REVEAL_THRESHOLD, COOLING_INTERVAL]`. **Not** Upstash Redis cache, **not** Postgres materialized view.

**Reasoning:**
- **Catalog scale:** ~100 ideas × 100 reads/idea/hour × 12 cache slots/hour = 120k cache hits/hour, 1.2k DB queries/hour — trivially manageable per-pod.
- **Upstash Redis cache** would add a network round-trip + a connection failure mode for negligible benefit; Phase 5 cache pattern is `unstable_cache`-based and there's no operational reason to fork.
- **Postgres materialized view** adds write-side bookkeeping (REFRESH MATERIALIZED VIEW on cron) for a small read win.
- `unstable_cache` is per-pod (no cross-pod invalidation needed because vote writes never bust the cache — D-03 explicit). On Fly.io with 1-2 web pods initially, drift between pod caches is at worst 5 minutes — irrelevant.

**Trade-off:** When Next.js 16 drops, migration to `use cache` directive is straightforward.

`[CITED: nextjs.org/docs/app/api-reference/functions/unstable_cache]`

### 6. `vote_events_log` Index Strategy (D-13/D-15)

**Recommendation:** Three indexes, exactly the CONTEXT-suggested set. Ship as:

```typescript
{
  ideaTimeIdx: index('vote_events_idea_time_idx').on(t.idea_id, t.occurred_at),     // D-12 trigger 1: per-idea velocity scan
  subnetTimeIdx: index('vote_events_subnet_time_idx').on(t.subnet_hash, t.occurred_at), // D-12 trigger 2: subnet cluster scan
  userTimeIdx: index('vote_events_user_time_idx').on(t.user_id, t.occurred_at),    // D-12 trigger 3 (fresh-account share via JOIN) + admin /admin/views/vote-anomalies forensic per-user
}
```

**Why this set:** Each anomaly trigger query fits one index lookup; admin per-vote forensic table fits the user index. No covering index — `vote_events_log` rows are small and scan-cheap once the predicate is index-served. Plans MUST NOT add indexes on `ip_hash` or `ua_hash` at v1 — those are forensic tools used in the editor admin UI only, not on hot paths.

### 7. Anomaly Tracker Storage (D-20) — Materialized vs On-Demand

**Recommendation:** **Materialized** `vote_anomalies` table:

```sql
CREATE TABLE vote_anomalies (
  id uuid PK,
  idea_id uuid REFERENCES ideas ON DELETE CASCADE,
  trigger_type text NOT NULL,  -- 'per_idea_velocity' | 'subnet_cluster' | 'fresh_account_share'
  count int NOT NULL,
  first_detected_at timestamptz DEFAULT NOW(),
  last_detected_at timestamptz DEFAULT NOW(),
  status text NOT NULL DEFAULT 'unresolved',  -- 'unresolved' | 'dismissed' | 'acted'
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users ON DELETE SET NULL,
  resolution_note text,
  -- INDEX (status, last_detected_at DESC) for the admin list view
);
```

**Reasoning:** Editor's-pick admin badge on Ideas list rows needs O(1) "does this idea have an unresolved anomaly?" lookup per row render. On-demand aggregate from `vote_events_log` would be 1 query per Ideas list row × 12 rows per page × every list page visit — bad. Materializing keeps admin Ideas list rendering fast. Trade-off: writes add `INSERT vote_anomalies` per detection event (low-frequency by design — anomalies are rare).

### 8. Anomaly-Event Status Workflow (D-20) — `moderation_log` vs Status Column

**Recommendation:** **Both.** Status column on `vote_anomalies` for fast admin list query (`WHERE status='unresolved'`). When editor dismisses or acts, the Server Action ALSO writes a `moderation_log` row:
- Dismiss: `INSERT moderation_log (action='vote_anomaly_dismiss', target_kind='anomaly', target_id=anomalyId)`.
- Act (which always means freeze + exclude): `INSERT moderation_log (action='vote_anomaly_act', ...)`. The freeze/exclude actions ALSO write their own moderation_log rows; the anomaly itself transitions to `acted`.

**Reasoning:** Status column = O(1) admin filter. `moderation_log` = full audit chain (Phase 6 GDPR-07 INSERT-only enforcement). Same dual-channel pattern Phase 5 used for unsubscribe consent (write to consents AND propagate to Brevo). No information lost; admin queries stay fast.

### 9. Featured-Order Field UX (D-18)

**Recommendation:** **Numeric input** (`type: 'number'`) on the Ideas collection edit screen, label "Поредност в Отбор на редактора (по-малки числа = по-горе; празно = в края)". **Not** drag-to-reorder (overkill at v1 scale; Payload doesn't ship a built-in drag-reorder for collection rows; would require `@hello-pangea/dnd` or similar — not on the stack).

**Schema:** `featured_order int NULL` on `ideas`. Sort: `WHERE is_featured=true ORDER BY featured_order ASC NULLS LAST, created_at DESC`.

### 10. Idea Autosave / Version History / Role-Based Publish

**Recommendation:** **Mirror exactly what Newsletters does — verify in Plan 03-01.** Specifically:
- Payload draft autosave: confirm Newsletters has `versions: { drafts: { autosave: true } }` config; if so, copy onto Ideas collection. If Newsletters does NOT have it (read of `Newsletters.ts` showed no `versions` block — Plan 03-01 must add it consciously OR document the absence), Phase 3 ships without autosave, matching Phase 5.
- Version history: not currently enabled on Newsletters. Phase 3 ships without it. **Add to deferred items** if coalition wants it later.
- Role-based publish: Payload's collection-level `access.update` already gates publish (only admin/editor can transition `draft → published`). The status field is the sole publish state. No separate "publish" permission.

**Verification step in plan:** Read `src/collections/Newsletters.ts` for any `versions` / `drafts` config; copy or document delta.

### 11. Sentry Tag Schema for `vote_velocity_anomaly` (D-12)

**Recommendation:**

```typescript
Sentry.captureMessage('vote_velocity_anomaly', {
  level: 'warning',
  tags: {
    // Required (always set):
    idea_id: ideaId,                          // UUID, no PII
    trigger_type: 'per_idea_velocity' | 'subnet_cluster' | 'fresh_account_share',
    count: String(numericCount),              // sanitized int as string
    // Optional (per-trigger):
    window_min: '10' | '30',                  // for per_idea / subnet
    fresh_pct: '67',                          // for fresh-account
  },
  // contexts.anomaly = {anomalyId} for admin link-back
});
```

**Phase 1 D-21 PII-free invariant:** No `user_id`, no `email`, no `subnet_hash` (subnet_hash is technically a hash but per Phase 1 D-21 plain-text REDACT we keep cryptographic identifiers out of Sentry too — Sentry's tag indexing is searchable by support staff).

### 12. HMAC Secret Rotation Procedure (D-15)

**Recommendation:** New OPS-RUNBOOK §X "Vote audit HMAC rotation":

```markdown
## Vote audit HMAC rotation (annual)

Cadence: every January (or sooner if compromise suspected).

1. Generate new secret: `openssl rand -hex 32`.
2. Set Fly.io secret: `flyctl secrets set VOTE_AUDIT_HMAC_SECRET=<new> -a smbsite-prod`.
3. Set GitHub Actions secret: GitHub → Settings → Secrets → `VOTE_AUDIT_HMAC_SECRET`.
4. Bump epoch counter in `OPS-RUNBOOK §X` (current: epoch 1 from <date>).
5. Document rotation event in `STATE.md` deferred items (resolved).

Rotation does NOT re-hash historic vote_events_log rows — that would defeat the GDPR
rationale (raw IPs are not retained). Per Phase 3 D-15: anomaly alerts fire on ≤30-min
windows, so cross-epoch comparison is never required for OPS-04 detection. Old hashes
remain matchable within their own epoch for forensic purposes; cross-epoch
matching requires external correlation, which is intentional.

If a leak of the OLD epoch's secret occurs: rotate immediately + notify DPO. Hashes
from the old epoch become rainbow-table-ble; the rows themselves are not GDPR-violating
(no raw IP) but the cluster-detection signal is degraded for the leaked epoch.
```

### 13. Vote-Button Rendered-Selected State (D-24)

**Recommendation:** `aria-pressed` + shadcn/ui Button `variant="default"` (selected) vs `variant="outline"` (un-selected). Same label always (D-25). See Pattern 8.

**Why not custom variant:** The shadcn/ui `Button` already supports `variant` and `aria-pressed`; introducing a new variant adds CSS surface area for marginal benefit. WAI-ARIA APG canonical pattern.

`[CITED: w3.org/WAI/ARIA/apg/patterns/button + developer.mozilla.org/aria-pressed]`

### 14. Lexical Block Whitelist for Ideas (D-17)

**Recommendation:** Identical to Newsletters (Pattern 1). Specifically: `ParagraphFeature, HeadingFeature({h2,h3}), LinkFeature, UnorderedListFeature, OrderedListFeature, BoldFeature, ItalicFeature, FixedToolbarFeature, InlineToolbarFeature`. **Differences from Newsletters:**
- No image upload feature in v1? — D-17 says "image upload via Payload media collection" — re-add `UploadFeature` with the existing media collection (Newsletters had it removed because no upload-target collection existed at the time of Phase 5 / commit f6694c0; for Phase 3, the media collection already exists post-Phase 5, so `UploadFeature` is safe). **Verify the Newsletters upload-feature absence is no longer applicable in Phase 3** — read `src/payload.config.ts` for the existing media collection config.

`[VERIFIED: src/collections/Newsletters.ts:95-119 + comment block on UploadFeature removal]`

### 15. Cooling-Period Join Cost (D-04)

**Recommendation:** Already addressed in § "Pattern 5". At 5k–50k members + ~100 ideas the JOIN is cheap (< 5ms hot, < 20ms cold). At v2 scale (5x growth) the JOIN cost stays sub-50ms because `votes.user_id` is an index pre-filter and `users.email_verified_at` is a simple comparison. **Do NOT materialize.** Revisit only if production p95 > 100ms on the count read.

### 16. Toast Undo for Retract (D-24)

**Recommendation:** Sonner with `duration: 5000` and `action.onClick = undoRetractServerAction`. See Pattern 7. **No client-side state vs server pre-commit timer** — both clicks are independent state-changing Server Actions; the 5-second window is purely UX.

`[CITED: github.com/emilkowalski/sonner#action]`

### 17. Bunny.net Hero-Image Flow (D-18)

**Recommendation:** Mirror Phase 5 D-19 exactly. Hero image uploads via Payload's media collection (extended in Phase 5 to accept `image/png|jpeg|svg+xml`). File-size / dimension limits:
- **Max file size:** 5 MB (Payload `upload.imageSizes.maxFileSize`, configured per Phase 5 D-19).
- **Max dimensions:** 2400 × 1200 (auto-resize on upload via Payload `imageSizes` configuration; original kept at native resolution if smaller).
- **Allowed MIME:** `image/png`, `image/jpeg`, `image/svg+xml`.
- **Rendered served via Bunny.net CDN** through Payload's existing media URL.

**Verify:** Read existing `src/payload.config.ts` media-collection config; the Phase 5 plan-04 task already shipped image extension. Phase 3 changes nothing.

### 18. Anti-Abuse Pitfall Research

**Auto-freeze warning UI (Pitfall 1 #5):** Embedded help text on `/admin/views/vote-anomalies` admin view header:

> **Замразяването е ръчно решение.** Многобройни гласове за кратко време често са знак за виралност (споделяне на идеята), не за злоупотреба. Замразявайте САМО ако виждате клъстер от freshly-registered акаунти от един и същи /24 subnet.

Plus a per-anomaly tooltip on the freeze button: "Виралност или злоупотреба? Виж per-vote forensics преди да решиш."

**Reject-count exposure (Pitfall 9):** Reject count gates on the **same** `IDEA_REVEAL_THRESHOLD` as the approve count. Below threshold, neither number is displayed to anyone (member or public). Above threshold, only members see the reject count — and the rendering MUST attach an "за членове" subscript so screenshots are self-attributing. **Reasoning:** Any earlier reject-count exposure makes the cooling-period and threshold-gate defenses meaningless. The minimum non-leaky exposure threshold is the same as the approve-count threshold.

## Assumptions Log

> Claims tagged `[ASSUMED]` requiring user confirmation before implementation.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Velocity defaults (per-idea 30/10, subnet 20/30, fresh 50%/20) are appropriate for warmup volume | § Claude's Discretion #1 | False positives spam editors during legitimate viral spike; false negatives miss real attacks. Mitigation: env-flag tunable post-launch. |
| A2 | `IDEA_REVEAL_THRESHOLD = 20` is the right minimum for statistical defensibility | § Claude's Discretion #2 | Lower threshold leaks misleading percentages; higher threshold causes "is this thing on?" UX. Mitigation: env-flag tunable. |
| A3 | Vote rate limits 5/min soft, 20/min hard are appropriate | § Claude's Discretion #3 | Too tight: blocks legitimate browsing-then-voting; too loose: gives scripted brigading more headroom. Mitigation: env-flag tunable. |
| A4 | `transliteration@2.6.1` default Cyrillic mapping matches Streamlined System for all non-exception letters | § Claude's Discretion #4 | If `transliteration` produces e.g. `j` for `й` instead of `y`, slugs are wrong. Mitigation: char-by-char unit test catches this in CI before any production slug. |
| A5 | Payload draft autosave config copy from Newsletters works for Ideas | § Claude's Discretion #10 | If Newsletters' config has scheduled-publish-specific bits, blind copy could break. Mitigation: planner reads Newsletters fully, documents the delta. |
| A6 | The lawyer's Art. 9 opinion will not require schema changes (only consent wording / retention scope) | § Summary | If the lawyer requires e.g. `SET NULL` instead of `CASCADE`, schema migration needed. Mitigation: D-13's `vote_events_log.user_id` is already nullable per design. |
| A7 | Annual HMAC secret rotation cadence is sufficient | § Pattern 2 | If a leak is detected sooner, manual rotation kicks in; otherwise annual is industry standard for low-throughput audit hashes. Mitigation: OPS-RUNBOOK procedure documented. |
| A8 | `unstable_cache` per-pod is acceptable at coalition scale | § Claude's Discretion #5 | If Fly.io scales to many pods + counts must agree precisely, drift becomes user-visible. Mitigation: 5-min TTL is short enough that drift is bounded. |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

(The table is non-empty.)

## Open Questions

1. **Lexical UploadFeature for Ideas** — Newsletters removed `UploadFeature` per the comment block (Plan 05-04 / commit f6694c0) because no upload-target media collection existed at that time. Phase 3 D-17 explicitly wants image uploads via Bunny.net. **Question:** is the Phase 5 media-collection in `src/payload.config.ts` available for Ideas Lexical `UploadFeature`?
   - **What we know:** Newsletters wraps `lexicalEditor` without `UploadFeature`; the comment says it was tried and removed.
   - **What's unclear:** The current media collection state in `payload.config.ts` (not read in this research).
   - **Recommendation:** Plan 03-01 reads `payload.config.ts` first. If a media collection exists, register `UploadFeature({ collections: { media: {...} } })`. If not, add the media collection in Plan 03-01 before adding Ideas. Either way, do NOT silently match Newsletters' "no upload" config — Phase 3 D-17 is explicit about hero image and inline images.

2. **Cooling-period for the editor's-pick sort vs cooling-aware approve sort** — D-08 specifies "Най-одобрени" sorts by approve count. The cooled count vs raw count question is implicit but unstated.
   - **Recommendation:** Use cooled count to match the displayed count (Pitfall 6 above). Plans verify the SQL.

3. **`moderation_log` Phase 4 enum extensibility** — D-21 says Phase 4 EDIT-06 ADDS values without schema change. **Verify:** the `action text` column has no CHECK constraint enforcing the v1 enum at DB level. **Recommendation:** Yes — text + Zod boundary, no DB CHECK, per project convention.

4. **Sentry rate-limit on anomaly events** — if a sustained brigade fires 100 anomalies in an hour, Sentry would receive 100 events. **Question:** does Phase 1 Sentry config rate-limit such events?
   - **Recommendation:** Sentry event rate-limit is project-level configuration in Sentry dashboard; defer to OPS verify-step. Add note in plan: "Sentry event throttle for `vote_velocity_anomaly` tag — verify after first attack simulation."

## Environment Availability

> External tools needed for Phase 3 implementation. Most reuse existing project setup.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `transliteration` npm package | Slug helper (D-18) | NEW (install) | 2.6.1 | None — required (no equivalent for Streamlined System) |
| Sonner (toast) | Retract undo (D-24) | ✓ | 2.0.7 | None — required |
| `@upstash/ratelimit` + Upstash Redis | Vote rate limit (D-11) | ✓ | 2.0.8 + 1.37.0 | None — required (Phase 1 D-07) |
| Cloudflare Turnstile | CAPTCHA-on-suspicion (D-11) | ✓ | (JS snippet) | None — required (Phase 1 D-05) |
| Sentry EU | Anomaly events (D-12) | ✓ | 10.51.0 | None — required (Phase 1 D-21) |
| BullMQ + Upstash | Editor email + anomaly worker (D-12) | ✓ | 5.76.6 | None — required (Phase 1 D-19) |
| Payload media collection | Hero image upload (D-18) | ✓ (Phase 5 added) | 3.84.1 | None — required |
| Bunny.net CDN | Hero image hosting (D-18) | ✓ (Phase 5 D-19) | (REST) | None — required |
| `VOTE_AUDIT_HMAC_SECRET` Fly.io secret | HMAC hashes (D-15) | ✗ NEW | n/a | None — required; ops sets before deploy |
| `VOTE_AUDIT_HMAC_SECRET` GitHub Actions secret | CI build env validation (`scripts/check-env.ts`) | ✗ NEW | n/a | None — required |
| `VOTE_COUNTABLE_INTERVAL` env | Cooling gate (D-04, D-10) | ✗ NEW | default `48 hours` | None — required (default works) |
| `IDEA_REVEAL_THRESHOLD` env | Threshold gate (D-03) | ✗ NEW | default `20` | None — required (default works) |
| Anomaly threshold envs (`ANOMALY_*` ×6) | Multi-axis trigger (D-12) | ✗ NEW | defaults set | None — required (defaults work) |
| Drizzle migrations | `votes` / `vote_events_log` / `moderation_log` / `vote_anomalies` schema | ✓ via `pnpm db:generate` + `pnpm db:migrate` | 0.31.10 | None — required |
| Manual Neon DDL | Ideas Payload collection columns | ⚠ BLOCKED-on-`payload migrate` per memory | n/a | DDL via Neon SQL console (operator step in plan checklist) |

**Missing dependencies with no fallback:**
- `VOTE_AUDIT_HMAC_SECRET` — operator must set before deploy. Add to `01-OPS-RUNBOOK` "Phase 3 prep" section.
- `MAXMIND_LICENSE_KEY` already set per Phase 2.1; no new MaxMind dependency.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

> Phase 3 is integrity-critical — every decision in CONTEXT.md has a measurable verification target. Generated for Plan 03-VALIDATION.md derivation per Step 5.5 of plan-phase.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.8 (unit + integration) + Playwright 1.49.1 (E2E) |
| Config file | `vitest.config.ts` and `playwright.config.ts` (existing) |
| Quick run command | `pnpm test:unit -- --run path/to/test` |
| Full suite command | `pnpm test` (= `pnpm test:unit && pnpm test:e2e`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **IDEA-01** | Catalog page renders 12 published ideas with topic chip + sort dropdown | E2E | `pnpm test:e2e tests/e2e/idea-catalog.spec.ts` | ❌ Wave 0 |
| **IDEA-01** | Catalog excludes draft + archived ideas | unit | `pnpm test:unit -- tests/unit/idea-catalog-query.test.ts` | ❌ Wave 0 |
| **IDEA-02** | Filter by topic narrows results; sort by Най-нови / Най-одобрени / Отбор; URL state survives reload | E2E | `pnpm test:e2e tests/e2e/idea-catalog-filter.spec.ts` | ❌ Wave 0 |
| **IDEA-02** | Sort "Най-одобрени" uses cooling-aware approve count | unit (SQL fixture) | `pnpm test:unit -- tests/unit/idea-catalog-sort.test.ts` | ❌ Wave 0 |
| **IDEA-03** | Member can vote approve / reject; current choice rendered selected via aria-pressed | E2E | `pnpm test:e2e tests/e2e/idea-vote.spec.ts` | ❌ Wave 0 |
| **IDEA-03** | Vote button labels exactly match D-25 locked Bulgarian copy | unit (i18n grep) | `pnpm test:unit -- tests/unit/idea-i18n.test.ts` | ❌ Wave 0 |
| **IDEA-04** | UNIQUE on (user_id, idea_id) prevents double-vote under concurrent INSERT | integration (real DB) | `pnpm test:unit -- tests/integration/vote-unique-concurrent.test.ts` | ❌ Wave 0 |
| **IDEA-04** | Schema declares UNIQUE on (user_id, idea_id) | unit (schema grep) | `pnpm test:unit -- tests/unit/voting-schema.test.ts` | ❌ Wave 0 |
| **IDEA-05** | Retract DELETEs votes row + INSERTs vote_events_log with action='retract', choice=null | integration | `pnpm test:unit -- tests/integration/retract-vote.test.ts` | ❌ Wave 0 |
| **IDEA-05** | Re-vote after retract = clean INSERT (no UNIQUE conflict) | integration | covered by `retract-vote.test.ts` | ❌ Wave 0 |
| **IDEA-05** | 5-second toast undo within window restores previous choice + writes audit row | E2E | `pnpm test:e2e tests/e2e/retract-undo.spec.ts` | ❌ Wave 0 |
| **IDEA-06** | Soft rate (5/min default) triggers Turnstile widget; hard rate (20/min) blocks with Bulgarian message | E2E | `pnpm test:e2e tests/e2e/vote-rate-limit.spec.ts` | ❌ Wave 0 |
| **IDEA-06** | Server Action verifies Turnstile token between soft + hard | unit | `pnpm test:unit -- tests/unit/vote-rate-limit.test.ts` | ❌ Wave 0 |
| **IDEA-07** | Cooling-period query JOIN excludes vote from displayed count when email_verified_at + INTERVAL > NOW() | unit (SQL fixture) | `pnpm test:unit -- tests/unit/cooling-period.test.ts` | ❌ Wave 0 |
| **IDEA-07** | "My Activity" panel shows "Гласът ти ще се отчете след HHч MMм" for cooling votes | E2E | covered by `member-activity.spec.ts` | ❌ Wave 0 |
| **IDEA-07** | `VOTE_COUNTABLE_INTERVAL` regex validation; invalid value = startup fail | unit | `pnpm test:unit -- tests/unit/cooling-config.test.ts` | ❌ Wave 0 |
| **IDEA-08** | Pre-threshold: empty-state copy "Гласуването е в ход — резултатите ще се покажат след първите N гласа." | E2E | covered by `idea-detail.spec.ts` | ❌ Wave 0 |
| **IDEA-08** | Post-threshold: public sees approve % + count; member sees ALSO reject; editor admin sees full breakdown | E2E | `pnpm test:e2e tests/e2e/vote-display.spec.ts` | ❌ Wave 0 |
| **IDEA-08** | Vote write does NOT bust the displayed-count cache (5-min TTL) | unit | `pnpm test:unit -- tests/unit/idea-cache-no-bust.test.ts` | ❌ Wave 0 |
| **MEMB-01** | "My Activity" panel renders voted ideas with retract/change actions | E2E | `pnpm test:e2e tests/e2e/member-activity.spec.ts` | ❌ Wave 0 |
| **MEMB-02** | `/member/profile` shows full_name, email, registration date, sector, role, preferred_channel | E2E | `pnpm test:e2e tests/e2e/member-profile.spec.ts` | ❌ Wave 0 |
| **MEMB-02** | GDPR-04 "Изнеси моите данни" button leads to placeholder Phase 6 page | E2E | covered by `member-profile.spec.ts` | ❌ Wave 0 |
| **MEMB-03** | Phase 5 `/member/preferences` linked from `/member/profile`; verification only | E2E | extend existing `tests/e2e/member-preferences.spec.ts` | ✓ exists, extend |
| **EDIT-01** | Editor can log in to Payload admin (Phase 1 verification) | E2E | covered by Phase 1 sign-off | ✓ done |
| **EDIT-02** | Editor creates / publishes / archives an Idea; Lexical allowed-blocks enforced | E2E | `pnpm test:e2e tests/e2e/admin-ideas-collection.spec.ts` | ❌ Wave 0 |
| **EDIT-02** | Lexical allowed-blocks identical to Newsletters (paragraph, h2, h3, link, ol, ul, image, bold, italic) | unit (config grep) | `pnpm test:unit -- tests/unit/ideas-lexical-config.test.ts` | ❌ Wave 0 |
| **OPS-04** | Per-idea velocity > N1 in T1 fires anomaly + Sentry event + BullMQ email | integration | `pnpm test:unit -- tests/integration/anomaly-per-idea.test.ts` | ❌ Wave 0 |
| **OPS-04** | Subnet aggregate > N2 in T2 from one /24 fires anomaly | integration | `pnpm test:unit -- tests/integration/anomaly-subnet.test.ts` | ❌ Wave 0 |
| **OPS-04** | Fresh-account share > P% of last N3 fires anomaly | integration | `pnpm test:unit -- tests/integration/anomaly-fresh-share.test.ts` | ❌ Wave 0 |
| **OPS-04** | Editor freeze + bulk vote-exclude write moderation_log rows | integration | `pnpm test:unit -- tests/integration/admin-vote-exclude.test.ts` | ❌ Wave 0 |
| **OPS-04** | `/admin/views/vote-anomalies` requires editor/admin role; member denied | E2E | `pnpm test:e2e tests/e2e/admin-vote-anomalies.spec.ts` | ❌ Wave 0 |

### Schema Regression Tests (HIGH-PRIORITY — mirror Phase 2.1 pattern)

| Test | Asserts | Pattern |
|------|---------|---------|
| `tests/unit/voting-schema.test.ts` — no inet/raw_ip in `vote_events_log` | grep src/db/schema/voting.ts (comments stripped) for `\binet\b`, `\braw_ip\b`, `\bip_address\b`, `\buser_agent\b` | mirrors `tests/unit/attribution-schema.test.ts:5-17` |
| `tests/unit/voting-schema.test.ts` — UNIQUE on (user_id, idea_id) | grep src/db/schema/voting.ts for `unique\(\).*user_id.*idea_id\|primaryKey.*user_id.*idea_id\|index.*\.unique\(\)` matching pattern | new |
| `tests/unit/voting-schema.test.ts` — ON DELETE CASCADE on votes + vote_events_log | regex match | mirrors `tests/unit/attribution-schema.test.ts:19-22` |
| `tests/unit/voting-schema.test.ts` — vote_events_log.user_id is NULLABLE (D-16 lawyer-flip) | regex assertion `not\.notNull\(\)` after .references | new |
| `tests/unit/voting-schema.test.ts` — moderation_log.target_ids is uuid[] type | regex match | new |
| `tests/unit/append-only-vote-log.test.ts` — no UPDATE / DELETE on vote_events_log + moderation_log in code | grep `src/lib/voting/` and `src/app/actions/voting/` for `db.update(vote_events_log)\|db.delete(vote_events_log)\|db.update(moderation_log)\|db.delete(moderation_log)` | mirrors `tests/unit/consents-append-only.test.ts` (Phase 1 D-13) |
| `tests/unit/server-action-no-revalidate.test.ts` — castVote / change / retract / undoRetract MUST NOT import revalidatePath / revalidateTag (Pitfall 7 + D-03) | grep | new |
| `tests/unit/voting-no-pgenum.test.ts` — choice / action / topic / status all use text(...) not pgEnum() | grep | mirrors `tests/unit/attribution-schema.test.ts` text-cols rule |

### Concurrent-INSERT Race Test (CRITICAL for IDEA-04)

```typescript
// tests/integration/vote-unique-concurrent.test.ts
import { db } from '@/db';
import { votes } from '@/db/schema/voting';

describe('IDEA-04 — DB UNIQUE prevents concurrent double-vote', () => {
  it('two concurrent INSERTs with same (user_id, idea_id) — exactly one succeeds', async () => {
    const userId = await fixtureUser();
    const ideaId = await fixtureIdea();
    const insert = () =>
      db.insert(votes).values({ user_id: userId, idea_id: ideaId, choice: 'approve' })
        .onConflictDoNothing();
    const results = await Promise.all([insert(), insert(), insert()]);
    const rowCount = await db.select({ id: votes.id }).from(votes)
      .where(and(eq(votes.user_id, userId), eq(votes.idea_id, ideaId)));
    expect(rowCount).toHaveLength(1);
  });
});
```

`[CITED: postgresql.org/docs/current/transaction-iso.html — race conditions resolved by UNIQUE]`

### Append-Only Enforcement Test

```typescript
// tests/unit/vote-events-log-append-only.test.ts
describe('D-13 — vote_events_log is append-only at app convention', () => {
  it('no UPDATE on vote_events_log anywhere in source', () => {
    const grep = execSync('grep -rE "db\\.update\\(vote_events_log\\)|db\\.delete\\(vote_events_log\\)" src/lib/voting/ src/app/actions/voting/', { encoding: 'utf8' });
    expect(grep).toBe('');
  });
});
```

### Sampling Rate

- **Per task commit:** `pnpm test:unit -- tests/unit/voting-*` (~3-5s)
- **Per wave merge:** `pnpm test:unit && pnpm test:e2e tests/e2e/idea-*.spec.ts tests/e2e/admin-*.spec.ts` (~30-90s)
- **Phase gate:** Full suite green before `/gsd-verify-work`; PLUS manual editor walkthrough of Ideas authoring + freeze + bulk-exclude + anomaly review.

### Wave 0 Gaps

> All tests for Phase 3 are net-new. Wave 0 must scaffold:

- [ ] `tests/unit/voting-schema.test.ts` — covers IDEA-04 + GDPR-09 schema invariants
- [ ] `tests/unit/append-only-vote-log.test.ts` — covers D-13 append-only convention
- [ ] `tests/unit/server-action-no-revalidate.test.ts` — covers D-03 cache-no-bust
- [ ] `tests/unit/voting-no-pgenum.test.ts` — covers project text-over-pgEnum convention
- [ ] `tests/unit/voting-i18n.test.ts` — covers D-25 locked Bulgarian copy strings
- [ ] `tests/unit/cooling-config.test.ts` — covers D-10 env regex
- [ ] `tests/unit/cooling-period.test.ts` — covers D-04 SQL fixture (cooling JOIN)
- [ ] `tests/unit/idea-catalog-sort.test.ts` — covers D-08 sort-with-cooling
- [ ] `tests/unit/idea-catalog-query.test.ts` — covers IDEA-01 published-only
- [ ] `tests/unit/idea-cache-no-bust.test.ts` — covers D-03 unstable_cache TTL behavior
- [ ] `tests/unit/vote-rate-limit.test.ts` — covers D-11 two-tier
- [ ] `tests/unit/ideas-lexical-config.test.ts` — covers D-17 allowed-blocks
- [ ] `tests/unit/slug.test.ts` — covers D-18 Bulgarian Streamlined transliteration (30+ cases)
- [ ] `tests/integration/vote-unique-concurrent.test.ts` — covers IDEA-04 concurrent-INSERT race
- [ ] `tests/integration/retract-vote.test.ts` — covers IDEA-05 DELETE+log+re-vote
- [ ] `tests/integration/anomaly-per-idea.test.ts` — covers OPS-04 trigger 1
- [ ] `tests/integration/anomaly-subnet.test.ts` — covers OPS-04 trigger 2
- [ ] `tests/integration/anomaly-fresh-share.test.ts` — covers OPS-04 trigger 3
- [ ] `tests/integration/admin-vote-exclude.test.ts` — covers OPS-04 + D-21 moderation_log writes
- [ ] `tests/e2e/idea-catalog.spec.ts` — IDEA-01 catalog render
- [ ] `tests/e2e/idea-catalog-filter.spec.ts` — IDEA-02 filter + sort + URL state
- [ ] `tests/e2e/idea-vote.spec.ts` — IDEA-03 vote / change with aria-pressed
- [ ] `tests/e2e/retract-undo.spec.ts` — IDEA-05 5-sec Sonner undo
- [ ] `tests/e2e/vote-rate-limit.spec.ts` — IDEA-06 Turnstile + hard block
- [ ] `tests/e2e/vote-display.spec.ts` — IDEA-08 layered display
- [ ] `tests/e2e/member-activity.spec.ts` — MEMB-01 My Activity panel
- [ ] `tests/e2e/member-profile.spec.ts` — MEMB-02 read-only profile + GDPR placeholder
- [ ] `tests/e2e/admin-ideas-collection.spec.ts` — EDIT-02 Ideas authoring
- [ ] `tests/e2e/admin-vote-anomalies.spec.ts` — OPS-04 admin view role gate

**Framework install:** None. All test infrastructure is in place from Phase 1 / 2.1 / 5.

### Phase Gate End-to-End Flow Test

> The integration / e2e gate that proves the entire stack works end-to-end:

```
Editor publishes idea
  → Catalog page lists it (sort=newest first)
  → Member opens detail page; sees pre-threshold copy "Резултатите ще се покажат след първите 20 гласа"
  → Member casts vote (immediate INSERT; cooling-pending in My Activity)
  → 19 more votes from other members across cooling boundary
  → Threshold crossed; cache TTL elapsed; public sees approve %
  → Member retracts; toast appears; member clicks Undo within 5s
  → vote_events_log shows: cast → retract → cast (audit chain intact)
  → Adversary script casts 31 votes from one /24 in 9 minutes
  → BullMQ anomaly worker detects subnet_cluster trigger
  → vote_anomalies row inserted; Sentry event fired; editor email enqueued
  → Editor opens /admin/views/vote-anomalies; sees row; clicks freeze
  → ideas.display_frozen = true; moderation_log row written
  → Public idea page: cached count read no longer renders (silent freeze; D-23)
  → Editor reviews per-vote forensics; bulk-excludes 25 votes
  → moderation_log row written (action='vote_exclude', target_ids=[25 uuids])
  → vote_events_log unchanged (audit preserved)
  → Editor unfreezes; cache TTL elapses; new count visible to public
```

This flow exercises: D-04 cooling, D-03 threshold reveal + cache, D-13 audit table, D-14 retract, D-24 toast undo, D-12 anomaly detection, D-20 admin review, D-21 moderation_log, D-23 silent freeze.

## Security Domain

> ASVS Level 1 enforced (`security_enforcement: true`, `security_asvs_level: 1`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Auth.js v5 session for all member surfaces; admin-role re-check for editor surfaces (`assertEditorOrAdmin`) |
| V3 Session Management | yes | Auth.js v5 sliding 30-day session; member re-uses (no new session model) |
| V4 Access Control | yes | (a) `assertSession()` on `/member/*`; (b) `assertEmailVerified()` on vote actions; (c) `assertEditorOrAdmin()` on Ideas Payload collection AND Server Actions for freeze/exclude (defense-in-depth — Plan 05-01 pattern) |
| V5 Input Validation | yes | All Server Action payloads validated with `zod` + `zod-i18n-map` Bulgarian errors; URL filter params (`/idei?topic=…&sort=…&page=…`) Zod-validated to enum + integer; slug validated against `^[a-z0-9-]+$` |
| V6 Cryptography | yes | HMAC-SHA256 via `node:crypto.createHmac` (NOT custom; D-15) for vote audit identifiers; 32-byte (256-bit) secret. Time-safe comparison via `crypto.timingSafeEqual` for HMAC verification |
| V7 Error Handling and Logging | yes | Pino REDACT extends to `ip`, `raw_ip`, `ua`, `user_agent` (D-15 + Phase 1 D-21); structured JSON logs; user_id pseudonymous only |
| V11 Business Logic | yes | One-vote-per-account enforced at DB UNIQUE (defense-in-depth: app + DB) |
| V13 API & Web Service | yes | Server Actions only (no public REST API for voting); Turnstile gate; Upstash rate limit |

### Known Threat Patterns for Next.js + Postgres + Drizzle Civic-Voting

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via filter params | Tampering | Drizzle parameterized queries (no raw SQL with concatenation); Zod validation at boundary |
| Cross-site scripting via Lexical body | Tampering | Lexical allowed-blocks list (D-17) bans raw HTML / custom blocks; rendered as React tree, never `dangerouslySetInnerHTML` |
| Cross-site request forgery on vote action | Spoofing | Next.js Server Actions ship CSRF protection by default in App Router (origin check on POST) |
| Brigading via fake accounts (sockpuppet) | Spoofing | Multi-layer: email verification (Phase 1) + 48h cooling (D-04) + per-user rate limit (D-11) + per-subnet anomaly trigger (D-12) |
| HMAC secret leak via logs | Information disclosure | Pino REDACT extension; HMAC inputs never logged; only outputs |
| Vote manipulation via concurrent INSERT | Tampering | DB UNIQUE on (user_id, idea_id); test asserts |
| Audit log tampering | Repudiation | Append-only convention at app level (v1); INSERT-only DB permission Phase 6 GDPR-07 |
| Doxxing via public name display | Information disclosure | D-01 anonymous public; user_id never exposed in client-rendered HTML |
| Screenshot smear via public reject count | Reputation harm | D-02 reject count members-only + D-03 threshold + D-23 silent display-freeze |
| Account-deletion vote retention violation | Compliance (GDPR Art. 17) | D-16 ON DELETE CASCADE on votes + vote_events_log; lawyer may flip to SET NULL |
| Vote-event timing attack on HMAC verification | Information disclosure | `crypto.timingSafeEqual` for token compares (Phase 5 unsubscribe pattern lineage) |

## Sources

### Primary (HIGH confidence)

- `src/collections/Newsletters.ts` (lines 1-172) — direct template for Ideas collection
- `src/app/(payload)/admin/views/attribution/{AttributionView,AttributionDashboard,actions}.tsx` — direct template for vote-anomalies admin view
- `src/components/member/Timeline.tsx` (lines 1-35) — pattern for "My Activity" panel
- `src/lib/auth/role-gate.ts` — `assertEditorOrAdmin` pattern (Plan 05-01)
- `src/lib/email/queue.ts` — BullMQ producer pattern (Phase 1 D-19); EmailJobKind extension pattern (Phase 5)
- `src/lib/turnstile.ts` + `src/lib/rate-limit.ts` — D-11 reuse
- `src/lib/unsubscribe/hmac.ts` — HMAC token pattern (D-15)
- `src/db/schema/{auth,consents,attribution}.ts` — schema conventions
- `tests/unit/attribution-schema.test.ts` — schema regression test pattern
- `.planning/phases/03-idea-catalog-voting/03-CONTEXT.md` — locked decisions
- `.planning/research/PITFALLS.md` — Pitfalls 1, 2, 3, 8, 9, 12, 13
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 D-04, D-05, D-07, D-12, D-13, D-19, D-21, D-27 inheritance
- `.planning/phases/02.1-attribution-source-dashboard/02.1-CONTEXT.md` — D-19 GDPR-09 no-raw-IP rule, admin/views/attribution template
- `.planning/phases/05-notifications/05-CONTEXT.md` — D-01 Newsletters Lexical pattern, D-19 Bunny.net image extension, D-25 assertEditorOrAdmin pattern, D-13 single-opt-in fallback architecture pattern
- `package.json` — locked stack versions

### Secondary (MEDIUM confidence — verified with primary)

- `[CITED: en.wikipedia.org/wiki/Romanization_of_Bulgarian]` — Streamlined System mapping (Bulgarian Transliteration Act 2009 + 2006 -ия exception)
- `[CITED: postgresql.org/docs/current/transaction-iso.html]` — Race condition resolution via UNIQUE
- `[CITED: w3.org/WAI/ARIA/apg/patterns/button]` — `aria-pressed` toggle pattern
- `[CITED: nextjs.org/docs/app/api-reference/functions/unstable_cache]` — current Next.js 15 cache pattern
- `[CITED: github.com/emilkowalski/sonner]` — Sonner toast undo pattern
- `[CITED: developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-pressed]` — ARIA attribute spec
- `[CITED: gdpr-info.eu/art-9-gdpr]` — Special-category processing scope
- `[CITED: gdprhub.eu — Bulgarian CPDP €12,770 political-data fine]` — Bulgarian DPA enforcement precedent

### Tertiary (LOW confidence — flagged for validation)

- Velocity-trigger thresholds (D-12 defaults 30/10, 20/30, 50%/20) — `[ASSUMED]` directional. Real ground-truth post-launch.
- `IDEA_REVEAL_THRESHOLD = 20` — `[ASSUMED]` directional.
- Vote rate limits 5/60s soft, 20/60s hard — `[ASSUMED]` directional.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package version verified against package.json + npm registry on 2026-05-07
- Architecture patterns: HIGH — every pattern is a literal mirror of an existing shipped component (Newsletters, attribution dashboard, unsubscribe HMAC, Timeline)
- Pitfalls: HIGH — Pitfalls 1, 2, 3, 8, 9, 12 are documented in `.planning/research/PITFALLS.md` with citations; mitigations match locked decisions in CONTEXT.md
- Bulgarian Streamlined transliteration: MEDIUM-HIGH — verified against Wikipedia citation; per-letter unit test at planning time will tighten to HIGH
- Velocity thresholds: MEDIUM — directional defaults from CONTEXT, env-flag tunable
- Cache implementation: HIGH — `unstable_cache` is the documented Next.js 15 pattern; alternative (Upstash) examined and rejected
- Anomaly storage materialized vs on-demand: HIGH — recommendation justified by editor-Ideas-list-render scaling argument
- Lawyer Art. 9 forward-prep: HIGH — schema decisions designed default-safe per CONTEXT external_blocker

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 for stack versions (30 days; stable mature stack); through Art. 9 lawyer opinion landing for legal scoping.

## RESEARCH COMPLETE

**Phase:** 3 — Idea Catalog + Voting
**Confidence:** HIGH (overall) — locked decisions cover 95% of implementation surface; Claude's Discretion items now have authoritative recommendations.

### Key Findings

1. **Phase 3 is an integration phase, not a greenfield phase.** Every D-* decision maps to an existing pattern shipped in Phase 1, 2.1, or 5. Plans should literally copy `Newsletters.ts` + `/admin/views/attribution/` + `unsubscribe/hmac.ts` + `Timeline.tsx` as starting templates.
2. **The three new Drizzle tables (`votes`, `vote_events_log`, `moderation_log`) are the only genuinely new infrastructure.** Plus a new `vote_anomalies` materialized table (recommended over on-demand). All four follow the project's `text`-over-`pgEnum` + append-only-app-convention + cascade-delete + HMAC-hashed-no-raw-IP conventions.
3. **The multi-axis anomaly detector is the only genuinely new business logic.** Three SQL aggregates (per-idea velocity / subnet aggregate / fresh-account share) wrapped in a BullMQ worker; emits Sentry event + enqueues Brevo email via existing pipelines.
4. **`transliteration@2.6.1` + Bulgarian Streamlined override regex is the recommended slug helper.** Built-in Cyrillic mapping aligns with the official Transliteration Act 2009 mapping for all non-exception letters; one regex override covers the word-final -ия → -ia rule.
5. **`unstable_cache` with `revalidate: 300` is recommended for D-03 displayed counts**; vote writes do NOT bust the cache (intentional anti-screenshot-smear). At catalog scale (~100 ideas, 5k members) this is sufficient.
6. **External blocker: Phase 3 ship is gated on the GDPR Art. 9 lawyer opinion** — but plans + research can proceed because schema is designed default-safe (cascade delete, append-only, no raw IP, anonymous public surface) and only consent wording / retention scope is at risk of late-stage change.

### File Created

`.planning/phases/03-idea-catalog-voting/03-RESEARCH.md` (this document)

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Every version pinned in package.json; transliteration verified against npm registry on 2026-05-07 |
| Architecture | HIGH | Every pattern is a literal mirror of an existing shipped component |
| Pitfalls | HIGH | All applicable pitfalls (1, 2, 3, 8, 9, 12, 13) have explicit mitigation patterns |
| Cache strategy | HIGH | `unstable_cache` justified at coalition scale; alternatives examined |
| Anomaly storage | HIGH | Materialized vs on-demand decision justified by editor list-render scaling |
| Slug helper | MEDIUM-HIGH | `transliteration` recommendation justified; per-letter unit test will tighten to HIGH |
| Velocity thresholds | MEDIUM | Directional defaults from CONTEXT; env-tunable |

### Open Questions

1. **Lexical UploadFeature for Ideas** — Is the Phase 5 media collection in `payload.config.ts` available for Ideas hero/inline images? Plan 03-01 must verify before adding `UploadFeature`. (Section: Open Questions #1)
2. **Sentry event rate-limit on `vote_velocity_anomaly` tag** — defer to OPS verify-step; Sentry dashboard configuration. (Section: Open Questions #4)

### Ready for Planning

Research complete. Planner can now create plan files mirroring Phase 5's wave structure: schema + slug + helpers (Wave 1), Server Actions + components + cache + cooling (Wave 2), Payload Ideas collection + admin custom view + anomaly worker (Wave 3), member dashboard + profile + e2e + sign-off (Wave 4). External blocker on Art. 9 lawyer opinion blocks SHIP, not PLAN.
