// src/lib/geoip.ts
//
// MaxMind GeoLite2 in-process lookup wrapper. Loaded ONCE per process via a
// lazy singleton (mirrors src/lib/email/queue.ts lines 16-27 IORedis pattern).
//
// CRITICAL — Node runtime only. DO NOT import from src/middleware.ts or any
// Edge route. `Reader.open()` calls fs.readFile, which is not available in
// the Next.js Edge runtime (RESEARCH.md Pitfall 1). Build will fail with
// "Module not found: Can't resolve 'fs'" if you do.
//
// D-01: This module overrides the ipapi.co row in CLAUDE.md tech stack guide.
// Authority: .planning/legal/attribution-balancing-test.md.
// D-03: Lookup failure → return { oblast: 'unknown', country: 'unknown' }.
//       Never throws; worker MUST always write the attribution row.
// D-24: Oblast format = ISO 3166-2 code (e.g. 'BG-22'). Constructed by
//       concatenating country.isoCode + '-' + subdivisions[0].isoCode
//       (Pitfall 4 — MaxMind returns only the numeric suffix in subdivisions).

import { Reader, type ReaderModel } from '@maxmind/geoip2-node';
import path from 'node:path';

// Reader.open() returns a ReaderModel (the queryable wrapper); Reader itself
// is the static factory. Tracked as a Pitfall-4-adjacent type quirk.
let _reader: ReaderModel | null = null;

export async function getGeoReader(): Promise<ReaderModel> {
  if (_reader) return _reader;
  const mmdbPath = process.env.GEOIP_DB_PATH ?? path.join(process.cwd(), 'GeoLite2-City.mmdb');
  _reader = await Reader.open(mmdbPath, { cache: { max: 1000 } });
  return _reader;
}

export interface GeoLookupResult {
  oblast: string; // ISO 3166-2 e.g. 'BG-22' or 'unknown'
  country: string; // ISO alpha-2 e.g. 'BG' or 'unknown'
}

export async function lookupIp(ip: string): Promise<GeoLookupResult> {
  if (!ip || typeof ip !== 'string') return { oblast: 'unknown', country: 'unknown' };
  try {
    const reader = await getGeoReader();
    const response = reader.city(ip);
    const countryCode = response.country?.isoCode ?? null;
    const subdivSuffix = response.subdivisions?.[0]?.isoCode ?? null;
    const oblast = countryCode && subdivSuffix ? `${countryCode}-${subdivSuffix}` : 'unknown';
    const country = countryCode ?? 'unknown';
    return { oblast, country };
  } catch {
    // D-03: always return unknown on any error (private IP, IPv6 miss, mmdb absent)
    return { oblast: 'unknown', country: 'unknown' };
  }
}

// Test helper — resets the singleton so tests can swap GEOIP_DB_PATH between cases.
// Not exported to non-test code paths in production (no production caller imports this).
export function __resetReaderForTests(): void {
  _reader = null;
}
