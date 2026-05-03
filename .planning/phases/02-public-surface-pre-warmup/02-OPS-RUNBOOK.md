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

## 2. Cloudflare cache rule (cookie-vary'd anonymous cache)

**Purpose:** PUB-02 requires `/`, `/agenda`, `/faq` to be CDN-cached for the QR mail-drop traffic peak. Per RESEARCH §1.4 and UI-SPEC §13.1, the Header reads `auth()` which returns different HTML for authenticated vs anonymous users. Cloudflare must cache the anonymous variant only.

**Path A decision (from plan 02-04 SUMMARY):** the routes `/`, `/agenda`, `/faq` are classified as `ƒ (Dynamic)` at origin because the parent layout's Header calls `auth()` (a dynamic API). The build emits `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` for those routes. PUB-02 caching is therefore satisfied SOLELY at the Cloudflare layer via the rules below — Cloudflare overrides origin's `private, no-store` to `public, s-maxage=3600, stale-while-revalidate=86400` for anonymous requests, and bypasses cache entirely when an auth-session cookie is present.

**Pre-requisite:** `chastnik.eu` zone exists in Cloudflare (Phase 1 wired DNS).

### 2.1 A1 verification — confirm cookie-presence Cache Rules are creatable on free tier

1. Log into Cloudflare → select `chastnik.eu` zone.
2. **Caching → Cache Rules → Create rule.** If the "Create rule" button is disabled or shows a "Pro plan required" prompt, A1 is FALSIFIED — fall back to §2.4 below.
3. In the rule expression builder, search for "Cookie" in the field dropdown. Confirm `http.cookie` field is available. (Free tier should expose this.)

If §2.1 succeeds, proceed to §2.2.

### 2.2 Create the bypass rule (higher priority — runs first)

**Rule name:** `Bypass cache for authenticated members`

**Expression** (paste verbatim into the expression editor):

```
(http.cookie contains "next-auth.session-token") or (http.cookie contains "__Secure-next-auth.session-token")
```

**Action:** Bypass cache.

**Save & Deploy.**

### 2.3 Create the public-pages cache rule (lower priority — runs after bypass)

**Rule name:** `Cache anonymous public pages`

**Expression** (paste verbatim):

```
(http.request.uri.path eq "/" or http.request.uri.path eq "/agenda" or http.request.uri.path eq "/faq" or starts_with(http.request.uri.path, "/legal/"))
and (not http.cookie contains "next-auth.session-token")
and (not http.cookie contains "__Secure-next-auth.session-token")
```

**Action:** Eligible for cache.

**Edge TTL:** **Override origin** → 1 hour (3600 seconds). RESEARCH Pitfall 6 specifically calls out that "Respect origin" CANNOT be used here because the Header's `auth()` call forces origin to emit `private, no-store` (plan 02-04 SUMMARY Architectural Issue §1, Path A). We are intentionally OVERRIDING origin's no-store directive for anonymous requests; the bypass rule in §2.2 protects authenticated users from receiving the cached HTML.

**Browser TTL:** Respect origin (let downstream browsers honor their own freshness — they will revalidate via Cloudflare anyway).

**Save & Deploy.**

> **Why "Override origin" is safe here:** the bypass rule (§2.2) intercepts every request that has an auth cookie BEFORE this rule evaluates. So this rule only ever runs for visitors with NO session cookie — i.e., visitors for whom the page would render identically anyway (anonymous variant only). The 1-hour TTL matches the per-route `revalidate = 3600` intent from plan 02-04, which the origin would have honored if `auth()` weren't forcing dynamic. Cloudflare effectively becomes the ISR layer. See RESEARCH Pitfall 2 for the threat scenario this design defends against.

### 2.4 Fallback (only if A1 falsifies — free tier doesn't support cookie-presence)

**Option:** Defer the bypass rule to a paid Cloudflare tier upgrade or to a Cloudflare Worker. Document in STATE.md deferred items as `D-CookieVaryCacheRule (resolves_phase: 6)`.

**Interim behavior:** Cloudflare default caching applies. Anonymous visitors will hit cache normally. Authenticated visitors may sometimes get stale anonymous HTML (showing "Вход" link instead of their session indicator) — this is the regression flagged in RESEARCH Pitfall 2. Sentry will surface hydration mismatch errors; if these become noisy, escalate to paid Cloudflare tier or Worker.

### 2.5 Verification

From a clean browser:

```bash
# Anonymous visit — should HIT cache after first request
curl -sI https://chastnik.eu/ | grep -iE "(cf-cache-status|cache-control)"
# First request: MISS or DYNAMIC; second request within 1h: HIT
# After §2.3 rule applied: cache-control should contain `public, max-age=3600` (Cloudflare-rewritten) instead of origin's `private, no-store`.
```

From an authenticated browser (with auth-session-token cookie):

```bash
# Authenticated visit — should BYPASS cache
curl -sI -H "Cookie: __Secure-next-auth.session-token=DUMMY" https://chastnik.eu/ | grep -iE "(cf-cache-status|cache-control)"
# Expect cf-cache-status: BYPASS or DYNAMIC; cache-control should pass through origin's private, no-store untouched.
```

Verify the OG-image and font-asset cache headers from `next.config.ts` are also live:

```bash
curl -sI https://chastnik.eu/og-image.png | grep -i cache-control
# Expect: public, max-age=86400, stale-while-revalidate=604800
curl -sI https://chastnik.eu/fonts/gilroy-extrabold.woff2 | grep -i cache-control
# Expect: public, max-age=31536000, immutable
```

### 2.6 Stale-content alarm (post-launch)

If coalition edits agenda copy in `messages/bg.json`, the staging build deploys, but Cloudflare still serves the old HTML for up to 3600 seconds (1 hour). This is by design.

**Manual purge** (use sparingly):

1. Cloudflare → Caching → Configuration → Purge Cache → Custom Purge.
2. Purge URLs: `https://chastnik.eu/`, `https://chastnik.eu/agenda`, `https://chastnik.eu/faq`, `https://chastnik.eu/legal/privacy`, `https://chastnik.eu/legal/terms`.
3. Verify with `curl -sI https://chastnik.eu/agenda | grep -i cache-status` — should show `MISS` next request.

**Automated purge (post-deploy hook, future):** plan 02-08 may wire a `cf purge-cache` invocation into `.github/workflows/deploy.yml`. Out of scope here; tracked as `D-CFPurgeOnDeploy` (resolves_phase: 6).

### 2.7 Operator alert: middleware origin-IP gate verification

After Cloudflare rules are saved, verify the cf-ray middleware (committed in plan 02-07 as `src/middleware.ts`) doesn't break legitimate Cloudflare-routed traffic:

```bash
# Through Cloudflare — should succeed
curl -sI https://chastnik.eu/ | head -5
# Expect: HTTP/2 200; cf-ray header present in response.

# Direct to Fly origin (bypassing Cloudflare) — should be blocked
FLY_HOST=$(fly ips list -a smbsite-prod --json | jq -r '.[0].address')
curl -sI -H "Host: chastnik.eu" "http://${FLY_HOST}/"
# Expect: HTTP/1.1 403 Forbidden (middleware blocked the no-cf-ray request).
```

**CAVEAT (T-02-07-5):** the cf-ray check is a CASUAL-PROBE gate only. A determined attacker who sets `cf-ray: anything` in their direct-origin HTTP request will bypass the middleware. The strong network-layer authentication boundary (Cloudflare-IP allow-list on Fly.io's `internal_port`) is tracked under `D-CloudflareIPAllowlist` in STATE.md as a post-warmup hardening task. Until that lands, rely on (a) origin-IP obscurity and (b) Fly.io's default network ACL.

## 3. (Reserved) — additional Phase 2 ops procedures

See plan 02-09 for footer cookie-settings link wiring + favicon refresh.
