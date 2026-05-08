import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('ATTR-05 / D-07 — verifyOtp attr_sid → user_id linkage', () => {
  const src = readFileSync('src/app/actions/verify-otp.ts', 'utf8');

  it('imports attribution_events from @/db/schema', () => {
    expect(src).toMatch(/import\s*\{[^}]*attribution_events[^}]*\}\s*from\s*'@\/db\/schema'/);
  });

  it('reads attr_sid cookie via cookieJar.get on success', () => {
    expect(src).toMatch(/cookieJar\.get\(['"]attr_sid['"]\)/);
  });

  it('UPDATEs attribution_events.user_id where attr_sid matches', () => {
    expect(src).toMatch(/db\s*\.update\(attribution_events\)/);
    expect(src).toMatch(/\.set\(\s*\{\s*user_id:\s*userId\s*\}/);
    expect(src).toMatch(/\.where\(eq\(attribution_events\.attr_sid,\s*attrSid\)\)/);
  });

  it('linkage is conditional on attrSid presence (silent skip when absent — D-07 rare-direct-registration case)', () => {
    expect(src).toMatch(/if\s*\(\s*attrSid\s*\)/);
  });

  it('linkage UPDATE runs BEFORE the session-token cookie set (correct ordering for atomicity)', () => {
    const updateIdx = src.indexOf('.update(attribution_events)');
    const sessionCookieIdx = src.indexOf("cookieJar.set('__Secure-next-auth.session-token'");
    expect(updateIdx).toBeGreaterThan(-1);
    expect(sessionCookieIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeLessThan(sessionCookieIdx);
  });

  it('preserves existing post-success behavior (sessionToken mint, navigate to /member)', () => {
    // Success now redirects server-side via next/navigation `redirect()` instead
    // of returning { ok: true, nextHref }. The previous shape left the client
    // Router Cache holding the pre-login layout segment so the Header didn't
    // re-render after OTP verify (debug session header-stale-after-login).
    expect(src).toContain('const sessionToken = crypto.randomUUID()');
    expect(src).toMatch(/import\s*\{\s*redirect\s*\}\s*from\s*'next\/navigation'/);
    expect(src).toContain("redirect('/member')");
  });
});
