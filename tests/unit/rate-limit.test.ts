import { describe, it, expect } from 'vitest';

describe('AUTH-09 — Upstash rate-limit wrappers', () => {
  it.todo('registration limit: 5 attempts per IP per hour');
  it.todo('OTP issue limit: 3 attempts per email per 10 min');
  it.todo('OTP verify limit: 5 attempts per token before lockout');
  it('SCAFFOLD MISSING — wired in plan 1.06', () => {
    expect.fail('Stub: implement in src/lib/rate-limit.ts (plan 1.06)');
  });
});
