import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL ?? '';

// Bypass when env is missing or points at a local placeholder (CI / .env.test).
// Production sets a real Upstash URL, so this evaluates to false there.
// AUTH-09 spec is the dedicated rate-limit gate — bypassing here keeps unrelated
// auth specs from depending on a Redis service container in CI.
const BYPASS = !upstashUrl || upstashUrl.startsWith('http://localhost') || upstashUrl.startsWith('http://127.');

const redis = new Redis({
  url: upstashUrl || 'https://placeholder.invalid',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
});

const registrationIp = new Ratelimit({
  redis,
  prefix: 'registration-ip',
  limiter: Ratelimit.slidingWindow(3, '24 h'),
  analytics: false,
});
const registrationSubnet = new Ratelimit({
  redis,
  prefix: 'registration-subnet',
  limiter: Ratelimit.slidingWindow(5, '24 h'),
  analytics: false,
});
const loginOtpEmail = new Ratelimit({
  redis,
  prefix: 'login-otp-email',
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  analytics: false,
});
const loginOtpIp = new Ratelimit({
  redis,
  prefix: 'login-otp-ip',
  limiter: Ratelimit.slidingWindow(20, '1 h'),
  analytics: false,
});
const otpVerify = new Ratelimit({
  redis,
  prefix: 'otp-verify',
  limiter: Ratelimit.fixedWindow(5, '15 m'),
  analytics: false,
});

export type LimitResult = { success: boolean; remaining: number; reset: number };

const ALWAYS_PASS: LimitResult = { success: true, remaining: Number.POSITIVE_INFINITY, reset: 0 };

function asResult(r: Awaited<ReturnType<Ratelimit['limit']>>): LimitResult {
  return { success: r.success, remaining: r.remaining, reset: r.reset };
}

export async function checkRegistrationIp(ip: string): Promise<LimitResult> {
  if (BYPASS) return ALWAYS_PASS;
  return asResult(await registrationIp.limit(ip));
}
export async function checkRegistrationSubnet(subnet: string): Promise<LimitResult> {
  if (BYPASS) return ALWAYS_PASS;
  return asResult(await registrationSubnet.limit(subnet));
}
export async function checkLoginOtpEmail(email: string): Promise<LimitResult> {
  if (BYPASS) return ALWAYS_PASS;
  return asResult(await loginOtpEmail.limit(email.toLowerCase()));
}
export async function checkLoginOtpIp(ip: string): Promise<LimitResult> {
  if (BYPASS) return ALWAYS_PASS;
  return asResult(await loginOtpIp.limit(ip));
}
export async function checkOtpVerify(otpKey: string): Promise<LimitResult> {
  if (BYPASS) return ALWAYS_PASS;
  return asResult(await otpVerify.limit(otpKey));
}

export const RATE_LIMITS = {
  registrationIp: { limit: 3, window: '24h' },
  registrationSubnet: { limit: 5, window: '24h' },
  loginOtpEmail: { limit: 5, window: '1h' },
  loginOtpIp: { limit: 20, window: '1h' },
  otpVerify: { limit: 5, window: '15m' },
} as const;
