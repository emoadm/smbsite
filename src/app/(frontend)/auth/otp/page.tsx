import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MainContainer } from '@/components/layout/MainContainer';
import { OtpForm } from '@/components/forms/OtpForm';

export default async function OtpPage() {
  const t = await getTranslations('auth.otp');
  return (
    <MainContainer width="form">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-3xl">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense>
            <OtpForm />
          </Suspense>
        </CardContent>
      </Card>
    </MainContainer>
  );
}
