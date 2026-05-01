/**
 * Bootstrap a first Payload admin user.
 *
 * Usage (in fly ssh console at /app):
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='strong-pw' \
 *     node_modules/.bin/tsx scripts/bootstrap-admin.ts
 *
 * The Users collection's access rules require req.user for create (D-25 gates the
 * public first-admin signup), so this script bypasses access via overrideAccess.
 * Idempotent: if the email already exists the script reports and exits 0.
 *
 * IIFE wrapper required because the project is CommonJS (no "type": "module")
 * and tsx transforms .ts files as CJS by default — top-level await is rejected.
 */
import payload from 'payload';
import config from '../src/payload.config';

const email = process.env.ADMIN_EMAIL?.trim();
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Required: ADMIN_EMAIL and ADMIN_PASSWORD env vars');
  process.exit(1);
}

(async () => {
  await payload.init({ config });

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  });

  if (existing.totalDocs > 0) {
    console.log(`admin already exists: ${existing.docs[0].id} (${email})`);
    process.exit(0);
  }

  const result = await payload.create({
    collection: 'users',
    data: { email, password, role: 'admin' },
    overrideAccess: true,
  });

  console.log(`admin created: ${result.id} (${email})`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
