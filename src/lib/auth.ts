import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import type { Provider } from 'next-auth/providers';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, accounts, sessions, verificationTokens } from '@/db/schema/auth';
import {
  generateOtpCode,
  hashOtp,
  registrationOtpExpiry,
  loginOtpExpiry,
} from '@/lib/auth-utils';

const emailOtpProvider: Provider = {
  id: 'email',
  type: 'email',
  name: 'Email OTP',
  maxAge: 10 * 60,
  from: process.env.EMAIL_FROM_TRANSACTIONAL,
  generateVerificationToken: async () => generateOtpCode(),
  sendVerificationRequest: async () => {
    throw new Error('Email queue not wired — implement in plan 1.10 (NOTIF-08)');
  },
};

// pnpm hoists drizzle-orm with two distinct peer-resolutions
// (one with @neondatabase/serverless, one without), so the adapter sees
// nominally-different drizzle types than our schema. Runtime is identical
// — single package version. Re-evaluate when a pnpm `overrides` rule
// enforces one resolution.
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db as never, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  } as never),
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  providers: [emailOtpProvider],
  cookies: {
    sessionToken: {
      name: '__Secure-next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        (session.user as { emailVerified?: Date | null }).emailVerified =
          (user as { emailVerified?: Date | null }).emailVerified ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    verifyRequest: '/auth/otp',
    error: '/login',
  },
  secret: process.env.AUTH_SECRET,
});

export async function persistHashedOtp(
  identifier: string,
  plaintextCode: string,
  kind: 'register' | 'login',
): Promise<{ expires: Date }> {
  const expires = kind === 'register' ? registrationOtpExpiry() : loginOtpExpiry();
  const tokenHash = hashOtp(plaintextCode, identifier);

  await db.transaction(async (tx) => {
    await tx.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
    await tx.insert(verificationTokens).values({
      identifier,
      token: tokenHash,
      expires,
      kind,
      attempts: '0',
    });
  });

  return { expires };
}
