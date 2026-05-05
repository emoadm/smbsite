import { describe, it, expect } from 'vitest';
import { Writable } from 'node:stream';
import { readFileSync } from 'node:fs';
import pino from 'pino';


const REDACT_LIST = [
  'email',
  'password',
  'ip',
  'x-forwarded-for',
  'cf-connecting-ip',
  'name',
  'full_name',
];

describe('OPS-03 — pino logger redacts PII (D-21)', () => {
  it('redacts email, name, full_name, ip, x-forwarded-for, cf-connecting-ip', () => {
    const chunks: string[] = [];
    const sink = new Writable({
      write(c, _enc, cb) {
        chunks.push(String(c));
        cb();
      },
    });
    const logger = pino({ level: 'info', redact: REDACT_LIST }, sink);

    logger.info(
      {
        event: 'user.registered',
        userId: 'u1',
        email: 'leak@example.com',
        name: 'Leak Person',
        full_name: 'Leak Full Person',
        ip: '1.2.3.4',
        'x-forwarded-for': '5.6.7.8',
        'cf-connecting-ip': '9.10.11.12',
      },
      'event',
    );

    const out = chunks.join('');
    for (const forbidden of [
      'leak@example.com',
      'Leak Person',
      'Leak Full Person',
      '1.2.3.4',
      '5.6.7.8',
      '9.10.11.12',
    ]) {
      expect(out, `field leaked: ${forbidden}`).not.toContain(forbidden);
    }
    expect(out).toContain('"userId":"u1"');
    expect(out).toContain('[Redacted]');
  });

  it('source declares the same redact list as PATTERNS.md', () => {
    const src = readFileSync('src/lib/logger.ts', 'utf8');
    for (const k of REDACT_LIST) expect(src).toContain(`'${k}'`);
  });

  it('REDACT array includes raw_ip (Phase 2.1 D-19 belt-and-braces)', () => {
    const src = readFileSync('src/lib/logger.ts', 'utf8');
    expect(src).toMatch(/'raw_ip'/);
  });
});

describe('Phase 5 D-24 — REDACT extended for newsletter worker', () => {
  it('REDACT array includes "to" and "recipient_email"', () => {
    const src = readFileSync('src/lib/logger.ts', 'utf8');
    // Strip comments before assertion to avoid the "self-invalidating grep gate" pitfall
    const codeOnly = src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    expect(codeOnly).toMatch(/'to'/);
    expect(codeOnly).toMatch(/'recipient_email'/);
  });
});
