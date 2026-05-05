'use client';

import React from 'react';
import { useDocumentInfo } from '@payloadcms/ui';
import { LivePreviewIframe } from './LivePreviewIframe';
import { SendBlastButton } from './SendBlastButton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sendTest } from '@/app/actions/send-test';
import { cancelScheduled } from '@/app/actions/cancel-scheduled';
import { getAdminT } from '@/lib/email/i18n-direct';
import type { NewsletterTopic } from '@/lib/email/templates/NewsletterEmail';

/**
 * Phase 5 NOTIF-09 / UI-SPEC §5.4 / D-22 — newsletter composer custom field component.
 *
 * Wraps the Payload-default form fields with a sibling live-preview pane
 * (≥xl split, <xl tab-toggle) + Send Test + Send Blast + Cancel Scheduled
 * buttons.
 *
 * i18n: this is a Payload admin custom 'use client' component. The Payload
 * admin shell does NOT mount NextIntlClientProvider. Therefore:
 *   - getAdminT('admin.newsletters') from src/lib/email/i18n-direct.ts (Plan 05-03)
 *   - NEVER `useTranslations` from 'next-intl' — would throw at runtime.
 *
 * All Bulgarian copy resolves through t() — no hardcoded Cyrillic literals
 * (D-22 source-of-truth lock).
 */
const t = getAdminT('admin.newsletters');

export interface NewsletterComposerProps {
  newsletterId?: string;
  subject?: string;
  previewText?: string;
  topic?: NewsletterTopic;
  fullName?: string;
  lexicalAst?: unknown;
  scheduledAt?: string | null;
  status?: string;
  lastTestSentAt?: string | null;
  lastEditedAfterTestAt?: boolean;
}

export function NewsletterComposer(props: NewsletterComposerProps) {
  const [tab, setTab] = React.useState<'edit' | 'preview'>('edit');

  // Phase 5 hotfix — Plan 05-07 originally read newsletterId/subject/etc.
  // from `props`, but Payload's `admin.components.edit.beforeDocumentControls`
  // slot does NOT actually pass document data as plain props. The only
  // reliable source for the current document ID is the `useDocumentInfo`
  // hook from @payloadcms/ui (the slot is rendered inside DocumentInfoProvider).
  // Without this, every `onSendTest`/`onCancelScheduled` call silently
  // no-op'd because props.newsletterId was always undefined.
  const docInfo = useDocumentInfo();
  const docId = docInfo?.id;
  const newsletterId =
    docId !== undefined && docId !== null ? String(docId) : props.newsletterId;

  const previewArgs = {
    subject: props.subject ?? '',
    previewText: props.previewText ?? '',
    topic: (props.topic ?? 'newsletter_general') as NewsletterTopic,
    fullName: props.fullName,
    lexicalAst:
      props.lexicalAst ?? {
        root: { type: 'root', children: [], direction: null, format: '', indent: 0, version: 1 },
      },
  };

  const onSendTest = async () => {
    const sonner = await import('sonner');
    if (!newsletterId) {
      // UX guardrail — previously this silently returned, now we surface
      // the missing ID as an error so the operator knows to save first.
      sonner.toast.error(t('testSend.toast.error'));
      return;
    }
    const result = await sendTest({ newsletterId });
    if (result.ok) {
      sonner.toast.success(t('testSend.toast.success', { email: result.sentTo }));
    } else {
      sonner.toast.error(t('testSend.toast.error'));
    }
  };

  const onCancelScheduled = async () => {
    if (!newsletterId) return;
    const result = await cancelScheduled({ newsletterId });
    const sonner = await import('sonner');
    // D-22 — fallback toast text comes from messages/bg.json
    // (bg.admin.newsletters.toast.error === "Грешка"; added by Plan 05-03).
    sonner.toast(result.ok ? t('status.cancelled') : t('toast.error'));
  };

  return (
    <div className="newsletter-composer">
      {/* ≥xl split-pane, <xl tab-toggle (UI-SPEC §5.4.1) */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as 'edit' | 'preview')}
        className="lg:hidden"
      >
        <TabsList>
          <TabsTrigger value="edit">{t('tabs.edit')}</TabsTrigger>
          <TabsTrigger value="preview">{t('tabs.preview')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="hidden lg:grid lg:grid-cols-2 gap-8">
        {/* Left pane is already populated by Payload's default form rendering;
            this composer renders the right pane (preview) and the bottom action bar. */}
        <div />
        <div>
          <h3 className="font-display text-lg mb-2">{t('preview.title')}</h3>
          <LivePreviewIframe args={previewArgs} />
          <p className="mt-2 text-xs text-muted-foreground">{t('preview.helper')}</p>
        </div>
      </div>

      {/* Mobile preview when 'preview' tab selected */}
      {tab === 'preview' && (
        <div className="lg:hidden mt-4">
          <LivePreviewIframe args={previewArgs} />
        </div>
      )}

      {/* Action bar */}
      <div className="mt-8 flex items-center gap-3 justify-end">
        <Button variant="outline" onClick={onSendTest} type="button">
          {t('actions.sendTest')}
        </Button>
        {props.status === 'scheduled' && (
          <Button variant="destructive" onClick={onCancelScheduled} type="button">
            {t('cancel.dialog.title')}
          </Button>
        )}
        {newsletterId && (
          <SendBlastButton
            newsletterId={newsletterId}
            scheduledAt={props.scheduledAt}
            lastTestSentAt={props.lastTestSentAt}
            lastEditedAfterTestAt={props.lastEditedAfterTestAt}
          />
        )}
      </div>
    </div>
  );
}

export default NewsletterComposer;
