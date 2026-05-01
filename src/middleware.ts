import createIntlMiddleware from 'next-intl/middleware';
import { auth } from '@/lib/auth';
import { routing } from '@/i18n/routing';

// Node runtime: auth.ts pulls node:crypto via auth-utils (OTP HMAC) and the
// DrizzleAdapter performs DB lookups for the database-strategy session (D-02).
// Edge runtime cannot bundle either. Single-region Fly Frankfurt origin —
// Edge buys nothing here.
export const runtime = 'nodejs';

const intlMiddleware = createIntlMiddleware(routing);

type AuthRequest = Parameters<Parameters<typeof auth>[0]>[0];

export default auth((req: AuthRequest) => {
  const { nextUrl } = req;
  const session = req.auth as
    | { user?: { id?: string; emailVerified?: Date | null } }
    | null
    | undefined;

  const isMemberRoute = nextUrl.pathname.startsWith('/member');
  if (isMemberRoute) {
    if (!session?.user) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('next', nextUrl.pathname);
      return Response.redirect(loginUrl);
    }
    if (!session.user.emailVerified) {
      return Response.redirect(new URL('/auth/otp', req.url));
    }
  }
  return intlMiddleware(req as unknown as Parameters<typeof intlMiddleware>[0]);
});

export const config = {
  matcher: ['/((?!api|admin|_next/static|_next/image|favicon.ico|logo-placeholder.svg).*)'],
};
