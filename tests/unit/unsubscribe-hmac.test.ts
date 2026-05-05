import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';

// Test secret — set BEFORE any import of the SUT so SECRET() picks it up.
const ORIGINAL_SECRET = process.env.UNSUBSCRIBE_HMAC_SECRET;
beforeAll(() => {
  process.env.UNSUBSCRIBE_HMAC_SECRET = 'test-secret-32bytes-or-longer-for-vitest-only';
});
afterAll(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.UNSUBSCRIBE_HMAC_SECRET;
  } else {
    process.env.UNSUBSCRIBE_HMAC_SECRET = ORIGINAL_SECRET;
  }
});

describe('Phase 5 D-16 — HMAC unsubscribe token', () => {
  it('signs and verifies a round-trip token', async () => {
    const { signUnsubToken, verifyUnsubToken } = await import('@/lib/unsubscribe/hmac');
    const token = signUnsubToken('uid-abc');
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    const result = verifyUnsubToken(token);
    expect(result).toEqual({ ok: true, uid: 'uid-abc' });
  });

  it('returns malformed for non-string input', async () => {
    const { verifyUnsubToken } = await import('@/lib/unsubscribe/hmac');
    // @ts-expect-error — testing runtime defense
    expect(verifyUnsubToken(undefined)).toEqual({ ok: false, reason: 'malformed' });
    // @ts-expect-error
    expect(verifyUnsubToken(null)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('returns malformed for token with no period', async () => {
    const { verifyUnsubToken } = await import('@/lib/unsubscribe/hmac');
    expect(verifyUnsubToken('garbage')).toEqual({ ok: false, reason: 'malformed' });
  });

  it('returns malformed for token with too many periods (3 segments)', async () => {
    const { verifyUnsubToken } = await import('@/lib/unsubscribe/hmac');
    expect(verifyUnsubToken('a.b.c')).toEqual({ ok: false, reason: 'malformed' });
  });

  it('returns malformed for empty body or sig', async () => {
    const { verifyUnsubToken } = await import('@/lib/unsubscribe/hmac');
    expect(verifyUnsubToken('.sig')).toEqual({ ok: false, reason: 'malformed' });
    expect(verifyUnsubToken('body.')).toEqual({ ok: false, reason: 'malformed' });
  });

  it('returns bad-sig when signature is tampered (replaces middle of sig)', async () => {
    // Replace a chunk in the middle of the sig with deterministic non-equal
    // characters. Single-char flips at the boundary can land in padding bits
    // and decode to the same Buffer — causing intermittent "still valid" false
    // positives (#flaky). Replacing 5 contiguous characters guarantees a real
    // byte difference after base64url decode.
    const { signUnsubToken, verifyUnsubToken } = await import('@/lib/unsubscribe/hmac');
    const token = signUnsubToken('uid-xyz');
    const dotIdx = token.indexOf('.');
    expect(dotIdx).toBeGreaterThan(0);
    const sig = token.slice(dotIdx + 1);
    expect(sig.length).toBeGreaterThan(20);
    // Inject a fixed non-base64url-equivalent run at position 5..10 of the sig.
    // 'AAAAA' is not byte-equivalent to any random 5-char base64url window.
    const tamperedSig = sig.slice(0, 5) + 'AAAAA' + sig.slice(10);
    const flipped = `${token.slice(0, dotIdx + 1)}${tamperedSig}`;
    const result = verifyUnsubToken(flipped);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(['bad-sig', 'malformed']).toContain(result.reason);
  });

  it('returns bad-sig when sig is shorter/longer than expected', async () => {
    const { signUnsubToken, verifyUnsubToken } = await import('@/lib/unsubscribe/hmac');
    const token = signUnsubToken('uid-zzz');
    const [body] = token.split('.');
    expect(verifyUnsubToken(`${body}.short`)).toEqual({ ok: false, reason: 'bad-sig' });
  });

  it('returns expired for token with iat older than 90 days', async () => {
    const { verifyUnsubToken } = await import('@/lib/unsubscribe/hmac');
    const { createHmac } = await import('node:crypto');
    const expired = { uid: 'uid-old', iat: Date.now() - 91 * 24 * 3600 * 1000 };
    const body = Buffer.from(JSON.stringify(expired)).toString('base64url');
    const sig = createHmac('sha256', process.env.UNSUBSCRIBE_HMAC_SECRET!)
      .update(body).digest('base64url');
    const token = `${body}.${sig}`;
    expect(verifyUnsubToken(token)).toEqual({ ok: false, reason: 'expired' });
  });

  it('accepts token with iat just under 90 days (89 days)', async () => {
    const { verifyUnsubToken } = await import('@/lib/unsubscribe/hmac');
    const { createHmac } = await import('node:crypto');
    const fresh = { uid: 'uid-fresh', iat: Date.now() - 89 * 24 * 3600 * 1000 };
    const body = Buffer.from(JSON.stringify(fresh)).toString('base64url');
    const sig = createHmac('sha256', process.env.UNSUBSCRIBE_HMAC_SECRET!)
      .update(body).digest('base64url');
    expect(verifyUnsubToken(`${body}.${sig}`)).toEqual({ ok: true, uid: 'uid-fresh' });
  });

  it('rejects payload with missing uid or iat', async () => {
    const { verifyUnsubToken } = await import('@/lib/unsubscribe/hmac');
    const { createHmac } = await import('node:crypto');
    const bad = Buffer.from(JSON.stringify({ uid: 'x' })).toString('base64url');
    const sig = createHmac('sha256', process.env.UNSUBSCRIBE_HMAC_SECRET!)
      .update(bad).digest('base64url');
    expect(verifyUnsubToken(`${bad}.${sig}`)).toEqual({ ok: false, reason: 'malformed' });
  });
});

describe('Phase 5 D-16 — implementation lock-ins (RESEARCH Pitfall 8 + Anti-Pattern: no JWT lib)', () => {
  it('package.json has NO jsonwebtoken or jose dependency', () => {
    const pkg = readFileSync('package.json', 'utf8');
    expect(pkg).not.toMatch(/"jsonwebtoken"\s*:/);
    expect(pkg).not.toMatch(/"jose"\s*:/);
  });

  it('src/lib/unsubscribe/hmac.ts does not import jose or jsonwebtoken', () => {
    const src = readFileSync('src/lib/unsubscribe/hmac.ts', 'utf8');
    expect(src).not.toMatch(/from\s+['"]jsonwebtoken['"]/);
    expect(src).not.toMatch(/from\s+['"]jose['"]/);
  });

  it('uses node:crypto.timingSafeEqual (not ===) for signature compare', () => {
    const src = readFileSync('src/lib/unsubscribe/hmac.ts', 'utf8');
    expect(src).toContain('timingSafeEqual');
    expect(src).toContain("from 'node:crypto'");
  });

  it('reads UNSUBSCRIBE_HMAC_SECRET inside a getter (lazy — Pitfall 8)', () => {
    const src = readFileSync('src/lib/unsubscribe/hmac.ts', 'utf8');
    // SECRET() must be a function, not a top-level const = process.env.X
    expect(src).toMatch(/function\s+SECRET\(\)/);
    // The literal string 'UNSUBSCRIBE_HMAC_SECRET' must appear ONLY inside the function body,
    // not as a top-level destructure or const assignment.
    const beforeSecretFn = src.split('function SECRET()')[0];
    expect(beforeSecretFn).not.toMatch(/process\.env\.UNSUBSCRIBE_HMAC_SECRET/);
  });
});
