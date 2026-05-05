// Phase 5 hotfix — Lexical RSC entries.
//
// Payload's `payload generate:importmap` would normally produce these
// automatically, but that command uses tsx and is blocked by the
// tsx@4.21 + Node 22 ESM incompat documented in
// .planning/todos/pending/2026-05-04-payload-tsx-esm-incompat.md.
//
// Without these entries the body (richText) field on
// /admin/collections/newsletters/{create,*/edit} fails to mount and
// disappears entirely from the form (Fly log: `getFromImportMap:
// PayloadComponent not found in importMap` for the RscEntryLexicalField
// path). Hand-registered here as a mirror of the default
// Payload+Lexical importMap.
import {
  RscEntryLexicalField,
  RscEntryLexicalCell,
  LexicalDiffComponent,
} from '@payloadcms/richtext-lexical/rsc'
import { AttributionView as AttributionView_attribution_dashboard } from '@/app/(payload)/admin/views/attribution/AttributionView'
import { NewsletterComposer as NewsletterComposer_newsletters_beforedoccontrols } from '@/components/payload/NewsletterComposer'

export const importMap = {
  '@payloadcms/richtext-lexical/rsc#RscEntryLexicalField': RscEntryLexicalField,
  '@payloadcms/richtext-lexical/rsc#RscEntryLexicalCell': RscEntryLexicalCell,
  '@payloadcms/richtext-lexical/rsc#LexicalDiffComponent': LexicalDiffComponent,
  "/src/app/(payload)/admin/views/attribution/AttributionView#AttributionView": AttributionView_attribution_dashboard,
  "/src/components/payload/NewsletterComposer#NewsletterComposer": NewsletterComposer_newsletters_beforedoccontrols,
}
