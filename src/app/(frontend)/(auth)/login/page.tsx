import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MainContainer } from '@/components/layout/MainContainer';
import { LoginForm } from '@/components/forms/LoginForm';

export default async function LoginPage() {
  const t = await getTranslations('auth.login');
  return (
    <MainContainer width="form">
      <Card>
        <CardHeader>
          <h1 className="font-display text-3xl">{t('title')}</h1>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </MainContainer>
  );
}
