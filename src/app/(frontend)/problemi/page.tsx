import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { MainContainer } from '@/components/layout/MainContainer';
import { Button } from '@/components/ui/button';
import { OblastMap } from '@/components/problems/OblastMap';
import { OblastBreakdownTable } from '@/components/problems/OblastBreakdownTable';
import {
  getOblastProblemAggregates,
  getNationalProblemCount,
  getOblastTopTopics,
} from '@/lib/submissions/public-queries';

export const revalidate = 1800; // align with unstable_cache TTL

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('problem.heatmap');
  return { title: t('pageTitle'), description: t('pageDescription') };
}

export default async function PublicProblemsPage() {
  const t = await getTranslations('problem.heatmap');
  const aggregates = await getOblastProblemAggregates();
  const nationalCount = await getNationalProblemCount();

  // Build breakdown rows with per-oblast top topic
  const breakdownRows = await Promise.all(
    aggregates.map(async (r) => {
      const top = await getOblastTopTopics(r.oblast);
      return { oblast: r.oblast, count: r.count, topTopic: top?.topic ?? null };
    }),
  );

  const nationalTop = nationalCount ? await getOblastTopTopics('national') : null;
  const nationalRow = nationalCount
    ? { count: nationalCount.count, topTopic: nationalTop?.topic ?? null }
    : null;

  const isEmpty = aggregates.length === 0 && nationalCount === null;
  const session = await auth();
  const isLoggedIn = Boolean(session?.user);

  return (
    <MainContainer width="page">
      <div className="pt-12 pb-4">
        <h1 className="font-display text-4xl font-extrabold text-primary">{t('pageTitle')}</h1>
        <p className="mt-2 text-muted-foreground">{t('pageDescription')}</p>
      </div>
      {isEmpty ? (
        <div className="mt-12 flex flex-col items-center gap-4 text-center py-16">
          <p className="text-muted-foreground max-w-prose">{t('emptyBody')}</p>
          {isLoggedIn && (
            <Button asChild>
              <Link href="/member/signaliziray">{t('emptyCta')}</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px] pb-16">
          <div>
            <OblastMap aggregates={aggregates} />
          </div>
          <div>
            <OblastBreakdownTable rows={breakdownRows} nationalRow={nationalRow} />
          </div>
        </div>
      )}
    </MainContainer>
  );
}
