/**
 * One-shot Payload admin bootstrap route (D-25 fallback).
 *
 * Plan 01-12's `fly ssh console` + `payload create` path is blocked by a
 * Payload v3 / Next 15.3 compatibility bug in payload's bin/loadEnv.js
 * (default-import expectation on next/env). This route runs Payload from
 * inside Next's runtime where the import graph is correct.
 *
 * Disabled unless `ADMIN_BOOTSTRAP_SECRET` Fly secret is set. After creating
 * the first admin, unset the secret with:
 *   fly secrets unset ADMIN_BOOTSTRAP_SECRET -a smbsite-prod
 * which disables the route entirely.
 */
import { getPayload } from 'payload';
import config from '@/payload.config';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!secret) {
    return new Response('Bootstrap disabled', { status: 503 });
  }
  if (req.headers.get('x-bootstrap-secret') !== secret) {
    return new Response('Forbidden', { status: 403 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;
  if (!email || !password) {
    return new Response('Missing email or password', { status: 400 });
  }

  const payload = await getPayload({ config });

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  });

  if (existing.totalDocs > 0) {
    return Response.json({
      status: 'exists',
      id: existing.docs[0].id,
      email,
    });
  }

  const user = await payload.create({
    collection: 'users',
    data: { email, password, role: 'admin' },
    overrideAccess: true,
  });

  return Response.json({
    status: 'created',
    id: user.id,
    email: user.email,
  });
}
