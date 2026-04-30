import pino, { type LoggerOptions, type Logger } from 'pino';

const REDACT = [
  'email',
  'password',
  'ip',
  'x-forwarded-for',
  'cf-connecting-ip',
  'name',
  'full_name',
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
