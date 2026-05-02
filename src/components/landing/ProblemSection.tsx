import { getTranslations } from 'next-intl/server';
import { SectionEyebrow } from './SectionEyebrow';

/**
 * Problem section (UI-SPEC §5.2 — landing.problem keys).
 *
 * Surface bg, two-column layout on md+: left = eyebrow + h2, right = body.
 * Body copy is Claude-drafted (UI-SPEC §5.2 inline note — coalition can
 * override via `landing.problem.body`).
 *
 * The optional right-column supporting image is rendered as a text-only
 * paragraph in v1; image drop-in is post-launch under D-CoalitionHeroImage.
 */
export async function ProblemSection() {
  const t = await getTranslations('landing.problem');
  const tHero = await getTranslations('landing.hero');
  return (
    <section id="problem" className="bg-surface">
      <div className="mx-auto max-w-[1140px] px-4 py-12 md:grid md:grid-cols-2 md:gap-12 md:px-6 md:py-20">
        <div>
          <SectionEyebrow>{tHero('kicker')}</SectionEyebrow>
          <h2 className="mt-4 font-display text-2xl text-primary md:text-3xl">
            {t('heading')}
          </h2>
        </div>
        <div className="mt-6 md:mt-0">
          <p className="text-base text-muted-foreground md:text-lg">
            {t('body')}
          </p>
        </div>
      </div>
    </section>
  );
}
