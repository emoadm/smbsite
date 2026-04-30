'use server';

import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { z } from '@/lib/zod-i18n';
import { db } from '@/db';
import { users } from '@/db/schema';
import { generateOtpCode, loginOtpExpiry } from '@/lib/auth-utils';
import { persistHashedOtp } from '@/lib/auth';
import { checkLoginOtpEmail, checkLoginOtpIp } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/ip';
import { addEmailJob } from '@/lib/email/queue';

const Schema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export type RequestOtpState =
  | { ok: true; nextHref: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

export async function requestOtp(
  _prev: RequestOtpState | null,
  formData: FormData,
): Promise<RequestOtpState> {
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const email = parsed.data.email;

  const h = await headers();
  const ip = getClientIp(h);
  try {
    const er = await checkLoginOtpEmail(email);
    if (!er.success) return { ok: false, error: 'auth.login.rateLimited' };
    if (ip) {
      const ir = await checkLoginOtpIp(ip);
      if (!ir.success) return { ok: false, error: 'auth.login.rateLimited' };
    }
  } catch {
    return { ok: false, error: 'auth.login.rateLimited' };
  }

  const found = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (found.length === 0) {
    return { ok: true, nextHref: `/auth/otp?email=${encodeURIComponent(email)}` };
  }

  const code = generateOtpCode();
  await persistHashedOtp(email, code, 'login');
  await addEmailJob({
    to: email,
    kind: 'login-otp',
    otpCode: code,
    expiresAt: loginOtpExpiry(),
  });

  return { ok: true, nextHref: `/auth/otp?email=${encodeURIComponent(email)}` };
}
