# Phase 1 — Email Warm-up Daily Log

Operator updates this file daily during the 4-week warm-up window. Per D-18.

**Sender:** `no-reply@auth.chastnik.eu` via Brevo (shared IP, Phase 1 volumes)
**Postmaster Tools dashboard:** https://postmaster.google.com (domain `auth.chastnik.eu`)
**Brevo dashboard:** https://app.brevo.com → Statistics → Email
**Trigger thresholds:** see bottom of file.

## Format

| Date | Sends | Opens | Bounces | Complaints | Postmaster Domain Rep | Notes |
|------|-------|-------|---------|------------|------------------------|-------|

---

## Week 1 — target 20 sends/day, internal opt-ins only

Audience: coalition staff + volunteers, registered through real `/register` flow.
Mix: ≥10 Gmail addresses (Postmaster threshold), ≥5 Abv.bg addresses (Pitfall J).
Goal: baseline sending; first reputation signal in Postmaster.

| Date | Sends | Opens | Bounces | Complaints | Postmaster Domain Rep | Notes |
|------|-------|-------|---------|------------|------------------------|-------|
| (day 1) |  |  |  |  |  |  |
| (day 2) |  |  |  |  |  |  |
| (day 3) |  |  |  |  |  |  |
| (day 4) |  |  |  |  |  |  |
| (day 5) |  |  |  |  |  |  |
| (day 6) |  |  |  |  |  |  |
| (day 7) |  |  |  |  |  |  |

**Week 1 review:** ___________________

---

## Week 2 — target 50 sends/day

Audience: expand internal list + early supporters.
Goal: grow volume; monitor Postmaster spam rate.

| Date | Sends | Opens | Bounces | Complaints | Postmaster Domain Rep | Notes |
|------|-------|-------|---------|------------|------------------------|-------|
| (day 8) |  |  |  |  |  |  |
| (day 9) |  |  |  |  |  |  |
| (day 10) |  |  |  |  |  |  |
| (day 11) |  |  |  |  |  |  |
| (day 12) |  |  |  |  |  |  |
| (day 13) |  |  |  |  |  |  |
| (day 14) |  |  |  |  |  |  |

**Week 2 review:** ___________________

---

## Week 3 — target 150 sends/day

Audience: all internal opt-ins + soft outreach to trusted contacts.
Goal: near-threshold; verify Postmaster "High" domain reputation appears.

| Date | Sends | Opens | Bounces | Complaints | Postmaster Domain Rep | Notes |
|------|-------|-------|---------|------------|------------------------|-------|
| (day 15) |  |  |  |  |  |  |
| (day 16) |  |  |  |  |  |  |
| (day 17) |  |  |  |  |  |  |
| (day 18) |  |  |  |  |  |  |
| (day 19) |  |  |  |  |  |  |
| (day 20) |  |  |  |  |  |  |
| (day 21) |  |  |  |  |  |  |

**Week 3 review:** ___________________

---

## Week 4 — readiness check (300/day Brevo free tier limit)

Goal: full-volume readiness confirmation; upgrade Brevo plan if needed; escalate apex DMARC `p=quarantine` → `p=reject`.

| Date | Sends | Opens | Bounces | Complaints | Postmaster Domain Rep | Notes |
|------|-------|-------|---------|------------|------------------------|-------|
| (day 22) |  |  |  |  |  |  |
| (day 23) |  |  |  |  |  |  |
| (day 24) |  |  |  |  |  |  |
| (day 25) |  |  |  |  |  |  |
| (day 26) |  |  |  |  |  |  |
| (day 27) |  |  |  |  |  |  |
| (day 28) |  |  |  |  |  |  |

**Week 4 review:** ___________________

**Apex DMARC escalation date (`p=quarantine` → `p=reject`):** __________

---

## Trigger thresholds (escalation)

| Signal                         | Threshold       | Action                                                   |
| ------------------------------ | --------------- | -------------------------------------------------------- |
| Bounce rate                    | > 2%            | Pause warm-up; investigate (likely bad-list addresses)   |
| Complaint rate                 | > 0.1%          | Pause warm-up; review opt-in process; check for unsolicited recipients |
| Postmaster Domain Reputation   | "Low" or "Bad"  | Pause warm-up; investigate authentication, content, sending pattern |
| Postmaster Spam Rate           | > 0.3%          | Pause warm-up; revisit recipient list quality            |
| Bunny Storage daily backup     | missing         | Escalate to ops; check `.github/workflows/backup.yml` runs and Sentry alert chain |
| Gmail authentication panel     | any failure     | Stop sending; debug DKIM signing — Brevo dashboard "Authenticate domain" status |
| Abv.bg deliverability          | > 5% bounces from `@abv.bg` | Add plain-text fallback verification; check React Email render for both MIME parts |

## How to read Postmaster Domain Reputation

Per Google's Postmaster Tools v2 (RESEARCH line 700-708):
- **High** — Gmail trusts the domain. Goal state.
- **Medium** — Mostly trusted; minor issues.
- **Low** — Most messages going to spam. Investigate.
- **Bad** — Effectively blocked. Stop sending; rebuild reputation.

Data only populates after **100+ Gmail recipients/day** for at least one full day. Week 1 list
must include ≥10 Gmail addresses, sending at 20/day → Postmaster threshold reached around day 5.

## How to log

Each evening (operator's local time):
1. Open Brevo Statistics → today's date → record `Sent`, `Opens`, `Bounces`, `Complaints`.
2. Open Postmaster Tools → Domain Reputation → record one of `High / Medium / Low / Bad / N/A`.
3. Add any incidents to "Notes" column (e.g., "Abv.bg test address bounced", "Cyrillic subject rendered as ?? in Outlook desktop").
4. If any threshold above is crossed → escalate per the "Action" column.
5. Commit the updated log file: `git add .planning/phases/01-foundation/01-WARMUP-LOG.md && git commit -m "docs(01-13): warmup day N — sends/opens/etc"`.
