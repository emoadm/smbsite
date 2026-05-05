import pino, { type LoggerOptions, type Logger } from 'pino';

const REDACT = [
  'email',
  'password',
  'ip',
  'x-forwarded-for',
  'cf-connecting-ip',
  'name',
  'full_name',
  'raw_ip', // Phase 2.1 D-19 / D-21 belt-and-braces — see src/lib/attribution/worker.ts
  'to',              // Phase 5 D-24 — newsletter worker per-recipient send results
  'recipient_email', // Phase 5 D-24 — alternative key in newsletter worker logs
];

function buildOptions(): LoggerOptions {
  const isProd = process.env.NODE_ENV === 'production';
  const base: LoggerOptions = {
    level: process.env.LOG_LEVEL ?? 'info',
    redact: { paths: REDACT, censor: '[Redacted]' },
    formatters: { level: (label) => ({ level: label }) },
    timestamp: pino.stdTimeFunctions.isoTime,
  };
  if (isProd && process.env.BETTERSTACK_SOURCE_TOKEN) {
    base.transport = {
      target: '@logtail/pino',
      options: { sourceToken: process.env.BETTERSTACK_SOURCE_TOKEN },
    };
  } else if (!isProd) {
    base.transport = {
      target: 'pino-pretty',
      options: { translateTime: 'SYS:standard' },
    };
  }
  return base;
}

export const logger: Logger = pino(buildOptions());
