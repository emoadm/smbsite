import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';

/**
 * Centered CTA block on surface bg (UI-SPEC §5.2 cta section).
 *
 * Renders on `/` between the vision and FAQ-teaser sections; reusable on
 * `/agenda` bottom (deferred). Composes `<Button asChild><Link>` per
 * Pattern P6 — the canonical CTA shape in this codebase.
 */
export async function CTASection() {
  const t = await getTranslations('landing.cta');
  return (
    <section id="cta" className="bg-surface">
      <div className="mx-auto max-w-[1140px] px-4 py-12 text-center md:px-6 md:py-20">
        <h2 className="font-display text-3xl text-primary md:text-4xl">
          {t('heading')}
        </h2>
        <p className="mx-auto mt-4 max-w-[640px] text-base text-muted-foreground md:text-lg">
          {t('body')}
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/register">{t('button')}</Link>
        </Button>
      </div>
    </section>
  );
}
