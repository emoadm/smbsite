import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const bg = JSON.parse(readFileSync('messages/bg.json', 'utf8')) as Record<string, any>;

describe('ATTR-06 / D-09 / D-10 — auth.register.source namespace', () => {
  const SOURCE_ENUM = [
    'qr_letter',
    'email_coalition',
    'sinya_site',
    'facebook',
    'linkedin',
    'referral',
    'news_media',
    'other',
  ] as const;

  it('contains label + placeholder + otherPlaceholder', () => {
    const s = bg.auth.register.source;
    expect(s.label).toBe('Откъде научихте за нас?');
    expect(s.placeholder).toBeTruthy();
    expect(s.otherPlaceholder).toBeTruthy();
  });

  it('contains all 8 locked enum values (D-10) with non-empty Bulgarian labels', () => {
    const s = bg.auth.register.source;
    for (const key of SOURCE_ENUM) {
      expect(s[key], `auth.register.source.${key}`).toBeTruthy();
      expect(typeof s[key], `auth.register.source.${key} is string`).toBe('string');
    }
  });

  it('uses formal-respectful tone — no vocative Уважаеми forms (D-21)', () => {
    const blob = JSON.stringify(bg.auth.register.source);
    expect(blob).not.toMatch(/Уважаеми/);
    expect(blob).not.toMatch(/Уважаема/);
  });
});

describe('ATTR-07 / D-12 / D-21 — attribution.dashboard namespace', () => {
  it('has title, filters, columns, tables, export, unknown, denied, loginRequired keys', () => {
    const d = bg.attribution.dashboard;
    expect(d.title).toBeTruthy();
    expect(d.filters).toBeTypeOf('object');
    expect(d.columns).toBeTypeOf('object');
    expect(d.tables).toBeTypeOf('object');
    expect(d.export).toBeTruthy();
    expect(d.unknown).toBeTruthy();
    expect(d.denied).toBeTruthy();
    expect(d.loginRequired).toBeTruthy();
  });

  it('has totalSessions + totalRegistered keys (Phase 1 D-27 — Plan 07 dashboard binds via t.totalSessions / t.totalRegistered, zero hardcoded Cyrillic in JSX)', () => {
    const d = bg.attribution.dashboard;
    expect(d.totalSessions).toBe('Общо посетители');
    expect(d.totalRegistered).toBe('Регистрирани');
  });

  it('unknown label matches OBLAST_NAMES.unknown for cross-module consistency', () => {
    expect(bg.attribution.dashboard.unknown).toBe('Неизвестен');
  });

  it('uses formal-respectful tone — no vocative Уважаеми forms (D-21)', () => {
    const blob = JSON.stringify(bg.attribution.dashboard);
    expect(blob).not.toMatch(/Уважаеми/);
    expect(blob).not.toMatch(/Уважаема/);
  });

  it('declares filter sub-keys: dateRange, utmSource, oblast, qrFlag, selfReportedSource', () => {
    const f = bg.attribution.dashboard.filters;
    for (const key of ['dateRange', 'utmSource', 'oblast', 'qrFlag', 'selfReportedSource']) {
      expect(f[key], `filters.${key}`).toBeTruthy();
    }
  });
});
