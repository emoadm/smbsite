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
    ['--color-destructive', '#E72E4D'],
    ['--color-success', '#009F54'],
    ['--color-sky', '#00B7ED'],
    ['--text-sm', '14px'],
    ['--text-base', '16px'],
    ['--text-xl', '20px'],
    ['--text-3xl', '28px'],
  ] as const;

  for (const [name, value] of tokens) {
    it(`declares ${name} = ${value}`, () => {
      expect(css).toMatch(
        new RegExp(`${name.replace(/[-]/g, '\\-')}\\s*:\\s*${value.replace(/[#]/g, '\\#')}`),
      );
    });
  }
});
