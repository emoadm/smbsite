'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useActionState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { requestOtp, type RequestOtpState } from '@/app/actions/request-otp';
import { verifyOtp, type VerifyOtpState } from '@/app/actions/verify-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const initial: VerifyOtpState = { ok: false };

export function OtpForm() {
  const t = useTranslations('auth.otp');
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(verifyOtp, initial);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.nextHref) router.push(state.nextHref);
  }, [state, router]);

  return (
    <div className="flex flex-col gap-6">
      <form ref={formRef} action={action} className="flex flex-col gap-6">
        <input type="hidden" name="email" value={email} />
        <p className="text-base text-muted-foreground">
          {t('body', { email, validityMinutes: 10 })}
        </p>
        {!state.ok && state.error && (
          <Alert variant="destructive">
            <AlertDescription>
              {state.error === 'auth.otp.invalid' && t('invalid')}
              {state.error === 'auth.otp.expired' && t('expired')}
              {state.error === 'auth.otp.locked' && t('locked')}
            </AlertDescription>
          </Alert>
        )}
        {/* Plain <input> instead of input-otp library — that lib's React 19 hydration bug
            silently drops the underlying <input> element, leaving the user unable to type. */}
        <Input
          name="code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          minLength={6}
          autoComplete="one-time-code"
          autoFocus
          required
          aria-label={t('inputAriaLabel')}
          onChange={(e) => {
            // Auto-submit on 6th digit (D-01 + UI-SPEC § OTP entry).
            const v = e.currentTarget.value.replace(/\D/g, '').slice(0, 6);
            if (v !== e.currentTarget.value) e.currentTarget.value = v;
            if (v.length === 6) formRef.current?.requestSubmit();
          }}
          className="text-center font-mono text-2xl tracking-[0.5em]"
        />
        <Button
          type="submit"
          disabled={pending}
          className="bg-accent text-background hover:bg-accent/90"
        >
          {t('cta')}
        </Button>
      </form>
      {/* Resend lives OUTSIDE the verify form — nested <form> elements are invalid HTML
          and React's useActionState submission silently fails to fire on the inner form. */}
      <div className="flex flex-col gap-2 text-sm">
        <ResendButton email={email} t={t} />
        <Link href="/login" className="text-accent hover:underline">
          {t('wrongEmail')}
        </Link>
      </div>
    </div>
  );
}

/**
 * M-3 fix: the "send a new code" button re-requests an OTP via the `requestOtp` server action.
 * Goes through the same rate limiter as the original login OTP request (D-07 →
 * checkLoginOtpEmail / IP). No new server action required — reuses plan 1.07's `requestOtp`.
 */
function ResendButton({
  email,
  t,
}: {
  email: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [state, action, pending] = useActionState(requestOtp, { ok: false } as RequestOtpState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="email" value={email} />
      <Button type="submit" variant="ghost" disabled={pending}>
        {t('resend')}
      </Button>
      {state && !state.ok && state.error && (
        <Alert variant="destructive">
          <AlertDescription>{t('locked')}</AlertDescription>
        </Alert>
      )}
      {state && state.ok && (
        <p className="text-sm text-muted-foreground">{t('sent', { email })}</p>
      )}
    </form>
  );
}
