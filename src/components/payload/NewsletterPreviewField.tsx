'use client';

import { useFormFields } from '@payloadcms/ui';
import { LivePreviewIframe } from './LivePreviewIframe';
import { getAdminT } from '@/lib/email/i18n-direct';
import type { NewsletterTopic } from '@/lib/email/templates/NewsletterEmail';

// Phase 5 NOTIF-09 — newsletter preview rendered as a Payload `ui` field.
//
// Earlier this iframe lived in NewsletterComposer (mounted into the
// `beforeDocumentControls` slot). That slot is the compact inline area next
// to the document title — not a full-width region — so the iframe was
// squeezed and visually overlapped the title bar. Moving the preview into
// the form sequence as a `ui` field gives it the form's natural full width
// and proper vertical flow under the body editor.
//
// Form-state subscription: useFormFields([sub, dispatch]) with a selector
// reads only the fields we care about and re-renders when those change.
// Updates are debounced inside LivePreviewIframe (500ms) so server-action
// renderPreview calls don't fire on every keystroke.
//
// i18n: getAdminT (NOT useTranslations) — Payload admin shell does NOT
// mount NextIntlClientProvider; useTranslations would throw at runtime.

const t = getAdminT('admin.newsletters');

interface FieldRow {
  value?: unknown;
}

const EMPTY_LEXICAL = {
  root: { type: 'root', children: [], direction: null, format: '', indent: 0, version: 1 },
};

export function NewsletterPreviewField() {
  const subject = useFormFields(([fields]) => (fields?.subject as FieldRow | undefined)?.value);
  const previewText = useFormFields(
    ([fields]) => (fields?.previewText as FieldRow | undefined)?.value,
  );
  const topic = useFormFields(([fields]) => (fields?.topic as FieldRow | undefined)?.value);
  const body = useFormFields(([fields]) => (fields?.body as FieldRow | undefined)?.value);

  const previewArgs = {
    subject: typeof subject === 'string' ? subject : '',
    previewText: typeof previewText === 'string' ? previewText : '',
    topic: (typeof topic === 'string' ? topic : 'newsletter_general') as NewsletterTopic,
    fullName: undefined,
    lexicalAst: body ?? EMPTY_LEXICAL,
  };

  return (
    <div className="field-type ui">
      <h3 className="font-display text-lg mb-2">{t('preview.title')}</h3>
      <LivePreviewIframe args={previewArgs} />
      <p className="mt-2 text-xs text-muted-foreground">{t('preview.helper')}</p>
    </div>
  );
}

export default NewsletterPreviewField;
