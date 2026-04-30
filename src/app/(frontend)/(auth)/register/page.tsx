import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MainContainer } from '@/components/layout/MainContainer';

export default async function RegisterPage() {
  const t = await getTranslations('auth.register');
  return (
    <MainContainer width="form">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-3xl">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* RegistrationForm wired in plan 1.09 */}
          <p className="text-base text-muted-foreground">…</p>
        </CardContent>
      </Card>
    </MainContainer>
  );
}
