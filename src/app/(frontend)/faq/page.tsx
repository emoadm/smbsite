import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MainContainer } from '@/components/layout/MainContainer';
import { FAQAccordion } from '@/components/landing/FAQAccordion';

/**
 * /faq — operational FAQ only (D-04, UI-SPEC §5.4). 6 items locked.
 * Privacy/legal questions live on /legal/privacy; trust questions live on /agenda.
 * Container width="legal" (720px) — same as legal pages, sufficient for accordion.
 */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('faq');
  const tSite = await getTranslations('site');
  return {
    title: `${t('title')} — ${tSite('brandName')}`,
    description: t('metadataDescription'),
    alternates: { canonical: '/faq' },
    openGraph: {
      type: 'website',
      siteName: tSite('brandName'),
      locale: 'bg_BG',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', images: ['/og-image.png'] },
  };
}

export default async function FAQPage() {
  const t = await getTranslations('faq');
  return (
    <MainContainer width="legal">
      <h1 className="mb-6 font-display text-3xl">{t('title')}</h1>
      <p className="mb-8 text-base text-muted-foreground md:text-lg">
        {t.rich('lead', {
          privacyLink: (chunks) => (
            <Link href="/legal/privacy" className="text-primary hover:underline">
              {chunks}
            </Link>
          ),
          agendaLink: (chunks) => (
            <Link href="/agenda" className="text-primary hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
      <FAQAccordion namespace="faq" count={6} />
    </MainContainer>
  );
}
