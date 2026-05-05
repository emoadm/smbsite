import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Phase 5 D-16 — One-click unsubscribe HMAC token.
 *
 * Format: base64url(JSON({uid, iat})).base64url(sig)
 *   - sig = HMAC-SHA256(body, UNSUBSCRIBE_HMAC_SECRET)
 *   - 90-day TTL enforced via iat
 *
 * Why no JWT? Fixed format + fixed algorithm = no `alg:none` confusion attack
 * surface (RESEARCH §Anti-Patterns + Sources / aquilax.ai/blog/jwt-algorithm-confusion).
 *
 * Why lazy SECRET()? RESEARCH §Pitfall 8 — module-eval-time env-var bug from
 * Phase 02.1. Build must not fail when secret is unset; only first sign/verify call.
 */

const TTL_MS = 90 * 24 * 3600 * 1000;

interface UnsubPayload {
  uid: string;
  iat: number; // milliseconds since epoch (Date.now())
}

function SECRET(): string {
  const s = process.env.UNSUBSCRIBE_HMAC_SECRET;
  if (!s) throw new Error('UNSUBSCRIBE_HMAC_SECRET not set');
  return s;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export function signUnsubToken(uid: string): string {
  const payload: UnsubPayload = { uid, iat: Date.now() };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', SECRET()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export type UnsubVerifyResult =
  | { ok: true; uid: string }
  | { ok: false; reason: 'malformed' | 'bad-sig' | 'expired' };

export function verifyUnsubToken(token: string): UnsubVerifyResult {
  if (typeof token !== 'string') return { ok: false, reason: 'malformed' };
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed' };
  const [body, sig] = parts;
  if (!body || !sig) return { ok: false, reason: 'malformed' };

  const expected = createHmac('sha256', SECRET()).update(body).digest('base64url');
  const a = Buffer.from(sig, 'base64url');
  const b = Buffer.from(expected, 'base64url');
  // length check BEFORE timingSafeEqual — timingSafeEqual throws RangeError on mismatched lengths
  if (a.length === 0 || a.length !== b.length) return { ok: false, reason: 'bad-sig' };
  if (!timingSafeEqual(a, b)) return { ok: false, reason: 'bad-sig' };

  let payload: UnsubPayload;
  try {
    const decoded = Buffer.from(body, 'base64url').toString('utf8');
    payload = JSON.parse(decoded);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof payload.uid !== 'string' || typeof payload.iat !== 'number') {
    return { ok: false, reason: 'malformed' };
  }
  if (Date.now() - payload.iat > TTL_MS) return { ok: false, reason: 'expired' };
  return { ok: true, uid: payload.uid };
}
