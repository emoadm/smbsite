import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from './VideoPlayer';

/**
 * Full-bleed landing-page hero (UI-SPEC §5.2 + §13.3).
 *
 * Renders the {@link VideoPlayer} slot when `videoUrl` is provided (D-03);
 * otherwise the still `/hero.jpg` placeholder via `next/image` with `priority`,
 * `fill`, and `sizes="100vw"` for LCP-class loading.
 *
 * The hero `<h1>` is the page-title element for `/` (Pattern P9 — raw `<h1>`
 * with `font-display`, NEVER shadcn `CardTitle`; carry-forward of Phase 1
 * Cause-2, commit a635faa). The hero text sits over a navy scrim
 * (`--color-hero-overlay`) in `--color-hero-text` (white) for AA contrast.
 *
 * All copy comes from `landing.hero.*` keys via next-intl; coalition swaps
 * `headline`/`subheadline` via bg.json without touching this file.
 */
export async function Hero({ videoUrl }: { videoUrl?: string } = {}) {
  const t = await getTranslations('landing.hero');
  return (
    <section className="relative w-full overflow-hidden">
      {videoUrl ? (
        <VideoPlayer src={videoUrl} />
      ) : (
        <Image
          src="/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 -z-20 object-cover"
        />
      )}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: 'var(--color-hero-overlay)' }}
        aria-hidden
      />
      <div className="mx-auto max-w-[1140px] px-4 py-16 md:px-6 md:py-24">
        <p className="text-sm uppercase tracking-wider text-secondary">
          {t('kicker')}
        </p>
        <h1 className="mt-4 font-display text-4xl text-hero-text md:text-6xl">
          {t('headline')}
        </h1>
        <p className="mt-4 max-w-[720px] text-lg text-hero-text md:text-xl">
          {t('subheadline')}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="default">
            <Link href="/register">{t('ctaPrimary')}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="#vision">{t('ctaSecondary')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
