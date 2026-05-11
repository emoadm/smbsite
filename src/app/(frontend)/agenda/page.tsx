import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MainContainer } from '@/components/layout/MainContainer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SectionEyebrow } from '@/components/landing/SectionEyebrow';
import { TableOfContents } from '@/components/landing/TableOfContents';

/**
 * /agenda — coalition political program. Body ships as `[ТЕКСТ ОТ КОАЛИЦИЯ]`
 * placeholder until coalition delivers (D-CoalitionContent-Agenda). The
 * <Alert> draft marker visibly surfaces the pending state per UI-SPEC §7.5.
 * Container uses `prose` width (768px) for long-form readability.
 */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('agenda');
  const tSite = await getTranslations('site');
  return {
    title: `${t('title')} — ${tSite('brandName')}`,
    description: t('draftAlert'),
    alternates: { canonical: '/agenda' },
    openGraph: {
      type: 'article',
      siteName: tSite('brandName'),
      locale: 'bg_BG',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', images: ['/og-image.png'] },
  };
}

/**
 * V1 ships with EMPTY items array — no TOC rendered. Once coalition delivers
 * the agenda body with section h2 anchors, items can be hardcoded here.
 * Empty array is safe (TOC component renders nothing when items.length === 0).
 */
const TOC_ITEMS: { id: string; label: string }[] = [];

export default async function AgendaPage() {
  const t = await getTranslations('agenda');
  const tA11y = await getTranslations('a11y');
  return (
    <MainContainer width="prose">
      <SectionEyebrow>{t('leadEyebrow')}</SectionEyebrow>
      <h1 className="mt-2 mb-6 font-display text-3xl">{t('title')}</h1>

      <Alert className="mb-8">
        <AlertDescription className="text-sm text-muted-foreground">
          {t('draftAlert')}
        </AlertDescription>
      </Alert>

      {TOC_ITEMS.length > 0 && (
        <TableOfContents items={TOC_ITEMS} label={tA11y('primaryNavLabel')} />
      )}

      <article className="prose prose-slate prose-lg max-w-none">
        <p>{t('body')}</p>
      </article>
    </MainContainer>
  );
}
