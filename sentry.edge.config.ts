import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    if (event.request?.headers) {
      const h = event.request.headers as Record<string, unknown>;
      delete h['cf-connecting-ip'];
      delete h['x-forwarded-for'];
    }
    return event;
  },
});
