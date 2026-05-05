import { MessageCircle, Send, Hourglass } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { auth } from '@/lib/auth';
import { MainContainer } from '@/components/layout/MainContainer';
import { ChannelCard } from '@/components/community/ChannelCard';

// Phase 5 NOTIF-04 / NOTIF-05 / D-10 / D-11 / D-12 / UI-SPEC §5.2 — community surface.
//
// Public preview-vs-redeem:
//   - Anonymous → teaser cards + /register?next=/community CTAs (no raw URLs leak in HTML).
//   - Member with visible channels → real https://whatsapp.com/channel/... + https://t.me/... URLs.
//   - One channel invisible → real card + placeholder card.
//   - Both invisible (D-12) → single full-width placeholder.
//
// Why force-dynamic, not revalidate: coalition swaps URLs in Payload Global
// without redeploy (D-12); auth-conditional render must run per-request.

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('community');
  return { title: t('heading') };
}

interface ChannelGlobalShape {
  whatsappChannelUrl?: string | null;
  whatsappVisible?: boolean;
  telegramChannelUrl?: string | null;
  telegramVisible?: boolean;
  bgDescription?: string | null;
}

export default async function CommunityPage() {
  const t = await getTranslations('community');
  const session = await auth();
  const isMember = !!session?.user;

  const payloadInst = await getPayload({ config });
  const channels = (await payloadInst.findGlobal({
    slug: 'community-channels' as never,
  })) as ChannelGlobalShape;

  const whatsappActive =
    channels.whatsappVisible === true && !!channels.whatsappChannelUrl;
  const telegramActive =
    channels.telegramVisible === true && !!channels.telegramChannelUrl;
  const bothInvisible = !whatsappActive && !telegramActive;

  return (
    <MainContainer width="page">
      <p className="text-sm uppercase tracking-wider text-secondary">{t('eyebrow')}</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-primary md:text-4xl">
        {t('heading')}
      </h1>
      <p className="mt-4 max-w-prose text-base text-muted-foreground md:text-lg">
        {t('lead')}
      </p>

      {bothInvisible ? (
        <div className="mt-12">
          <ChannelCard
            variant="placeholder"
            icon={<Hourglass className="h-8 w-8" />}
            title={t('placeholder.title')}
            description={t('placeholder.body')}
          />
        </div>
      ) : (
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {whatsappActive ? (
            isMember ? (
              <ChannelCard
                variant="redeem"
                icon={<MessageCircle className="h-8 w-8" />}
                title={t('whatsapp.title')}
                description={t('whatsapp.description.member')}
                ctaLabel={t('whatsapp.cta.member')}
                ctaHref={channels.whatsappChannelUrl!}
                ctaExternal
              />
            ) : (
              <ChannelCard
                variant="teaser"
                icon={<MessageCircle className="h-8 w-8" />}
                title={t('whatsapp.title')}
                description={t('whatsapp.description.anonymous')}
                ctaLabel={t('whatsapp.cta.anonymous')}
                ctaHref="/register?next=/community"
              />
            )
          ) : (
            <ChannelCard
              variant="placeholder"
              icon={<MessageCircle className="h-8 w-8" />}
              title={t('whatsapp.title')}
              description={t('placeholder.body')}
            />
          )}

          {telegramActive ? (
            isMember ? (
              <ChannelCard
                variant="redeem"
                icon={<Send className="h-8 w-8" />}
                title={t('telegram.title')}
                description={t('telegram.description.member')}
                ctaLabel={t('telegram.cta.member')}
                ctaHref={channels.telegramChannelUrl!}
                ctaExternal
              />
            ) : (
              <ChannelCard
                variant="teaser"
                icon={<Send className="h-8 w-8" />}
                title={t('telegram.title')}
                description={t('telegram.description.anonymous')}
                ctaLabel={t('telegram.cta.anonymous')}
                ctaHref="/register?next=/community"
              />
            )
          ) : (
            <ChannelCard
              variant="placeholder"
              icon={<Send className="h-8 w-8" />}
              title={t('telegram.title')}
              description={t('placeholder.body')}
            />
          )}
        </div>
      )}

      <section className="mt-16 max-w-prose">
        <h2 className="font-display text-2xl font-extrabold md:text-3xl">
          {t('explainer.heading')}
        </h2>
        <p className="mt-4 whitespace-pre-line text-base text-muted-foreground">
          {t('explainer.body')}
        </p>
      </section>
    </MainContainer>
  );
}
