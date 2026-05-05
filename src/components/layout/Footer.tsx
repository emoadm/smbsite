import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { CookieSettingsLink } from './CookieSettingsLink';

/**
 * Phase 2 Footer (UI-SPEC §5.6) — expanded from Phase 1's compact legal-links
 * footer to a 4-column grid: Brand / Платформа / Правна информация / Канали.
 *
 * Phase 5 (D-10 / D-11 / D-12 / UI-SPEC §5.2.4) — Column 4 reads the
 * CommunityChannels Payload Global + auth() session and renders conditional
 * links. Anonymous visitors see /community fallback links; members see real
 * external WhatsApp/Telegram URLs. The `channelsPending` translation key is
 * preserved as the both-channels-invisible fallback (D-12 — operator can
 * temporarily hide both channels without a redeploy).
 *
 * The legal column also hosts the "Настройки за бисквитки" CookieSettingsLink
 * (UI-SPEC §9.2) — reopens the CookieYes banner via
 * window.revisitCkyConsent() so users can revise consent without navigation.
 *
 * Existing branding.spec.ts assertions for legal-link rendering still pass —
 * this is a superset layout, not a breaking change.
 */
export async function Footer() {
  const t = await getTranslations('footer');
  const tSite = await getTranslations('site');
  const tCookie = await getTranslations('cookieBanner');
  const tCommunity = await getTranslations('community');
  const year = new Date().getFullYear();
  const brand = tSite('brandName');

  // Phase 5 D-10 — read CommunityChannels Global + auth state for Column 4.
  // Resilience: any failure (table missing, Payload boot error, DB outage)
  // falls back to the both-channels-invisible branch and renders the
  // `channelsPending` copy. Without this guard a Payload error in the
  // Global lookup takes down every (frontend) page (incident: deploy of
  // commit 3b4df52 — community_channels table not yet DDL'd in prod).
  const session = await auth();
  const isMember = !!session?.user;

  type Channels = {
    whatsappChannelUrl?: string | null;
    whatsappVisible?: boolean;
    telegramChannelUrl?: string | null;
    telegramVisible?: boolean;
  };
  let channels: Channels = {};
  try {
    const { getPayload } = await import('payload');
    const config = (await import('@/payload.config')).default;
    const payloadInst = await getPayload({ config });
    channels = (await payloadInst.findGlobal({
      slug: 'community-channels' as never,
    })) as Channels;
  } catch (err) {
    logger.error(
      { err, component: 'Footer', global: 'community-channels' },
      'community-channels lookup failed; rendering channelsPending fallback',
    );
  }
  const whatsappActive =
    channels.whatsappVisible === true && !!channels.whatsappChannelUrl;
  const telegramActive =
    channels.telegramVisible === true && !!channels.telegramChannelUrl;

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
                <a
                  href="mailto:contact@example.invalid"
                  className="text-accent hover:underline"
                >
                  {t('contact')}
                </a>
              </li>
              <li>
                <CookieSettingsLink label={tCookie('settingsLink')} />
              </li>
            </ul>
          </nav>

          {/* Column 4: Канали — Phase 5 D-10 / D-11 / D-12 conditional links */}
          <div>
            <h2 className="font-display text-base">{t('channelsHeading')}</h2>
            {!whatsappActive && !telegramActive ? (
              <p className="mt-3 text-sm text-muted-foreground">{t('channelsPending')}</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {whatsappActive ? (
                  <li>
                    {isMember ? (
                      <a
                        href={channels.whatsappChannelUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        {tCommunity('whatsapp.title')}
                      </a>
                    ) : (
                      <Link href="/community" className="text-accent hover:underline">
                        {tCommunity('whatsapp.title')}
                      </Link>
                    )}
                  </li>
                ) : null}
                {telegramActive ? (
                  <li>
                    {isMember ? (
                      <a
                        href={channels.telegramChannelUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        {tCommunity('telegram.title')}
                      </a>
                    ) : (
                      <Link href="/community" className="text-accent hover:underline">
                        {tCommunity('telegram.title')}
                      </Link>
                    )}
                  </li>
                ) : null}
              </ul>
            )}
          </div>
        </div>

        <hr className="my-8 border-border" />

        <p className="text-xs text-muted-foreground">{t('copyright', { year })}</p>
      </div>
    </footer>
  );
}
