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
 * Phase 4 EDIT-03 — agitation pages collection.
 *
 * Editors compose and publish static content pages in Payload admin.
 * Status flows draft → published.
 *
 * Access: editors and admins can read draft + published pages.
 * Public (anonymous + members) can only read status='published' pages.
 *
 * Lexical features mirror Newsletters.ts (Plan 05-04 D-01).
 */

const isEditorOrAdmin = ({ req }: { req: { user?: unknown } }): boolean => {
  const role = ((req.user as { role?: string } | null)?.role) ?? '';
  return ['admin', 'editor'].includes(role);
};

const isPublishedOrEditor = ({ req }: { req: { user?: unknown } }) => {
  const role = ((req.user as { role?: string } | null)?.role) ?? '';
  if (['admin', 'editor'].includes(role)) return true;
  // Public read of published pages (anonymous + members):
  return { status: { equals: 'published' } };
};

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'status'],
    description: 'Агитационни страници (EDIT-03). Публикуват се от редактори.',
  },
  access: {
    read: isPublishedOrEditor,
    create: isEditorOrAdmin,
    update: isEditorOrAdmin,
    delete: isEditorOrAdmin,
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 200 },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'URL-сегмент (латиница или кирилица).' },
    },
    {
      name: 'body',
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
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Чернова', value: 'draft' },
        { label: 'Публикувана', value: 'published' },
      ],
    },
    { name: 'published_at', type: 'date', admin: { readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        // Stamp published_at when status flips draft → published.
        if (data.status === 'published' && (!originalDoc || originalDoc.status !== 'published')) {
          (data as Record<string, unknown>).published_at = new Date().toISOString();
        }
        return data;
      },
    ],
  },
};
