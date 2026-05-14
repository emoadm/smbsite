import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  FileText,
  HelpCircle,
  Inbox,
  Send,
  Users,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { MainContainer } from '@/components/layout/MainContainer';
import { Button } from '@/components/ui/button';
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
 *
 * Quick 260514-q3u — extended with:
 *   - Actions section (Q3U-03): 2 prominent CTA buttons linking to the
 *     member submission flows (`/member/predlozhi`, `/member/signaliziray`).
 *   - 2 new cards (Q3U-04) in the existing card grid: Моите предложения
 *     (`/member/predlozheniya`) + Моите сигнали (`/member/signali`).
 *   - Grid width changed from lg:grid-cols-4 to lg:grid-cols-3 so 6 cards
 *     wrap as 2 rows of 3 on the lg breakpoint instead of 4 + 2.
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

      <section className="mt-12">
        <h2 className="font-display text-2xl text-primary md:text-3xl">
          {t('actions.heading')}
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Button
            asChild
            size="lg"
            className="h-auto justify-start whitespace-normal px-4 py-3 md:px-6 md:py-4"
          >
            <Link
              href="/member/predlozhi"
              className="flex w-full min-w-0 items-start gap-3 text-left"
            >
              <Send className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.5} />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-display text-base md:text-lg">
                  {t('actions.submitProposal.label')}
                </span>
                <span className="text-sm font-normal opacity-90">
                  {t('actions.submitProposal.description')}
                </span>
              </span>
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-auto justify-start whitespace-normal px-4 py-3 md:px-6 md:py-4"
          >
            <Link
              href="/member/signaliziray"
              className="flex w-full min-w-0 items-start gap-3 text-left"
            >
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0"
                strokeWidth={1.5}
              />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-display text-base md:text-lg">
                  {t('actions.reportProblem.label')}
                </span>
                <span className="text-sm font-normal opacity-90">
                  {t('actions.reportProblem.description')}
                </span>
              </span>
            </Link>
          </Button>
        </div>
      </section>

      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
        <Card>
          <CardHeader>
            <Bell className="h-6 w-6 text-primary" strokeWidth={1.5} />
            <h3 className="mt-2 font-display text-xl">{t('cards.preferences.title')}</h3>
          </CardHeader>
          <CardContent>
            <p className="text-base text-muted-foreground">{t('cards.preferences.body')}</p>
            <Link
              href="/member/preferences"
              className="mt-4 inline-block text-primary underline-offset-4 hover:underline"
            >
              {t('cards.preferences.title')} →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Users className="h-6 w-6 text-primary" strokeWidth={1.5} />
            <h3 className="mt-2 font-display text-xl">{t('cards.community.title')}</h3>
          </CardHeader>
          <CardContent>
            <p className="text-base text-muted-foreground">{t('cards.community.body')}</p>
            <Link
              href="/community"
              className="mt-4 inline-block text-primary underline-offset-4 hover:underline"
            >
              {t('cards.community.title')} →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <FileText className="h-6 w-6 text-primary" strokeWidth={1.5} />
            <h3 className="mt-2 font-display text-xl">{t('cards.myProposals.title')}</h3>
          </CardHeader>
          <CardContent>
            <p className="text-base text-muted-foreground">{t('cards.myProposals.body')}</p>
            <Link
              href="/member/predlozheniya"
              className="mt-4 inline-block text-primary underline-offset-4 hover:underline"
            >
              {t('cards.myProposals.title')} →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Inbox className="h-6 w-6 text-primary" strokeWidth={1.5} />
            <h3 className="mt-2 font-display text-xl">{t('cards.mySignals.title')}</h3>
          </CardHeader>
          <CardContent>
            <p className="text-base text-muted-foreground">{t('cards.mySignals.body')}</p>
            <Link
              href="/member/signali"
              className="mt-4 inline-block text-primary underline-offset-4 hover:underline"
            >
              {t('cards.mySignals.title')} →
            </Link>
          </CardContent>
        </Card>
      </div>
    </MainContainer>
  );
}
