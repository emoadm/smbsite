import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { MainContainer } from '@/components/layout/MainContainer';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { NewsletterToggleRow } from '@/components/preferences/NewsletterToggleRow';
import { PreferredChannelRadio } from '@/components/preferences/PreferredChannelRadio';
import { getCurrentTopicState } from '@/lib/newsletter/recipients';
import type { NewsletterTopic } from '@/lib/email/templates/NewsletterEmail';

// Phase 5 NOTIF-01 / NOTIF-03 / UI-SPEC §5.1 — member preferences page.
//
// Auth: inherits (frontend)/member/ layout's redirect — DO NOT call auth() here
// for redirect purposes. We DO call auth() to read the user id for the initial
// state queries; the layout has already guaranteed the session exists.

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('member.preferences');
  return { title: t('heading') };
}

const TOPICS: NewsletterTopic[] = [
  'newsletter_general',
  'newsletter_voting',
  'newsletter_reports',
  'newsletter_events',
];

export default async function PreferencesPage() {
  const t = await getTranslations('member.preferences');
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;

  const topicStates = await Promise.all(
    TOPICS.map((topic) => getCurrentTopicState(userId, topic)),
  );

  const userRows = await db
    .select({ preferred_channel: users.preferred_channel })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const initialChannel =
    (userRows[0]?.preferred_channel as 'whatsapp' | 'telegram' | 'none' | null | undefined) ??
    null;

  return (
    <MainContainer width="legal">
      <p className="text-sm uppercase tracking-wider text-secondary">{t('eyebrow')}</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-primary">
        {t('heading')}
      </h1>
      <p className="mt-4 text-base text-muted-foreground">{t('lead')}</p>

      <Card className="mt-12">
        <CardHeader>
          <CardTitle>{t('email.title')}</CardTitle>
          <CardDescription>{t('email.description')}</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {TOPICS.map((topic, i) => (
            <NewsletterToggleRow
              key={topic}
              topic={topic}
              initialGranted={topicStates[i]!}
            />
          ))}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{t('channel.title')}</CardTitle>
          <CardDescription>{t('channel.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <PreferredChannelRadio initialChannel={initialChannel} />
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{t('language.title')}</CardTitle>
          <CardDescription>{t('language.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup defaultValue="bg" disabled aria-disabled="true">
            <div className="flex items-center gap-3 py-2">
              <RadioGroupItem value="bg" id="lang-bg" />
              <Label htmlFor="lang-bg">{t('language.options.bg')}</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="mt-8 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <Link
          href="/community"
          className="text-primary underline-offset-4 hover:underline"
        >
          {t('links.community')}
        </Link>
        <span aria-hidden="true">•</span>
        <Link href="/member" className="text-primary underline-offset-4 hover:underline">
          {t('links.back')}
        </Link>
      </div>
      <Toaster />
    </MainContainer>
  );
}
