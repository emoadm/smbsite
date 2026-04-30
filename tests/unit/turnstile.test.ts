import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyTurnstile } from '@/lib/turnstile';

describe('AUTH-08 — Cloudflare Turnstile siteverify', () => {
  const ORIGINAL_FETCH = global.fetch;
  beforeEach(() => {
    process.env.TURNSTILE_SECRET_KEY =
      process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
  });
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
  });

  it('returns ok=true when Cloudflare reports success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch;
    const r = await verifyTurnstile('valid-token', '1.2.3.4');
    expect(r.ok).toBe(true);
  });

  it('returns ok=false with error codes on Cloudflare failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    }) as unknown as typeof fetch;
    const r = await verifyTurnstile('bad-token', '1.2.3.4');
    expect(r.ok).toBe(false);
    expect(r.errorCodes).toContain('invalid-input-response');
  });

  it('fail-closed on network error (RESEARCH line 591)', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    const r = await verifyTurnstile('any-token', '1.2.3.4');
    expect(r.ok).toBe(false);
    expect(r.errorCodes).toContain('fetch-failed');
  });

  it('rejects empty token without network call', async () => {
    const spy = vi.fn();
    global.fetch = spy as unknown as typeof fetch;
    const r = await verifyTurnstile('', '1.2.3.4');
    expect(r.ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('POSTs application/x-www-form-urlencoded to challenges.cloudflare.com siteverify', async () => {
    const spy = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    global.fetch = spy as unknown as typeof fetch;
    await verifyTurnstile('t', '5.6.7.8');
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('challenges.cloudflare.com/turnstile/v0/siteverify'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/x-www-form-urlencoded',
        }),
      }),
    );
  });
});
