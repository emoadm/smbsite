import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MainContainer } from '@/components/layout/MainContainer';
import { RegistrationForm } from '@/components/forms/RegistrationForm';
import { signFormStamp } from '@/lib/forms/honeypot';

export default async function RegisterPage() {
  const t = await getTranslations('auth.register');
  const formStamp = signFormStamp();
  return (
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
  );
}
