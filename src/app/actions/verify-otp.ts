'use server';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { and, eq, gt } from 'drizzle-orm';
import { z } from '@/lib/zod-i18n';
import { db } from '@/db';
import { users, verificationTokens, sessions, attribution_events } from '@/db/schema';
import { hashOtp, verifyOtpHash, MAX_OTP_VERIFY_ATTEMPTS } from '@/lib/auth-utils';
import { checkOtpVerify } from '@/lib/rate-limit';

const Schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().regex(/^\d{6}$/),
});

// Success now redirects server-side via next/navigation `redirect()`; the action
// only returns state on failure. The previous shape (returning `nextHref` and
// soft-navigating from a useEffect) left the client Router Cache holding the
// pre-login layout segment, so the Header re-rendered as anonymous until a
// hard refresh. `redirect()` from a Server Action triggers a fresh navigation
// that re-fetches the layout with the just-set session cookie.
export type VerifyOtpState =
  | { ok: false; error?: 'auth.otp.invalid' | 'auth.otp.expired' | 'auth.otp.locked' };

export async function verifyOtp(
  _prev: VerifyOtpState | null,
  formData: FormData,
): Promise<VerifyOtpState> {
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: 'auth.otp.invalid' };
  const { email, code } = parsed.data;

  const submittedHash = hashOtp(code, email);
  try {
    const r = await checkOtpVerify(`${email}:${submittedHash}`);
    if (!r.success) return { ok: false, error: 'auth.otp.locked' };
  } catch {
    return { ok: false, error: 'auth.otp.locked' };
  }

  const now = new Date();
  const candidates = await db
    .select()
    .from(verificationTokens)
    .where(and(eq(verificationTokens.identifier, email), gt(verificationTokens.expires, now)));
  if (candidates.length === 0) return { ok: false, error: 'auth.otp.expired' };

  const match = candidates.find((t) => verifyOtpHash(code, email, t.token));
  if (!match) {
    const latest = candidates.sort((a, b) => +b.expires - +a.expires)[0]!;
    const nextAttempts = Number(latest.attempts ?? '0') + 1;
    if (nextAttempts >= MAX_OTP_VERIFY_ATTEMPTS) {
      await db
        .delete(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, email),
            eq(verificationTokens.token, latest.token),
          ),
        );
      return { ok: false, error: 'auth.otp.locked' };
    }
    await db
      .update(verificationTokens)
      .set({ attempts: String(nextAttempts) })
      .where(
        and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.token, latest.token),
        ),
      );
    return { ok: false, error: 'auth.otp.invalid' };
  }

  await db.transaction(async (tx) => {
    await tx.delete(verificationTokens).where(eq(verificationTokens.identifier, email));
    await tx
      .update(users)
      .set({ emailVerified: now, email_verified_at: now })
      .where(eq(users.email, email));
  });

  // H-3: mint a database session row + cookie directly. The Auth.js email
  // provider's signIn helper would re-trigger its own OTP loop (it doesn't
  // know we just consumed the code via our HMAC pipeline) and conflict.
  const sessionToken = crypto.randomUUID();
  const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const userRow = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const userId = userRow[0]!.id;
  await db.insert(sessions).values({ sessionToken, userId, expires: sessionExpires });

  const cookieJar = await cookies();

  // Phase 2.1 D-07 / ATTR-05: link the anonymous attribution session to the
  // now-confirmed user. The /api/attr/init endpoint set attr_sid on the
  // visitor's first landing-page hit; here we attach it to user_id so the
  // dashboard can join attribution_events ↔ users by user_id.
  // Silent on miss: (a) visitor may have registered without ever hitting the
  // landing page first (direct registration link), in which case no attr_sid
  // cookie exists; (b) worker may not yet have INSERTed the row (eventual
  // consistency — the attribution job is fire-and-forget). Both cases are
  // acceptable; the user simply has no attribution row linked.
  const attrSid = cookieJar.get('attr_sid')?.value ?? null;
  if (attrSid) {
    await db
      .update(attribution_events)
      .set({ user_id: userId })
      .where(eq(attribution_events.attr_sid, attrSid));
  }

  cookieJar.set('__Secure-next-auth.session-token', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    expires: sessionExpires,
  });

  // Server-side redirect: throws NEXT_REDIRECT, never returns. The Next.js
  // client treats redirects from Server Actions as a full re-fetch (not a
  // cache-reusing soft nav), so the root layout's Header re-renders with the
  // just-set session cookie. revalidatePath('/', 'layout') was insufficient
  // here because the client Router Cache reused the cached layout segment
  // across the /auth/otp → /member transition (debug session
  // header-stale-after-login, evidence: new tab to /member showed correct
  // Header while the soft nav after OTP did not).
  redirect('/member');
}
