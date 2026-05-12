import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MainContainer } from '@/components/layout/MainContainer';
import { ProposalForm } from '@/components/forms/ProposalForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('submission.proposal');
  return { title: t('formTitle') };
}

export default async function SubmitProposalPage() {
  const t = await getTranslations('submission.proposal');
  return (
    <>
      {/*
        Turnstile api.js loaded as raw <script> (NOT next/script) so it ships in
        initial SSR HTML and is available before React hydration. Matches the
        pattern used on /register — see src/app/(frontend)/(auth)/register/page.tsx.
      */}
      <script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        async
        defer
      />
      <MainContainer width="form">
        <Card>
          <CardHeader>
            <h1 className="font-display text-3xl font-extrabold">{t('formTitle')}</h1>
            <p className="mt-2 text-muted-foreground">{t('formDescription')}</p>
          </CardHeader>
          <CardContent>
            <ProposalForm />
          </CardContent>
        </Card>
      </MainContainer>
    </>
  );
}
