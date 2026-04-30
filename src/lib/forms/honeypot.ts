import crypto from 'node:crypto';

const MIN_DWELL_MS = 3_000;
const TOKEN_TTL_MS = 30 * 60 * 1000;

function key(): string {
  return process.env.AUTH_SECRET ?? 'dev-secret';
}

export function signFormStamp(now = Date.now()): string {
  const sig = crypto.createHmac('sha256', key()).update(String(now)).digest('hex').slice(0, 16);
  return `${now}.${sig}`;
}

export function checkFormStamp(
  stamp: string | null | undefined,
  now = Date.now(),
): 'ok' | 'bot' | 'expired' {
  if (!stamp || !stamp.includes('.')) return 'bot';
  const [tsRaw, sig] = stamp.split('.');
  const ts = Number(tsRaw);
  if (!Number.isFinite(ts)) return 'bot';
  const expectedSig = crypto
    .createHmac('sha256', key())
    .update(String(ts))
    .digest('hex')
    .slice(0, 16);
  if (sig !== expectedSig) return 'bot';
  const dwell = now - ts;
  if (dwell < MIN_DWELL_MS) return 'bot';
  if (dwell > TOKEN_TTL_MS) return 'expired';
  return 'ok';
}

export const HONEYPOT_FIELD = 'website';

export function isHoneypotTriggered(value: FormDataEntryValue | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}
