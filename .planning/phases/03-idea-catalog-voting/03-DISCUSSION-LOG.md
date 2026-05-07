# Phase 3: Idea Catalog + Voting - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `03-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 3 — Idea Catalog + Voting
**Areas discussed:** Vote visibility / names / result display, Idea catalog UX & filters, Cooling gate / CAPTCHA / velocity alerts, Vote audit semantics, Ideas Payload collection shape, Editor admin anomaly review surface, URL / retract UX / Bulgarian copy locks, MEMB-02 profile

---

## Vote visibility, names & result display

### Q1 — Names visibility on votes

| Option | Description | Selected |
|--------|-------------|----------|
| Anonymous public | Aggregate counts only; no names; user_id internal only | ✓ |
| Named-public, real-name only | full_name visible publicly; high doxxing/screenshot risk | |
| Member-opt-in pseudonym | Default anonymous; opt-in display_name via per-vote toggle | |
| Members-only-named | Public sees aggregate; logged-in members see voter names | |

**User's choice:** Anonymous public.
**Notes:** Resolves Open Decision #1; keeps Art. 9(2)(d) not-for-profit-member exception path open; mitigates Pitfall 12 (doxxing) + Pitfall 9 (screenshot smear). `display_name` stays deferred from Phase 1 D-11.

### Q2 — Public result display format

| Option | Description | Selected |
|--------|-------------|----------|
| Approve count + % public, reject members-only | Editor sees full breakdown | ✓ |
| Both raw counts public | Maximum transparency, direct Pitfall 9 exposure | |
| Net score only | Single number; obscures volume | |
| Approve count only, no reject anywhere | Most defensive; loses signal entirely | |

**User's choice:** Approve count + approval % public, reject count members-only.

### Q3 — Result-display gating

| Option | Description | Selected |
|--------|-------------|----------|
| Threshold-gated reveal + 5-min cache | Hidden until N≥20 votes; then 5-min cache TTL | ✓ |
| Live counts | No threshold, no cache; max gameable | |
| 5-min cache only, no threshold | Counts always visible but lagged | |
| Threshold-gated, then live | Hides empty state; loses ongoing dampener | |

**User's choice:** Threshold-gated reveal + 5-min cache.
**Notes:** Default N=20, planner tunes via env / const. Vote write is real-time; only the displayed count is delayed.

### Q4 — Member dashboard "My Activity" panel

| Option | Description | Selected |
|--------|-------------|----------|
| Full list with retract action | Title + my vote + cached count + inline retract/change | ✓ |
| Title + my vote only | No result count; click-through to /idei/{slug} for outcome | |
| Aggregate only | "You voted on N ideas" + link | |
| Full list + privacy toggle | Hide-by-default for shared-device safety | |

**User's choice:** Full list with retract/change action.

---

## Idea catalog UX & filters

### Q1 — Catalog layout

| Option | Description | Selected |
|--------|-------------|----------|
| Card grid (1/2/3 cols responsive) | Mobile-first; consistent w/ Phase 2 / Sinya design | ✓ |
| Vertical list with full content | Higher scroll; weak SEO at scale | |
| Two-column list+detail (desktop) | Email-client style; awkward on mobile | |
| Editorial timeline | Reuses Timeline.tsx; weak filter UX | |

**User's choice:** Card grid.

### Q2 — Topic enum

| Option | Description | Selected |
|--------|-------------|----------|
| Default 6-topic SMB enum, coalition extends later | Hardcoded Bulgarian labels via next-intl; text column | ✓ |
| Free-text topic field | No filter UX; inconsistent strings | |
| Single 'Други' until coalition decides | Defers all filter value | |
| Match newsletter topics from Phase 5 D-08 | Semantic mismatch | |

**User's choice:** Default 6-topic enum (Данъци / Трудово законодателство / Регулаторни режими / Финансиране и кредит / Цифровизация / Други).

### Q3 — Filter & sort UX

| Option | Description | Selected |
|--------|-------------|----------|
| Topic chips multi-select + 3 sorts + editor's-pick badge | Sort: newest / most-approved / editor's-pick first | ✓ |
| Topic dropdown single-select + 2 sorts, no pick | Simpler; less discoverability | |
| + active/closed status toggle | Adds idea-close mechanism (out of scope) | |
| No filters/sort, reverse-chron only | Most minimal v1 | |

**User's choice:** Topic chips multi-select + 3 sort options + editor's-pick badge.

### Q4 — Pagination + empty state

| Option | Description | Selected |
|--------|-------------|----------|
| Page-based (12/page) + dedicated empty states | SEO-friendly; deep-linkable; two empty states | ✓ |
| Infinite scroll + skeleton loaders | SEO-unfriendly; weaker accessibility | |
| Load-more button | No URL state for deep links | |
| Single page, no pagination | Trivial; risks slow render at scale | |

**User's choice:** Page-based pagination with dedicated platform-empty / filter-empty components.

---

## Cooling gate / CAPTCHA / velocity alerts

### Q1 — Cooling-period gate type

| Option | Description | Selected |
|--------|-------------|----------|
| Hard gate — block vote attempt | Vote button disabled; clear countdown copy | |
| Soft gate — record vote, reveal after cooling | Vote INSERTs immediately; displayed-count JOIN filters | ✓ |
| Hard gate + 7-day extra display hold | Layered protection; high confusion cost | |

**User's choice:** Soft gate.
**Notes:** Vote write path stays simple; cached-count query gains a JOIN on `users.email_verified_at + INTERVAL`. IDEA-07 satisfied via "отчетен" (counted) reading.

### Q2 — Display-suppress window

| Option | Description | Selected |
|--------|-------------|----------|
| 48h soft cooling only | Single threshold matching IDEA-07 minimum | |
| 7 days post email_verified_at | Maximum anti-brigading; week-long member confusion | |
| Tunable env-var knob, default 48h | Coalition+ops can flip to 7d without redeploy | ✓ |
| No display-suppress window | Violates IDEA-07; not recommended | |

**User's choice:** Tunable `VOTE_COUNTABLE_INTERVAL` env var (default 48h, allowlisted format).

### Q3 — CAPTCHA-on-suspicion (IDEA-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Two-tier rate limit, Turnstile between soft+hard | Reuses Phase 1 D-05 + D-07 patterns | ✓ |
| Always require Turnstile per vote | Heavy UX | |
| Once-per-session token cookie | Cheaper UX; weaker against compromised sessions | |
| Subnet-aggregate trigger only | Misses single-actor sockpuppet armies | |

**User's choice:** Two-tier per-user rate-limit, Turnstile required between soft (e.g., 5/min) and hard (e.g., 20/min).

### Q4 — Vote-velocity alert (OPS-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-axis trigger + admin badge + Sentry + email; manual review | Per-idea + subnet + fresh-account-share triggers | ✓ |
| Single per-idea velocity trigger + admin badge | Misses subnet + sockpuppet signals | |
| Auto-freeze + alert (no manual editor action) | Pitfall 1 #5 explicit warning against this | |
| Telemetry-only (Sentry, no admin UI, no email) | Editors don't live in Sentry | |

**User's choice:** Multi-axis triggers + multi-channel alerts + manual editor review; never auto-freeze.

---

## Vote audit semantics

### Q1 — Vote storage model

| Option | Description | Selected |
|--------|-------------|----------|
| votes UNIQUE + append-only vote_events_log | Two tables; cheap reads + full audit | ✓ |
| Append-only votes table only | Partial UNIQUE index; heavier reads | |
| Single-row votes only, no log | No Art. 9 audit trail; lawyer would object | |
| Event-sourced votes + projection table | Overkill for v1 | |

**User's choice:** Two-table model (votes + vote_events_log).

### Q2 — Retract semantics

| Option | Description | Selected |
|--------|-------------|----------|
| DELETE votes row, log captures history | Simplest cached-count query | ✓ |
| Soft-delete via withdrawn_at column | Closer to event-sourced shape; redundant | |
| No retract at all | Violates IDEA-05 | |

**User's choice:** DELETE votes row on retract; vote_events_log retains full history.

### Q3 — vote_events_log columns

| Option | Description | Selected |
|--------|-------------|----------|
| Standard: + HMAC ip + ua + fresh_account flag, no raw IP/UA | Aligned with Phase 2.1 D-19 / GDPR-09 | ✓ |
| Standard + attr_sid linkage to attribution | Cross-tab coupling | |
| Minimum: just (user_id, idea_id, choice, action, ts) | Weak forensic surface | |
| Maximum: raw IP + raw UA | Violates GDPR-09; not allowed | |

**User's choice:** Standard log schema with HMAC-hashed IP + UA + subnet + fresh-account flag (no raw IP/UA).

### Q4 — Vote audit retention

| Option | Description | Selected |
|--------|-------------|----------|
| ON DELETE CASCADE — full erasure | Default-safe under strict Art. 17 reading | ✓ |
| ON DELETE SET NULL — preserve aggregate | Loses linkage; preserves forensics | |
| Bounded retention with periodic prune | Operationally heavier | |
| Defer entirely to lawyer's opinion | No working default | |

**User's choice:** ON DELETE CASCADE for both votes and vote_events_log.
**Notes:** Final retention deferred to Art. 9 lawyer's opinion. If lawyer prefers SET NULL, planner flips with one schema migration.

---

## Ideas Payload collection shape & lifecycle

### Q1 — Lexical allowed-blocks + status flow

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror Newsletters: same blocks + draft/published/archived | Brand consistency; reuses Newsletters template | ✓ |
| Simpler block whitelist, no images | Cheaper scope; weaker visual catalog | |
| Mirror Newsletters + scheduledAt | Adds delayed-publish; overkill | |
| Free-form Lexical, 2 states | Brand inconsistency risk | |

**User's choice:** Mirror Newsletters block whitelist + 3-state status flow (draft → published → archived).

### Q2 — Slug + hero + editor's-pick

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-slug + optional hero + is_featured boolean | Editor types title; slug auto; hero optional; pick = bool | ✓ |
| Human-edited slug + required hero + featured Global | Heavier authoring; over-engineered | |
| Numeric slug + no hero + is_featured boolean | Weak SEO; weaker visual surface | |
| Auto-slug + no hero + featured_rank int | Adds editorial ranking complexity | |

**User's choice:** Auto-slug from Cyrillic-transliterated title + optional hero image (Bunny.net) + `is_featured` boolean.

### Q3 — Topic-list source + editor preview

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded enum + 'View on site' preview button | Cheapest v1 ship; mirrors Phase 1 sector/role pattern | ✓ |
| Payload Global topics + preview button | Self-service topics; manual DDL overhead | |
| Hardcoded enum + live in-edit preview pane | Newsletters D-02 pattern; overkill for catalog | |
| Payload Global + live preview pane | Maximum flexibility; highest cost | |

**User's choice:** Hardcoded topic enum + draft preview button on edit screen.

---

## Editor admin: vote-anomaly review surface + Ideas edit affordances

### Q1 — Anomaly review surface

| Option | Description | Selected |
|--------|-------------|----------|
| /admin/views/vote-anomalies + inline badges on Ideas list | Two surfaces; mirrors /admin/views/attribution | ✓ |
| Inline only — anomalies as Ideas-edit tab | Loses cross-idea oversight | |
| Top-level dashboard widget + drill-into-idea | Same plus dashboard tile; marginal value | |
| Sentry-only review | Editors don't live in Sentry | |

**User's choice:** Dedicated /admin/views/vote-anomalies + inline anomaly count badge on Ideas list.

### Q2 — moderation_log boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 3 ships full moderation_log schema; Phase 4 extends action enum | Single canonical table; cheap to ship | ✓ |
| Phase 3 ships minimal vote-exclusion-only log; Phase 4 widens | Two tables; dual-truth risk | |
| No audit log in Phase 3; vote_events_log status only | Loses cross-action audit | |

**User's choice:** Full moderation_log schema in Phase 3.

### Q3 — Ideas edit-screen affordances

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar with live stats + freeze toggle + activity feed | Single-screen idea-health view | ✓ |
| Stats-only sidebar; freeze in /admin/views/vote-anomalies | More clicks to act | |
| No sidebar; stats on a separate tab | Under-delivers editorial question | |
| Sidebar with stats only (no freeze, no feed) | Half-measure | |

**User's choice:** Sidebar with live stats + freeze/unfreeze toggle + recent activity feed.

---

## URL shape, retract UX, Bulgarian copy

### Q1 — URL shape

| Option | Description | Selected |
|--------|-------------|----------|
| Top-level /idei + /idei/{slug}; /community stays channels-only | Cleaner mental model; better URL semantics | ✓ |
| Nested /community/idei/{slug} | Long URL; mixed-purpose /community page | |
| Top-level /ideas (English) | Inconsistent with Bulgarian /agenda routes | |

**User's choice:** Top-level `/idei` + `/idei/{slug}`. Member dashboard adds two CTAs ("Разгледай идеи" + existing "Присъедини се към общността").

### Q2 — Retract / change UX

| Option | Description | Selected |
|--------|-------------|----------|
| 1-click change + 1-click retract, 5s toast undo | Two buttons always; current choice highlighted | ✓ |
| Confirm modal on retract, 1-click on change | More friction on destructive | |
| Confirm modal on every action | Maximum friction | |
| Retract only from /member dashboard | Reduces accidental + legitimate retracts | |

**User's choice:** 1-click change + 1-click retract with 5-second toast undo.

### Q3 — Bulgarian copy locks + display-freeze visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Lock recommended copy + silent freeze | Локирани копи; silent freeze on public idea page | ✓ |
| Lock copy + visible freeze banner on idea page | Pitfall 1 #5 surface; opponents game alerts | |
| Revise specific copy strings | User would specify | |
| Defer all copy to coalition (placeholders) | Risks shipping with placeholder visible | |

**User's choice:** Lock the recommended Bulgarian copy strings + silent display-freeze (no public banner; admin badge only).

---

## MEMB-02 profile page scope

### Q1 — Profile-view scope

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only /member/profile + GDPR-04 placeholder | New page; link to /member/preferences | ✓ |
| Inline section on /member dashboard | Denser dashboard | |
| Read-only + editable full_name only | Adds form + Server Action | |
| Editable everything | Email change requires re-verify; v2 scope | |

**User's choice:** Read-only `/member/profile` page + GDPR-04 placeholder + link to existing `/member/preferences`.

---

## Claude's Discretion

The following items were not explicitly chosen by the user and are flagged as planner-discretion in `03-CONTEXT.md`:

- Specific velocity-trigger thresholds (D-12 — directional defaults given: 30/10, 20/30, 50% of 20).
- Exact `IDEA_REVEAL_THRESHOLD` value (D-03 — default N=20).
- Exact soft/hard rate-limit numbers (D-11 — defaults 5/min soft, 20/min hard).
- Slug helper implementation (D-18 — `slugify-bg` pkg or custom; needs Cyrillic→Latin transliteration table tests).
- Cache implementation (D-03 — Postgres materialized view vs Upstash Redis vs Next.js `unstable_cache`).
- `vote_events_log` index strategy (D-13 / D-15).
- Anomaly-event status workflow (D-20 — unresolved / dismissed / acted; planner decides write-paths).
- Anomaly tracker storage (D-20 — materialized vs computed-on-demand).
- Featured-order field UX (D-18 — numeric input vs drag-to-reorder in Payload).
- Idea autosave-during-draft, version history, role-based publish permission (mirror Newsletters; planner confirms).
- Sentry tag schema for `vote_velocity_anomaly` events (D-12).
- HMAC secret rotation procedure (D-15 — annual cadence; OPS-RUNBOOK entry).
- Whether vote Server Action checks `consents.kind='political_opinion'` defense-in-depth at vote-time (lawyer's opinion may dictate).

## Deferred Ideas

(Captured in `03-CONTEXT.md` `<deferred>` section; copied here for audit completeness.)

- `display_name` column for proposals/reports byline — Phase 4 will revisit.
- Idea-closing / lifecycle states beyond draft/published/archived — Phase 4+ / v2.
- Date-range filter on catalog — v2.
- Public catalog full-text search — v1.x per FEATURES.md row 33.
- Device fingerprinting (FingerprintJS) — Pitfall 1 #7; v2.
- BULSTAT-verification tier — V2-VERIFY-01.
- 7-day display-tally hold as default — `VOTE_COUNTABLE_INTERVAL` operational dial.
- Topic-list Payload Global — coalition revisits later.
- Scheduled-publish for ideas — Newsletters-only pattern.
- Live in-edit preview pane on Ideas — Newsletters D-02 overkill for catalog.
- Full account self-service (full_name self-edit, sector/role change, email change) — v2.
- Per-idea / per-vote subscription opt-in beyond Phase 5 newsletter_voting topic — Phase 5+ revisit.
- WhatsApp / Telegram per-idea broadcasts — channel-level only.
- Account deletion UI — Phase 6 GDPR-05.
- GDPR-04 actual data export — Phase 6.
- Slug 301 redirects on title change — slug immutable post-publish.
- Cross-idea DSA "Сигнализирай незаконно съдържание" button — Phase 4 / 5 user-content scope.
- Forensic snapshot CSV export of vote_events_log — operational need.
