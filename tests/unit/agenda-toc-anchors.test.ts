import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guards against TOC drift on /agenda: every TOC_ITEMS id must have a
 * matching <h2 id="..."> in page.tsx. Slice 1 ships 3 anchors; Phase 02.3
 * will extend this set. This test parses the source string with regex
 * (no JSX runtime needed) — it's a static-source assertion.
 */
describe('/agenda TOC anchors', () => {
  const source = readFileSync(
    resolve(__dirname, '../../src/app/(frontend)/agenda/page.tsx'),
    'utf8',
  );

  // Extract TOC ids from the TOC_ITEMS array literal
  const tocBlock = source.match(/const TOC_ITEMS[\s\S]*?\];/)?.[0] ?? '';
  const tocIds = [...tocBlock.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map(
    (m) => m[1],
  );

  // Extract h2 ids from JSX (id="..." on h2 elements)
  const h2Ids = [...source.matchAll(/<h2\s+id=["']([^"']+)["']/g)].map(
    (m) => m[1],
  );

  it('has at least 8 TOC entries (slice 2 — plan 02 partial)', () => {
    expect(tocIds.length).toBeGreaterThanOrEqual(8);
  });

  it('every TOC id has a matching <h2 id="…">', () => {
    for (const id of tocIds) {
      expect(h2Ids).toContain(id);
    }
  });

  it('contains the locked slice-1 anchors', () => {
    expect(tocIds).toEqual(
      expect.arrayContaining(['manifest', 'desen-konsensus', 'ikonomika']),
    );
  });

  it('contains the slice-2 plan-01 anchors (Енергетика, Земеделие, Здравеопазване, Външна сигурност)', () => {
    expect(tocIds).toEqual(
      expect.arrayContaining([
        'energetika',
        'zemedelie',
        'zdraveopazvane',
        'vanshna-sigurnost',
      ]),
    );
  });

  it('contains the slice-2 plan-02 anchor for Образование', () => {
    expect(tocIds).toContain('obrazovanie');
  });
});
