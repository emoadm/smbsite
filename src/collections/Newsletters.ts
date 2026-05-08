import type { CollectionConfig } from 'payload';
import {
  lexicalEditor,
  ParagraphFeature,
  HeadingFeature,
  LinkFeature,
  UnorderedListFeature,
  OrderedListFeature,
  BoldFeature,
  ItalicFeature,
  FixedToolbarFeature,
  InlineToolbarFeature,
} from '@payloadcms/richtext-lexical';

/**
 * Phase 5 D-01..D-05, D-25 — newsletter authoring collection.
 *
 * Editors compose newsletters in Payload admin; status flows
 * draft → scheduled → sending → sent | failed | cancelled.
 *
 * Pre-send safety (D-02): `lastTestSentAt` must be < 24h from now AND
 * `lastEditedAfterTestAt` must be false for the Send Server Action
 * (Plan 05-07) to allow blast.
 *
 * Allowed Lexical blocks (D-01 + UI-SPEC §5.5.2): paragraph, h2, h3,
 * link, list (ordered + unordered), image (upload), bold, italic.
 * Banned: code blocks, blockquotes, custom blocks, raw HTML.
 *
 * Access (D-25): role IN ('admin','editor') for ALL operations
 * (defense-in-depth — Server Actions in Plan 05-07 re-check via
 * assertEditorOrAdmin from Plan 05-01).
 */

const isEditorOrAdmin = ({ req }: { req: { user?: unknown } }): boolean => {
  const role = ((req.user as { role?: string } | null)?.role) ?? '';
  return ['admin', 'editor'].includes(role);
};

export const Newsletters: CollectionConfig = {
  slug: 'newsletters',
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'topic', 'status', 'scheduledAt'],
    description: 'Бюлетини — изпращат се през BullMQ опашката на newsletter темите.',
    // Phase 5 NOTIF-09 — composer custom component renders above the document
    // controls (Save / Publish buttons) on the Edit view. Payload 3.84 collection
    // admin does NOT expose a generic `afterFields` — the closest seam for
    // augmenting (not replacing) the edit view is `admin.components.edit.beforeDocumentControls`.
    // Path resolves via importMap.js (Pitfall 7 — explicit string registration;
    // payload.config.ts is NOT modified).
    components: {
      edit: {
        beforeDocumentControls: [
          '/src/components/payload/NewsletterComposer#NewsletterComposer',
        ],
      },
    },
  },
  access: {
    read: isEditorOrAdmin,
    create: isEditorOrAdmin,
    update: isEditorOrAdmin,
    delete: isEditorOrAdmin,
  },
  fields: [
    {
      name: 'subject',
      type: 'text',
      required: true,
      maxLength: 200,
      admin: { description: 'Тема на писмото — показва се в inbox' },
    },
    {
      name: 'previewText',
      type: 'textarea',
      maxLength: 90,
      admin: { description: 'Кратък преглед в inbox preview (макс 90 знака)' },
    },
    {
      name: 'topic',
      type: 'select',
      required: true,
      defaultValue: 'newsletter_general',
      options: [
        { label: 'Общи обявявания', value: 'newsletter_general' },
        { label: 'Нови гласувания', value: 'newsletter_voting' },
        { label: 'Отчети по инициативи', value: 'newsletter_reports' },
        { label: 'Покани за събития', value: 'newsletter_events' },
      ],
    },
    {
      name: 'body',
      type: 'richText',
      required: true,
      editor: lexicalEditor({
        // Phase 5 — restricted Lexical features (Plan 05-04 D-01).
        //
        // UploadFeature was originally listed but removed: payload.config.ts
        // has no upload-target collection, so registering UploadFeature()
        // had no effect (and earlier was suspected of causing the body field
        // crash; real cause was missing importMap.js entries for Lexical
        // RSC components — see commit f6694c0).
        //
        // FixedToolbarFeature + InlineToolbarFeature must be added explicitly
        // — Payload Lexical separates "format functionality" (Bold, Italic,
        // Heading, etc.) from "toolbar UI". Without one of these features
        // the editor renders as a plain contenteditable with no buttons.
        features: () => [
          ParagraphFeature(),
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
          LinkFeature(),
          UnorderedListFeature(),
          OrderedListFeature(),
          BoldFeature(),
          ItalicFeature(),
          FixedToolbarFeature(),
          InlineToolbarFeature(),
        ],
      }),
    },
    {
      // Phase 5 NOTIF-09 — live email preview rendered as a `ui` field so it
      // sits inside the form layout at full width, instead of inside the
      // narrow `beforeDocumentControls` slot where it overlapped the title.
      // Subscribes to subject/previewText/topic/body via useFormFields and
      // updates on form change (debounced 500ms in LivePreviewIframe).
      name: 'preview',
      type: 'ui',
      admin: {
        components: {
          Field: '/src/components/payload/NewsletterPreviewField#NewsletterPreviewField',
        },
      },
    },
    {
      name: 'scheduledAt',
      type: 'date',
      admin: {
        description: 'Оставете празно за изпращане сега. Максимум 30 дни напред.',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Чернова', value: 'draft' },
        { label: 'Планиран', value: 'scheduled' },
        { label: 'Изпраща се', value: 'sending' },
        { label: 'Изпратен', value: 'sent' },
        { label: 'Неуспешен', value: 'failed' },
        { label: 'Отказан', value: 'cancelled' },
      ],
      admin: { readOnly: true, description: 'Управлява се от системата (опашката)' },
    },
    {
      name: 'lastTestSentAt',
      type: 'date',
      admin: { readOnly: true, description: 'Последно изпратено тестово писмо (D-02)' },
    },
    {
      name: 'lastEditedAfterTestAt',
      type: 'checkbox',
      defaultValue: false,
      admin: { readOnly: true, description: 'Маркирано при редакция след тестово (D-02)' },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        if (originalDoc) {
          const editableFields = ['subject', 'previewText', 'topic', 'body', 'scheduledAt'];
          const changed = editableFields.some(
            (f) => JSON.stringify((data as Record<string, unknown>)[f]) !== JSON.stringify((originalDoc as Record<string, unknown>)[f]),
          );
          if (changed && originalDoc.lastTestSentAt) {
            (data as Record<string, unknown>).lastEditedAfterTestAt = true;
          }
        }
        return data;
      },
    ],
  },
};
