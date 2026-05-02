import { getTranslations } from 'next-intl/server';
import { MainContainer } from '@/components/layout/MainContainer';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DRAFT_DATE = '2026-04-29';

export default async function PrivacyPolicyPage() {
  const tDraft = await getTranslations('legal.draft');
  const tPriv = await getTranslations('legal.privacy');

  return (
    <MainContainer width="legal">
      <h1 className="mb-2 font-display text-3xl">{tPriv('title')}</h1>
      <Alert className="mb-6">
        <AlertDescription className="text-sm text-muted-foreground">
          {tDraft('marker', { date: DRAFT_DATE })}
        </AlertDescription>
      </Alert>
      <article className="prose prose-slate max-w-none text-base" />

    </MainContainer>
  );
}
