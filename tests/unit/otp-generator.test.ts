import { describe, it, expect } from 'vitest';

describe('AUTH-03 — OTP generator + HMAC hashing', () => {
  it.todo('generateOtp() produces 6-digit numeric string');
  it.todo('hashOtp(code, key) is deterministic and uses HMAC-SHA256');
  it.todo('verifyOtp(code, hash, key) returns true on match, false on mismatch');
  it.todo('expired OTP is rejected (10-minute window)');
  it('SCAFFOLD MISSING — wired in plan 1.05', () => {
    expect.fail('Stub: implement in src/lib/auth-utils.ts (plan 1.05)');
  });
});
