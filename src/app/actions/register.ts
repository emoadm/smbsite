'use server';

import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { z } from '@/lib/zod-i18n';
import { db } from '@/db';
import { users, consents } from '@/db/schema';
import { generateOtpCode, registrationOtpExpiry } from '@/lib/auth-utils';
import { persistHashedOtp } from '@/lib/auth';
import { verifyTurnstile } from '@/lib/turnstile';
import { isDisposable } from '@/lib/disposable-email';
import { checkRegistrationIp, checkRegistrationSubnet } from '@/lib/rate-limit';
import { getClientIp, getSubnet } from '@/lib/ip';
import { addEmailJob } from '@/lib/email/queue';
import { checkFormStamp, isHoneypotTriggered, HONEYPOT_FIELD } from '@/lib/forms/honeypot';

const SectorEnum = z.enum(['it', 'trade', 'production', 'services', 'other']);
const RoleEnum = z.enum(['owner', 'manager', 'employee', 'other']);

const RegistrationSchema = z.object({
  full_name: z.string().min(2).max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .refine((e) => !isDisposable(e), { message: 'auth.register.invalidEmail' }),
  sector: SectorEnum,
  role: RoleEnum,
  consent_privacy_terms: z.literal('on'),
  consent_cookies: z.literal('on'),
  consent_newsletter: z.union([z.literal('on'), z.literal('')]).optional(),
  consent_political: z.union([z.literal('on'), z.literal('')]).optional(),
  'cf-turnstile-response': z.string().min(1),
  formStamp: z.string().min(1),
});

export type ActionState =
  | { ok: true; nextHref: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

const POLICY_VERSION = '2026-04-29';

export async function register(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    return await registerInner(_prevState, formData);
  } catch (err) {
    console.error('[register-action] uncaught', err);
    throw err;
  }
}

async function registerInner(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  console.error('[register-action] enter');
  if (isHoneypotTriggered(formData.get(HONEYPOT_FIELD))) {
    return { ok: true, nextHref: '/auth/otp' };
  }
  const stampStatus = checkFormStamp(formData.get('formStamp')?.toString());
  console.error('[register-action] stampStatus', stampStatus);
  if (stampStatus !== 'ok') return { ok: true, nextHref: '/auth/otp' };

  const h = await headers();
  const ip = getClientIp(h);
  if (ip) {
    try {
      const ipR = await checkRegistrationIp(ip);
      if (!ipR.success) return { ok: false, error: 'auth.register.rateLimited' };
      const subR = await checkRegistrationSubnet(getSubnet(ip));
      if (!subR.success) return { ok: false, error: 'auth.register.rateLimited' };
    } catch {
      return { ok: false, error: 'auth.register.rateLimited' };
    }
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = RegistrationSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('[register-action] schema parse failed', parsed.error.flatten().fieldErrors);
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  console.error('[register-action] schema ok, calling verifyTurnstile');

  const tr = await verifyTurnstile(data['cf-turnstile-response'], ip ?? undefined);
  if (!tr.ok) {
    console.error('[register-action] turnstile fail', tr);
    return { ok: false, error: 'auth.register.captchaFailed' };
  }
  console.error('[register-action] turnstile ok, calling db.select');

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);
  if (existing.length > 0) {
    return { ok: true, nextHref: '/auth/otp' };
  }

  console.error('[register-action] db.select ok, beginning insert transaction');
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(users)
      .values({
        email: data.email,
        name: data.full_name,
        full_name: data.full_name,
        sector: data.sector,
        role: data.role,
      })
      .returning({ id: users.id });
    const userId = inserted[0]!.id;
    await tx.insert(consents).values([
      {
        user_id: userId,
        kind: 'privacy_terms',
        granted: true,
        version: POLICY_VERSION,
      },
      { user_id: userId, kind: 'cookies', granted: true, version: POLICY_VERSION },
      {
        user_id: userId,
        kind: 'newsletter',
        granted: data.consent_newsletter === 'on',
        version: POLICY_VERSION,
      },
      {
        user_id: userId,
        kind: 'political_opinion',
        granted: data.consent_political === 'on',
        version: POLICY_VERSION,
      },
    ]);
  });

  console.error('[register-action] insert tx done, calling persistHashedOtp');
  const code = generateOtpCode();
  await persistHashedOtp(data.email, code, 'register');
  console.error('[register-action] persistHashedOtp done, calling addEmailJob');
  await addEmailJob({
    to: data.email,
    kind: 'register-otp',
    otpCode: code,
    expiresAt: registrationOtpExpiry(),
    fullName: data.full_name,
  });

  console.error('[register-action] addEmailJob done, returning ok:true');
  return { ok: true, nextHref: `/auth/otp?email=${encodeURIComponent(data.email)}` };
}
