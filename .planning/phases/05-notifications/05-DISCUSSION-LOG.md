# Phase 5: Notifications - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-04
**Phase:** 5-notifications
**Areas discussed:** Blast composer (NOTIF-09), Member preferences UX, Off-site channel links, Opt-in semantics

---

## Blast composer (NOTIF-09)

### Q1 — What authoring surface should an editor use to compose a newsletter inside Payload admin?

| Option | Description | Selected |
|--------|-------------|----------|
| Payload Lexical RTE + content fields | Newsletters collection with Lexical rich-text editor + structured fields (subject, preview-text, sections, CTA URL); React Email renders Lexical AST. Brand-locked. | ✓ |
| Markdown body only | Subject + Markdown textarea; remark-rendered. Editors must know Markdown. | |
| Upload pre-built HTML | Editors paste designed HTML. Maximum design freedom but breaks brand + Outlook. | |
| React Email template + Payload data | Hard-coded blocks; editor only fills text. Most rigid. | |

**User's choice:** Payload Lexical RTE + content fields
**Notes:** Locks brand consistency. Editor sees Bulgarian text, gets bold/italic/links/headings, no HTML knowledge needed.

### Q2 — Pre-send safety steps

| Option | Description | Selected |
|--------|-------------|----------|
| Test send + live preview required | Live HTML preview pane + mandatory test-send-to-self before 'Send blast' unlocks. | ✓ |
| Live preview only (test send optional) | Preview mandatory; test-send a button but not a gate. | |
| Test send required, no live preview | No preview pane; every layout tweak requires a real send. | |
| Neither — send button only | Lowest friction, highest blast-day risk. | |

**User's choice:** Test send + live preview required
**Notes:** Catches Cyrillic encoding bugs, broken CTA links, mis-bound merge fields before they hit 5k+ inboxes.

### Q3 — Recipient targeting in v1

| Option | Description | Selected |
|--------|-------------|----------|
| Blast-all only (v1) | Every member with consents.kind='newsletter' AND latest granted=true. No filter UI. | ✓ |
| Filter by oblast + sector + role | Composer dropdowns + count preview. Doubles test-send + suppression-list complexity. | |
| Filter by self-reported source | Filter on users.self_reported_source (Phase 02.1 D-10). | |
| Full filters: oblast + sector + role + source | All four filters AND-combined. Significant scope. | |

**User's choice:** Blast-all only (v1)
**Notes:** Simplest legal posture, fastest to ship for warmup. Per-topic suppression IS the v1 filter mechanism (introduced via Member preferences M2). Full editor-side filters deferred.

### Q4 — Send-now vs scheduled send

| Option | Description | Selected |
|--------|-------------|----------|
| Send-now only (v1) | No scheduledAt field, no cron. Smallest scope. | |
| Schedule-send + send-now | Optional scheduledAt; BullMQ delayed jobs. Half-day extra scope. | ✓ |

**User's choice:** Schedule-send + send-now
**Notes:** Editors can prep a send and schedule it for a specific time. Cancel-scheduled UX needed in admin.

---

## Member preferences UX

### Q1 — Where do logged-in members manage their notification preferences?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated /member/preferences page | New route; linked from /member dashboard 'Настройки' card. Most discoverable. | ✓ |
| Section on /member dashboard | Card alongside welcome banner + timeline. Denser dashboard. | |
| Unsubscribe-link only (no in-app prefs) | Email footer only. No resubscribe path without contacting an editor. | |

**User's choice:** Dedicated /member/preferences page
**Notes:** Aligns with the 'members feel heard' product story — visible self-service.

### Q2 — What can a member toggle on /member/preferences in v1?

| Option | Description | Selected |
|--------|-------------|----------|
| Newsletter on/off + preferred channel (informational) | Two controls; channel field purely informational. Smallest UX/legal surface. | |
| Newsletter + per-topic toggles | Email newsletter splits into N topics. Composer adds topic dropdown; suppression more complex. | ✓ |
| Newsletter + cadence preference | On/off + 'How often?' radio. Adds throttle logic at dispatch. | |

**User's choice:** Newsletter + per-topic toggles
**Notes:** Per-topic = explicit consent granularity. Composer's targeting decision (Q3 above) becomes "topic-respecting" rather than blast-all-no-filter.

### Q3 — Topic enum (locked Bulgarian contract)

| Option | Description | Selected |
|--------|-------------|----------|
| 3 topics: Общи / Гласувания / Отчети | Maps to 3 product loops. | |
| 4 topics: + Събития / events | Same 3 + events_invitations. | ✓ |
| 2 topics: Общи / Гласувания | Reports + events fold into 'general'. | |
| Single topic v1 — defer split to v2 | Reverts per-topic decision. | |

**User's choice:** 4 topics: + Събития / events
**Notes:** `newsletter_general`, `newsletter_voting`, `newsletter_reports`, `newsletter_events` — locked enum. Bulgarian display labels in `member.preferences.topics.*` next-intl namespace.

### Q4 — Default per-topic state at registration

| Option | Description | Selected |
|--------|-------------|----------|
| All 4 topics default-granted; member opts out on /member/preferences | Single registration checkbox = blanket grant. Honors Phase 1 D-12. | ✓ |
| Only 'general' default-granted; member opts in to others on /member/preferences | More conservative; lower reach. | |
| All 4 toggles shown at registration, all checked by default | Replaces single newsletter checkbox with 4 sub-checkboxes. Re-litigates Phase 1 D-12. | |

**User's choice:** All 4 topics default-granted; member opts out on /member/preferences
**Notes:** Preserves Phase 1 D-12 wording. Registration form unchanged; the `register` Server Action writes 4 simultaneous consents rows when newsletter checkbox is checked.

---

## Off-site channel links (NOTIF-04 / NOTIF-05)

### Q1 — Where on the site should the WhatsApp Channel + Telegram links appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Footer + /member dashboard CTA | Footer + prominent CTA card on /member. No dedicated /community page. | |
| Dedicated /community page + footer | Real new public surface; explainer + preview blocks. | ✓ |
| Footer only | Cheapest, most invisible. | |
| Footer + /member dashboard + /community page | All three. | |

**User's choice:** Dedicated /community page + footer
**Notes:** /community is a real Phase 5 surface. Coalition can redirect QR-letter follow-up traffic somewhere.

### Q2 — Should /community be public or members-only?

| Option | Description | Selected |
|--------|-------------|----------|
| Public (anonymous + members) | Indexed by Google. Risk: anonymous can subscribe externally without registering. | |
| Members-only (auth-gated) | Channel links as 'member benefit'. | |
| Public, but only authenticated members see the actual URLs (preview-vs-redeem) | Anonymous see teaser ('Регистрирай се'); members see real URLs. | ✓ |

**User's choice:** Public, but only authenticated members see the actual URLs (preview-vs-redeem)
**Notes:** Preserves registration funnel discipline; rewards conversion. Footer links use same conditional render.

### Q3 — Where should the WhatsApp + Telegram URLs live in the codebase?

| Option | Description | Selected |
|--------|-------------|----------|
| Payload CMS singleton 'CommunityChannels' | Payload Global; editor swaps URLs from /admin without a deploy. | ✓ |
| next-intl bg.json keys | URLs as message keys. Requires deploy. | |
| Env vars (NEXT_PUBLIC_*) | Fly.io secrets. Operator-only. | |

**User's choice:** Payload CMS singleton 'CommunityChannels'
**Notes:** Coalition self-serves URL handoff; matches Phase 2 placeholder mechanism. `whatsappVisible`/`telegramVisible` booleans gate the rendered links.

---

## Opt-in semantics

### Q1 — Single vs double opt-in?

| Option | Description | Selected |
|--------|-------------|----------|
| Single opt-in (current pipeline is enough) | Newsletter checkbox + OTP-verified email = lawful basis. No second confirmation email. | |
| Confirmed (double) opt-in | Brevo sends a 'Confirm subscription' email; consent only effective after click. | |
| Single opt-in for v1; add double-opt-in if Brevo flags us | Ship single; switch to double if complaint rate >= 0.3% during weeks 2-4. | ✓ |

**User's choice:** Single opt-in for v1; add double-opt-in if Brevo flags us
**Notes:** Pragmatic. The fallback is a designed-but-not-defaulted code path so the switch is a config flag, not a feature build.

### Q2 — One-click unsubscribe UX

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate unsub + confirmation page | Click → server unsub before render → land on '...успешно' with resubscribe button. | ✓ |
| Confirmation page first, then unsub on click | Two-click. May violate Gmail/Yahoo 'one-click' spec. | |
| Per-topic unsub + confirmation page | Topic toggles on the confirmation page. May downgrade ESP reputation. | |

**User's choice:** Immediate unsub + confirmation page
**Notes:** RFC 8058 List-Unsubscribe-Post compliance. Resubscribe path via /member/preferences from the confirmation page. No login required.

### Q3 — Unsub scope

| Option | Description | Selected |
|--------|-------------|----------|
| All topics (full newsletter opt-out) | All 4 topics flipped to granted=false. Aligns with Gmail's 'one-click = stop hearing'. | ✓ |
| Current topic only (granular) | Only the message's topic flipped. Risk: spam-flag on remaining topics. | |

**User's choice:** All topics (full newsletter opt-out)
**Notes:** The post-click confirmation page invites granular resubscribe via /member/preferences.

---

## Claude's Discretion

- Exact Drizzle schema choice for per-topic consents — extend `CONSENT_KINDS` array with 4 new values (recommended; preserves audit semantics) vs add a `topic` discriminator column.
- Lexical → React Email rendering library or hand-rolled walker.
- BullMQ retry/backoff for newsletter sends — defaults: `attempts: 5`, exponential backoff with 30s base.
- Brevo contacts API sync timing — inline-await on opt-in vs queued sub-job (recommended: queued).
- Live preview rendering technology — Server Action + sanitized HTML (recommended) vs in-iframe client render.
- Composer's `scheduledAt` upper bound — default 30 days.
- Test-send 24-hour gate window — recommended starting point; planner can tune.
- HMAC unsubscribe secret rotation strategy — defer to Phase 6.
- Whether existing welcome / OTP emails should be re-rendered through the new master template for visual consistency — recommended yes, but as a single no-op refactor commit.

## Deferred Ideas

- Recipient targeting filters (oblast / sector / role / source) — punted from D-03; future phase.
- Cadence preferences (weekly / monthly / important-only) — punted from M2.
- Per-topic per-message unsub from email footer link — punted from D-15; granular control on /member/preferences only.
- Confirmed double opt-in by default — designed-but-not-defaulted fallback (D-13).
- WhatsApp Business API two-way messaging — forbidden by Meta for political parties.
- Telegram bot / two-way messaging — out of scope.
- Bulgaria-map SVG visualization for newsletter open-rate by oblast — Phase 6+ analytics.
- Multilingual support — language radio on /member/preferences locked to bg in v1; mechanism forward-prep for v2.
- Master-template re-render of existing Phase 1 emails — Claude's discretion; not Phase 5 scope.
