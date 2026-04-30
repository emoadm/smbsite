# Attribution Capture — Legitimate Interest Balancing Test

**Status:** Draft (Phase 1)
**Owner:** Coalition + DPO (TBD)
**Last review:** 2026-04-29
**Refers to:** D-14, GDPR-09 (Phase 6), ATTR-02 (Phase 2)

## Purpose

The platform attributes registration events to traffic sources (UTM parameters, HTTP Referer header, IP-derived oblast/country, QR-scan flag). The legal basis under GDPR is **legitimate interest (Art. 6(1)(f) GDPR)** — the balancing test is documented here.

## Necessity

The QR direct-mail campaign cannot be evaluated without source attribution. Without aggregate per-oblast scan counts, the coalition cannot:
- Decide which regions warrant follow-up letters
- Justify campaign spend to coalition members
- Detect abuse (sudden volume spikes from a single subnet)

Less-intrusive alternatives considered and rejected:
- **Server-side analytics with no IP processing** — cannot derive oblast.
- **Asking the user for their region in the form** — reduces conversion; users skip.
- **Cookie-based attribution only** — works for repeat visits but the QR landing page is the user's first visit.

## Data minimisation

- Raw IP is **never persisted**. The IP is converted in-memory to (oblast, country) via MaxMind GeoLite2 (Phase 2) and the raw IP is discarded BEFORE the database write.
- UTM parameters and Referer are persisted only at registration time, attached to the user's row.
- Aggregate scan counts (oblast → count) are stored without user linkage; deletable via Phase 6 GDPR self-service.

## Balancing test

| Factor | Assessment |
|---|---|
| Reasonable expectation | Bulgarian SMB owners scanning a QR code in a campaign letter expect SOME tracking. Privacy policy makes this explicit. |
| Privacy impact | Minimal — IP never stored against identity; oblast is coarse (~28 oblasts in Bulgaria). |
| Right to object | User can request data export (Phase 6 / GDPR-04) and deletion (GDPR-05). Cookie banner allows opt-out of analytics. |
| Power imbalance | Low — voluntary engagement with a political coalition; no coercion. |

**Conclusion:** Legitimate interest is appropriate for QR-scan attribution. The balancing test favors processing because the privacy impact is low (no raw-IP persistence, coarse aggregation only) and the legitimate interest is concrete (campaign evaluation).

## Safeguards

- Raw IP never persisted (GDPR-09 enforcement in Phase 2)
- 90-day log retention (D-21)
- Privacy policy declares this basis explicitly
- Cookie banner offers analytics opt-out (D-20)
- Phase 6 introduces INSERT-only audit tables; deletion log retains hashed user_id only

## Pending review

- Bulgarian DPO sign-off (post-Phase-2 launch)
- Final wording in privacy policy (Phase 2 lawyer-reviewed text)
