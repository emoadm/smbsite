// Phase 5 hotfix — Lexical RSC + client feature entries.
//
// Payload's `payload generate:importmap` would normally produce these
// automatically, but that command uses tsx and is blocked by the
// tsx@4.21 + Node 22 ESM incompat documented in
// .planning/todos/pending/2026-05-04-payload-tsx-esm-incompat.md.
//
// Two categories of entries are required for any Lexical richText field:
//   1. RSC entries (server-component render path): RscEntryLexicalField,
//      RscEntryLexicalCell, LexicalDiffComponent. Without these the field
//      doesn't render at all (Fly log: `getFromImportMap: PayloadComponent
//      not found in importMap` for the RscEntryLexicalField path).
//   2. Client feature entries: every Lexical *Feature() call registered in
//      the lexicalEditor({ features }) config requires a matching client
//      counterpart at the path `@payloadcms/richtext-lexical/client#<Name>Client`.
//      Without these the editor mounts but the toolbar is empty (no Bold /
//      Italic / Heading / Link buttons render).
//
// Newsletters.ts (Plan 05-04) uses 9 features: paragraph, heading, link,
// list (ordered + unordered), bold, italic, fixed toolbar, inline toolbar.
// All 9 client variants are registered here.
import {
  RscEntryLexicalField,
  RscEntryLexicalCell,
  LexicalDiffComponent,
} from '@payloadcms/richtext-lexical/rsc'
import {
  ParagraphFeatureClient,
  HeadingFeatureClient,
  LinkFeatureClient,
  UnorderedListFeatureClient,
  OrderedListFeatureClient,
  BoldFeatureClient,
  ItalicFeatureClient,
  FixedToolbarFeatureClient,
  InlineToolbarFeatureClient,
} from '@payloadcms/richtext-lexical/client'
import { AttributionView as AttributionView_attribution_dashboard } from '@/app/(payload)/admin/views/attribution/AttributionView'
import { NewsletterComposer as NewsletterComposer_newsletters_beforedoccontrols } from '@/components/payload/NewsletterComposer'

export const importMap = {
  // RSC entries
  '@payloadcms/richtext-lexical/rsc#RscEntryLexicalField': RscEntryLexicalField,
  '@payloadcms/richtext-lexical/rsc#RscEntryLexicalCell': RscEntryLexicalCell,
  '@payloadcms/richtext-lexical/rsc#LexicalDiffComponent': LexicalDiffComponent,
  // Client feature entries (one per *Feature() in Newsletters.ts)
  '@payloadcms/richtext-lexical/client#ParagraphFeatureClient': ParagraphFeatureClient,
  '@payloadcms/richtext-lexical/client#HeadingFeatureClient': HeadingFeatureClient,
  '@payloadcms/richtext-lexical/client#LinkFeatureClient': LinkFeatureClient,
  '@payloadcms/richtext-lexical/client#UnorderedListFeatureClient': UnorderedListFeatureClient,
  '@payloadcms/richtext-lexical/client#OrderedListFeatureClient': OrderedListFeatureClient,
  '@payloadcms/richtext-lexical/client#BoldFeatureClient': BoldFeatureClient,
  '@payloadcms/richtext-lexical/client#ItalicFeatureClient': ItalicFeatureClient,
  '@payloadcms/richtext-lexical/client#FixedToolbarFeatureClient': FixedToolbarFeatureClient,
  '@payloadcms/richtext-lexical/client#InlineToolbarFeatureClient': InlineToolbarFeatureClient,
  // Project-local custom components
  "/src/app/(payload)/admin/views/attribution/AttributionView#AttributionView": AttributionView_attribution_dashboard,
  "/src/components/payload/NewsletterComposer#NewsletterComposer": NewsletterComposer_newsletters_beforedoccontrols,
}
