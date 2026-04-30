import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
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

function asResult(r: Awaited<ReturnType<Ratelimit['limit']>>): LimitResult {
  return { success: r.success, remaining: r.remaining, reset: r.reset };
}

export async function checkRegistrationIp(ip: string): Promise<LimitResult> {
  return asResult(await registrationIp.limit(ip));
}
export async function checkRegistrationSubnet(subnet: string): Promise<LimitResult> {
  return asResult(await registrationSubnet.limit(subnet));
}
export async function checkLoginOtpEmail(email: string): Promise<LimitResult> {
  return asResult(await loginOtpEmail.limit(email.toLowerCase()));
}
export async function checkLoginOtpIp(ip: string): Promise<LimitResult> {
  return asResult(await loginOtpIp.limit(ip));
}
export async function checkOtpVerify(otpKey: string): Promise<LimitResult> {
  return asResult(await otpVerify.limit(otpKey));
}

export const RATE_LIMITS = {
  registrationIp: { limit: 3, window: '24h' },
  registrationSubnet: { limit: 5, window: '24h' },
  loginOtpEmail: { limit: 5, window: '1h' },
  loginOtpIp: { limit: 20, window: '1h' },
  otpVerify: { limit: 5, window: '15m' },
} as const;
