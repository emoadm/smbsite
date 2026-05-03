import { describe, it, expect, beforeEach } from 'vitest';
import { lookupIp, __resetReaderForTests } from '@/lib/geoip';
import { OBLAST_NAMES, oblastDisplayName } from '@/lib/oblast-names';

describe('ATTR-02 / D-03 — GeoIP lookup fallback', () => {
  beforeEach(() => __resetReaderForTests());

  it('returns unknown for an empty IP and never throws (D-03)', async () => {
    // No mmdb required — invalid input short-circuits before Reader.open()
    await expect(lookupIp('')).resolves.toEqual({ oblast: 'unknown', country: 'unknown' });
  });

  it('returns unknown for a non-string input and never throws (D-03)', async () => {
    // @ts-expect-error — testing runtime guard
    await expect(lookupIp(null)).resolves.toEqual({ oblast: 'unknown', country: 'unknown' });
  });

  it('returns unknown for a malformed IP string when no mmdb is loaded (D-03)', async () => {
    // GEOIP_DB_PATH points to a non-existent file → Reader.open throws → caught → unknown
    process.env.GEOIP_DB_PATH = '/tmp/this-mmdb-does-not-exist-' + Date.now() + '.mmdb';
    await expect(lookupIp('not-an-ip')).resolves.toEqual({ oblast: 'unknown', country: 'unknown' });
    delete process.env.GEOIP_DB_PATH;
  });
});

describe('ATTR-02 / D-24 — OBLAST_NAMES constant', () => {
  it('has 28 BG oblast entries plus an unknown fallback (29 keys total)', () => {
    expect(Object.keys(OBLAST_NAMES)).toHaveLength(29);
  });

  it('maps BG-22 to София and BG-23 to София-град (canonical sanity check)', () => {
    expect(OBLAST_NAMES['BG-22']).toBe('София');
    expect(OBLAST_NAMES['BG-23']).toBe('София-град');
  });

  it('maps every BG-01..BG-28 key', () => {
    for (let i = 1; i <= 28; i++) {
      const code = `BG-${String(i).padStart(2, '0')}`;
      expect(OBLAST_NAMES[code]).toBeTruthy();
    }
  });

  it('oblastDisplayName returns Неизвестен for null/undefined/missing-code', () => {
    expect(oblastDisplayName(null)).toBe('Неизвестен');
    expect(oblastDisplayName(undefined)).toBe('Неизвестен');
    expect(oblastDisplayName('XX-99')).toBe('Неизвестен');
  });
});
