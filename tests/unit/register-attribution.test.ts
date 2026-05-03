import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('ATTR-06 / D-11 — register Server Action self_reported_source extension', () => {
  const src = readFileSync('src/app/actions/register.ts', 'utf8');

  it('declares SelfReportedSourceEnum with all 8 D-10 enum values', () => {
    expect(src).toMatch(/SelfReportedSourceEnum\s*=\s*z\.enum\(/);
    for (const v of ['qr_letter', 'email_coalition', 'sinya_site', 'facebook', 'linkedin', 'referral', 'news_media', 'other']) {
      expect(src, `enum value ${v}`).toContain(`'${v}'`);
    }
  });

  it('RegistrationSchema includes self_reported_source (required) + self_reported_other (optional max 300)', () => {
    expect(src).toMatch(/self_reported_source:\s*SelfReportedSourceEnum/);
    expect(src).toMatch(/self_reported_other:\s*z\.string\(\)\.max\(300\)\.optional\(\)/);
  });

  it('db.insert(users).values block carries both new columns', () => {
    // Find the values({ ... }) block following insert(users)
    const m = src.match(/insert\(users\)\s*\.values\(\s*\{[\s\S]*?\}\s*\)/);
    expect(m, 'expected insert(users).values({...}) block').not.toBeNull();
    const block = m![0];
    expect(block).toMatch(/self_reported_source:\s*data\.self_reported_source/);
    expect(block).toMatch(/self_reported_other:\s*data\.self_reported_other\s*\?\?\s*null/);
  });

  it('preserves existing required fields (regression — email, name, sector, role still present)', () => {
    const m = src.match(/insert\(users\)\s*\.values\(\s*\{[\s\S]*?\}\s*\)/);
    const block = m![0];
    expect(block).toContain('email: data.email');
    expect(block).toContain('full_name: data.full_name');
    expect(block).toContain('sector: data.sector');
    expect(block).toContain('role: data.role');
  });
});
