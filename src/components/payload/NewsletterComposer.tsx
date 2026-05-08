'use client';

import React from 'react';
import { Button as PayloadButton, useDocumentInfo } from '@payloadcms/ui';
import { Toaster } from 'sonner';
import { LivePreviewIframe } from './LivePreviewIframe';
import { SendBlastButton } from './SendBlastButton';
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

  // Phase 5 G2 (UAT gap closure — Plan 05-13) — gate-field wiring fix.
  // Payload's `admin.components.edit.beforeDocumentControls` slot passes NO
  // document fields as plain props. The 6daaf8c hotfix fixed this for the
  // doc ID via useDocumentInfo() but stopped at the ID. lastTestSentAt and
  // lastEditedAfterTestAt are read from useDocumentInfo().savedDocumentData
  // (the persisted DB row shape — matches what src/lib/email/worker.tsx:271
  // writes after a successful test send). Fallback chain handles the upstream
  // deprecation: savedDocumentData → data → initialData → props (last resort).
  // Without this fix, computeGate() always returns 'never' and the blast
  // button is permanently disabled — Phase 5 main shipping deliverable
  // (newsletter blast send) is non-functional via the admin UI.
  const persistedData =
    (docInfo?.savedDocumentData as Record<string, unknown> | undefined) ??
    (docInfo?.data as Record<string, unknown> | undefined) ??
    (docInfo?.initialData as Record<string, unknown> | undefined);
  const persistedLastTestSentAt = persistedData?.lastTestSentAt;
  const persistedLastEditedAfterTestAt = persistedData?.lastEditedAfterTestAt;

  const resolvedLastTestSentAt =
    typeof persistedLastTestSentAt === 'string'
      ? persistedLastTestSentAt
      : props.lastTestSentAt ?? null;
  const resolvedLastEditedAfterTestAt =
    typeof persistedLastEditedAfterTestAt === 'boolean'
      ? persistedLastEditedAfterTestAt
      : props.lastEditedAfterTestAt;

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
      {/* Phase 5 hotfix — Sonner Toaster MUST be mounted somewhere in the
          admin DOM tree for toast.error/success calls in this component to
          actually render. The (payload)/layout.tsx wraps Payload's admin
          shell and does NOT include a Toaster (the project's Toaster is
          only mounted on /member/preferences). Mounting it here is the
          cleanest scoped fix — toasts from sendTest, cancelScheduled, and
          sendBlast all flow through Sonner's global queue and will render
          via this Toaster as long as the composer is on screen. Using the
          bare `sonner` Toaster (not the project's themed wrapper) to avoid
          pulling in next-themes/ThemeProvider in the admin context. */}
      <Toaster richColors position="bottom-right" />

      {/* Live email preview — full-width below Payload's form fields.
          Earlier layout used a 2-col grid with an empty left column on the
          assumption that Payload's form fields would render inside it. They
          don't — the form is rendered by Payload in its own slot, not nested
          inside our composer. The grid left half of the viewport empty and
          squeezed the preview to half width. The mobile Tabs UX appended a
          second iframe below the form on click which read as "form
          duplicated, action bar pushed off-screen". Both removed in favor of
          a single full-width preview pane. */}
      <div className="mt-6">
        <h3 className="font-display text-lg mb-2">{t('preview.title')}</h3>
        <LivePreviewIframe args={previewArgs} />
        <p className="mt-2 text-xs text-muted-foreground">{t('preview.helper')}</p>
      </div>

      {/* Action bar — uses Payload's native Button so it matches admin
          chrome instead of the public-site shadcn buttons. */}
      <div className="mt-6 flex items-center gap-3 justify-end">
        <PayloadButton buttonStyle="secondary" onClick={onSendTest} type="button">
          {t('actions.sendTest')}
        </PayloadButton>
        {props.status === 'scheduled' && (
          <PayloadButton buttonStyle="error" onClick={onCancelScheduled} type="button">
            {t('cancel.dialog.title')}
          </PayloadButton>
        )}
        {newsletterId && (
          <SendBlastButton
            newsletterId={newsletterId}
            scheduledAt={props.scheduledAt}
            lastTestSentAt={resolvedLastTestSentAt}
            lastEditedAfterTestAt={resolvedLastEditedAfterTestAt}
          />
        )}
      </div>
    </div>
  );
}

export default NewsletterComposer;
