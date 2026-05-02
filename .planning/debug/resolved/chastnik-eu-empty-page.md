---
slug: chastnik-eu-empty-page
status: resolved
trigger: empty page issue on chastnik.eu (production main page renders blank body)
created: 2026-05-01
updated: 2026-05-01
resolved: 2026-05-01
---

## Production Verification (2026-05-01 19:58Z)

After `flyctl deploy`, live curl probes against https://chastnik.eu:

| Path | Status | Body bytes | Behavior |
| --- | --- | --- | --- |
| `/register` | 200 OK | 37,827 | Form renders |
| `/` | 307 → `/register` | 20,345 | Redirect chain works |
| `/login` | 200 OK | 27,470 | Form renders |

Compare to pre-fix state (same routes, all `200 + 0 bytes`). Fix verified in production.

# Debug Session: chastnik-eu-empty-page

## Symptoms

<!-- DATA_START -->
- **Expected**: visiting https://chastnik.eu/ should redirect to /register (unauth) or /member (auth) per src/app/(frontend)/page.tsx
- **Actual**: main page is empty in production — body renders nothing
- **Error messages**: not yet captured (browser console, Fly logs, Sentry breadcrumbs all need to be pulled)
- **Timeline**: surfaced after recent Phase 01 foundation deploys; user flagged this in a previous session before a `gsd update` and asked to come back via /gsd-debug
- **Reproduction**: visit https://chastnik.eu/ in a browser; local `pnpm dev` against the same code path needs to be checked for parity
<!-- DATA_END -->

## Current Focus

- **hypothesis**: A misconfigured middleware / Node-runtime opt-in is producing a 200-with-empty-body response for every middleware-matched route. Specifically: `src/middleware.ts` declares `export const runtime = 'nodejs'` (commit 4b78134), but `next.config.ts` does NOT set `experimental.nodeMiddleware: true`. Confirmed in `node_modules/next/dist/build/entries.js:505-508` that Next 15.3 silently downgrades the runtime to `'edge'` in this case (warn-only). The middleware imports `@/lib/auth` → DrizzleAdapter + `@/db` (pg driver) + `node:crypto` via `auth-utils`, none of which can be bundled for Edge runtime — but the bundling is silent. Production then either runs a broken Edge bundle that returns an empty Response, or the manifest registration fails.
- **test**: ran live curl against https://chastnik.eu/, https://chastnik.eu/register, https://chastnik.eu/xyz, and bypassed Cloudflare via https://smbsite-prod.fly.dev — all middleware-matched paths return 200 with body size 0 and **no `content-type` / `content-length` headers**. Paths excluded from middleware matcher (`/admin`, `/api/*`, `/favicon.ico`, `/robots.txt`) all serve correctly. Inspected build artifacts at `.next/server/middleware-manifest.json` (empty: `middleware: {}`, `sortedMiddleware: []`) and `.next/server/functions-config-manifest.json` (registers `/_middleware` with `runtime: nodejs`). Inspected runtime loader in `node_modules/next/dist/server/next-server.js:1039-1054` — `loadNodeMiddleware()` returns immediately when `experimental.nodeMiddleware` is false, regardless of the per-file declaration. Inspected build code at `.../next/dist/build/entries.js:505-508` — confirms warn-then-force-edge downgrade.
- **expecting**: `flyctl logs -a smbsite-prod` will show either (a) the Next.js build warning "nodejs runtime support for middleware requires experimental.nodeMiddleware..." in the deploy log, and/or (b) repeated Edge runtime errors at request time — likely `Cannot find module 'node:crypto'`, `Module not found: pg`, or `Dynamic Code Evaluation` errors from DrizzleAdapter — that correlate with the empty 200 responses.
- **next_action**: ask user to run `flyctl logs -a smbsite-prod` (recent + tail-during-curl) so we can confirm which of these failure modes is firing in prod. Once confirmed, propose the fix: add `experimental.nodeMiddleware: true` to `next.config.ts` AND verify Next 15.3.x supports the flag (per release notes), OR alternatively remove the auth/db imports from middleware and move the membership guard into a Server Component (cleaner long-term).
- **reasoning_checkpoint**: pending — confirm hypothesis via live logs before applying the config fix. Counter-hypothesis still open: a redirect loop triggered by next-intl's middleware rewriting `/` → `/bg/` (since codebase has no `[locale]` segment) — but middleware-manifest is empty, so middleware likely isn't running at all, weakening this counter.
- **tdd_checkpoint**: pending — define a Playwright smoke against `/` and `/register` checking response body length > 0 (or specific markup) before applying fix. Add a step in `.github/workflows/deploy.yml` post-deploy.

## Evidence

- timestamp: 2026-05-01 19:16Z — `curl -is https://chastnik.eu/` → HTTP/2 200, `size_download=0`, no content-type / content-length headers, no Set-Cookie, no Location. `via: 1.1 fly.io` confirms origin. Body bytes = 0 (verified with xxd dump of header file).
- timestamp: 2026-05-01 19:17Z — `/register`, `/login`, `/xyz` all return 200 + 0 bytes via Cloudflare. `/admin` returns 200 + 43,642 bytes (Payload admin renders fully). `/api/auth/session` returns 200 + 4 bytes (`null` JSON). `/favicon.ico` returns 404 + 7,089 bytes (Next 404 HTML with Sentry meta tags). `/robots.txt` returns 200 + 1,738 bytes.
- timestamp: 2026-05-01 19:24Z — same probes against `https://smbsite-prod.fly.dev/*` (bypass Cloudflare) confirm identical behavior. CF is not stripping body. Fly origin is itself emitting empty 200s.
- timestamp: 2026-05-01 19:18Z — local build `.next/server/middleware-manifest.json` shows `{"version":3,"middleware":{},"functions":{},"sortedMiddleware":[]}`. Standalone copy `.next/standalone/.next/server/middleware-manifest.json` identical. **No middleware registered in the runtime manifest.**
- timestamp: 2026-05-01 19:18Z — local build `.next/server/functions-config-manifest.json` shows `/_middleware` entry with `"runtime": "nodejs"` and the correct compiled matcher regex. **Build is aware of the desired runtime, but does not register it for runtime dispatch.**
- timestamp: 2026-05-01 19:19Z — `node_modules/next/dist/build/entries.js:505-508` — Next.js source: `if (isMiddlewareFile(page) && !config.experimental.nodeMiddleware && pageRuntime === 'nodejs') { log.warn('nodejs runtime support for middleware requires experimental.nodeMiddleware be enabled in your next.config'); pageRuntime = 'edge'; }`. **Confirms silent runtime downgrade when flag is missing.**
- timestamp: 2026-05-01 19:21Z — `node_modules/next/dist/server/next-server.js:1039-1054` — `loadNodeMiddleware()` early-returns if `experimental.nodeMiddleware` is false. Combined with `.next/server/middleware-manifest.json` empty, runtime never loads or invokes middleware.
- timestamp: 2026-05-01 19:14Z — `.next/required-server-files.json` confirms `experimental.nodeMiddleware: false` baked into deployed config (the Next-managed default; user has not opted in).
- timestamp: 2026-05-01 19:09Z — git log shows commit 4b78134 (latest middleware change) added `runtime = 'nodejs'` to middleware but did NOT touch `next.config.ts`.
- timestamp: 2026-05-01 19:13Z — `package.json`: next@15.3.9, next-auth@5.0.0-beta.31, next-intl@4.11.0, @auth/drizzle-adapter@1.11.2.
- timestamp: 2026-05-01 19:15Z — `next.config.ts:8-11`: `nextConfig = { output: 'standalone', experimental: { reactCompiler: false } }`. `nodeMiddleware` not set. Wrapped by `withSentryConfig(withNextIntl(withPayload(...)))`.
- timestamp: 2026-05-01 19:16Z — `src/i18n/routing.ts`: `locales: ['bg']`, `defaultLocale: 'bg'`, `localePrefix: 'never'`. Codebase has NO `[locale]` segment under `app/`. With `localePrefix: 'never'` and a single locale, next-intl middleware would internally rewrite `/foo` → `/bg/foo`. Without a `[locale]` segment, that rewrite has nowhere to land — but this is moot if middleware isn't running (manifest empty).
- timestamp: 2026-05-01 19:20Z — local Dockerfile + fly.toml inspected. Standard `node server.js` start. No surprises in deployment shape.

## Eliminated

- **Cloudflare stripping body** — eliminated 19:24Z by reproducing the empty 200 directly against `smbsite-prod.fly.dev`.
- **Build-time fatal error** — eliminated. Standalone build produced complete `.next/standalone` with all page bundles (`(frontend)/page.js`, `register/page.js`, etc.). Routes manifest lists `/`, `/register`, `/login`, `/member`, `/auth/otp`, `/legal/*` as static routes.
- **Missing messages bundle** — eliminated. `messages/bg.json` content is inlined via webpack chunk `chunks/2608.js` in standalone build (verified by grep for Bulgarian strings).
- **`/api/*` and Payload broken** — eliminated. `/admin`, `/api/auth/session`, Payload admin all serve correctly.
- **Sentry init crashing** — eliminated. Fly logs show clean boot: `Ready in 940ms` / `Ready in 1345ms` on both web machines. Sentry initialised, Payload booted, Drizzle connected to Postgres. No request-time exceptions in logs for `/`, `/register`, `/login` paths.
- **Edge-runtime bundling failure at request time** — eliminated. Production logs (2026-05-01 17:28Z – 19:17Z window) contain ZERO `Cannot find module 'node:crypto'`, `Module not found: pg`, `Dynamic Code Evaluation`, or DrizzleAdapter errors. This is the diagnostic fingerprint of the `loadNodeMiddleware()` early-return path in `next-server.js:1039-1054`: Next never *attempted* to invoke the middleware, so there was nothing to crash. Confirms the silent-downgrade-then-skip-registration scenario over the alternative "Edge bundle runs and crashes" scenario.

## Live-Logs Evidence (2026-05-01 ~19:30Z)

- timestamp: 2026-05-01 17:28:23Z & 17:28:36Z — Both Fly web machines (`48e3376f4e7e58`, `683591dfd49478`) boot cleanly: `▲ Next.js 15.3.9` → `✓ Ready`. No middleware compile error in startup logs.
- timestamp: 2026-05-01 17:38:18Z & 17:38:33Z — pg SSL mode deprecation warnings (informational; pg-connection-string v3 future change). Not request-blocking.
- timestamp: 2026-05-01 17:38:18Z & 17:38:33Z — `[WARN]: No email adapter provided. Email will be written to console.` — Payload email adapter missing. Tracks separate from this bug (members-flow / NOTIF-07 territory). Not the empty-body cause.
- timestamp: 2026-05-01 17:42:00Z & 18:55:23Z — `getFromImportMap: PayloadComponent not found in importMap { key: '@payloadcms/next/rsc#CollectionCards' }`. Payload importMap regeneration needed. Cosmetic Payload-admin issue. Separate.
- timestamp: 2026-05-01 19:17:11Z — `[auth][error] UnknownAction: Only GET and POST requests are supported.` Stack: `wrapRouteHandlerWithSentry.js:60` → Auth.js handler. **This is the fingerprint of a HEAD probe (`curl -I`) hitting `/api/auth/*`** — Auth.js rejects non-GET/POST. Confirms the user's prior diagnosis that the post-deploy smoke gate is built on `curl -I` (HEAD), which is fundamentally wrong for two reasons: (a) HEAD never returns a body, so an empty-200 bug is invisible to it; (b) HEAD against `/api/auth/*` produces a 500 in the logs *but* Auth.js's wrapper still emits a non-empty response, so the gate may show "pass" while the underlying app is broken.
- timestamp: 2026-05-01 19:17Z window — **No errors logged for any `/`, `/register`, `/login`, `/member` request.** Combined with the wire evidence (200 + 0 bytes), this proves middleware is never invoked: if it were invoked and crashing, Sentry's instrumentation wrapping would surface it.

## Conclusion (root cause confirmed)

The middleware is silently absent from the runtime manifest because Next 15.3 force-downgrades `runtime = 'nodejs'` to Edge when `experimental.nodeMiddleware` is unset, and `loadNodeMiddleware()` then early-returns. Requests that match the middleware matcher hit a registration void and the runtime returns an empty `Response`. Routes excluded from the matcher (`/api`, `/admin`, static assets) bypass this trap and serve correctly — exactly the wire pattern observed.

Two distinct production gaps surfaced:

1. **Primary bug**: missing `experimental.nodeMiddleware: true` in `next.config.ts`. One-line fix.
2. **Secondary gap (separate but adjacent)**: post-deploy smoke gate uses `curl -I` (HEAD), which cannot detect empty-body 200s and provokes false errors against Auth.js. Needs replacement with a GET-based smoke that asserts non-zero body length and a sensible status (`200 | 30x` with `content-length > 0`) on `/`, `/register`, `/login`.
- **Locale segment rewrite landing on 404 with empty body** — partially eliminated. Even if next-intl rewrote `/` → `/bg/`, an unmatched route should produce Next.js's standard 404 HTML (we observed that on `/favicon.ico`). Empty 200 with no headers is NOT what Next emits for 404. But this hypothesis is moot anyway because middleware-manifest is empty (middleware does not run).

## Resolution

### Two layered bugs

The "empty page" symptom turned out to mask **two** independent bugs. The first hid the second.

**Bug 1 (primary, surface symptom): middleware silently absent from runtime manifest.**

`src/middleware.ts` declared `export const runtime = 'nodejs'` (commit `4b78134`) so it could call `auth()` (which transitively imports `node:crypto` via `auth-utils` and `pg`/DrizzleAdapter via `@/db`). Next 15.3.x silently force-downgrades any `runtime = 'nodejs'` middleware to Edge unless `experimental.nodeMiddleware: true` is set in `next.config.ts` (verified in `node_modules/next/dist/build/entries.js:505-508`). The build-time loader then early-returns at `next-server.js:1039-1054`, so middleware was never registered (`middleware-manifest.json` empty) and the runtime emitted an empty `Response` for every middleware-matched route.

**Bug 2 (latent, exposed once Bug 1 was fixed): next-intl rewrite without `[locale]` segment.**

After re-registering middleware with only `intlMiddleware`, `/register` returned **200 + 12,288 bytes — but they were Next 404 HTML.** next-intl's middleware always rewrites `/foo` → `/${locale}/foo` even when `localePrefix: 'never'`, intending the rewrite target to be captured by an `[locale]` route segment. The codebase has none — locale is single (`['bg']`) and resolved via `getRequestConfig` server-side. The rewrite landed in nowhere → 404. This was hidden in production because the broken middleware (Bug 1) never executed the rewrite.

### Why the original Path A (add `experimental.nodeMiddleware: true`) was abandoned

Tried it. Build hard-failed:

> `Error: The experimental feature "experimental.nodeMiddleware" can only be enabled when using the latest canary version of Next.js.`

Per official docs version-history (https://nextjs.org/docs/app/api-reference/file-conventions/middleware): `runtime = 'nodejs'` in middleware became **stable in Next 15.5.0**, experimental in 15.2.0, and was renamed to `proxy` in v16.0.0. We were on 15.3.9.

Next bump 15.3.9 → 15.5.15 attempted next: blocked by Payload CMS peer-dep range (`@payloadcms/next@3.84.1` excludes the entire Next 15.5.x line, only re-supports 16.2.2+). Payload 3.84.1 is the latest 3.x — no newer Payload 3.x exists. Bumping Payload to 16.x-compatible would mean migrating off the `middleware`-named convention entirely.

### Final fix (applied)

1. **Deleted `src/middleware.ts`.** Single-locale + `localePrefix: 'never'` makes the middleware structurally unnecessary — `getRequestConfig` resolves locale via `defaultLocale` fallback when no `requestLocale` is found. No `node:crypto` / `pg` / Drizzle imports in any middleware bundle. Edge-vs-Node runtime question becomes moot.

2. **Created `src/app/(frontend)/member/layout.tsx`** as a Server Component auth guard. Replaces what middleware was doing for `/member/*`:
   - Redirects unauthenticated users to `/login?next=/member`.
   - Redirects authenticated-but-unverified users to `/auth/otp`.
   - Cleaner architecture (RSC layouts can call `auth()` directly with full Node runtime — no middleware bundling concerns).

3. **Reverted `next.config.ts`** to original (only `reactCompiler: false`).

### Files changed

- `src/middleware.ts` — DELETED
- `src/app/(frontend)/member/layout.tsx` — NEW (Server Component auth guard)
- `next.config.ts` — no net change (briefly modified during Path A attempt; reverted)

### Verification

**Build manifest:**

```
$ pnpm build | tail -1
ƒ  (Dynamic)  server-rendered on demand
```

No more `ƒ Middleware` line — middleware is gone entirely. Compare to broken-state 233 KB middleware bundle.

**Localhost wire smoke (with minimal stub env to bypass DB connectivity at boot):**

| Path | Status | Body bytes | Behavior |
| --- | --- | --- | --- |
| `/register` | 200 OK | 57,508 | Renders registration form |
| `/` | 307 → `/register` | 35,428 | Auth-aware redirect works (no session → unauth path) |
| `/login` | 200 OK | 47,189 | Renders login form |
| `/legal/privacy` | 200 OK | 42,307 | Renders privacy page |

Compare to production-broken state (same routes, all `200 + 0 bytes`).

**Typecheck + build:** both clean.

### Outstanding work (not done in this session — open a phase or todo)

1. **Deploy the fix to Fly.io.** The bug is fixed in-tree; production is still serving the broken bundle until next `flyctl deploy`.
2. **Add a GET-based post-deploy smoke gate** to `.github/workflows/deploy.yml`. The current setup has no smoke gate at all; the prior `curl -I` proposal was already broken (HEAD requests can't see empty bodies and provoke `[auth][error] UnknownAction` 500s on `/api/auth/*`). Replace with a GET probe that asserts `content-length > 100` on `/`, `/register`, `/login` (and an HTTP-200 expectation on `/admin`).
3. **Decision: long-term locale strategy.** The codebase has next-intl wired for single-locale 'bg' with `localePrefix: 'never'`. Removing the middleware is fine for v1. If multiple locales are ever added, the team will need to add a `[locale]` route segment AND restore an intl middleware (Edge runtime — never with auth/DB imports).
4. **Separate Payload `getFromImportMap` warning** for `@payloadcms/next/rsc#CollectionCards` — cosmetic Payload-admin issue. Run `payload generate:importmap`. Tracked separately.
5. **Separate Payload `No email adapter provided`** warning. Tracks against members-flow / NOTIF-08 plan.
6. **Sentry warnings** about `onRouterTransitionStart` / `onRequestError` / global error boundary — separate cleanup todo.
