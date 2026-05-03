'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { register, type ActionState } from '@/app/actions/register';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TurnstileWidget } from './TurnstileWidget';

const initialState: ActionState = { ok: false };

export function RegistrationForm({ formStamp }: { formStamp: string }) {
  const t = useTranslations('auth.register');
  const tSectors = useTranslations('auth.register.sectors');
  const tRoles = useTranslations('auth.register.roles');
  const tSource = useTranslations('auth.register.source');
  const [state, formAction, pending] = useActionState(register, initialState);
  const router = useRouter();
  // H-4: track Turnstile readiness so we can disable Submit until the token is present and
  // surface a friendly recovery message if the script never loads (extension blocked, etc).
  const [turnstileStatus, setTurnstileStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [sourceValue, setSourceValue] = useState<string>('');

  useEffect(() => {
    if (state.ok && state.nextHref) router.push(state.nextHref);
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* Honeypot — visually hidden, accessible name avoided */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-px w-px"
      />
      <input type="hidden" name="formStamp" value={formStamp} />

      {!state.ok && state.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {state.error === 'auth.register.rateLimited' && t('rateLimited')}
            {state.error === 'auth.register.invalidEmail' && t('invalidEmail')}
            {state.error === 'auth.register.captchaFailed' && t('captchaFailed')}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">{t('fields.fullName')}</Label>
        <Input
          id="full_name"
          name="full_name"
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
        />
      </div>

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

      <div className="flex flex-col gap-2">
        <Label htmlFor="sector">{t('fields.sector')}</Label>
        <Select name="sector" required>
          <SelectTrigger id="sector">
            <SelectValue placeholder={t('fields.sectorPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="it">{tSectors('it')}</SelectItem>
            <SelectItem value="trade">{tSectors('trade')}</SelectItem>
            <SelectItem value="production">{tSectors('production')}</SelectItem>
            <SelectItem value="services">{tSectors('services')}</SelectItem>
            <SelectItem value="other">{tSectors('other')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="role">{t('fields.role')}</Label>
        <Select name="role" required>
          <SelectTrigger id="role">
            <SelectValue placeholder={t('fields.rolePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="owner">{tRoles('owner')}</SelectItem>
            <SelectItem value="manager">{tRoles('manager')}</SelectItem>
            <SelectItem value="employee">{tRoles('employee')}</SelectItem>
            <SelectItem value="other">{tRoles('other')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="self_reported_source">{tSource('label')}</Label>
        <Select name="self_reported_source" required onValueChange={setSourceValue}>
          <SelectTrigger id="self_reported_source">
            <SelectValue placeholder={tSource('placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="qr_letter">{tSource('qr_letter')}</SelectItem>
            <SelectItem value="email_coalition">{tSource('email_coalition')}</SelectItem>
            <SelectItem value="sinya_site">{tSource('sinya_site')}</SelectItem>
            <SelectItem value="facebook">{tSource('facebook')}</SelectItem>
            <SelectItem value="linkedin">{tSource('linkedin')}</SelectItem>
            <SelectItem value="referral">{tSource('referral')}</SelectItem>
            <SelectItem value="news_media">{tSource('news_media')}</SelectItem>
            <SelectItem value="other">{tSource('other')}</SelectItem>
          </SelectContent>
        </Select>
        {sourceValue === 'other' && (
          <div className="flex flex-col gap-1">
            <Input
              id="self_reported_other"
              name="self_reported_other"
              type="text"
              maxLength={300}
              placeholder={tSource('otherPlaceholder')}
              aria-describedby="self_reported_other_help"
            />
            <p id="self_reported_other_help" className="text-sm text-muted-foreground">
              {tSource('otherMaxLengthHelp')}
            </p>
          </div>
        )}
      </div>

      {/* D-12: 4 consent checkboxes — none pre-ticked. Privacy/terms uses next-intl rich-text
          (`t.rich()`) so the link Cyrillic copy stays in messages/bg.json (B-1 fix — no regex
          with hardcoded Cyrillic in this file). */}
      <fieldset className="mt-2 flex flex-col gap-3">
        <ConsentCheckbox name="consent_privacy_terms" required>
          <span>
            {t.rich('consents.privacyTerms', {
              privacyLink: (chunks) => (
                <Link href="/legal/privacy" className="text-accent underline">
                  {chunks}
                </Link>
              ),
              termsLink: (chunks) => (
                <Link href="/legal/terms" className="text-accent underline">
                  {chunks}
                </Link>
              ),
            })}
          </span>
          <span aria-hidden="true" className="ml-1 text-destructive">
            *
          </span>
        </ConsentCheckbox>
        <ConsentCheckbox name="consent_cookies" required>
          {t('consents.cookies')}
          <span aria-hidden="true" className="ml-1 text-destructive">
            *
          </span>
        </ConsentCheckbox>
        <ConsentCheckbox name="consent_newsletter">{t('consents.newsletter')}</ConsentCheckbox>
        <ConsentCheckbox name="consent_political">
          {t('consents.politicalOpinion')}
        </ConsentCheckbox>
      </fieldset>

      <TurnstileWidget onStatusChange={setTurnstileStatus} />

      {turnstileStatus === 'error' && (
        <Alert variant="destructive">
          <AlertDescription>{t('captchaFailed')}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={pending || turnstileStatus !== 'ready'}
        className="mt-4 bg-accent text-background hover:bg-accent/90"
      >
        {t('fields.submit')}
      </Button>
    </form>
  );
}

function ConsentCheckbox({
  name,
  required,
  children,
}: {
  name: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2 text-base leading-snug">
      <Checkbox name={name} value="on" required={required} />
      <span>{children}</span>
    </label>
  );
}
