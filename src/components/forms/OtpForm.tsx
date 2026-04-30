'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useActionState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { requestOtp, type RequestOtpState } from '@/app/actions/request-otp';
import { verifyOtp, type VerifyOtpState } from '@/app/actions/verify-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const initial: VerifyOtpState = { ok: false, error: 'auth.otp.invalid' };

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
      <InputOTP
        maxLength={6}
        name="code"
        inputMode="numeric"
        pattern="\d{6}"
        autoFocus
        aria-label={t('inputAriaLabel')}
        onComplete={() => {
          // Auto-submit on 6th digit (D-01 + UI-SPEC § OTP entry)
          formRef.current?.requestSubmit();
        }}
      >
        <InputOTPGroup>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <InputOTPSlot key={i} index={i} />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <Button
        type="submit"
        disabled={pending}
        className="bg-accent text-background hover:bg-accent/90"
      >
        {t('cta')}
      </Button>
      <div className="flex flex-col gap-2 text-sm">
        <ResendButton email={email} t={t} />
        <Link href="/login" className="text-accent hover:underline">
          {t('wrongEmail')}
        </Link>
      </div>
    </form>
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
    <form action={action}>
      <input type="hidden" name="email" value={email} />
      <Button type="submit" variant="ghost" disabled={pending}>
        {t('resend')}
      </Button>
      {state && !state.ok && state.error && (
        <Alert variant="destructive">
          <AlertDescription>{t('locked')}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
