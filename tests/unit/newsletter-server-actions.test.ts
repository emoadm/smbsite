import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const FILES = {
  preview: 'src/lib/newsletter/preview.ts',
  blast: 'src/app/actions/send-blast.ts',
  test: 'src/app/actions/send-test.ts',
  cancel: 'src/app/actions/cancel-scheduled.ts',
  count: 'src/app/actions/get-recipient-count.ts',
} as const;

describe('Phase 5 D-25 / Plan 05-01 — every new Server Action calls assertEditorOrAdmin', () => {
  for (const [name, path] of Object.entries(FILES)) {
    it(`${name}.ts imports assertEditorOrAdmin from @/lib/auth/role-gate`, () => {
      const src = readFileSync(path, 'utf8');
      expect(src).toMatch(
        /import\s*\{\s*assertEditorOrAdmin\s*\}\s*from\s+['"]@\/lib\/auth\/role-gate['"]/,
      );
    });
    it(`${name}.ts calls assertEditorOrAdmin in the function body`, () => {
      const src = readFileSync(path, 'utf8');
      expect(src).toMatch(/await\s+assertEditorOrAdmin\(\)/);
    });
    it(`${name}.ts declares 'use server'`, () => {
      const src = readFileSync(path, 'utf8');
      expect(src.split('\n').slice(0, 5).join('\n')).toMatch(/['"]use server['"]/);
    });
  }
});

describe('Phase 5 D-02 — sendBlast 24h gate logic', () => {
  const SRC = readFileSync(FILES.blast, 'utf8');

  it('checks lastTestSentAt presence', () => {
    expect(SRC).toMatch(/lastTestSentAt/);
  });

  it('checks lastEditedAfterTestAt flag (D-02 invalidation)', () => {
    expect(SRC).toMatch(/lastEditedAfterTestAt/);
  });

  it('uses TEST_GATE_MS = 24 hours', () => {
    expect(SRC).toMatch(/24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  });

  it('enqueues newsletter-blast kind', () => {
    expect(SRC).toMatch(/kind:\s*['"]newsletter-blast['"]/);
  });

  it('returns gate_never / gate_expired / gate_invalidated reasons distinctly', () => {
    expect(SRC).toMatch(/gate_never/);
    expect(SRC).toMatch(/gate_expired/);
    expect(SRC).toMatch(/gate_invalidated/);
  });
});

describe('Phase 5 — sendTest enqueues newsletter-test to caller email', () => {
  const SRC = readFileSync(FILES.test, 'utf8');

  it('enqueues newsletter-test kind', () => {
    expect(SRC).toMatch(/kind:\s*['"]newsletter-test['"]/);
  });

  it('uses payloadInst.auth() to get editor email', () => {
    expect(SRC).toMatch(/payloadInst\.auth\(/);
  });

  it('does NOT update lastTestSentAt directly — worker is responsible', () => {
    const code = SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    expect(code).not.toMatch(/lastTestSentAt:\s*new\s+Date/);
  });
});

describe('Phase 5 D-04 / Pitfall 3 — cancelScheduled order: status before remove', () => {
  const SRC = readFileSync(FILES.cancel, 'utf8');
  // Strip line comments so getJob(...) inside the docblock doesn't beat the real call.
  const CODE = SRC.split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');

  it('UPDATE status="cancelled" appears BEFORE BullMQ getJob/remove (line order)', () => {
    const updateIdx = CODE.search(/status:\s*['"]cancelled['"]/);
    const getJobIdx = CODE.search(/getJob\(/);
    expect(updateIdx).toBeGreaterThan(0);
    expect(getJobIdx).toBeGreaterThan(0);
    expect(updateIdx).toBeLessThan(getJobIdx);
  });

  it('wraps job.remove() in try/catch (job may already be active)', () => {
    const code = SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    expect(code).toMatch(/try\s*\{[\s\S]*?job\.remove\(\)[\s\S]*?\}\s*catch/);
  });
});

describe('Phase 5 — preview Server Action uses sentinel URLs', () => {
  const SRC = readFileSync(FILES.preview, 'utf8');

  it('unsubUrl is "#preview" (D-14 — preview never sends)', () => {
    expect(SRC).toMatch(/unsubUrl:\s*['"]#preview['"]/);
  });

  it('preferencesUrl is "#preview"', () => {
    expect(SRC).toMatch(/preferencesUrl:\s*['"]#preview['"]/);
  });

  it('renders NewsletterEmail via @react-email/render', () => {
    expect(SRC).toMatch(/from\s+['"]@react-email\/render['"]/);
    expect(SRC).toMatch(/render\(/);
    expect(SRC).toMatch(/NewsletterEmail/);
  });
});

describe('Phase 5 — getRecipientCount returns count only (no user list)', () => {
  const SRC = readFileSync(FILES.count, 'utf8');

  it('returns count number, not user array', () => {
    expect(SRC).toMatch(/count:\s*number/);
    expect(SRC).toMatch(/recipients\.length/);
  });

  it('reuses getNewsletterRecipients from src/lib/newsletter/recipients', () => {
    expect(SRC).toMatch(/from\s+['"]@\/lib\/newsletter\/recipients['"]/);
  });
});
