import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { MainContainer } from '@/components/layout/MainContainer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ProposalCard } from '@/components/proposals/ProposalCard';
import { getApprovedProposals } from '@/lib/submissions/public-queries';

export const revalidate = 60; // ISR — approved proposals don't change second-by-second

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('submission.proposals');
  return { title: t('pageTitle'), description: t('pageDescription') };
}

export default async function PublicProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ strana?: string }>;
}) {
  const t = await getTranslations('submission.proposals');
  const sp = (await searchParams) ?? {};
  const page = Math.max(1, Number(sp.strana ?? 1));
  const proposals = await getApprovedProposals({ limit: 12, offset: (page - 1) * 12 });
  const session = await auth();
  const isLoggedIn = Boolean(session?.user);

  return (
    <MainContainer width="page">
      <div className="pt-12">
        <h1 className="font-display text-4xl font-extrabold text-primary">{t('pageTitle')}</h1>
        <p className="mt-2 text-muted-foreground">{t('pageDescription')}</p>
      </div>
      <Alert className="mt-8 border-l-4 border-l-primary bg-primary/5">
        <AlertDescription>{t('votingSoon')}</AlertDescription>
      </Alert>
      {proposals.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-4 text-center py-16">
          <h2 className="font-display text-3xl">{t('emptyHeading')}</h2>
          <p className="text-muted-foreground">{t('emptyBody')}</p>
          {isLoggedIn && (
            <Button asChild>
              <Link href="/member/predlozhi">{t('emptyCta')}</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 pb-16">
          {proposals.map((p) => (
            <ProposalCard key={p.id} proposal={p} isLoggedIn={isLoggedIn} />
          ))}
        </div>
      )}
    </MainContainer>
  );
}
