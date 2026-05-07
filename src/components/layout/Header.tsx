import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { logout } from '@/app/actions/logout';
import { Button } from '@/components/ui/button';

export async function Header() {
  const tNav = await getTranslations('nav');
  const tSite = await getTranslations('site');
  const brand = tSite('brandName');
  const session = await auth();
  const email = session?.user?.email ?? null;
  const localPart = email ? truncate(email.split('@')[0]!, 12) : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-[1140px] items-center justify-between px-4 md:h-16 md:px-6">
        <Link href="/" aria-label={brand} className="flex items-center">
          <Image
            src="/logo.svg"
            alt={brand}
            width={156}
            height={40}
            className="h-8 w-auto md:h-10"
            priority
          />
        </Link>
        <div className="flex items-center gap-2">
          {email ? (
            <>
              <span className="text-sm text-muted-foreground" aria-label={email}>
                {localPart}
              </span>
              <form action={logout}>
                <Button type="submit" variant="ghost" size="sm">
                  {tNav('logout')}
                </Button>
              </form>
            </>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">{tNav('login')}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
