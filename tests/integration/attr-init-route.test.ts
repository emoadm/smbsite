import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

describe('ATTR-05 / D-22 / D-23 — /api/attr/init route invariants', () => {
  const src = readFileSync('src/app/api/attr/init/route.ts', 'utf8');

  it('declares Node runtime (Pitfall 3 — Edge cannot import IORedis)', () => {
    expect(src).toMatch(/export const runtime\s*=\s*'nodejs'/);
  });

  it('declares dynamic = force-dynamic (cookies + searchParams require per-request execution)', () => {
    expect(src).toMatch(/export const dynamic\s*=\s*'force-dynamic'/);
  });

  it('imports addAttributionJob from the attribution queue (D-23 enqueue here, not in middleware)', () => {
    expect(src).toMatch(/import\s*\{\s*addAttributionJob\s*\}\s*from\s*'@\/lib\/attribution\/queue'/);
  });

  it('sets attr_sid cookie with httpOnly, sameSite lax, 30-day maxAge (D-05)', () => {
    expect(src).toMatch(/cookieJar\.set\(ATTR_SID_COOKIE,/);
    expect(src).toMatch(/httpOnly:\s*true/);
    expect(src).toMatch(/sameSite:\s*'lax'/);
    // 30-day maxAge — accept either inline literal or named constant.
    expect(src).toMatch(/(maxAge:\s*60\s*\*\s*60\s*\*\s*24\s*\*\s*30|ATTR_SID_MAX_AGE_SECONDS\s*=\s*60\s*\*\s*60\s*\*\s*24\s*\*\s*30)/);
    expect(src).toMatch(/maxAge:\s*ATTR_SID_MAX_AGE_SECONDS|maxAge:\s*60\s*\*\s*60\s*\*\s*24\s*\*\s*30/);
  });

  it('returns Cache-Control: no-store (D-22 — never CDN-cached)', () => {
    expect(src).toMatch(/'Cache-Control':\s*'no-store/);
  });

  it('uses fire-and-forget pattern (.catch on addAttributionJob, no await on response path)', () => {
    expect(src).toMatch(/void addAttributionJob\(/);
    expect(src).toMatch(/\.catch\(\(\) =>/);
  });

  it('does NOT modify src/middleware.ts (D-23 — Edge middleware retains cf-ray gate role only)', () => {
    const middleware = readFileSync('src/middleware.ts', 'utf8');
    expect(middleware).not.toMatch(/attr_sid/);
    expect(middleware).not.toMatch(/addAttributionJob/);
    expect(middleware).not.toMatch(/from '@\/lib\/attribution/);
  });
});

describe('ATTR-05 — /api/attr/init route handler smoke', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('GET handler returns a Response with ok:true (functional smoke)', async () => {
    // Mock next/headers cookies + headers because Vitest is not inside a
    // Next.js request scope. The handler's logic is exercised; the cookie
    // set call lands on our mock.
    const cookieStore = new Map<string, string>();
    vi.doMock('next/headers', () => ({
      cookies: async () => ({
        get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined),
        set: (name: string, value: string) => {
          cookieStore.set(name, value);
        },
      }),
      headers: async () => new Headers({
        'cf-connecting-ip': '203.0.113.42',
        'user-agent': 'vitest-attr-init-smoke',
      }),
    }));

    const { GET } = await import('@/app/api/attr/init/route');
    const req = new Request('http://localhost/api/attr/init?utm_source=qr_letter&utm_medium=qr&path=/');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toMatch(/no-store/i);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    // Cookie was set via the mocked store
    expect(cookieStore.get('attr_sid')).toBeTruthy();
    expect(cookieStore.get('attr_sid')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
  });
});
