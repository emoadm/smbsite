---
phase: 02-public-surface-pre-warmup
plan: 07
subsystem: infra
tags: [middleware, edge-runtime, cloudflare, cache-control, og-image, favicon, ops-runbook, pub-02]

# Dependency graph
requires:
  - phase: 02-04
    provides: per-route revalidate=3600 + generateMetadata referencing /og-image.png; Path A architectural decision (origin private,no-store; Cloudflare overrides for anonymous)
  - phase: 02-06
    provides: 02-OPS-RUNBOOK.md §1 (CookieYes config) — §2 appended without touching §1
  - phase: 01
    provides: chastnik.eu Cloudflare zone, Fly.io deployment, Sentry/Payload/next-intl wrapper chain in next.config.ts
provides:
  - Edge middleware (src/middleware.ts) — cf-ray casual-probe gate, NODE_ENV !== 'production' early-bypass for dev
  - Static-asset Cache-Control headers via next.config.ts → /fonts/* (1y immutable), /og-image.png (1d + 7d SWR)
  - Public OG image (1200x630 PNG, Sinya brand)
  - Favicon set: favicon.ico (32x32 placeholder), apple-touch-icon.png (180x180), icon.png (512x512)
  - 02-OPS-RUNBOOK.md §2 — Cloudflare cache rule operator runbook (bypass + public-pages rules, Override origin → 1h TTL, A1 verification, fallback, purge procedure, middleware verification with T-02-07-5 caveat)
affects:
  - 02-08 (Lighthouse CI staging URL — measures the cache headers shipped here)
  - 02-09 (footer cookie-settings link, favicon refresh — coalition-final assets via D-CoalitionLogoSVG / D-CoalitionFaviconSet)
  - Post-warmup hardening (D-CloudflareIPAllowlist — true network-layer auth via Fly.io internal_port allow-list)

# Tech tracking
tech-stack:
  added:
    - "Next.js 15 Edge middleware (src/middleware.ts) — first re-introduction since chastnik-eu-empty-page deletion; strict-Edge per Pattern S5"
    - "next.config.ts async headers() — first usage in this codebase"
  patterns:
    - "Pattern S5 (strict-Edge middleware) enforced — zero @/lib/auth or @/db imports; no `runtime = 'nodejs'`; matcher excludes /_next/* and /api/*"
    - "Per-Edge inlinable env: process.env.NODE_ENV checked at module top for dev bypass (Edge-safe; Next inlines at build time)"
    - "next.config.ts headers() restricted to STATIC ASSETS only (anti-pattern check: no source: '/' or '/agenda' entries — RESEARCH lines 583-585)"
    - "Operator runbook documents Cloudflare 'Override origin' Edge TTL → required because Path A makes origin emit `private, no-store` (Header calls auth())"

key-files:
  created:
    - src/middleware.ts
    - public/og-image.png
    - public/favicon.ico
    - public/apple-touch-icon.png
    - public/icon.png
    - .planning/phases/02-public-surface-pre-warmup/02-07-SUMMARY.md
  modified:
    - next.config.ts (+18 lines: async headers() block)
    - .planning/phases/02-public-surface-pre-warmup/02-OPS-RUNBOOK.md (+116 lines: §2 Cloudflare cache rule)

key-decisions:
  - "Cloudflare Edge TTL = Override origin (1h) — diverges from plan source ('Respect origin') because Path A origin emits `private, no-store`; Respect origin would refuse to cache. Documented inline in §2.3 with safety justification (bypass rule guarantees this rule only fires for cookieless visitors)."
  - "Path A satisfies PUB-02 entirely at Cloudflare layer — origin remains dynamic (Header reads auth()); no Header refactor; no middleware rewrites of Cache-Control."
  - "OG image and favicons generated as PLACEHOLDERS via sharp + SVG composition — coalition delivers final brand assets via D-CoalitionLogoSVG + D-CoalitionFaviconSet quick tasks; v1 ships functional immediately."
  - "favicon.ico is a 32x32 PNG renamed to .ico (not a true multi-resolution ICO) — sharp doesn't write ICO and ImageMagick is not available locally. Browsers tolerate PNG-as-ICO at /favicon.ico. True multi-res ICO deferred to D-CoalitionFaviconSet."
  - "Middleware ships with NODE_ENV !== 'production' early-bypass — without it, `pnpm dev` requests would 403 (no cf-ray on localhost). Inlined at Edge build time."
  - "T-02-07-5 wording: cf-ray is a soft signal, NOT a strong auth boundary. Documented inline in middleware source AND in §2.7 of runbook. True hardening tracked under D-CloudflareIPAllowlist (post-warmup)."

patterns-established:
  - "Edge middleware shape (src/middleware.ts): named export `middleware(req)`, `export const config = { matcher: [...] }`, NextResponse.next() / new NextResponse(body, { status }) for dispatch"
  - "next.config.ts headers() returns array of `{ source, headers: [{ key, value }] }`; restricted to static asset paths; HTML routes are off-limits (per-route revalidate handles them)"
  - "OPS-RUNBOOK §N pattern: A-prefixed verification gates, fallback paths cite STATE.md deferred-item IDs, every actionable step has a curl-based smoke test"

requirements-completed: [PUB-02]
requirements-partial: []

# Metrics
duration: ~12min
completed: 2026-05-03
---

# Phase 02 Plan 07: Cloudflare middleware + cache headers + favicons + OG image + OPS-RUNBOOK §2 Summary

**Strict-Edge middleware (cf-ray casual-probe gate) + static-asset cache headers + 1200x630 OG image + favicon placeholders + Cloudflare cache rule runbook §2 (Override origin → 1h TTL); resolves Phase 1 D-CloudflareWAF deferral and satisfies PUB-02 entirely at the Cloudflare layer per Path A from 02-04 SUMMARY.**

## What Shipped

- **`src/middleware.ts` (NEW, 56 lines).** Re-introduces middleware after chastnik-eu-empty-page deletion. Strict-Edge: imports only `NextResponse` + `NextRequest` types from `next/server`. Two checks: (1) `process.env.NODE_ENV !== 'production'` early-bypass for dev; (2) `cf-ray` header presence — return 403 if missing. Matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `api/`. Source comments include the Pattern S5 anti-pattern catalogue (no `@/lib/auth`, no `@/db`, no `runtime = 'nodejs'`) and the SECURITY NOTE block characterizing cf-ray as a soft signal with D-CloudflareIPAllowlist as the hardening tracker. Build emits `ƒ Middleware 99.3 kB` cleanly with zero downgrade warnings.

- **`next.config.ts` (MODIFIED, +18 lines).** Added `async headers()` to the `nextConfig` object literal — preserved the wrapper chain `withSentryConfig(withNextIntl(withPayload(nextConfig)))`. Two entries: `/fonts/:path*` → `public, max-age=31536000, immutable` (1 year fonts); `/og-image.png` → `public, max-age=86400, stale-while-revalidate=604800` (1 day + 7 day SWR). Intentionally NO entries for `/`, `/agenda`, `/faq` — the per-route `revalidate = 3600` from plan 02-04 stays the source of truth (which Cloudflare overrides anyway per §2.3 of the runbook).

- **`public/og-image.png` (NEW, 32 KB, 1200×630).** Sinya navy gradient background (#004A79 → #003A60 → #0066B3), Bulgarian title "Синя България" (Georgia bold 64px white) + subtitle "Платформа на МСП" (36px Sinya-blue #3AC7FF), small СБ mark top-left, "chastnik.eu" footer hint. Generated via sharp + SVG composition (Path A from plan).

- **`public/favicon.ico` (NEW, 597 bytes, 32×32).** Square navy background with white "СБ" mark — PNG renamed to .ico (browsers tolerate). True multi-resolution ICO deferred to coalition (`D-CoalitionFaviconSet`).

- **`public/apple-touch-icon.png` (NEW, 3.4 KB, 180×180).** iOS home-screen icon, same СБ-on-navy mark.

- **`public/icon.png` (NEW, 13.5 KB, 512×512).** Next.js metadata-route default (auto-served at `/icon`). Same mark, larger size for high-DPI displays.

- **`02-OPS-RUNBOOK.md` §2 Cloudflare cache rule (APPENDED, +116 lines).** Replaced the placeholder "(Reserved)" §2 from plan 02-06 with a full runbook. Sub-sections:
  - **§2.1 A1 verification** — operator confirms cookie-presence Cache Rules creatable on free tier.
  - **§2.2 bypass rule** — `(http.cookie contains "next-auth.session-token") or (http.cookie contains "__Secure-next-auth.session-token")` → BYPASS. Higher priority.
  - **§2.3 public-pages rule** — path matches `/`, `/agenda`, `/faq`, `/legal/*` AND no auth cookie → Eligible for cache, **Edge TTL = Override origin → 1 hour**. Inline justification: bypass rule shields authenticated users; Override origin is the only path under Path A's `private, no-store` origin emission.
  - **§2.4 fallback** — `D-CookieVaryCacheRule (resolves_phase: 6)` if A1 falsifies (free tier doesn't support cookie-presence).
  - **§2.5 verification** — curl smoke for anonymous HIT, authenticated BYPASS, /og-image.png + /fonts/* asset headers.
  - **§2.6 stale-content purge** — manual Cloudflare purge URLs; `D-CFPurgeOnDeploy` future automation tracker.
  - **§2.7 operator alert: middleware origin-IP gate verification** — through-Cloudflare 200 + cf-ray; direct-Fly 403; T-02-07-5 caveat (cf-ray is a casual-probe gate; `D-CloudflareIPAllowlist` for true hardening).
  - §1 (CookieYes config from plan 02-06) preserved untouched; §3 stub redirects to plan 02-09 for footer cookie-settings link.

## Performance

| Metric | Value |
|---|---|
| Tasks committed | 4 of 4 implementation tasks (Task 5 is `checkpoint:human-verify` — operator-runs in production) |
| Total commits | 4 (one per task; no deviation-fix commits) |
| Duration | ~12 minutes |
| Files created | 5 (middleware.ts + 4 image assets) |
| Files modified | 2 (next.config.ts + 02-OPS-RUNBOOK.md) |
| pnpm typecheck | PASS (0 errors) |
| pnpm lint | PASS (only pre-existing warnings: 2 unused-eslint-disable in `(payload)`, 1 `next/script beforeInteractive` in CookieBanner — Phase 1 carry-forward, out of scope) |
| pnpm lint:i18n | PASS (`PUB-05 OK: no hardcoded Cyrillic in src/`) |
| pnpm build | PASS (`ƒ Middleware 99.3 kB`, all 16 routes emit, no Edge-runtime-downgrade warnings) |
| Middleware size | 99.3 kB Edge bundle (Pattern S5 compliance — would balloon with auth/db imports) |

## Build / Smoke Verification

### Worktree-local (executor-runnable)

```bash
WT=/Users/emoadm/projects/SMBsite/.claude/worktrees/agent-a0887472e3c171b17
cd "$WT"
pnpm typecheck     # PASS
pnpm exec next build  # PASS — ƒ Middleware 99.3 kB, no warnings
```

Localhost smoke (port-wait poll, no fixed sleep):

```bash
cd "$WT" && pnpm exec next start --port 3088 &
TIMEOUT=60; ELAPSED=0
until curl -s http://localhost:3088/ > /dev/null 2>&1; do
  [ $ELAPSED -ge $TIMEOUT ] && exit 1
  sleep 0.5; ELAPSED=$((ELAPSED + 1))
done
curl -sI http://localhost:3088/fonts/gilroy-extrabold.woff2 | grep -iE "(cache-control|HTTP)"
# HTTP/1.1 403 Forbidden  ← middleware blocks (NODE_ENV=production for next start, no cf-ray on localhost)
# Cache-Control: public, max-age=31536000, immutable  ← headers() emits before middleware response

curl -sI http://localhost:3088/og-image.png | grep -iE "(cache-control|HTTP)"
# HTTP/1.1 403 Forbidden
# Cache-Control: public, max-age=86400, stale-while-revalidate=604800  ← OG header config wired

pkill -f "next start --port 3088"
```

The 403 confirms middleware is enforcing in production mode; the Cache-Control headers confirm `next.config.ts headers()` is registered. In real production behind Cloudflare, requests carry cf-ray → middleware passes → assets serve 200 with same Cache-Control headers attached.

### Production smoke (operator-runnable, Task 5)

After the operator runs OPS-RUNBOOK §2 and Phase 1's GH Actions deploy ships these commits:

```bash
# 1. Through Cloudflare — should succeed and cache-hit on second request
curl -sI https://chastnik.eu/ | grep -iE "(cf-cache-status|cache-control|cf-ray|HTTP)"
# Expect: HTTP/2 200; cf-ray: <id>; cache-control: public, max-age=3600 (Cloudflare-rewritten)

# 2. Direct-to-Fly origin — should be blocked
FLY_HOST=$(fly ips list -a smbsite-prod --json | jq -r '.[0].address')
curl -sI -H "Host: chastnik.eu" "http://${FLY_HOST}/"
# Expect: HTTP/1.1 403 Forbidden (middleware cf-ray gate)

# 3. Authenticated bypass
curl -sI -H "Cookie: __Secure-next-auth.session-token=DUMMY" https://chastnik.eu/ | grep -i cache-status
# Expect: cf-cache-status: BYPASS

# 4. OG image cache headers
curl -sI https://chastnik.eu/og-image.png | grep -i cache-control
# Expect: public, max-age=86400, stale-while-revalidate=604800

# 5. OG image rendering — visit https://www.opengraph.xyz/?url=https%3A%2F%2Fchastnik.eu%2F
#    Expect: Sinya navy card with "Синя България — Платформа на МСП"

# 6. Favicon — open https://chastnik.eu/ in browser
#    Expect: tab icon shows СБ on navy
```

Task 5 of the plan is a `checkpoint:human-verify` — the operator runs these in production after deploy + Cloudflare dashboard config. Not blocking this executor's completion.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Plan source `Edge TTL: Respect origin` is incompatible with Path A architecture**

- **Found during:** Task 02.07.4 drafting of OPS-RUNBOOK §2.3.
- **Issue:** The plan literal at line 423 says: `Edge TTL: Respect origin (NOT "Override TTL"). This makes Cloudflare honor the s-maxage=3600 emitted by Next.js.` But the Path A architectural decision recorded in 02-04 SUMMARY (Architectural Issue §1) confirmed the routes `/`, `/agenda`, `/faq` emit `private, no-cache, no-store, max-age=0, must-revalidate` because the parent layout's Header calls `auth()`. With Respect origin, Cloudflare would honor `private, no-store` and **refuse to cache** — producing zero edge caching, completely failing PUB-02.
- **Fix:** Replaced "Respect origin" with "Override origin → 1 hour (3600s)" in §2.3, with inline justification block explaining (a) why Path A makes Respect origin impossible, (b) why Override origin is safe under the bypass rule (it only fires for cookieless visitors), (c) the 1h TTL preserves the per-route `revalidate = 3600` intent from plan 02-04.
- **Files modified:** `.planning/phases/02-public-surface-pre-warmup/02-OPS-RUNBOOK.md` §2.3.
- **Commit:** `0638bf3` — `docs(02-07): append §2 Cloudflare cache rule to OPS-RUNBOOK`.
- **Why Rule 1:** The plan literal's "Respect origin" recommendation is correct in the abstract (matches RESEARCH Pitfall 6's anti-pattern guidance about not overriding TTL when origin emits sane Cache-Control), but contradicts the concrete architectural state surfaced by plan 02-04. Implementing the literal would have shipped a non-functional cache rule. Documenting the architectural conflict + correct fix is more valuable than blindly following plan text.

### Auth Gates

None — no auth gates encountered.

### Out-of-Scope Discoveries (logged, not fixed)

- **`@sentry/nextjs` warns about missing `onRouterTransitionStart` hook + missing `global-error.js`.** Pre-existing in Phase 1; not touched here. Out of scope per Rule scope boundary; previously logged in 02-04 SUMMARY.
- **3 pre-existing ESLint warnings** in `(payload)/layout.tsx`, `api/[...slug]/route.ts`, `CookieBanner.tsx` (`next/script beforeInteractive` outside `_document.js`). Phase 1 carry-forward. Out of scope.
- **Worktree dependency state:** the symlink-from-main-repo `node_modules` strategy failed mid-execution (main repo `node_modules` was empty/wiped). Recovered via in-worktree `pnpm install --frozen-lockfile` (5.2s). Not a deviation in code; logged for future GSD orchestrator awareness.
- **Initial Write tool path mistake:** the first Write of `src/middleware.ts` went to the main-repo path (`/Users/emoadm/projects/SMBsite/src/middleware.ts`) instead of the worktree path (`/Users/emoadm/projects/SMBsite/.claude/worktrees/agent-a0887472e3c171b17/src/middleware.ts`). Recovered by `rm`-ing the misplaced file in main repo (returned to clean tree on `main` branch) and re-Writing to the worktree path. No commit landed on `main`; verified via `git status` on main showing only `.claude/` untracked (unchanged from initial state). Not a deviation in code; the FATAL HEAD-assertion correctly caught the cwd drift before the first commit.

## Open Questions

1. **Will A1 (cookie-presence Cache Rule on Cloudflare free tier) hold for the chastnik.eu account?** The runbook §2.1 has the operator confirm this in dashboard before §2.2 / §2.3. If false, the §2.4 fallback path is documented (`D-CookieVaryCacheRule` deferral). No code changes needed either way.
2. **Will the Override origin → 1h TTL design surface stale-content complaints from coalition editors?** Per §2.6 the manual purge procedure exists. If complaints become routine, plan 02-08 (or a quick task) can wire automated purge into `.github/workflows/deploy.yml` (`D-CFPurgeOnDeploy`).
3. **When does coalition deliver final brand assets?** OG image + favicon set are placeholders. Quick-task swap is fully decoupled from this codebase change (just replace the 4 PNG files + ICO).

## Threat Flags

None — no NEW security surface introduced beyond what the threat_model rows already catalogue.

T-02-07-5 wording is fully implemented: cf-ray characterized as soft signal in middleware source comments AND in §2.7 of runbook AND in this SUMMARY. D-CloudflareIPAllowlist tracker is named in all three locations for STATE.md to pick up.

## Known Stubs

- `public/favicon.ico` is a 32×32 PNG-as-ICO placeholder, not a true multi-resolution ICO. Browsers tolerate it; coalition delivers a true multi-res favicon via `D-CoalitionFaviconSet`.
- `public/og-image.png` uses Georgia (system serif fallback), not Gilroy. Pixel-perfect Gilroy rendering is bundled-font work that requires the coalition's true logo SVG; tracked under `D-CoalitionLogoSVG`.
- These stubs are functional (browsers + crawlers render them correctly) — not blocking PUB-02. They are intentional placeholder-then-swap, fully decoupled from code.

## TDD Gate Compliance

Not applicable — plan type is not `tdd`; all 4 tasks declared `tdd="false"`.

## Self-Check: PASSED

**Files exist (verified via `ls`):**

- `src/middleware.ts` — FOUND (created, 56 lines, contains cf-ray check + matcher + NODE_ENV bypass + SECURITY NOTE block)
- `next.config.ts` — FOUND (modified, headers() block present, wrapper chain intact)
- `public/og-image.png` — FOUND (32819 bytes, 1200×630 PNG)
- `public/favicon.ico` — FOUND (597 bytes, 32×32 PNG-as-ICO)
- `public/apple-touch-icon.png` — FOUND (3418 bytes, 180×180)
- `public/icon.png` — FOUND (13514 bytes, 512×512)
- `.planning/phases/02-public-surface-pre-warmup/02-OPS-RUNBOOK.md` — MODIFIED (§1 preserved + §2 Cloudflare cache rule + §3 stub)

**Commits exist (verified via `git log --oneline bea23f0..HEAD`):**

- `e316cad` — `feat(02-07): add Edge middleware with cf-ray casual-probe gate` (Task 02.07.1)
- `f7ef794` — `feat(02-07): static-asset Cache-Control headers in next.config.ts` (Task 02.07.2)
- `13cff52` — `feat(02-07): add OG image (1200x630) and favicon set placeholders` (Task 02.07.3)
- `0638bf3` — `docs(02-07): append §2 Cloudflare cache rule to OPS-RUNBOOK` (Task 02.07.4)

**Acceptance criteria:**

- Task 02.07.1: middleware exists, cf-ray check present, matcher exclusions present, NODE_ENV bypass present, no `from '@/lib/auth'` / `from '@/db'` / `runtime = 'nodejs'` in actual code (comment-mentions of anti-patterns excluded from match), pnpm build green — PASS
- Task 02.07.2: async headers() present, /fonts/* + /og-image.png entries with correct Cache-Control values, no `/`, `/agenda`, `/faq` entries (anti-pattern check), wrapper chain intact, pnpm typecheck + build green — PASS
- Task 02.07.3: all 4 image files exist with correct sizes (og >10KB, favicon >500B, apple-touch >2KB, icon >5KB), correct dimensions (1200×630, 32×32, 180×180, 512×512) — PASS
- Task 02.07.4: §2 heading present, bypass + public-pages rule expressions present verbatim, A1 + Pitfall 6 + Pitfall 2 references present, D-CookieVaryCacheRule fallback named, §2.5 verification commands present, §2.6 purge procedure present, §1 CookieYes preserved untouched, T-02-07-5 / D-CloudflareIPAllowlist references present — PASS
- Task 02.07.5: `checkpoint:human-verify` — operator runs in production after deploy + Cloudflare dashboard config; not blocking executor.

## Notes for Plan 02-08 (Lighthouse CI staging URL)

- The static-asset Cache-Control headers shipped here (1y immutable on `/fonts/*`, 1d+SWR on `/og-image.png`) directly affect Lighthouse "Efficient cache policy" audits. Should pass with green flying colors.
- Origin HTML routes still emit `private, no-store` per Path A — this is intentional. Lighthouse may flag "no caching for HTML" warnings against the staging URL if staging doesn't sit behind Cloudflare with the §2.3 rule. Decision needed: either (a) staging gets its own Cloudflare cache rule mirroring production, or (b) Lighthouse is run against the production URL post-deploy where the rule IS active.
- Middleware cf-ray gate WILL block Lighthouse runs if Lighthouse hits the staging Fly origin directly without a cf-ray header. Mitigation: either route Lighthouse through Cloudflare (preserve cf-ray) OR Lighthouse needs to spoof a cf-ray value (acceptable for staging-only URL).

## Notes for Plan 02-09 (footer cookie-settings link)

- §3 of OPS-RUNBOOK is currently a stub redirect ("See plan 02-09…"). Plan 02-09 will append §3 with the footer link wiring details.
- Coalition-final favicon delivery (`D-CoalitionFaviconSet`) is also tracked; plan 02-09 is the obvious quick-task host for the swap if delivery happens before then.

## Orchestrator follow-ups

The orchestrator should add to STATE.md deferred items (per plan §Notes line 547):

| ops | D-CloudflareIPAllowlist — configure Fly.io internal_port allow-list to accept only Cloudflare IP ranges (true network-layer auth boundary). Currently middleware checks cf-ray as soft signal only. | resolves_phase: post-warmup-hardening | Plan 02-07 |
| docs | D-CoalitionLogoSVG — coalition delivers final logo SVG; OG image regenerated with Gilroy-bundled rendering. Tracked alongside D-CoalitionFaviconSet. | resolves_phase: post-warmup | Plan 02-07 |
| docs | D-CoalitionFaviconSet — coalition delivers true multi-resolution favicon.ico + branded touch-icons. Quick-task swap, decoupled from code. | resolves_phase: post-warmup | Plan 02-07 |
| ops | D-CookieVaryCacheRule — only if §2.1 A1 falsifies (free Cloudflare tier doesn't expose cookie-presence Cache Rules). Pay-tier upgrade or Cloudflare Worker required. | resolves_phase: 6 (conditional) | Plan 02-07 |
| ops | D-CFPurgeOnDeploy — automate Cloudflare cache purge from `.github/workflows/deploy.yml` post-deploy. | resolves_phase: 6 | Plan 02-07 |

The orchestrator should mark RESOLVED in STATE.md deferred items:

- D-CloudflareWAF (Phase 1's "Cloudflare WAF custom rule (free-plan limitation)") — resolved by `src/middleware.ts` cf-ray gate (Option 2 from RESEARCH §6).

PUB-02 should be marked complete in REQUIREMENTS.md by the orchestrator (was partial after 02-04).
