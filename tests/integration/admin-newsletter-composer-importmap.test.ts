import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Strip line comments (`// …`) AND block comments (`/* … */`) before pattern checks.
// The composer files mention `useTranslations` / `next-intl` / Cyrillic in *comments*
// to document the constraint; only real code matters for the lock-in tests below.
function stripComments(src: string): string {
  // Remove block comments first (lazy match to avoid swallowing across boundaries).
  const noBlocks = src.replace(/\/\*[\s\S]*?\*\//g, '');
  // Then remove single-line comments.
  return noBlocks
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');
}

describe('Phase 5 — composer importMap registration (Pitfall 7)', () => {
  const IMPORT_MAP = readFileSync('src/app/(payload)/admin/importMap.js', 'utf8');
  const NEWSLETTERS = readFileSync('src/collections/Newsletters.ts', 'utf8');
  const COMPOSER_RAW = readFileSync('src/components/payload/NewsletterComposer.tsx', 'utf8');
  const SEND_BUTTON_RAW = readFileSync('src/components/payload/SendBlastButton.tsx', 'utf8');
  const COMPOSER = stripComments(COMPOSER_RAW);
  const SEND_BUTTON = stripComments(SEND_BUTTON_RAW);
  const PAYLOAD_CONFIG = readFileSync('src/payload.config.ts', 'utf8');

  it('importMap.js imports NewsletterComposer', () => {
    expect(IMPORT_MAP).toMatch(/import\s*\{[^}]*NewsletterComposer[^}]*\}/);
  });

  it('importMap.js exposes the path key matching Newsletters.ts afterFields entry', () => {
    expect(IMPORT_MAP).toMatch(
      /"\/src\/components\/payload\/NewsletterComposer#NewsletterComposer"/,
    );
  });

  it('importMap.js preserves the Phase 02.1 AttributionView entry', () => {
    expect(IMPORT_MAP).toMatch(/AttributionView/);
    expect(IMPORT_MAP).toMatch(
      /"\/src\/app\/\(payload\)\/admin\/views\/attribution\/AttributionView#AttributionView"/,
    );
  });

  it('Newsletters.ts admin block has components.edit.beforeDocumentControls with the composer path', () => {
    expect(NEWSLETTERS).toMatch(
      /components:\s*\{[\s\S]*?edit:\s*\{[\s\S]*?beforeDocumentControls[\s\S]*?NewsletterComposer/,
    );
  });

  it('payload.config.ts does NOT directly import NewsletterComposer (Pitfall 7)', () => {
    expect(PAYLOAD_CONFIG).not.toMatch(/from\s+['"][@.][^'"]*NewsletterComposer['"]/);
  });

  it('NewsletterComposer.tsx uses getAdminT from i18n-direct (NOT useTranslations)', () => {
    expect(COMPOSER).toMatch(
      /import\s*\{[^}]*getAdminT[^}]*\}\s*from\s+['"]@\/lib\/email\/i18n-direct['"]/,
    );
    expect(COMPOSER).not.toMatch(/from\s+['"]next-intl['"]/);
    expect(COMPOSER).not.toMatch(/useTranslations/);
  });

  it('SendBlastButton.tsx uses getAdminT from i18n-direct (NOT useTranslations)', () => {
    expect(SEND_BUTTON).toMatch(
      /import\s*\{[^}]*getAdminT[^}]*\}\s*from\s+['"]@\/lib\/email\/i18n-direct['"]/,
    );
    expect(SEND_BUTTON).not.toMatch(/from\s+['"]next-intl['"]/);
    expect(SEND_BUTTON).not.toMatch(/useTranslations/);
  });

  it('NewsletterComposer.tsx contains zero hardcoded Cyrillic literals (D-22)', () => {
    // Strip JSX strings inside templated literals; everything Bulgarian must be a t() lookup.
    expect(COMPOSER).not.toMatch(/[Ѐ-ӿ]/);
  });

  it('SendBlastButton.tsx contains zero hardcoded Cyrillic literals (D-22)', () => {
    expect(SEND_BUTTON).not.toMatch(/[Ѐ-ӿ]/);
  });
});
