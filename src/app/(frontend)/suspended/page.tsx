import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MainContainer } from '@/components/layout/MainContainer';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.suspended');
  return { title: t('pageTitle') };
}

async function logoutAction() {
  'use server';
  await signOut({ redirectTo: '/' });
}

export default async function SuspendedPage() {
  const t = await getTranslations('admin.suspended');
  return (
    <MainContainer width="form">
      <Card>
        <CardHeader>
          <h1 className="font-display text-3xl font-extrabold text-destructive">{t('pageTitle')}</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base">{t('body')}</p>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">{t('logoutLabel')}</Button>
          </form>
        </CardContent>
      </Card>
    </MainContainer>
  );
}
