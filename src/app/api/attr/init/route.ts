// Phase 2.1 attribution init endpoint. Owns:
//   1. Setting the attr_sid first-party cookie (D-05, D-22)
//   2. Extracting UTM params, Referer, landing_path, raw IP, user-agent
//   3. Enqueuing the BullMQ attribution job (D-08, D-23 — Edge does NOT enqueue)
//
// CRITICAL — Node runtime: this route imports addAttributionJob, which
// imports BullMQ + IORedis (Pitfall 3 — Edge runtime cannot resolve `net`).
// `export const runtime = 'nodejs'` prevents Next.js 15.3's silent
// Edge-downgrade trap.
//
// CRITICAL — Cloudflare cache (D-22 / D-CookieVaryCacheRule resolution):
// Public landing pages MUST NOT have Set-Cookie in their HTML response or
// Cloudflare returns BYPASS for every request, eliminating PUB-02 caching.
// This endpoint owns the cookie set; the landing page renders Set-Cookie-free.
// Response carries Cache-Control: no-store so this endpoint itself is also
// never cached by Cloudflare.

import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { getClientIp } from '@/lib/ip';
import { addAttributionJob } from '@/lib/attribution/queue';

export const runtime = 'nodejs';
// Tell Next.js this is dynamic (not statically pre-rendered) — query params
// + cookies require per-request execution.
export const dynamic = 'force-dynamic';

const ATTR_SID_COOKIE = 'attr_sid';
const ATTR_SID_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days (D-05)

function safeString(v: string | null | undefined, max = 500): string | null {
  if (v == null) return null;
  const s = String(v).slice(0, max);
  return s.length > 0 ? s : null;
}

export async function GET(req: Request) {
  // 1. Cookie set (no-op if already present — survives the 30-day window).
  const cookieJar = await cookies();
  let attrSid = cookieJar.get(ATTR_SID_COOKIE)?.value ?? null;
  if (!attrSid) {
    attrSid = crypto.randomUUID();
    cookieJar.set(ATTR_SID_COOKIE, attrSid, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ATTR_SID_MAX_AGE_SECONDS,
    });
  }

  // 2. Extract attribution signals. All optional — visitors may arrive
  //    without any UTM params (direct nav, bookmark, etc.). Cap each at
  //    500 chars to defeat header-bomb attacks (Pitfall: UTM injection).
  const url = new URL(req.url);
  const utm_source = safeString(url.searchParams.get('utm_source'));
  const utm_medium = safeString(url.searchParams.get('utm_medium'));
  const utm_campaign = safeString(url.searchParams.get('utm_campaign'));
  const utm_term = safeString(url.searchParams.get('utm_term'));
  const utm_content = safeString(url.searchParams.get('utm_content'));
  const landing_path = safeString(url.searchParams.get('path'), 200) ?? '/';
  const h = await headers();
  const referer = safeString(h.get('referer'));
  const ua = safeString(h.get('user-agent'), 300);
  const raw_ip = getClientIp(h);

  // 3. Fire-and-forget enqueue. Catch silently so producer errors never
  //    bubble to the visitor — worker logs failures via the standard
  //    BullMQ on('failed') handler in scripts/start-worker.ts.
  void addAttributionJob({
    attr_sid: attrSid,
    raw_ip,
    ua,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    referer,
    landing_path,
    ts: new Date().toISOString(),
  }).catch(() => {
    // intentional swallow — see comment above
  });

  // 4. Return 200 with no-store. Visitor's browser stores the cookie;
  //    Cloudflare never caches this response.
  return NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
