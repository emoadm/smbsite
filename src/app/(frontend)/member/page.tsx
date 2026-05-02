import Link from 'next/link';
import { BookOpen, HelpCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { MainContainer } from '@/components/layout/MainContainer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MemberWelcomeBanner } from '@/components/member/MemberWelcomeBanner';
import { Timeline } from '@/components/member/Timeline';

/**
 * /member — welcome page (UI-SPEC §5.5, D-09). Replaces Phase 1 placeholder.
 * Reads session via MemberWelcomeBanner (Pattern P3). NOT cached — implicitly
 * per-request because (frontend)/member/layout.tsx already enforces auth().
 *
 * DO NOT export revalidate here (UI-SPEC §13.1: /member is dynamic per-session).
 * Self-service controls deferred to Phase 6 per D-11.
 */
export default async function MemberPage() {
  const t = await getTranslations('member.welcome');
  return (
    <MainContainer width="page">
      <MemberWelcomeBanner />

      <h2 className="mt-12 font-display text-2xl text-primary md:text-3xl">
        {t('next.heading')}
      </h2>
      <Timeline />

      <div className="mt-16 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <BookOpen className="h-6 w-6 text-primary" strokeWidth={1.5} />
            <h3 className="mt-2 font-display text-xl">{t('cards.agenda.title')}</h3>
          </CardHeader>
          <CardContent>
            <p className="text-base text-muted-foreground">{t('cards.agenda.body')}</p>
            <Link
              href="/agenda"
              className="mt-4 inline-block text-primary underline-offset-4 hover:underline"
            >
              {t('cards.agenda.title')} →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <HelpCircle className="h-6 w-6 text-primary" strokeWidth={1.5} />
            <h3 className="mt-2 font-display text-xl">{t('cards.faq.title')}</h3>
          </CardHeader>
          <CardContent>
            <p className="text-base text-muted-foreground">{t('cards.faq.body')}</p>
            <Link
              href="/faq"
              className="mt-4 inline-block text-primary underline-offset-4 hover:underline"
            >
              {t('cards.faq.title')} →
            </Link>
          </CardContent>
        </Card>
      </div>
    </MainContainer>
  );
}
