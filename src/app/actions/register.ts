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
// Phase 2.1 D-09 / D-10 / ATTR-06 — 8 locked Bulgarian dropdown options.
// Internal values are English snake_case; display labels live in
// messages/bg.json#auth.register.source.* (Plan 03).
const SelfReportedSourceEnum = z.enum([
  'qr_letter',
  'email_coalition',
  'sinya_site',
  'facebook',
  'linkedin',
  'referral',
  'news_media',
  'other',
]);

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
  // Phase 2.1 D-11 / ATTR-06
  self_reported_source: SelfReportedSourceEnum,
  self_reported_other: z.string().max(300).optional(),
  consent_privacy_terms: z.literal('on'),
  consent_cookies: z.literal('on'),
  consent_newsletter: z.union([z.literal('on'), z.literal('')]).optional(),
  // consent_political: dropped during ramp-up without voting. Re-add when
  // Phase 3 ships (Art. 9 legal opinion received). Quick task 260508-rx3.
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
  if (isHoneypotTriggered(formData.get(HONEYPOT_FIELD))) {
    return { ok: true, nextHref: '/auth/otp' };
  }
  const stampStatus = checkFormStamp(formData.get('formStamp')?.toString());
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
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  const tr = await verifyTurnstile(data['cf-turnstile-response'], ip ?? undefined);
  if (!tr.ok) return { ok: false, error: 'auth.register.captchaFailed' };

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);
  if (existing.length > 0) {
    return { ok: true, nextHref: '/auth/otp' };
  }

  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(users)
      .values({
        email: data.email,
        name: data.full_name,
        full_name: data.full_name,
        sector: data.sector,
        role: data.role,
        // Phase 2.1 D-11
        self_reported_source: data.self_reported_source,
        self_reported_other: data.self_reported_other ?? null,
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
      // Phase 5 D-09 — single newsletter checkbox writes 4 topic rows simultaneously.
      // Read-time backward compat for legacy 'newsletter' rows lives in
      // src/lib/newsletter/recipients.ts (latest-per-(user,kind) precedence).
      {
        user_id: userId,
        kind: 'newsletter_general',
        granted: data.consent_newsletter === 'on',
        version: POLICY_VERSION,
      },
      {
        user_id: userId,
        kind: 'newsletter_voting',
        granted: data.consent_newsletter === 'on',
        version: POLICY_VERSION,
      },
      {
        user_id: userId,
        kind: 'newsletter_reports',
        granted: data.consent_newsletter === 'on',
        version: POLICY_VERSION,
      },
      {
        user_id: userId,
        kind: 'newsletter_events',
        granted: data.consent_newsletter === 'on',
        version: POLICY_VERSION,
      },
      // political_opinion consent row dropped during ramp-up without voting.
      // Re-introduce when Phase 3 ships (Art. 9 legal opinion received). The
      // 'political_opinion' kind remains in src/db/schema/consents.ts enum so
      // re-activation is purely additive. Quick task 260508-rx3.
    ]);
  });

  const code = generateOtpCode();
  await persistHashedOtp(data.email, code, 'register');
  await addEmailJob({
    to: data.email,
    kind: 'register-otp',
    otpCode: code,
    expiresAt: registrationOtpExpiry(),
    fullName: data.full_name,
  });

  return { ok: true, nextHref: `/auth/otp?email=${encodeURIComponent(data.email)}` };
}
