'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { submitProposal, type SubmitResult } from '@/lib/submissions/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TurnstileWidget } from './TurnstileWidget';

const initialState: SubmitResult = { ok: false };

const TOPICS = [
  'taxes',
  'admin_barriers',
  'financing',
  'labor',
  'digitalization',
  'energy',
  'other',
] as const;

export function ProposalForm() {
  const t = useTranslations('submission.proposal');
  const tTopics = useTranslations('submission.topics');
  const tErr = useTranslations('submission.error');

  const [state, formAction, pending] = useActionState(submitProposal, initialState);
  const router = useRouter();
  const [turnstileStatus, setTurnstileStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (state.ok && state.nextHref) {
      toast.success(t('successToast'));
      router.push(state.nextHref);
    }
  }, [state, router, t]);

  const errorKey =
    !state.ok && state.error
      ? (state.error.split('.').pop() ?? null)
      : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {!state.ok && state.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {errorKey === 'rateLimit' && tErr('rateLimit', { n: 24 * 60 })}
            {errorKey === 'captchaFailed' && tErr('captchaFailed')}
            {errorKey === 'unverified' && tErr('validation')}
            {errorKey === 'suspended' && tErr('validation')}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">{t('fields.title')}</Label>
        <Input
          id="title"
          name="title"
          required
          minLength={5}
          maxLength={300}
          placeholder={t('fields.titlePlaceholder')}
          aria-describedby="title-help"
          aria-invalid={!!state.ok === false && !!state.fieldErrors?.title}
        />
        <p id="title-help" className="text-sm text-muted-foreground">
          {t('fields.titleHelp')}
        </p>
        {!state.ok && state.fieldErrors?.title && (
          <p className="text-sm text-destructive">{state.fieldErrors.title[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="body">{t('fields.body')}</Label>
        <Textarea
          id="body"
          name="body"
          required
          minLength={50}
          maxLength={2000}
          rows={6}
          placeholder={t('fields.bodyPlaceholder')}
          aria-describedby="body-help"
          aria-invalid={!!state.ok === false && !!state.fieldErrors?.body}
          className="resize-y"
        />
        <p id="body-help" className="text-sm text-muted-foreground">
          {t('fields.bodyHelp')}
        </p>
        {!state.ok && state.fieldErrors?.body && (
          <p className="text-sm text-destructive">{state.fieldErrors.body[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="topic">{t('fields.topic')}</Label>
        <Select name="topic" required>
          <SelectTrigger id="topic">
            <SelectValue placeholder={t('fields.topicPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {TOPICS.map((key) => (
              <SelectItem key={key} value={key}>
                {tTopics(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!state.ok && state.fieldErrors?.topic && (
          <p className="text-sm text-destructive">{state.fieldErrors.topic[0]}</p>
        )}
      </div>

      <TurnstileWidget onStatusChange={setTurnstileStatus} />

      {turnstileStatus === 'error' && (
        <Alert variant="destructive">
          <AlertDescription>{tErr('captchaFailed')}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={pending || turnstileStatus !== 'ready'}
        className="mt-4 min-h-[44px] w-full bg-accent text-background hover:bg-accent/90"
      >
        {t('submitCta')}
      </Button>
    </form>
  );
}
