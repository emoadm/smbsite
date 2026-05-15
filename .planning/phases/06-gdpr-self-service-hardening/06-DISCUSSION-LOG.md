# Phase 6: GDPR Self-Service + Hardening — Discussion Log

> **Audit trail only.** Decisions captured in `06-CONTEXT.md` — this log preserves the discussion shape for retrospectives. Do NOT use as input to researcher/planner/executor.

**Date:** 2026-05-15
**Phase:** 06-gdpr-self-service-hardening
**Mode:** discuss (default, no flags)
**Areas discussed:** Export format + delivery, Deletion flow + content fate, WCAG 2.1 AA scope, Deferred-item rollup, Grace-period state, Deletion confirmation pattern

---

## Area Selection (multiSelect)

| Area | Selected | Notes |
|------|----------|-------|
| Export format + delivery | ✓ | |
| Deletion flow + content fate | ✓ | |
| WCAG 2.1 AA scope + audit-or-fix mode | ✓ | |
| Deferred-item rollup (D-CFPurgeOnDeploy / D-CookieVaryCacheRule / D-ConsentsRegionPopulation / N-1) | ✓ | |

User selected all four. Proceeded with single highest-leverage question per area to keep the discussion tight.

## Question Pass 1 — primary decision per area

### Export delivery
- **Question:** How does the user receive their data?
- **Options presented:** (A) Async via BullMQ → email link with TTL [recommended] | (B) Sync inline download | (C) Hybrid
- **User selected:** **A — Async via BullMQ → email link with TTL**
- **Cascaded into:** D-01, D-02 (scope = all PII-bearing tables), D-03 (JSON format)

### Content fate on deletion
- **Question:** What happens to user's votes/proposals/problem-reports?
- **Options presented:** (A) Anonymize, preserve aggregates [recommended] | (B) Hard-delete everything | (C) Anonymize with opt-in cascade
- **User selected:** **A — Anonymize (preserve aggregates)**
- **Cascaded into:** D-06, D-07 (cascade order steps 1-3 anonymize PII while keeping submitter_id links)
- **Known follow-on:** Art. 17(3) balancing test rationale needs D-LawyerTrack sign-off — deferred.

### WCAG 2.1 AA execution mode
- **Question:** Audit doc + fix critical-only in Phase 6 vs ship all fixes vs audit-only
- **Options presented:** (A) Audit + critical-only fixes in phase, minor deferred [recommended] | (B) Audit + all fixes in phase | (C) Audit-only
- **User selected:** **A — Audit + fix critical/serious in Phase 6**
- **Cascaded into:** D-11, D-12 (scope = 6 core flows; defer moderate+minor to follow-on quick tasks)

### Deferred-item rollup (multiSelect)
- **Question:** Which deferred items fold into Phase 6?
- **Options:** D-CFPurgeOnDeploy | D-CookieVaryCacheRule (conditional) | D-ConsentsRegionPopulation | N-1 anonymous cookie-consent persistence
- **User selected:** **all four**
- **Cascaded into:** D-09 (N-1), D-10 (consents.region backfill), D-15 (CF purge in deploy.yml), D-16 (CookieVaryCacheRule kept conditional — don't proactively build)

## Question Pass 2 — UX nuance follow-ups

### Grace-period state
- **Question:** During the 30-day deletion grace period, what state is the account in?
- **Options:** (A) Locked, banner on login [recommended] | (B) Read-only access | (C) Full access with banner
- **User selected:** **A — Locked, banner on login**
- **Cascaded into:** D-05 (reuses `/suspended/page.tsx` shell pattern)

### Deletion-start confirmation
- **Question:** Confirmation pattern for initiating deletion?
- **Options:** (A) Typed-text `ИЗТРИЙТЕ` + email notification [recommended] | (B) Email-link confirm | (C) OTP confirm
- **User selected:** **A — Typed-text `ИЗТРИЙТЕ`**
- **Cascaded into:** D-04 (matches GitHub / Stripe destructive-action UX pattern)

## Corrections Made

None. All 6 questions answered with the recommended option. No corrections needed.

## External Research

None required during this discussion. Phase 6 builds on well-established prior decisions (BullMQ from Phase 1, REVOKE from Phase 4, k6 from Phase 02.1, GeoIP from Phase 02.1); researcher phase may surface library-version specifics for axe-core integration but the architectural decisions are settled.

## Deferred Ideas Surfaced

- Lawyer sign-off on Art. 17(3) anonymization rationale text (D-LawyerTrack item)
- D-CoalitionVideoSubtitles — coalition delivers .vtt files; infrastructure ships in Phase 6
- D-CookieVaryCacheRule deployment — conditional on operator A1 verification
- Format-flexible export (CSV/ZIP) — v1 ships JSON-only

## Todo Cross-Reference

6 todos scored 0.6 (generic keyword matches against ops/payload/admin/security/2026 terms). None showed strong Phase 6 GDPR-specific fit. All reviewed, none folded. Documented in `06-CONTEXT.md <deferred>` under "Reviewed Todos (not folded)".

## Claude's Discretion Items

Captured in `06-CONTEXT.md <decisions>` under "Claude's Discretion": JSON schema versioning details, exact typed-confirm wording, axe-core integration mechanism choice, Bunny.net signed URL TTL exact value, `cookie_consents` column naming details.
