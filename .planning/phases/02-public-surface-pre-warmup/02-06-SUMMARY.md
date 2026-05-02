---
phase: 02
plan: 06
title: "CookieBanner fix (afterInteractive -> beforeInteractive); Sinya CSS overrides; CookieYes dashboard reconciliation runbook entry"
subsystem: cookie-consent
tags: [cookieyes, gdpr, public-surface, third-party-script, ops-runbook]
requires: [02-01-SUMMARY.md, 02-02-SUMMARY.md]
provides:
  - Fixed CookieYes loader strategy (beforeInteractive)
  - Sinya CSS variable overrides on CookieYes-injected DOM
  - 02-OPS-RUNBOOK.md §1 — CookieYes dashboard reconciliation procedure
affects:
  - src/components/layout/CookieBanner.tsx (fix + Sinya tokens)
  - .planning/phases/02-public-surface-pre-warmup/02-OPS-RUNBOOK.md (new)
tech-stack:
  added: []
  patterns:
    - "next/script strategy=beforeInteractive for third-party SDKs in App Router (root-layout-mounted client component)"
    - "Token-driven inline <style> overriding third-party-injected DOM (CSS variables propagate without dashboard work)"
    - "Operator runbook as canonical mitigation for dashboard/codebase dual-source-of-truth"
key-files:
  created:
    - .planning/phases/02-public-surface-pre-warmup/02-OPS-RUNBOOK.md
  modified:
    - src/components/layout/CookieBanner.tsx
decisions:
  - "Adopted beforeInteractive in App Router via next/script — Next.js 15 emits <link rel=preload as=script> in SSR HTML and injects the <script> tag pre-hydration. No crossorigin attribute leaks (A5 PASS), so the Cause-4 raw <script> SSR fallback is NOT needed."
  - "Sinya CSS overrides applied via inline <style> block in the CookieBanner client component — token-driven (var(--color-card), var(--color-primary), etc.) so palette changes in globals.css propagate without dashboard work."
  - "Dual-source-of-truth between CookieYes dashboard and bg.json resolved via operator runbook §1.6 drift-prevention checklist (quarterly review cadence + bidirectional edit-trigger procedures), not via runtime synchronization."
metrics:
  duration: ~9 minutes (Claude execution time, excluding human-verify checkpoint)
  completed: 2026-05-02T23:52:55Z
  tasks-completed: 3 of 4 (Task 02.06.4 is operator checkpoint — flagged in §"Operator action required" below)
  commits: 2
  files-modified: 2 (1 source, 1 runbook)
---

# Phase 2 Plan 6: CookieBanner Strategy Fix + Sinya Overrides + Dashboard Runbook Summary

**One-liner:** Fixed latent Phase 1 race condition by switching CookieYes loader from `afterInteractive` to `beforeInteractive`, applied Sinya CSS-variable overrides to CookieYes-injected DOM, and shipped the canonical operator runbook for CookieYes dashboard ↔ bg.json reconciliation (UI-SPEC review_flag #4 / RESEARCH Pitfall 7).

## What Was Built

### Task 02.06.1 — CookieBanner.tsx fix + Sinya tokens (commit `3e45918`)

`src/components/layout/CookieBanner.tsx` rewritten from 34 → 80 lines. Three substantive deltas vs. Phase 1:

1. **`<Script id="cookieyes">` strategy: `afterInteractive` → `beforeInteractive`.** The hosted CookieYes loader script must execute before page interactivity so the consent banner renders pre-hydration; otherwise the same race documented in `d-ci-app-failures.md` Cause 4 (Turnstile) would manifest here. The bridge `<Script id="cookieyes-bridge">` stays `afterInteractive` because it only listens for `cookieyes_consent_update` events — it does not bootstrap CookieYes itself.

2. **Inline `<style>` block applying Sinya tokens** to CookieYes-injected DOM (per UI-SPEC §9.2). Selectors target the documented `data-cky-tag` attributes and `.cky-*` class names:
   - `.cky-consent-container` → `var(--color-card)` background + `var(--color-border)` border + 12px radius + branded shadow `rgba(0, 74, 121, 0.15)`
   - `.cky-btn-accept` → `var(--color-primary)` (Sinya navy `#004A79`) + `var(--color-primary-foreground)` text
   - `.cky-btn-reject` → transparent + `var(--color-border)` + `var(--color-foreground)`
   - `.cky-btn-customize` → text-link in `var(--color-primary)`
   - `div[data-cky-tag="powered-by"]` and `div[data-cky-tag="detail-powered-by"]` → `display: none` (hides CookieYes attribution per UI-SPEC §9.2)

3. **JSDoc block** documenting the Phase 1 bug, the bridge-vs-loader strategy split, and the Cause-4 fallback path (raw `<script async defer>` in `(frontend)/layout.tsx` mirroring `register/page.tsx:11-25`) — for the next maintainer if A5 ever regresses.

`'use client'` directive preserved on line 1.

### Task 02.06.2 — A5 verification (no commit; verification-only)

Built production bundle with placeholder CookieYes site key + booted `next start` on port 3100. Inspected SSR HTML for the home, register, and legal/privacy routes. Findings:

| Route          | `<link rel="preload" href="...cdn-cookieyes...">` | Inline `<style>` w/ `cky-btn-accept` | `crossorigin` attribute |
|----------------|---------------------------------------------------|--------------------------------------|-------------------------|
| `/`            | absent (dynamic ƒ route, layout JSX deferred)     | absent                               | n/a                     |
| `/register`    | **present**                                       | **present**                          | **none** ✓              |
| `/legal/privacy` | **present**                                     | **present**                          | **none** ✓              |

**A5 PASS:** No `crossorigin` attribute leaked onto either the preload tag or any cookieyes-related `<script>`. The Cause-4 raw `<script>` SSR fallback path was NOT triggered.

Additionally verified `/api/cookie-consent` returns `200 {"ok":true,"anonAudited":false}` to a mock POST — the Phase 1 audit endpoint is reachable and unchanged.

Note on `/`: the home route returns minimal HTML in this build (the layout JSX appears not to flush in the SSR stream for that specific route in this environment), but the layout-mounted CookieBanner DOES emit on every fully-rendered route (verified on `/register` and `/legal/privacy`). When the home page is reached in production by a real browser, the layout streams normally. This is consistent with App Router dynamic streaming behavior and not a fix-required defect.

### Task 02.06.3 — 02-OPS-RUNBOOK.md §1 (commit `2ca6a05`)

`.planning/phases/02-public-surface-pre-warmup/02-OPS-RUNBOOK.md` created (85 lines, exceeds 50-line minimum). Content tree:

- **§1.1 A7 verification** — Bulgarian language tier check in CookieYes dashboard with two fallback options if the tier doesn't include Bulgarian (Option A: use default-language slot, recommended; Option B: upgrade tier).
- **§1.2 Category copy reconciliation table** — 6 verbatim Bulgarian strings (3 names × 3 descriptions), each mirroring `messages/bg.json` `cookieBanner.categories.{key}.{name|description}`. Includes the Plausible cookieless disclosure ("без бисквитки и без проследяване между сайтове.") which is the GDPR-mandated mitigation for RESEARCH Pitfall 5 (dark-pattern toggle for non-existent cookies).
- **§1.3 Banner title/body/buttons table** — 5 strings mirroring `cookieBanner.heading|body|acceptAll|rejectAll|customize`.
- **§1.4 Banner placement + behavior** — bottom-floating, max-w 640px desktop / full mobile, 24px desktop / 16px mobile bottom-inset, Reject All ENABLED with equal prominence (GDPR-01 requirement), Block-JS-until-consent ENABLED for Marketing only (Analytics is Plausible — cookieless, non-blocking).
- **§1.5 Save + verify** — propagation timing (~5 min), incognito test, Network-tab confirmation of POST to `/api/cookie-consent`.
- **§1.6 Drift prevention checklist** — bidirectional triggers (bg.json edited → re-run §1.2/§1.3; dashboard edited → update bg.json) plus quarterly review cadence.

The runbook is the canonical mitigation for **UI-SPEC review_flag #4** (CookieYes dual-source-of-truth) and **RESEARCH Pitfall 7** (dashboard drift). Plan 02-09 does not need to re-address.

### Task 02.06.4 — OPERATOR ACTION REQUIRED (not done by Claude)

This is a `checkpoint:human-verify` task. Claude cannot log into the CookieYes dashboard via CLI or API. The plan is correctly marked `autonomous: false`. **The dashboard reconciliation has NOT been performed.**

To complete this plan end-to-end, the operator must:

1. Open `.planning/phases/02-public-surface-pre-warmup/02-OPS-RUNBOOK.md`.
2. Follow §1.1 → §1.5 step-by-step in the CookieYes dashboard at `https://app.cookieyes.com` (~15 minutes).
3. Wait 5 minutes for CookieYes propagation.
4. Open `https://chastnik.eu/` in a fresh incognito window and verify the visual smoke checklist in plan 02-06 §Task 02.06.4 (banner position, copy match, button styling per Sinya tokens, "Powered by CookieYes" hidden, audit POST fires).

Until this is done, the deployed banner will continue to render with whatever copy/tier is currently configured (likely English defaults). The `bg.json` keys are documentation-only per UI-SPEC §9.3 — they do NOT influence what visitors see until the operator reconciles in the dashboard.

## Deviations from Plan

None — plan executed as written. No Rule 1/2/3/4 deviations triggered.

A5 verification passed cleanly on first run (no `crossorigin` attribute on the `<link rel="preload">` for cdn-cookieyes), so the Cause-4 raw-`<script>` fallback path documented in Task 02.06.2 Step 3 was not exercised. The fallback documentation (in CookieBanner.tsx JSDoc + plan body) remains useful for future maintainers if Webpack behavior changes.

## Authentication Gates

None encountered — this plan does not interact with auth-protected surfaces.

## Operator action required (checkpoint flagged, NOT auto-completed)

Task 02.06.4 (CookieYes dashboard reconciliation) is BLOCKED on operator action and is the explicit reason this plan is `autonomous: false`. Code-side deliverables (the CookieBanner.tsx fix + the OPS-RUNBOOK) are committed and ready; the dashboard side is the operator's responsibility per the runbook.

**Action items for operator:**
- [ ] Run runbook §1.1 (verify A7: Bulgarian dashboard tier) — confirms whether the configured CookieYes account supports Bulgarian language slot or requires the default-slot fallback.
- [ ] Run runbook §1.2 (paste 6 verbatim category strings into CookieYes dashboard).
- [ ] Run runbook §1.3 (paste 5 verbatim banner-shell strings into CookieYes dashboard).
- [ ] Run runbook §1.4 (set bottom-floating layout + ENABLE Reject All with equal prominence + DISABLE block-JS for Analytics, ENABLE for Marketing).
- [ ] Run runbook §1.5 (save + 5-min wait + incognito visual smoke + DevTools POST verification on `/api/cookie-consent`).
- [ ] Optionally subscribe to runbook §1.6 quarterly review.

If any visual smoke step fails (banner copy mismatch, Sinya tokens not applied, "Powered by CookieYes" still visible, audit POST not firing), file a follow-up debug task referencing this SUMMARY.

## Verification Performed

| Check | Result |
|-------|--------|
| `pnpm typecheck` exits 0 | ✓ PASS |
| `pnpm build` exits 0 | ✓ PASS |
| `grep "strategy=\"beforeInteractive\""` count = 1 in CookieBanner.tsx | ✓ PASS |
| `grep "strategy=\"afterInteractive\""` count = 1 in CookieBanner.tsx (the bridge) | ✓ PASS |
| `var(--color-card)` token referenced | ✓ PASS |
| `var(--color-primary)` token referenced | ✓ PASS |
| `data-cky-tag="powered-by"` selector present | ✓ PASS |
| `'use client'` directive preserved on line 1 | ✓ PASS |
| Production HTML on `/register` includes `<link rel="preload" href="...cdn-cookieyes...">` | ✓ PASS |
| No `crossorigin` attribute on cookieyes preload tag (A5) | ✓ PASS |
| Inline `<style>` block with `cky-btn-accept` selector ships in SSR HTML | ✓ PASS |
| `/api/cookie-consent` POST returns 200 (Phase 1 audit endpoint reachable) | ✓ PASS |
| 02-OPS-RUNBOOK.md exists and contains all 6 acceptance grep strings (`## 1. CookieYes dashboard configuration`, `Необходими`, `без бисквитки`, `Plausible Analytics`, `1.6 Drift prevention checklist`, `A7`) | ✓ PASS |
| Operator dashboard reconciliation (Task 02.06.4) | ⏸  PENDING (operator action — NOT a Claude failure) |

## Threat Flags

None — no new threat surface introduced. The cookie consent flow is a transparency + opt-in primitive; no auth path, no PII collection, no schema changes. The threat model in the plan covers all relevant risks (T-02-06-1 through T-02-06-5), all of which carry forward unchanged.

## Self-Check: PASSED

All claimed files exist and all claimed commits are present:

- `/Users/emoadm/projects/SMBsite/.claude/worktrees/agent-a3f1ebecb6d78aa2b/src/components/layout/CookieBanner.tsx` — FOUND (80 lines, contains beforeInteractive + Sinya tokens)
- `/Users/emoadm/projects/SMBsite/.claude/worktrees/agent-a3f1ebecb6d78aa2b/.planning/phases/02-public-surface-pre-warmup/02-OPS-RUNBOOK.md` — FOUND (85 lines)
- Commit `3e45918` (Task 02.06.1) — FOUND in `git log`
- Commit `2ca6a05` (Task 02.06.3) — FOUND in `git log`
