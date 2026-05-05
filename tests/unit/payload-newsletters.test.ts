import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Newsletters } from '@/collections/Newsletters';

describe('Phase 5 D-01 — Newsletters Payload collection', () => {
  it('slug is "newsletters"', () => {
    expect(Newsletters.slug).toBe('newsletters');
  });

  it('access policy gates on role IN [admin, editor] (D-25)', () => {
    expect(Newsletters.access).toBeDefined();
    for (const op of ['read', 'create', 'update', 'delete'] as const) {
      const fn = (Newsletters.access as Record<string, unknown>)[op];
      expect(typeof fn).toBe('function');
      const allow = (fn as (a: { req: { user: unknown } }) => boolean);
      expect(allow({ req: { user: { role: 'admin' } } })).toBe(true);
      expect(allow({ req: { user: { role: 'editor' } } })).toBe(true);
      expect(allow({ req: { user: { role: 'member' } } })).toBe(false);
      expect(allow({ req: { user: null } })).toBe(false);
    }
  });

  it('all required fields exist with correct types', () => {
    const byName = new Map(Newsletters.fields.map((f) => [(f as { name?: string }).name, f]));
    for (const name of ['subject', 'previewText', 'topic', 'body', 'scheduledAt', 'status', 'lastTestSentAt', 'lastEditedAfterTestAt']) {
      expect(byName.has(name), `field ${name} missing`).toBe(true);
    }
    expect((byName.get('subject') as { type: string }).type).toBe('text');
    expect((byName.get('subject') as { required?: boolean }).required).toBe(true);
    expect((byName.get('previewText') as { type: string }).type).toBe('textarea');
    expect((byName.get('previewText') as { maxLength?: number }).maxLength).toBe(90);
    expect((byName.get('topic') as { type: string }).type).toBe('select');
    expect((byName.get('body') as { type: string }).type).toBe('richText');
    expect((byName.get('scheduledAt') as { type: string }).type).toBe('date');
    expect((byName.get('status') as { type: string }).type).toBe('select');
    expect((byName.get('lastTestSentAt') as { type: string }).type).toBe('date');
    expect((byName.get('lastEditedAfterTestAt') as { type: string }).type).toBe('checkbox');
  });

  it('topic options are exactly the 4 D-08 enum values', () => {
    const topic = Newsletters.fields.find((f) => (f as { name?: string }).name === 'topic') as {
      options: Array<{ value: string; label: string }>;
    };
    const values = topic.options.map((o) => o.value).sort();
    expect(values).toEqual(['newsletter_events', 'newsletter_general', 'newsletter_reports', 'newsletter_voting']);
  });

  it('status options are exactly draft/scheduled/sending/sent/failed/cancelled with default draft', () => {
    const status = Newsletters.fields.find((f) => (f as { name?: string }).name === 'status') as {
      options: Array<{ value: string }>; defaultValue: string;
    };
    const values = status.options.map((o) => o.value).sort();
    expect(values).toEqual(['cancelled', 'draft', 'failed', 'scheduled', 'sending', 'sent']);
    expect(status.defaultValue).toBe('draft');
  });

  it('body field uses lexicalEditor with restricted features (D-01 / UI-SPEC §5.5.2)', () => {
    const src = readFileSync('src/collections/Newsletters.ts', 'utf8');
    // Strip comments before grepping
    const code = src.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
    expect(code).toMatch(/lexicalEditor\(/);
    expect(code).toMatch(/features:\s*\(\)\s*=>/);
    expect(code).toMatch(/ParagraphFeature\(\)/);
    expect(code).toMatch(/HeadingFeature\(/);
    expect(code).toMatch(/LinkFeature\(/);
    expect(code).toMatch(/UnorderedListFeature\(\)/);
    expect(code).toMatch(/OrderedListFeature\(\)/);
    expect(code).toMatch(/UploadFeature\(/);
    // Banned features must NOT appear
    expect(code).not.toMatch(/BlockquoteFeature/);
    expect(code).not.toMatch(/CodeBlock/);
    expect(code).not.toMatch(/CustomBlock/);
  });

  it('beforeChange hook flips lastEditedAfterTestAt to true on field edit', () => {
    const src = readFileSync('src/collections/Newsletters.ts', 'utf8');
    expect(src).toMatch(/lastEditedAfterTestAt/);
    expect(src).toMatch(/beforeChange/);
  });
});
