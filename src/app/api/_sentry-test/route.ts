import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.SENTRY_TEST_ENABLED !== '1'
  ) {
    return new NextResponse('Not Found', { status: 404 });
  }
  logger.warn({ event: 'sentry.test.invoked' }, 'sentry test route invoked');
  throw new Error('Sentry smoke test — intentional throw');
}
