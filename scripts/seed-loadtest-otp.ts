import 'dotenv/config';
import { Client } from 'pg';
import { hashOtp } from '../src/lib/auth-utils';

// STAGING ONLY — referenced by .planning/phases/02.1-attribution-source-dashboard/02.1-LOAD-TEST.md §4.
// Seeds a fixture user + a long-lived verification_tokens row so k6's
// otpVerifyHit scenario can submit the same email/code repeatedly.

async function main() {
  const [, , email, code] = process.argv;
  if (!email || !code) {
    console.error('usage: tsx scripts/seed-loadtest-otp.ts <email> <code>');
    process.exit(1);
  }
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('DIRECT_URL/DATABASE_URL not set');

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO users (email, name, full_name, sector, role, self_reported_source, email_verified)
       VALUES ($1, 'Load Test', 'Load Test', 'services', 'owner', 'qr_letter', NULL)
       ON CONFLICT (email) DO UPDATE
         SET email_verified = NULL, full_name = EXCLUDED.full_name`,
      [email],
    );
    const tokenHash = hashOtp(code, email);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await client.query(`DELETE FROM verification_tokens WHERE identifier = $1`, [email]);
    await client.query(
      `INSERT INTO verification_tokens (identifier, token, expires, kind, attempts)
       VALUES ($1, $2, $3, 'login', '0')`,
      [email, tokenHash, expires.toISOString()],
    );
    const r = await client.query(
      `SELECT COUNT(*)::int AS count FROM verification_tokens WHERE identifier = $1`,
      [email],
    );
    console.warn(
      `seeded user=${email} verification_tokens.rows=${r.rows[0].count} expires=${expires.toISOString()}`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
