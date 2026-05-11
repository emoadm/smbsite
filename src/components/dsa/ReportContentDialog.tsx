'use client';

import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TurnstileWidget } from '@/components/forms/TurnstileWidget';
import { submitDsaReport } from '@/lib/submissions/dsa-actions';
import type { DsaSubmitResult } from '@/lib/submissions/dsa-actions';

interface Props {
  submissionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_KEYS = ['illegal', 'harassment', 'misinformation', 'spam', 'other'] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];

const initialState: DsaSubmitResult = { ok: false };

export function ReportContentDialog({ submissionId, open, onOpenChange }: Props) {
  const t = useTranslations('dsa.report');
  const [state, formAction, pending] = useActionState(submitDsaReport, initialState);
  const [turnstileStatus, setTurnstileStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [category, setCategory] = useState<CategoryKey | ''>('');

  // Reset category state when dialog closes
  useEffect(() => {
    if (!open) {
      setCategory('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('heading')}</DialogTitle>
          <DialogDescription>{t('body')}</DialogDescription>
        </DialogHeader>

        {state.ok ? (
          <div className="space-y-4 py-4">
            <h3 className="font-display text-lg font-extrabold">{t('successHeading')}</h3>
            <p className="text-sm text-muted-foreground">{t('successBody')}</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('close')}
            </Button>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="targetSubmissionId" value={submissionId} />

            {state.error && (
              <div role="alert" className="text-destructive text-sm">
                {state.error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="category">{t('categoryLabel')}</Label>
              <Select
                name="category"
                value={category}
                onValueChange={(v) => setCategory(v as CategoryKey)}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`categories.${key}` as `categories.${CategoryKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.fieldErrors?.category && (
                <p className="text-destructive text-sm">{state.fieldErrors.category[0]}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="reason">{t('reasonLabel')}</Label>
              <Textarea
                id="reason"
                name="reason"
                rows={4}
                placeholder={t('reasonPlaceholder')}
                required
                minLength={20}
              />
              {state.fieldErrors?.reason && (
                <p className="text-destructive text-sm">{state.fieldErrors.reason[0]}</p>
              )}
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="goodFaith" name="goodFaith" value="on" required />
              <Label htmlFor="goodFaith" className="text-sm leading-relaxed cursor-pointer">
                {t('goodFaithLabel')}
              </Label>
            </div>

            <TurnstileWidget onStatusChange={setTurnstileStatus} />

            <Button
              type="submit"
              variant="default"
              size="lg"
              className="min-h-[44px] w-full"
              disabled={pending || turnstileStatus !== 'ready'}
            >
              {t('submitCta')}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
