import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

describe('AUTH-09 — rate-limit policies (D-07)', () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'http://localhost:8079';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  });

  it('exposes all 5 limiters with the D-07 limits', async () => {
    const mod = await import('@/lib/rate-limit');
    expect(typeof mod.checkRegistrationIp).toBe('function');
    expect(typeof mod.checkRegistrationSubnet).toBe('function');
    expect(typeof mod.checkLoginOtpEmail).toBe('function');
    expect(typeof mod.checkLoginOtpIp).toBe('function');
    expect(typeof mod.checkOtpVerify).toBe('function');
  });

  const src = readFileSync('src/lib/rate-limit.ts', 'utf8');

  it('source declares 3/24h for registration-ip (D-07)', () => {
    expect(src).toMatch(/registration-ip[\s\S]*slidingWindow\(3,\s*['"]24\s*h['"]\)/);
  });
  it('source declares 5/24h for registration-subnet (D-07)', () => {
    expect(src).toMatch(/registration-subnet[\s\S]*slidingWindow\(5,\s*['"]24\s*h['"]\)/);
  });
  it('source declares 5/1h for login-otp-email (D-07)', () => {
    expect(src).toMatch(/login-otp-email[\s\S]*slidingWindow\(5,\s*['"]1\s*h['"]\)/);
  });
  it('source declares 20/1h for login-otp-ip (D-07)', () => {
    expect(src).toMatch(/login-otp-ip[\s\S]*slidingWindow\(20,\s*['"]1\s*h['"]\)/);
  });
  it('source declares fixedWindow(5) for otp-verify (D-07)', () => {
    expect(src).toMatch(/otp-verify[\s\S]*fixedWindow\(5,/);
  });
});
