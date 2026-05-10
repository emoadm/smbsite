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
 * Phase 4 D-A1 / EDIT-02 — Ideas collection (CRUD without voting fields).
 *
 * Phase 3 (paused under D-LawyerTrack in STATE.md) will re-activate by
 * ALTERing this collection's underlying `ideas` table to add voting
 * columns (votes, votable, votes_open_at) — no rebase required.
 *
 * Editor-curated content: Phase 4 ships no member-facing /idea submission
 * flow. Member-submitted political proposals go through the `submissions`
 * Drizzle table (kind='proposal'); Ideas is the future voting catalog.
 *
 * Access mirrors Pages.ts: public reads `status='approved'` rows only;
 * editor/admin can read drafts. moderatorNote is editor-only.
 *
 * submittedBy/approvedBy stored as plain text UUIDs (no Payload relationship
 * field — avoids join-table complexity and potential conflict with the
 * Drizzle-managed `users` table vs Payload `admin_users` table). Phase 3
 * re-activation converts these to relationships if needed without DDL change.
 */

const isEditorOrAdmin = ({ req }: { req: { user?: unknown } }): boolean => {
  const role = ((req.user as { role?: string } | null)?.role) ?? '';
  return ['admin', 'editor', 'super_editor'].includes(role);
};

const isApprovedOrEditor = ({ req }: { req: { user?: unknown } }) => {
  const role = ((req.user as { role?: string } | null)?.role) ?? '';
  if (['admin', 'editor', 'super_editor'].includes(role)) return true;
  return { status: { equals: 'approved' } };
};

export const Ideas: CollectionConfig = {
  slug: 'ideas',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'topic', 'status'],
    description: 'Политически идеи — EDIT-02. Гласуването се добавя при реактивирането на Фаза 3.',
  },
  access: {
    read: isApprovedOrEditor,
    create: isEditorOrAdmin,
    update: isEditorOrAdmin,
    delete: isEditorOrAdmin,
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 200 },
    {
      name: 'description',
      type: 'richText',
      required: true,
      editor: lexicalEditor({
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
      name: 'topic',
      type: 'select',
      required: true,
      options: [
        { label: 'Икономика', value: 'economy' },
        { label: 'Труд', value: 'labor' },
        { label: 'Данъци', value: 'taxes' },
        { label: 'Регулация', value: 'regulation' },
        { label: 'Друго', value: 'other' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Чернова', value: 'draft' },
        { label: 'Одобрена', value: 'approved' },
        { label: 'Отхвърлена', value: 'rejected' },
      ],
    },
    // submittedBy / approvedBy stored as plain text UUIDs (no Payload relationship —
    // see file header rationale). Phase 3 re-activation converts these to relationships
    // if needed without DDL change.
    {
      name: 'submittedBy',
      type: 'text',
      admin: {
        description: 'UUID на подателя (опционално — повечето идеи са създадени от редактори).',
        readOnly: true,
      },
    },
    {
      name: 'approvedBy',
      type: 'text',
      admin: { description: 'UUID на одобряващия редактор.', readOnly: true },
    },
    {
      name: 'moderatorNote',
      type: 'textarea',
      access: {
        // Editor-only field-level read (mirrors the moderation_log "internal-only" pattern at field level).
        read: isEditorOrAdmin,
      },
    },
    { name: 'publishedAt', type: 'date', admin: { readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        // Stamp publishedAt when status flips to 'approved' (mirrors Pages.ts pattern).
        if (data.status === 'approved' && (!originalDoc || originalDoc.status !== 'approved')) {
          (data as Record<string, unknown>).publishedAt = new Date().toISOString();
        }
        return data;
      },
    ],
  },
};
