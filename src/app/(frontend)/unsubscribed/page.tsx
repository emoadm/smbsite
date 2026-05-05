import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MainContainer } from '@/components/layout/MainContainer';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Phase 5 D-14 / D-16 / NOTIF-03 / UI-SPEC §5.3 — public confirmation page.
//
// Renders 4 variants based on ?reason query param:
//   (none)              → success (token verified, 4 INSERTs done in /api/unsubscribe)
//   ?reason=expired     → success layout + Alert "Линкът е изтекъл"
//   ?reason=bad-sig     → invalid heading + login CTA
//   ?reason=malformed   → invalid heading + login CTA (same UX as bad-sig)
//
// Public — no auth required (D-14 — HMAC token IS the auth substitute).
// force-dynamic required because the variant depends on the searchParams query string.
export const dynamic = 'force-dynamic';

interface UnsubscribedPageProps {
  searchParams: Promise<{ reason?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('unsubscribe');
  return {
    title: t('success.heading'),
    robots: { index: false, follow: false },
  };
}

type Variant = 'success' | 'expired' | 'invalid';

function variantFor(reason: string | undefined): Variant {
  if (reason === 'expired') return 'expired';
  if (reason === 'bad-sig' || reason === 'malformed') return 'invalid';
  // Unknown values (including missing) → success (T-05-06-07 open-redirect guard).
  return 'success';
}

export default async function UnsubscribedPage({ searchParams }: UnsubscribedPageProps) {
  const t = await getTranslations('unsubscribe');
  const sp = await searchParams;
  const variant = variantFor(sp.reason);

  if (variant === 'invalid') {
    return (
      <MainContainer width="form">
        <div className="py-12 text-center md:py-16">
          <h1 className="font-display text-3xl font-extrabold text-primary">
            {t('invalid.heading')}
          </h1>
          <p className="mt-4 text-base text-muted-foreground">{t('invalid.body')}</p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/login?next=/member/preferences">{t('invalid.cta')}</Link>
          </Button>
          <p className="mt-6 text-sm text-muted-foreground">
            <Link href="/community" className="text-primary underline-offset-4 hover:underline">
              {t('success.communityLink')}
            </Link>
          </p>
        </div>
      </MainContainer>
    );
  }

  // success or expired — same successful-unsub heading, with optional expiry Alert.
  return (
    <MainContainer width="form">
      <div className="py-12 text-center md:py-16">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
        <h1 className="mt-4 font-display text-3xl font-extrabold text-primary">
          {t('success.heading')}
        </h1>
        <p className="mt-4 text-base text-muted-foreground">{t('success.body')}</p>
        <Button asChild size="lg" className="mt-8 w-full sm:w-auto">
          <Link href="/member/preferences">{t('success.cta')}</Link>
        </Button>
        <p className="mt-6 text-sm text-muted-foreground">
          <Link href="/community" className="text-primary underline-offset-4 hover:underline">
            {t('success.communityLink')}
          </Link>
        </p>
        {variant === 'expired' && (
          <Alert className="mt-12 text-left">
            <AlertTitle>{t('expired.alert.title')}</AlertTitle>
            <AlertDescription>{t('expired.alert.body')}</AlertDescription>
          </Alert>
        )}
      </div>
    </MainContainer>
  );
}
