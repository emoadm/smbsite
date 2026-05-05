'use client';

import { useState, useTransition } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { saveTopicPreference } from '@/app/actions/save-preferences';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

// Phase 5 NOTIF-01 / NOTIF-03 / D-13 — per-topic Switch row with optimistic save.
//
// Append-only contract: every flip INSERTs a new consents row. Reading the
// latest row per (user, kind) gives current state at the next page load.

export interface NewsletterToggleRowProps {
  topic: 'newsletter_general' | 'newsletter_voting' | 'newsletter_reports' | 'newsletter_events';
  initialGranted: boolean;
}

export function NewsletterToggleRow({ topic, initialGranted }: NewsletterToggleRowProps) {
  const t = useTranslations('member.preferences');
  const [granted, setGranted] = useState<boolean>(initialGranted);
  const [isPending, startTransition] = useTransition();

  const onToggle = (next: boolean) => {
    setGranted(next); // optimistic
    startTransition(async () => {
      const result = await saveTopicPreference({ topic, granted: next });
      if (result.ok) {
        toast.success(t('toast.saved'));
      } else {
        setGranted(!next);
        toast.error(t('toast.error'));
      }
    });
  };

  const labelKey = `topics.${topic}.label`;
  const descKey = `topics.${topic}.description`;

  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex-1">
        <Label className="text-sm font-semibold">{t(labelKey)}</Label>
        <p className="mt-1 text-sm text-muted-foreground">{t(descKey)}</p>
      </div>
      <Switch
        checked={granted}
        onCheckedChange={onToggle}
        disabled={isPending}
        aria-label={t('topics.toggleAriaLabel', { topic: t(labelKey) })}
      />
    </div>
  );
}

export default NewsletterToggleRow;
