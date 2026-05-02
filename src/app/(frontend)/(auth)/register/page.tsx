import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MainContainer } from '@/components/layout/MainContainer';
import { RegistrationForm } from '@/components/forms/RegistrationForm';
import { signFormStamp } from '@/lib/forms/honeypot';

export default async function RegisterPage() {
  const t = await getTranslations('auth.register');
  const formStamp = signFormStamp();
  return (
    <>
      {/*
        Loaded as raw <script> (NOT next/script) so it ships in initial SSR HTML.
        next/script's default `afterInteractive` strategy injects post-hydration,
        which races Playwright AUTH-08 (anti-abuse.spec.ts:25) — see
        .planning/debug/d-ci-app-failures.md Cause 4. This page is the ONLY route
        where the Turnstile widget is mounted; keeping the script here (not in a
        layout) preserves the AUTH-08 negative spec (anti-abuse.spec.ts:31) which
        asserts /login does NOT load the script.
      */}
      <script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        async
        defer
      />
      <MainContainer width="form">
        <Card>
          <CardHeader>
            <h1 className="font-display text-3xl">{t('title')}</h1>
          </CardHeader>
          <CardContent>
            <RegistrationForm formStamp={formStamp} />
          </CardContent>
        </Card>
      </MainContainer>
    </>
  );
}
