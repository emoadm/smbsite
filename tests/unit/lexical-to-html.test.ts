import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Phase 5 — lexical-to-html converter (RESEARCH Pattern 5 + Pitfall 1)', () => {
  it('imports from @payloadcms/richtext-lexical/html (NOT a hand-rolled walker)', () => {
    const src = readFileSync('src/lib/newsletter/lexical-to-html.ts', 'utf8');
    expect(src).toMatch(/from\s+['"]@payloadcms\/richtext-lexical\/html['"]/);
  });

  it('exports renderLexicalToHtml as a named function', () => {
    const src = readFileSync('src/lib/newsletter/lexical-to-html.ts', 'utf8');
    expect(src).toMatch(/export\s+function\s+renderLexicalToHtml/);
  });

  it('custom upload converter emits HTML width/height attributes (Pitfall 1)', () => {
    const src = readFileSync('src/lib/newsletter/lexical-to-html.ts', 'utf8');
    // Strip comments before grepping
    const code = src.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
    expect(code).toMatch(/upload:/);
    expect(code).toMatch(/width="\$\{width\}"/);
    expect(code).toMatch(/height="\$\{height\}"/);
    expect(code).toMatch(/alt=/);
  });

  it('renderLexicalToHtml returns a string for an empty Lexical AST', async () => {
    const { renderLexicalToHtml } = await import('@/lib/newsletter/lexical-to-html');
    const empty = { root: { type: 'root', children: [], direction: null, format: '', indent: 0, version: 1 } };
    // @ts-expect-error — testing minimal happy-path; full SerializedEditorState typed in production
    const html = renderLexicalToHtml(empty);
    expect(typeof html).toBe('string');
  });
});
