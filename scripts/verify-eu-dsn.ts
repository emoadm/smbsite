/** Pitfall G: Sentry DSN must point to EU region (.de.sentry.io). */
const dsn = process.env.SENTRY_DSN ?? '';
if (!dsn) {
  console.error('SENTRY_DSN is not set');
  process.exit(1);
}
if (!/\.de\.sentry\.io|\.eu\.sentry\.io/.test(dsn)) {
  console.error('FAIL: SENTRY_DSN does not point to EU region. Got:', dsn.replace(/[a-f0-9]{32,}/g, '<redacted>'));
  console.error('Expected hostname containing ".de.sentry.io" or ".eu.sentry.io"');
  process.exit(2);
}
console.log('OK: SENTRY_DSN points to EU region.');
