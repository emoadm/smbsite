// src/middleware.ts
//
// Edge-runtime middleware (DO NOT add `export const runtime = 'nodejs'`).
// Resolves Phase 1 deferred item "Cloudflare WAF custom rule (free-plan
// limitation)" — this middleware blocks direct origin-IP access by
// requiring the cf-ray header that Cloudflare always adds to proxied
// requests.
//
// CRITICAL: this file MUST stay Edge-compatible. The previous Phase 1
// middleware was DELETED (.planning/debug/resolved/chastnik-eu-empty-page.md)
// because it imported auth() -> DrizzleAdapter -> node:crypto + pg, none of
// which run on Edge. This file imports NOTHING from @/lib/* or @/db.
//
// Anti-patterns (DO NOT introduce):
//   - import { auth } from '@/lib/auth'
//   - import { db } from '@/db'
//   - export const runtime = 'nodejs'  (silent Edge downgrade trap on next 15.3)
//
// The matcher excludes /_next/* and /api/* per chastnik-eu-empty-page.md
// observation that excluding /api prevents Auth.js HEAD-probe 500s from
// being intercepted.
//
// SECURITY NOTE: the cf-ray check is a SOFT signal, not a strong auth
// boundary. The header is NOT cryptographically authenticated; an attacker
// who discovers the Fly.io origin IP can trivially set `cf-ray: anything`
// in their direct HTTP request and bypass this middleware. The actual
// mitigation relies on (a) origin-IP obscurity (Fly.io's internal hostname
// is not publicly enumerable from chastnik.eu DNS) and (b) Fly.io's default
// network ACL which restricts inbound traffic to Fly.io's edge network.
// For production hardening, configure Fly.io's `internal_port` allow-list
// to accept only Cloudflare's documented IP ranges
// (https://www.cloudflare.com/ips/). Tracked under D-CloudflareIPAllowlist
// in STATE.md deferred items (post-warmup-hardening).

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Allow all traffic in non-production environments (dev, test, preview deploys).
  // process.env.NODE_ENV is Edge-safe — Next.js inlines it at build time.
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  // Cloudflare always adds cf-ray to proxied requests. Direct origin-IP
  // access (bypassing Cloudflare) won't have it — block as a casual-probe
  // gate. This is NOT cryptographic authentication (see SECURITY NOTE).
  if (!req.headers.get('cf-ray')) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
