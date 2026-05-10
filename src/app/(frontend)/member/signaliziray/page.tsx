import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { headers } from 'next/headers';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MainContainer } from '@/components/layout/MainContainer';
import { ProblemReportForm } from '@/components/forms/ProblemReportForm';
import { lookupIp } from '@/lib/geoip';
import { getClientIp } from '@/lib/ip';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('submission.problem');
  return { title: t('formTitle') };
}

export default async function SubmitProblemReportPage() {
  const t = await getTranslations('submission.problem');
  const h = await headers();
  const ip = getClientIp(h);

  // T-04-03-03: raw IP never reaches client; only the derived ISO oblast code is passed.
  let defaultOblastCode: string | null = null;
  if (ip) {
    try {
      const geo = await lookupIp(ip);
      // 'unknown' → null (no auto-fill when GeoIP can't resolve)
      defaultOblastCode = geo.oblast !== 'unknown' ? geo.oblast : null;
    } catch {
      // GeoIP may fail in dev without mmdb; fall back to no suggestion.
      defaultOblastCode = null;
    }
  }

  return (
    <>
      {/*
        Turnstile api.js loaded as raw <script> (NOT next/script) — matches
        the pattern on /register for reliable SSR inclusion.
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
            <ProblemReportForm defaultOblastCode={defaultOblastCode} />
          </CardContent>
        </Card>
      </MainContainer>
    </>
  );
}
