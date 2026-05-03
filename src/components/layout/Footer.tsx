import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { CookieSettingsLink } from './CookieSettingsLink';

/**
 * Phase 2 Footer (UI-SPEC §5.6) — expanded from Phase 1's compact legal-links
 * footer to a 4-column grid: Brand / Платформа / Правна информация / Канали.
 * Channels column ships with "стартират скоро" placeholder per D-10; quick
 * task swaps in WhatsApp + Telegram URLs once coalition delivers.
 *
 * The legal column also hosts the "Настройки за бисквитки" CookieSettingsLink
 * (UI-SPEC §9.2 + plan 02-09 Task 02.09.3) — reopens the CookieYes banner via
 * window.revisitCkyConsent() so users can revise consent without navigation.
 *
 * Existing branding.spec.ts assertions for legal-link rendering still pass —
 * this is a superset layout, not a breaking change.
 */
export async function Footer() {
  const t = await getTranslations('footer');
  const tSite = await getTranslations('site');
  const tCookie = await getTranslations('cookieBanner');
  const year = new Date().getFullYear();
  const brand = tSite('brandName');

  return (
    <footer className="bg-surface mt-12 border-t border-border">
      <div className="mx-auto max-w-[1140px] px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Column 1: Brand */}
          <div>
            <Link href="/" aria-label={brand} className="inline-flex items-center">
              <Image
                src="/logo-placeholder.svg"
                alt={brand}
                width={96}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">{t('tagline')}</p>
          </div>

          {/* Column 2: Платформа */}
          <nav aria-label={t('platformGroupAria')}>
            <h2 className="font-display text-base">{t('platformHeading')}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/agenda" className="text-accent hover:underline">
                  {t('agenda')}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-accent hover:underline">
                  {t('faq')}
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-accent hover:underline">
                  {t('register')}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Column 3: Правна информация */}
          <nav aria-label={t('legalGroupAria')}>
            <h2 className="font-display text-base">{t('legalHeading')}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/legal/privacy" className="text-accent hover:underline">
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="text-accent hover:underline">
                  {t('terms')}
                </Link>
              </li>
              <li>
                <a href="mailto:contact@example.invalid" className="text-accent hover:underline">
                  {t('contact')}
                </a>
              </li>
              <li>
                <CookieSettingsLink label={tCookie('settingsLink')} />
              </li>
            </ul>
          </nav>

          {/* Column 4: Канали (D-10 placeholder until coalition delivers URLs) */}
          <div>
            <h2 className="font-display text-base">{t('channelsHeading')}</h2>
            <p className="mt-3 text-sm text-muted-foreground">{t('channelsPending')}</p>
            {/*
              When coalition delivers WhatsApp + Telegram URLs, replace this
              paragraph with a <ul> of <Link> entries. Tracked under
              D-CoalitionChannels in STATE.md deferred items.
            */}
          </div>
        </div>

        <hr className="my-8 border-border" />

        <p className="text-xs text-muted-foreground">{t('copyright', { year })}</p>
      </div>
    </footer>
  );
}
