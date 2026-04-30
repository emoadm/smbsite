'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { requestOtp, type RequestOtpState } from '@/app/actions/request-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: RequestOtpState = { ok: false };

export function LoginForm() {
  const t = useTranslations('auth.login');
  const [state, action, pending] = useActionState(requestOtp, initial);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.nextHref) router.push(state.nextHref);
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-4">
      {!state.ok && state.error && (
        <Alert variant="destructive">
          <AlertDescription>{t('rateLimited')}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t('fields.email')}</Label>
        <Input
          id="email"
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
        />
        <p className="text-sm text-muted-foreground">{t('fields.emailHelp')}</p>
      </div>
      <Button
        type="submit"
        disabled={pending}
        className="bg-accent text-background hover:bg-accent/90"
      >
        {t('cta')}
      </Button>
    </form>
  );
}
