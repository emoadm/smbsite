'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { submitProblemReport, type SubmitResult } from '@/lib/submissions/actions';
import { OBLAST_NAMES } from '@/lib/oblast-names';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TurnstileWidget } from './TurnstileWidget';

interface Props {
  defaultOblastCode: string | null;
}

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

// Sorted oblast entries for the Select dropdown
const OBLAST_ENTRIES = Object.entries(OBLAST_NAMES)
  .filter(([code]) => code !== 'unknown')
  .sort(([, a], [, b]) => a.localeCompare(b, 'bg'));

export function ProblemReportForm({ defaultOblastCode }: Props) {
  const t = useTranslations('submission.problem');
  const tTopics = useTranslations('submission.topics');
  const tLevel = useTranslations('problem.level');
  const tErr = useTranslations('submission.error');

  const [state, formAction, pending] = useActionState(submitProblemReport, initialState);
  const router = useRouter();
  const [level, setLevel] = useState<'local' | 'national'>('local');
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
        <Label htmlFor="body">{t('fields.body')}</Label>
        <Textarea
          id="body"
          name="body"
          required
          minLength={30}
          maxLength={1000}
          rows={5}
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
            <SelectValue />
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

      <div className="flex flex-col gap-2">
        <Label>{t('fields.level')}</Label>
        <RadioGroup
          name="level"
          defaultValue="local"
          onValueChange={(v) => setLevel(v as 'local' | 'national')}
          className="flex flex-row gap-6"
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="local" id="level-local" />
            <span className="text-sm">{tLevel('local')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="national" id="level-national" />
            <span className="text-sm">{tLevel('national')}</span>
          </label>
        </RadioGroup>
      </div>

      {/* Oblast selector — visible only for local level; opacity transition keeps layout stable */}
      <div
        className={`flex flex-col gap-2 transition-opacity duration-200 ${
          level === 'local' ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={level !== 'local'}
      >
        <Label htmlFor="oblast">{t('fields.oblast')}</Label>
        <Select
          name="oblast"
          defaultValue={defaultOblastCode ?? undefined}
          required={level === 'local'}
        >
          <SelectTrigger id="oblast">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OBLAST_ENTRIES.map(([code, name]) => (
              <SelectItem key={code} value={code}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!state.ok && state.fieldErrors?.oblast && (
          <p className="text-sm text-destructive">{state.fieldErrors.oblast[0]}</p>
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
