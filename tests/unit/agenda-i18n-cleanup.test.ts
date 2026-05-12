import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Regression guard for Phase 02.3 i18n cleanup. Asserts the agenda
 * namespace in messages/bg.json has the post-slice-2 shape — no
 * draftAlert, no body placeholder, but a populated metadataDescription.
 */
describe('Phase 02.3 — agenda i18n cleanup', () => {
  const bg = readFileSync('messages/bg.json', 'utf8');
  // Match only the TOP-LEVEL "agenda" namespace (2-space indent = root key).
  // Nested "agenda" keys (e.g. inside dashboard) have deeper indentation.
  const agendaBlock = bg.match(/^  "agenda":\s*\{[\s\S]*?\n  \}/m)?.[0] ?? '';

  it('agenda namespace has been parsed', () => {
    expect(agendaBlock).toContain('"agenda"');
    expect(agendaBlock).toContain('"title"');
  });

  it('agenda.body key has been dropped', () => {
    expect(agendaBlock).not.toContain('"body"');
  });

  it('agenda.draftAlert key has been dropped', () => {
    expect(agendaBlock).not.toContain('"draftAlert"');
  });

  it('agenda.metadataDescription key has been added', () => {
    expect(agendaBlock).toContain('"metadataDescription"');
  });

  it('no [ТЕКСТ ОТ КОАЛИЦИЯ] placeholder remains in agenda', () => {
    expect(agendaBlock).not.toContain('[ТЕКСТ ОТ КОАЛИЦИЯ]');
  });
});
