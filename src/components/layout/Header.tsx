import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { logout } from '@/app/actions/logout';
import { Button } from '@/components/ui/button';
import { HeaderMobileNav } from '@/components/layout/HeaderMobileNav';

export async function Header() {
  const tNav = await getTranslations('nav');
  const tSite = await getTranslations('site');
  const brand = tSite('brandName');
  const session = await auth();
  const email = session?.user?.email ?? null;
  const localPart = email ? truncate(email.split('@')[0]!, 12) : null;

  // 4 public-surface nav links (Q3U-01). Same set for anon + signed-in;
  // public surfaces stay public after auth. Order is the editorial reading
  // order: programme → proposals → problems → questions.
  const links = [
    { href: '/agenda', label: tNav('agenda') },
    { href: '/predlozheniya', label: tNav('proposals') },
    { href: '/problemi', label: tNav('problems') },
    { href: '/faq', label: tNav('faq') },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
      <div className="relative mx-auto flex h-14 max-w-[1140px] items-center justify-between px-4 md:h-16 md:px-6">
        <Link
          href={email ? '/member' : '/'}
          aria-label={brand}
          className="flex items-center"
        >
          <Image
            src="/logo.svg"
            alt={brand}
            width={156}
            height={40}
            className="h-8 w-auto md:h-10"
            priority
          />
        </Link>

        {/* Desktop inline nav (>= md). Hidden on mobile; HeaderMobileNav
            ships the same hrefs in a hamburger drawer below md. */}
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label={tNav('primary')}
        >
          {links.map((link) => (
            <Button key={link.href} asChild variant="ghost" size="sm">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Mobile hamburger (< md). The drawer renders all 4 links + login
              unconditionally in the DOM so SSR + crawlers + no-JS clients
              discover the surface — open/close toggles `hidden` only. */}
          <div className="md:hidden">
            <HeaderMobileNav
              links={links}
              loginHref="/login"
              loginLabel={tNav('login')}
              menuOpenLabel={tNav('menuOpen')}
              menuCloseLabel={tNav('menuClose')}
              isAuthed={!!email}
            />
          </div>

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
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
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
