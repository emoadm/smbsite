import { getTranslations } from 'next-intl/server';
import { MainContainer } from '@/components/layout/MainContainer';

export default async function MemberPage() {
  const t = await getTranslations('member.placeholder');
  return (
    <MainContainer width="legal">
      <h1 className="mb-4 font-display text-3xl">{t('heading')}</h1>
      <p className="text-base text-muted-foreground">{t('body')}</p>
    </MainContainer>
  );
}
