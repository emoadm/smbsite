# Phase 2 — Operations Runbook

Operator-side procedures the developer runs ONCE per environment. Reference document for plan 02-06 (CookieYes config) and downstream phases.

## 1. CookieYes dashboard configuration

**Purpose:** GDPR-01 requires a granular cookie banner with three categories (necessary / analytics / marketing) in Bulgarian. The CookieYes hosted script renders banner copy from the dashboard, NOT from this codebase. This runbook ensures dashboard text matches `messages/bg.json` `cookieBanner.*` keys exactly — preventing the dual-source-of-truth drift flagged in UI-SPEC review_flag #4 + RESEARCH Pitfall 7.

**Pre-requisite:** `NEXT_PUBLIC_COOKIEYES_SITE_KEY` set in `.env` and Fly.io secrets (Phase 1 wired).

### 1.1 Verify A7 — CookieYes account tier supports Bulgarian

1. Log into [https://app.cookieyes.com](https://app.cookieyes.com).
2. Select the SMBsite property (chastnik.eu).
3. Navigate to **Cookie Banner → Languages**.
4. Confirm "Bulgarian" appears in the language dropdown. If the available tier doesn't include Bulgarian:
   - **Option A:** Configure banner with Bulgarian text in the default English-language slot. CookieYes still serves the text; users see Bulgarian regardless of their browser locale.
   - **Option B:** Upgrade tier (free → starter ~$10/mo) for full multilingual support.
   - **Recommended:** Option A — sufficient for v1, no recurring cost.

### 1.2 Configure category copy (must match bg.json)

Navigate to **Cookie Banner → Customize → Categories**. For each of the three categories, enter the EXACT Bulgarian text below. These strings are mirrored from `messages/bg.json` under `cookieBanner.categories.{key}.{name|description}`.

| Dashboard field | Category | Bulgarian copy (paste verbatim) |
|-----------------|----------|----------------------------------|
| Category name | Necessary | `Необходими` |
| Description   | Necessary | `Тези бисквитки са необходими за работата на сайта (вход, сесия, защита от ботове).` |
| Category name | Analytics | `Анализи` |
| Description   | Analytics | `Анонимна статистика за това как се използва сайтът. Не съдържа лична информация. Plausible Analytics — без бисквитки и без проследяване между сайтове.` |
| Category name | Marketing | `Маркетинг` |
| Description   | Marketing | `Резервирано за бъдещи маркетинг функционалности. В момента не се използват маркетинг бисквитки.` |

**The Plausible disclosure ("без бисквитки") is GDPR-mandatory** — it prevents the dark-pattern flagged in RESEARCH Pitfall 5 (toggle for a non-existent cookie). Do not omit.

### 1.3 Configure banner copy

Navigate to **Cookie Banner → Customize → Banner Settings**.

| Dashboard field | Bulgarian copy |
|-----------------|----------------|
| Banner title    | `Бисквитки и поверителност` |
| Banner body     | `Използваме бисквитки за работата на сайта и за анонимни анализи. Можете да изберете кои да приемете.` |
| Accept all button | `Приеми всички` |
| Reject all button | `Само необходимите` |
| Customize button  | `Настрой` |

### 1.4 Configure banner placement + behavior

Navigate to **Cookie Banner → Customize → Layout**.

- Position: **Bottom Floating** (UI-SPEC §9.2)
- Width: 100% on mobile / 640px max on desktop
- Inset from bottom: 24px desktop, 16px mobile
- Reject All button: ENABLED (GDPR-01 requires equal prominence with Accept All)
- Block JS until consent: ENABLED for "Marketing" category, DISABLED for "Analytics" (Plausible is cookieless and non-blocking)
- Reopen link: ENABLED (a footer link will trigger `window.revisitCkyConsent()` — wired in plan 02-09)

### 1.5 Save + verify

1. Click **Save** in dashboard.
2. CookieYes propagates within ~5 minutes. Visit `https://chastnik.eu/` in an incognito window.
3. Confirm the banner appears in Bulgarian with the exact copy from §1.2 + §1.3.
4. Test all three buttons: Accept All / Reject All / Customize.
5. Open browser devtools → Network tab → filter `cookie-consent` → confirm POST to `/api/cookie-consent` fires (Phase 1 audit endpoint).

### 1.6 Drift prevention checklist

Whenever `messages/bg.json` `cookieBanner.*` keys are edited:

- [ ] Re-run §1.2 + §1.3 to update CookieYes dashboard
- [ ] Click Save in dashboard
- [ ] Verify in incognito after 5 minutes

Whenever CookieYes dashboard copy is edited:

- [ ] Update `messages/bg.json` `cookieBanner.*` keys to match
- [ ] Commit + deploy

Quarterly review: open both surfaces side-by-side; diff the strings.

## 2. (Reserved) — additional Phase 2 ops procedures

See plan 02-07 for Cloudflare cache rule + middleware operator steps (when written).
See plan 02-09 for footer cookie-settings link wiring + favicon refresh.
