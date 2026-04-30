import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateOtpCode,
  hashOtp,
  verifyOtpHash,
  registrationOtpExpiry,
  loginOtpExpiry,
} from '@/lib/auth-utils';

beforeAll(() => {
  process.env.OTP_HMAC_KEY =
    process.env.OTP_HMAC_KEY || 'test-hmac-key-do-not-use-in-prod-32bytes!';
});

describe('AUTH-03 — generateOtpCode', () => {
  it('returns a 6-digit string', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });
  it('uses crypto-secure randomness (no Math.random)', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync('src/lib/auth-utils.ts', 'utf8');
    expect(src).not.toMatch(/Math\.random/);
    expect(src).toMatch(/crypto/);
  });
});

describe('AUTH-03 — hashOtp / verifyOtpHash (Pitfall K)', () => {
  it('produces a hex HMAC-SHA256 (64 chars)', () => {
    const h = hashOtp('123456', 'test@example.com');
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
  it('hash differs across identifiers (salted)', () => {
    expect(hashOtp('123456', 'a@x.com')).not.toEqual(hashOtp('123456', 'b@x.com'));
  });
  it('verifyOtpHash returns true on match, false on mismatch', () => {
    const h = hashOtp('111111', 'u@x.com');
    expect(verifyOtpHash('111111', 'u@x.com', h)).toBe(true);
    expect(verifyOtpHash('222222', 'u@x.com', h)).toBe(false);
  });
  it('verifyOtpHash is timing-safe (no naive ===)', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync('src/lib/auth-utils.ts', 'utf8');
    expect(src).toMatch(/timingSafeEqual/);
  });
});

describe('AUTH-04 / D-04 — token expiry differentiation', () => {
  it('registrationOtpExpiry is ~48h from now', () => {
    const e = registrationOtpExpiry();
    const diffMs = e.getTime() - Date.now();
    expect(diffMs).toBeGreaterThan(47 * 60 * 60 * 1000);
    expect(diffMs).toBeLessThan(49 * 60 * 60 * 1000);
  });
  it('loginOtpExpiry is ~10 min from now', () => {
    const e = loginOtpExpiry();
    const diffMs = e.getTime() - Date.now();
    expect(diffMs).toBeGreaterThan(9 * 60 * 1000);
    expect(diffMs).toBeLessThan(11 * 60 * 1000);
  });
});
