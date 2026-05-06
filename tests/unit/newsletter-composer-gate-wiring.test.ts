import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Phase 5 G2 (UAT gap closure) — newsletter composer gate-field wiring.
//
// Payload's admin.components.edit.beforeDocumentControls slot does NOT pass
// document fields as plain React props. The only reliable source for the
// CURRENT document fields (including the D-02 gate fields lastTestSentAt
// and lastEditedAfterTestAt) is useDocumentInfo() — specifically the
// savedDocumentData context field (Payload 3.84.x; fallback chain to `data`
// then `initialData` per upstream deprecation note).
//
// This is a source-grep contract. The runtime contract is exercised by
// (a) tests/unit/newsletter-composer-gate.test.tsx (jsdom mount, fast, every PR)
// (b) tests/e2e/admin-newsletter-composer.spec.ts (Playwright, full admin shell, CI).

describe('Phase 5 G2 — NewsletterComposer reads gate fields from useDocumentInfo', () => {
  const composerSrc = readFileSync('src/components/payload/NewsletterComposer.tsx', 'utf8');

  it('imports useDocumentInfo from @payloadcms/ui', () => {
    expect(composerSrc).toMatch(/useDocumentInfo/);
    expect(composerSrc).toMatch(/from\s+['"]@payloadcms\/ui['"]/);
  });

  it('references savedDocumentData (the Payload context field for persisted doc fields)', () => {
    // Filter comments to avoid a stray comment satisfying the gate.
    const codeOnly = composerSrc
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(
      codeOnly,
      'NewsletterComposer.tsx must read savedDocumentData (or fallback `data`) from useDocumentInfo() to populate the gate fields',
    ).toMatch(/savedDocumentData/);
  });

  it('does NOT pass props.lastTestSentAt directly to SendBlastButton (the broken pattern)', () => {
    const codeOnly = composerSrc
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    // The broken pattern was: lastTestSentAt={props.lastTestSentAt}
    // The fix passes a resolved local variable: lastTestSentAt={resolvedLastTest}
    expect(
      codeOnly.match(/lastTestSentAt\s*=\s*\{\s*props\.lastTestSentAt\s*\}/g) ?? [],
      'NewsletterComposer.tsx must not pass props.lastTestSentAt directly — Payload\'s slot does not populate it',
    ).toHaveLength(0);
    expect(
      codeOnly.match(/lastEditedAfterTestAt\s*=\s*\{\s*props\.lastEditedAfterTestAt\s*\}/g) ?? [],
      'NewsletterComposer.tsx must not pass props.lastEditedAfterTestAt directly — Payload\'s slot does not populate it',
    ).toHaveLength(0);
  });

  it('passes a resolved local identifier to SendBlastButton (not a props-prefixed value)', () => {
    const codeOnly = composerSrc
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    // Match the wiring at the JSX site. Capture the inner identifier — it must
    // be a bare local variable, NOT props.something.
    const match = codeOnly.match(/lastTestSentAt\s*=\s*\{\s*([^}]+?)\s*\}/);
    expect(match, 'NewsletterComposer.tsx must pass lastTestSentAt to SendBlastButton').not.toBeNull();
    if (match) {
      expect(
        match[1],
        'lastTestSentAt prop value must be a resolved local identifier, not props-prefixed',
      ).not.toMatch(/^props\./);
    }
  });
});
