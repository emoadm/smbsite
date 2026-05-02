import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { FAQAccordion } from './FAQAccordion';

/**
 * Homepage FAQ-teaser section (UI-SPEC §5.2).
 *
 * Renders the first 4 of 6 `faq.items` via the shared {@link FAQAccordion}
 * component (Client Component — Radix Accordion needs interactivity), with
 * a view-all link (`landing.faqTeaser.viewAll`) to `/faq` for the full list.
 *
 * Reuses the `faq` namespace directly (not a separate namespace) so coalition
 * edits one place in bg.json.
 */
export async function FAQTeaserSection() {
  const t = await getTranslations('landing.faqTeaser');
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-[720px] px-4 py-12 md:px-6 md:py-20">
        <h2 className="font-display text-2xl text-primary md:text-3xl">
          {t('heading')}
        </h2>
        <div className="mt-8">
          <FAQAccordion namespace="faq" count={4} />
        </div>
        <div className="mt-8 text-right">
          <Button asChild variant="link" size="sm">
            <Link href="/faq">{t('viewAll')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
