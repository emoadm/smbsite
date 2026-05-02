import { getTranslations } from 'next-intl/server';
import { ValuePropGrid } from './ValuePropGrid';

/**
 * Vision section (UI-SPEC §5.2 — landing.vision keys).
 *
 * White bg with h2 + lead paragraph + 3-card {@link ValuePropGrid}. The
 * `id="vision"` matches the hero's secondary-CTA anchor target
 * (`#vision`) so smooth-scroll from the hero lands on this section.
 */
export async function VisionSection() {
  const t = await getTranslations('landing.vision');
  return (
    <section id="vision" className="bg-background">
      <div className="mx-auto max-w-[1140px] px-4 py-12 md:px-6 md:py-20">
        <h2 className="font-display text-2xl text-primary md:text-3xl">
          {t('heading')}
        </h2>
        <p className="mt-4 max-w-[720px] text-base text-muted-foreground md:text-lg">
          {t('lead')}
        </p>
        <div className="mt-12">
          <ValuePropGrid />
        </div>
      </div>
    </section>
  );
}
