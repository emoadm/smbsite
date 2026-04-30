import { describe, it, expect } from 'vitest';

describe('AUTH-08 — Cloudflare Turnstile server verify', () => {
  it.todo('verifyTurnstile(token) calls challenges API with TURNSTILE_SECRET_KEY');
  it.todo('rejects request when token is missing');
  it.todo('rejects request when API returns success: false');
  it('SCAFFOLD MISSING — wired in plan 1.06', () => {
    expect.fail('Stub: implement in src/lib/turnstile.ts (plan 1.06)');
  });
});
