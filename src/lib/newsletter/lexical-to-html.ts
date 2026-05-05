import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html';
import type {
  HTMLConvertersFunction,
} from '@payloadcms/richtext-lexical/html';

/**
 * Phase 5 — Lexical AST → HTML for newsletter content slot.
 *
 * Wraps Payload's built-in convertLexicalToHTML with a custom `upload`
 * converter that emits HTML width/height attributes (not just CSS).
 * Outlook desktop ignores CSS sizing — HTML attrs are mandatory
 * (Pitfall 1 from RESEARCH; tedgoas.com/blog/outlook-email-rendering).
 *
 * Default converters cover paragraph, heading, link, list out of the box.
 * Image is the only override.
 */

// Use the default generic (DefaultNodeTypes | SerializedBlockNode | SerializedInlineBlockNode)
const converters: HTMLConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upload: ({ node }: any) => {
    // Outlook desktop ignores CSS width/height — HTML attrs are mandatory (RESEARCH Pitfall 1)
    const value: {
      url?: string;
      width?: number | string;
      height?: number | string;
      alt?: string;
    } = (node as { value?: Record<string, unknown> }).value ?? {};
    const url = value.url ?? '';
    const width = value.width ?? 600;
    const height = value.height ?? 'auto';
    const alt = String(value.alt ?? '').replace(/"/g, '&quot;');
    return `<img src="${url}" alt="${alt}" width="${width}" height="${height}" style="display:block;max-width:100%;height:auto;border:0;" />`;
  },
});

export function renderLexicalToHtml(data: Parameters<typeof convertLexicalToHTML>[0]['data']): string {
  return convertLexicalToHTML({ data, converters });
}
