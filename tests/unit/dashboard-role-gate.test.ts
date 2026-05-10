import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('ATTR-07 / D-13 — attribution dashboard role gate (AttributionView.tsx)', () => {
  const src = readFileSync('src/app/(payload)/admin/views/attribution/AttributionView.tsx', 'utf8');

  it('exports AttributionView async function with AdminViewServerProps signature', () => {
    expect(src).toMatch(/export async function AttributionView\(/);
    expect(src).toMatch(/AdminViewServerProps/);
  });

  it('checks role using singular "role" property (NOT "roles" plural)', () => {
    expect(src).toMatch(/\(user as \{ role\?:\s*string \}\)\.role/);
    // Defensive: forbid the wrong PATTERNS.md/RESEARCH.md `roles` plural form
    expect(src).not.toMatch(/\(user as any\)\.roles/);
  });

  it('role gate restricts to admin, editor, or super_editor (Phase 4 EDIT-07 extension)', () => {
    // Phase 4 EDIT-07 extended the gate to include super_editor.
    // The old assertion ['admin','editor'] is superseded by the new 3-element check.
    expect(src).toMatch(/\['admin', 'editor', 'super_editor'\]\.includes\(role\)/);
  });

  it('renders denial element BEFORE calling fetchAttributionAggregates (no data leak on bad role)', () => {
    const denialIdx = src.indexOf('t.denied');
    const fetchIdx = src.indexOf('fetchAttributionAggregates(');
    expect(denialIdx, 'denial render present').toBeGreaterThan(-1);
    expect(fetchIdx, 'aggregate fetch present').toBeGreaterThan(-1);
    expect(denialIdx, 'denial must appear before aggregate fetch in source').toBeLessThan(fetchIdx);
  });

  it('renders loginRequired BEFORE calling fetchAttributionAggregates', () => {
    const loginIdx = src.indexOf('t.loginRequired');
    const fetchIdx = src.indexOf('fetchAttributionAggregates(');
    expect(loginIdx).toBeLessThan(fetchIdx);
  });
});

describe('ATTR-07 — attribution dashboard Server Action role re-check (actions.ts — defense in depth)', () => {
  const src = readFileSync('src/app/(payload)/admin/views/attribution/actions.ts', 'utf8');

  it('uses assertEditorOrAdmin (imported from shared module per Phase 5 D-25) and calls it at the start of fetchAttributionAggregates', () => {
    // Phase 5 D-25: helper extracted to src/lib/auth/role-gate.ts; actions.ts now imports it
    expect(src).toMatch(/from\s+['"]@\/lib\/auth\/role-gate['"]/);
    expect(src).toMatch(/assertEditorOrAdmin/);
    // Both exported actions must call the gate first.
    const aggMatch = src.match(/export async function fetchAttributionAggregates[\s\S]*?\{[\s\S]*?await assertEditorOrAdmin\(\)/);
    const csvMatch = src.match(/export async function fetchAttributionCsv[\s\S]*?\{[\s\S]*?await assertEditorOrAdmin\(\)/);
    expect(aggMatch, 'fetchAttributionAggregates calls gate').not.toBeNull();
    expect(csvMatch, 'fetchAttributionCsv calls gate').not.toBeNull();
  });

  it('uses Drizzle parameterized helpers (eq/gte/lte) — no raw string concat in WHERE', () => {
    // Filter conditions are built in buildWhere() using eq/gte/lte from drizzle-orm,
    // which guarantees parameterized SQL (no raw user-input concatenation).
    expect(src).toMatch(/from 'drizzle-orm'/);
    expect(src).toMatch(/eq\(attribution_events\./);
    expect(src).toMatch(/gte\(attribution_events\.first_seen_at/);
    expect(src).toMatch(/lte\(attribution_events\.first_seen_at/);
  });
});

describe('ATTR-07 — payload.config.ts custom view registration', () => {
  const src = readFileSync('src/payload.config.ts', 'utf8');

  it('registers attribution view under admin.components.views', () => {
    expect(src).toMatch(/components:\s*\{/);
    expect(src).toMatch(/views:\s*\{/);
    expect(src).toMatch(/attribution:\s*\{/);
  });

  it('Component path points at AttributionView#AttributionView named export', () => {
    expect(src).toMatch(/AttributionView#AttributionView/);
  });

  it('view path is /views/attribution', () => {
    expect(src).toMatch(/path:\s*'\/views\/attribution'/);
  });
});
