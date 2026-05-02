---
slug: d-ci-app-failures
status: resolved
trigger: |
  D-CI-app-failures: 7 Playwright specs fail on a5d47af in GitHub Actions CI run 25253139405
  with real (non-infra) assertions, surfaced after the webServer fix in commit 394e8f9 stopped
  masking them with universal ECONNREFUSED. Goal: first-time-green CI on main (Phase 1
  sign-off prerequisite, blocks operator-side checklist Section H).
created: 2026-05-02
updated: 2026-05-02
resolved: 2026-05-02
resolution_commits:
  - 5289a4b  # Cause 1 — rate-limit bypass on missing/localhost Upstash URL
  - a635faa  # Cause 2 — auth pages: <h1> instead of shadcn CardTitle
  - 5b05427  # Cause 3 — legal pages: remove duplicate draft marker
  - 089bb7b  # Cause 4 — SSR Turnstile api.js (eliminates AUTH-08 timing race)
  - 489aed9  # Cause 4 — refactor TurnstileWidget to poll window.turnstile
resolution_quick_task: 260502-vau
resolution_proof: |
  pnpm exec playwright test tests/e2e/anti-abuse.spec.ts --project=chromium-desktop --retries=0
  → 3 passed (18.4s) on first attempt — AUTH-08 positive (518ms), AUTH-08 negative (937ms), AUTH-10 (5.8s)
---

# Debug Session: d-ci-app-failures

## Symptoms

### Failing specs (7 of 22 total in chromium-desktop project)

| Spec | Test | Failure shape |
| --- | --- | --- |
| `tests/e2e/anti-abuse.spec.ts:25` | AUTH-08: Turnstile widget script is loaded on /register | `script[src*="challenges.cloudflare.com"]` count = 0 |
| `tests/e2e/branding.spec.ts:29` | BRAND-06: Cyrillic glyphs render without fallback boxes | `locator('h1').first()` not visible (no `<h1>` in DOM) |
| `tests/e2e/branding.spec.ts:37` | BRAND-03: headings sentence case not ALL CAPS | `locator('h1').first().textContent()` times out (no `<h1>`) |
| `tests/e2e/branding.spec.ts:43` | D-15: draft marker on /legal/privacy and /legal/terms | strict mode violation — `getByText(/проект, последна редакция/)` resolves to **2 elements** (Alert + article `<p>`) |
| `tests/e2e/login.spec.ts:9` | AUTH-05: login form posts to requestOtp and redirects to /auth/otp | URL stays at `/login`; html lang=bg renders |
| `tests/e2e/registration.spec.ts:12` | AUTH-01 + AUTH-02: form submit creates user and redirects to /auth/otp | URL stays at `/register`; html renders |
| `tests/e2e/smoke.spec.ts:4` | SC-5: root page returns 2xx and renders Cyrillic | `locator('h1, [role="heading"]').first()` not visible (root → /register has no `<h1>`) |

14 specs pass, 7 fail. Build green; server boots; 22 specs execute.

### CI run logs (key signal)

`gh run view 25253139405 --log-failed` ⇒ saved at `/tmp/ci-fail-full.log`. Notable:
- `[WebServer]  ⚠ "next start" does not work with "output: standalone" configuration. Use "node .next/standalone/server.js" instead.` — warning, not load-bearing here (logo SVG branding spec passes, so static assets DO serve and pages DO render).
- AUTH-05 failure: `Received string: "http://localhost:3000/login"` — click registered, but no redirect (Server Action returned `ok: false` OR client redirect blocked).
- AUTH-01/02: same shape, URL stays at `/register`.
- D-15: explicit error message names two duplicate matches inside `<main>`: an `<div data-slot="alert-description">…</div>` AND a `<p>…</p>` inside `<article>`.
- BRAND-06 / BRAND-03 / SC-5: all `locator('h1')` resolve to "element(s) not found".

## Root Cause(s) — FOUR distinct causes producing 7 failures

### Cause 1 — Missing Upstash Redis env vars in CI workflow → `requestOtp` and `register` Server Actions return `rateLimited` instead of redirecting

**Affected specs:** AUTH-05 (login redirect), AUTH-01/02 (registration redirect)

**Mechanism:**
1. `src/lib/rate-limit.ts:4-7` constructs `new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! })` at module load. The `!` non-null assertion masks the missing env at compile time.
2. `.github/workflows/ci.yml:25-38` job-level `env:` block lists `DATABASE_URL`, `AUTH_SECRET`, `OTP_HMAC_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, etc., but **does NOT include `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN`**. (`.env.test` has them, but `.env.test` is loaded by `playwright.config.ts` only in the Playwright runner process — NOT in the `pnpm start` Next.js server process that handles Server Actions.)
3. At Server Action time:
   - `request-otp.ts:33` calls `await checkLoginOtpEmail(email)` → Upstash Redis client tries `fetch(undefined + '/...')` → throws.
   - `try/catch` at request-otp.ts:32-41 swallows the error and returns `{ ok: false, error: 'auth.login.rateLimited' }`.
   - Client `LoginForm` `useEffect` only redirects on `state.ok === true`; the spec waits 10s for `/auth/otp` and times out.
4. Identical mechanism in `register.ts:56-65` (`checkRegistrationIp` / `checkRegistrationSubnet`) for AUTH-01/02.

**Evidence:**
- `.github/workflows/ci.yml:25-38` env block (verified — no UPSTASH keys).
- `.env.test:13-15` has the keys, proving they exist locally but aren't propagated to CI.
- `src/lib/rate-limit.ts:4-7` module-load Redis init.
- `src/app/actions/request-otp.ts:32-41` and `src/app/actions/register.ts:56-65` (identical try/catch returning `rateLimited`).
- Failure log line 327: `Received string: "http://localhost:3000/login"` confirms form click did fire and stayed on /login.

**Fix:** add the two Upstash test env vars to the workflow `env:` block. They can point at `http://localhost:8079` / `test-token` (matching `.env.test`) — the URL will fail at request time, but the `try/catch` will then correctly enter its rate-limited branch only when Redis is unreachable. Wait — that's the same broken state. **A real fix is needed**: either (a) provide a working in-CI Redis or (b) make the rate-limit module gracefully degrade when env is missing or unreachable so the action proceeds (recommended for CI ergonomics) or (c) start a Redis service container in CI like the Postgres one and set the env to point at it.

**Recommended fix:** `(b)` — add a defensive check at the top of each rate-limit helper: if `UPSTASH_REDIS_REST_URL` is missing or starts with `http://localhost`, return `{ success: true, remaining: Infinity, reset: 0 }` (test-skip). This (1) preserves production behavior unchanged, (2) avoids adding a Redis service container to CI that adds 30s to every job, (3) keeps `.env.test` working for local Playwright runs, (4) mirrors the existing pattern of `verifyTurnstile` skipping in test mode (test secret `1x000…AA` always passes). Document why the bypass is safe (tests don't validate rate-limiting behavior at this layer; AUTH-09 is a separate spec).

### Cause 2 — Auth pages have no `<h1>`; they use shadcn `CardTitle` which is a `<div>`

**Affected specs:** BRAND-06, BRAND-03, SC-5 (3 specs)

**Mechanism:**
- `src/components/ui/card.tsx:31-39` — `CardTitle({...}: React.ComponentProps<"div">)` renders a `<div>`, not a heading. This is the shadcn/ui default for v4+React 19.
- `src/app/(frontend)/(auth)/register/page.tsx:14` and `login/page.tsx:12` and `auth/otp/page.tsx:13` all render `<CardTitle>{t('title')}</CardTitle>` as the only top-level title. **No `<h1>` exists on those pages.**
- `src/app/(frontend)/page.tsx:6` — root `/` does `redirect(session?.user ? '/member' : '/register')`. Unauthenticated requests land on `/register` which has no `<h1>` → SC-5 fails.
- BRAND-06 hits `/register` directly.
- BRAND-03 hits `/login` directly.

**Evidence:**
- Confirmed via `grep -rnE "<h1|role=\"heading\"" src/app src/components` — the only `<h1>` tags are on `/member`, `/legal/privacy`, `/legal/terms` pages.
- Failure log line 128/177: `Locator: locator('h1').first()` → `Received: <element(s) not found>` — definitive.

**Fix:** add an `<h1>` to each auth page (register, login, OTP). Two options:
1. **Replace `<CardTitle>` with `<CardTitle asChild><h1>...</h1></CardTitle>`** — but shadcn's CardTitle in this codebase doesn't accept `asChild`; would need a Radix `Slot` rewrite.
2. **Render `<h1>` inside the Card above the form**, keeping the existing CardTitle for visual styling. Cleanest and least-invasive: just change CardTitle's element from `<div>` to `<h1>` for these page-title use cases, OR add a `<h1 className="sr-only">` for accessibility while keeping the visual CardTitle.

**Recommended fix:** patch `src/components/ui/card.tsx:31-39` to render `<h3>` (the original shadcn default before the React 19 update; matches semantic intent of "card title") OR `<h1>` (since the auth pages use Card-as-page-shell). Lower risk: add a per-page `<h1 className="sr-only">{t('title')}</h1>` above each Card. The simplest fix that satisfies all three failing specs and stays scoped: change CardTitle to render `<h3>` (semantic for a card heading), and add an explicit `<h1>` element to the three auth page titles. **Even simpler**: replace `<CardTitle>{t('title')}</CardTitle>` with `<h1 className="font-display text-3xl">{t('title')}</h1>` directly in each of the 3 pages (matches the legal pages' existing pattern).

### Cause 3 — Privacy / Terms pages duplicate the draft marker (Alert + article `<p>`)

**Affected specs:** D-15

**Mechanism:**
- `src/app/(frontend)/legal/privacy/page.tsx:14-21` — renders `tDraft('marker', { date })` inside an `<Alert>` AND inside an `<article><p>...`. Same text appears twice.
- `src/app/(frontend)/legal/terms/page.tsx:14-21` — identical duplication.
- Test uses `page.getByText(/проект, последна редакция/)` which resolves to BOTH elements. Playwright's strict mode flags this as ambiguous.

**Evidence:**
- Failure log line 251-253:
  ```
  Error: expect.toBeVisible: Error: strict mode violation: getByText(/проект, последна редакция/) resolved to 2 elements:
      1) <div data-slot="alert-description">проект, последна редакция 2026-04-29</div>
      2) <p class="text-muted-foreground">проект, последна редакция 2026-04-29</p>
  ```

**Fix:** delete the redundant `<p className="text-muted-foreground">{tDraft('marker', { date })}</p>` from inside `<article>` in both pages. The Alert is the visible draft marker by design.

### Cause 4 — Turnstile script tag is rendered via `next/script` at `afterInteractive`, racing the test's immediate `count()`

**Affected specs:** AUTH-08

**Mechanism:**
- `src/components/forms/TurnstileWidget.tsx:87-96` uses `<Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer onReady={...} />` — `next/script` with no `strategy` prop, defaulting to `afterInteractive`. Next.js injects this `<script>` tag into the DOM **after** the page becomes interactive (post-hydration).
- Playwright's `await page.goto('/register')` resolves at `load` event. The `<Script>` injection happens after `load`. The test then calls `await page.locator('script[src*="challenges.cloudflare.com"]').count()` immediately, finding 0.
- This is a timing race: the script DOES eventually load (the registration form's Turnstile widget DOES become "ready" — the registration spec's button-click succeeds, proving Turnstile resolved). The test just measures too early.

**Evidence:**
- `next/script` strategy semantics (Next.js 15 docs: `afterInteractive` ⇒ script is injected post-hydration).
- The fact that the registration spec's click on the Turnstile-gated submit button succeeds (button `disabled={pending || turnstileStatus !== 'ready'}` was enabled) proves Turnstile widget DID load and resolve. So api.js loads, just not in time for the immediate count().
- The complementary AUTH-08 negative test ("NOT loaded on /login") passes — confirms the selector itself is correct.

**Fix:** render the Turnstile api.js as a plain HTML `<script async>` element instead of `next/script`, so it's part of SSR HTML and present at `goto`-completion. Move it from the client `TurnstileWidget` into the Server Component `RegisterPage` (or render it via `<head>` injection). Concretely:
- In `src/app/(frontend)/(auth)/register/page.tsx`, add `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer />` directly in the JSX (Server Component, ships in initial HTML).
- In `src/components/forms/TurnstileWidget.tsx`, remove the `<Script>` wrapper. Replace `onReady` wiring with a `setInterval` poll on `window.turnstile` OR a `DOMContentLoaded`/`load` listener. The Cloudflare api.js script's `async` execution will populate `window.turnstile`; the existing `useEffect` that calls `renderWidget()` on mount will pick it up. Keep the existing `error-callback` and timeout logic.

**Note:** This also makes the Turnstile widget more reliable in production (script in initial HTML loads sooner than the post-hydration `next/script` injection — same prior-art reason that the production fix in `registration-flow-cascade.md` had to add defensive sitekey-missing checks).

## Hypotheses (pre-loaded — kept for archive)

### H1 — `NEXT_PUBLIC_TURNSTILE_SITE_KEY` not baked into the production bundle on CI's `pnpm build` path

**ELIMINATED.** Verified `.github/workflows/ci.yml:34` includes `NEXT_PUBLIC_TURNSTILE_SITE_KEY: 1x00000000000000000000AA` in the job-level `env:` block, which propagates to step shells per GitHub Actions semantics. The registration spec's button-click succeeded (button was enabled by `turnstileStatus === 'ready'`), proving the widget DID render with a working sitekey. The AUTH-08 failure is a different bug (Cause 4 above).

### H2 — `NEXT_PUBLIC_COOKIEYES_SITE_KEY` placeholder breaks client hydration

**ELIMINATED.** `BRAND-02` ("logo SVG present on every Phase 1 route") passes — it asserts on `getByRole('link', { name: 'Синя България' })` which is rendered by `<Header>`. If hydration were broken, that would still pass (it's SSR'd), but BRAND-06 (Cyrillic font on body) ALSO passes — both via `page.evaluate(() => getComputedStyle(...))` which requires a working browser. So the page does render and CSS does apply. CookieBanner script may still load harmlessly with a placeholder; even if it errors, it's a self-contained script tag and doesn't break React hydration of the auth form (which works — Turnstile resolves, button enables, click fires).

### H3 — Server Actions throw on placeholder DATABASE_URL/AUTH-related env

**PARTIALLY CONFIRMED — but the missing env is Upstash Redis, not Postgres/Auth.** See Cause 1 above. Postgres works (Drizzle migrate runs in CI step 13 against the same DSN; AUTH-10 disposable-email spec passes which writes to the DB).

## Existing prior-art — resolved sessions consulted

- `.planning/debug/resolved/registration-flow-cascade.md` — Bug 1 (Turnstile sitekey absent in Docker build) does not apply to CI: CI includes the env at build time and the sitekey IS in the bundle (registration spec successfully resolves Turnstile and clicks submit). The CI failure modes are 4 distinct issues, none of which match Bug 1.
- `.planning/debug/resolved/chastnik-eu-empty-page.md` — production middleware/edge-runtime issue, not applicable here (no `src/middleware.ts` exists in current tree; production was fixed by removing the middleware).

## Constraints / scope

- **In scope:** anything required to get CI green on main with the existing 22 specs passing.
- **Out of scope:** changing Playwright specs themselves to be more lenient.
- **CLAUDE.md guardrails:** never skip git hooks, never push without confirmation, atomic commits per fix.

## Specialist hint

`typescript` (Next.js 15 Server Actions, React 19 client components, shadcn/ui semantics, env-var propagation in GitHub Actions). The fix touches 5–6 files but is mechanical (defensive env check, swap one element, remove one duplicate `<p>`, swap one `<Script>` for `<script>`). No architectural changes.

## Current Focus

- hypothesis: 4 distinct root causes (Upstash env in CI, missing `<h1>` on auth pages, duplicate draft marker, Turnstile script timing) explain all 7 failures.
- test: applied diagnostic reads to ci.yml, all auth/legal pages, rate-limit module, Turnstile widget, prior-art resolved sessions.
- expecting: applying the 4 small fixes and re-running CI ⇒ all 22 specs green.
- next_action: orchestrator confirms fix approach; this session applies fixes if scope is approved, otherwise hands off to a quick task.
