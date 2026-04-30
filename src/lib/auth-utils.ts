import crypto from 'node:crypto';

export function generateOtpCode(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, '0');
}

export function hashOtp(code: string, identifier: string): string {
  const key = process.env.OTP_HMAC_KEY;
  if (!key) throw new Error('OTP_HMAC_KEY not configured');
  return crypto.createHmac('sha256', key).update(`${identifier}:${code}`).digest('hex');
}

export function verifyOtpHash(
  submittedCode: string,
  identifier: string,
  storedHash: string,
): boolean {
  const computed = hashOtp(submittedCode, identifier);
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function registrationOtpExpiry(): Date {
  return new Date(Date.now() + 48 * 60 * 60 * 1000);
}

export function loginOtpExpiry(): Date {
  return new Date(Date.now() + 10 * 60 * 1000);
}

export const MAX_OTP_VERIFY_ATTEMPTS = 5;
