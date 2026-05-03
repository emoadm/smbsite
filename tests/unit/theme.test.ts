import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('BRAND-01 — Tailwind v4 theme tokens', () => {
  const css = readFileSync(path.resolve('src/styles/globals.css'), 'utf8');
  const tokens = [
    ['--color-background', '#FFFFFF'],
    ['--color-surface', '#F1F5F9'],
    ['--color-foreground', '#0F172A'],
    ['--color-muted-foreground', '#475569'],
    ['--color-border', '#E2E8F0'],
    ['--color-accent', '#004A79'],
    // Token values retuned in Phase 2 (Plan 02-01) per UI-SPEC §4.6 backcompat layer:
    // destructive #E72E4D → #DC2626 + success #009F54 → #059669 (AA contrast tightening),
    // sky retuned to canonical Sinya #3AC7FF extracted from sinyabulgaria.bg.
    ['--color-destructive', '#DC2626'],
    ['--color-success', '#059669'],
    ['--color-sky', '#3AC7FF'],
    // Typography ramp moved from pixel values to rem-based per UI-SPEC §3.3.
    ['--text-sm', '0.875rem'],
    ['--text-base', '1rem'],
    ['--text-xl', '1.25rem'],
    ['--text-3xl', '1.875rem'],
  ] as const;

  for (const [name, value] of tokens) {
    it(`declares ${name} = ${value}`, () => {
      expect(css).toMatch(
        new RegExp(`${name.replace(/[-]/g, '\\-')}\\s*:\\s*${value.replace(/[#]/g, '\\#')}`),
      );
    });
  }
});
