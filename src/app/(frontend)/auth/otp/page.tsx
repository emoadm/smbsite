import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MainContainer } from '@/components/layout/MainContainer';
import { OtpForm } from '@/components/forms/OtpForm';

export default async function OtpPage() {
  const t = await getTranslations('auth.otp');
  return (
    <MainContainer width="form">
      <Card>
        <CardHeader>
          <h1 className="font-display text-3xl">{t('title')}</h1>
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
