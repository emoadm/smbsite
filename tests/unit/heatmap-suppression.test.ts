import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(process.cwd(), 'src/lib/submissions/public-queries.ts'), 'utf8');

describe('public-queries.ts D-D2 small-N suppression', () => {
  it('oblast aggregate uses HAVING count(*) >= 5', () => {
    expect(src).toMatch(/having\(sql`count\(\*\) >= 5`\)/);
  });
  it('oblast aggregate filters kind=problem AND level=local', () => {
    expect(src).toMatch(/eq\(submissions\.kind, 'problem'\)/);
    expect(src).toMatch(/eq\(submissions\.level, 'local'\)/);
  });
  it('national-bucket function returns null when count < 5', () => {
    expect(src).toMatch(/c >= 5 \? \{ count: c \} : null/);
  });
  it('top-topic function returns null when topCount < 5', () => {
    expect(src).toMatch(/top\.count < 5/);
  });
});
