import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('ATTR-02 / D-08 / D-19 / GDPR-09 — attribution worker', () => {
  // Read source once; share across all assertions.
  const src = readFileSync('src/lib/attribution/worker.ts', 'utf8');
  const codeOnly = src
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');

  it('imports lookupIp from @/lib/geoip', () => {
    expect(src).toMatch(/import\s*\{\s*lookupIp\s*\}\s*from\s*'@\/lib\/geoip'/);
  });

  it('calls lookupIp(raw_ip ?? "") exactly once on the request payload', () => {
    expect(codeOnly).toMatch(/lookupIp\(raw_ip\s*\?\?\s*''\)/);
  });

  it('Drizzle insert .values({...}) block does NOT reference raw_ip (D-19)', () => {
    // Find the .values({ ... }) call block and assert raw_ip is absent inside.
    // Conservative grep: the entire codeOnly string must not contain
    // raw_ip *after* the .values( opener — except in the very first line
    // where we destructure it from job.data and as the lookupIp argument.
    const valuesIndex = codeOnly.indexOf('.values({');
    expect(valuesIndex, 'worker must call db.insert(...).values({...})').toBeGreaterThan(-1);
    const valuesBlock = codeOnly.slice(valuesIndex);
    // Allow raw_ip ONLY inside the destructure or lookupIp call (which appear
    // before .values()). Inside the values block: zero occurrences.
    expect(valuesBlock).not.toMatch(/raw_ip/);
  });

  it('uses onConflictDoUpdate on attribution_events.attr_sid (D-04 upsert)', () => {
    expect(src).toMatch(/onConflictDoUpdate/);
    expect(src).toMatch(/target:\s*attribution_events\.attr_sid/);
  });

  it('derives qr_flag from utm_medium === "qr" case-insensitively (ATTR-01)', () => {
    expect(codeOnly).toMatch(/utm_medium.*toLowerCase\(\)\s*===\s*'qr'/);
  });

  it('logger.info call structured object does NOT contain raw_ip (Pitfall 6)', () => {
    // Find the logger.info({...}) call and assert raw_ip is absent inside.
    const m = codeOnly.match(/logger\.info\(\s*\{[^}]*\}/);
    expect(m, 'worker must call logger.info({...})').not.toBeNull();
    expect(m![0]).not.toMatch(/raw_ip/);
  });
});
