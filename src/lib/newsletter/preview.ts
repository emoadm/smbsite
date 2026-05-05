'use server';

import React from 'react';
import { render } from '@react-email/render';
import { NewsletterEmail, type NewsletterTopic } from '@/lib/email/templates/NewsletterEmail';
import { renderLexicalToHtml } from '@/lib/newsletter/lexical-to-html';
import { loadT } from '@/lib/email/i18n-direct';
import { assertEditorOrAdmin } from '@/lib/auth/role-gate';

// Phase 5 D-02 / NOTIF-09 — live preview render for composer iframe.
//
// Server Action invoked debounced (500ms) from src/components/payload/LivePreviewIframe.tsx.
// Returns sanitized HTML string for <iframe srcdoc=...>.
//
// Security: assertEditorOrAdmin gates non-editor invocation. Lexical AST → HTML
// goes through the trusted converter (Plan 05-03 — restricted block list).

export interface PreviewArgs {
  subject: string;
  previewText: string;
  topic: NewsletterTopic;
  fullName?: string;
  // Lexical SerializedEditorState — typed loosely here because Payload's
  // body field type may have a small generic mismatch with @react-email types.
  lexicalAst: unknown;
}

export async function renderPreview(args: PreviewArgs): Promise<string> {
  await assertEditorOrAdmin();

  const t = loadT('email.newsletter');
  const bodyHtml = renderLexicalToHtml(args.lexicalAst as never);

  const html = await render(
    React.createElement(NewsletterEmail, {
      t,
      fullName: args.fullName,
      subject: args.subject,
      previewText: args.previewText,
      topic: args.topic,
      bodyHtml,
      // D-14 sentinel — preview is never sent; nothing to opt-out of.
      unsubUrl: '#preview',
      preferencesUrl: '#preview',
      year: new Date().getFullYear(),
    }),
  );
  return html;
}
