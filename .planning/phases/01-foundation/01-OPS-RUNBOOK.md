# Phase 1 — Operations Runbook

Procedures the developer / operator runs ONCE per environment. Reference document for plan 1.13's deliverability checklist.

## 1. Cloudflare WAF setup (OPS-01, D-22)

Pre-requisite: Fly.io app deployed (Task 1.12.1) and reachable at `<app-name>.fly.dev`.

1. In Cloudflare → Add Site → enter `chastnik.eu` (final root domain).
2. Update domain registrar's nameservers to Cloudflare's two assigned nameservers.
3. SSL/TLS → Overview → mode = **Full (Strict)**.
4. DNS → Add A record:
   - Name: `@`
   - IPv4: Fly.io app's public IPv4 (`fly ips list -a smbsite-prod`)
   - Proxy status: Proxied (orange cloud)
5. DNS → Add CNAME:
   - Name: `auth`
   - Target: `chastnik.eu`
   - Proxy status: Proxied (orange cloud)
6. Security → WAF → Custom rules → Create rule:
   - Name: "Block non-Cloudflare origin hits"
   - Expression: `(not ip.src in $cloudflare_ip_ranges) and (http.host eq "chastnik.eu")`
   - Action: Block
7. Verify: from a server outside Cloudflare, `curl -I https://<fly-host>.fly.dev/` returns 403 once the WAF is active.

## 2. Payload first-admin bootstrap (D-25, RESEARCH Q5)

Payload's "first-user creates admin" flow is gated to localhost. In production, use `fly ssh`:

1. `fly ssh console -a smbsite-prod`
2. Inside the container shell:
   ```
   node --import tsx -e "import('./src/payload.config').then(async ({ default: cfg }) => { const { default: payload } = await import('payload'); await payload.init({ config: cfg }); const admin = await payload.create({ collection: 'users', data: { email: '<admin-email>', password: '<temp-password>', role: 'admin' } }); console.log('admin created:', admin.id); process.exit(0); });"
   ```
3. Email the temporary password to the admin via secure channel (1Password/Bitwarden share).
4. Admin signs in at `https://chastnik.eu/admin` and immediately changes the password.
5. Verify the `users` Payload row count is 1 (psql or admin UI).

Subsequent admins are added by an existing admin via Payload's invite-user UI.

## 3. Sentry EU DSN verification (Pitfall G)

Before each deploy, the CI job `verify-eu-dsn` runs `pnpm verify:eu-dsn` and asserts `SENTRY_DSN` matches `.de.sentry.io` or `.eu.sentry.io`. If the assertion fails, the deploy aborts.

Manual one-shot verification: `SENTRY_DSN=$(fly secrets list -a smbsite-prod | grep SENTRY_DSN | head -n 1)` then run the script locally.

Post-deploy verification of OPS-02: set `SENTRY_TEST_ENABLED=1`, hit `/api/_sentry-test`, confirm event in Sentry EU dashboard. Unset the env var afterwards: `fly secrets unset SENTRY_TEST_ENABLED -a smbsite-prod`.

## 4. Postgres restore procedure (D-24)

Tested before Phase 1 sign-off.

1. Identify the desired backup in Bunny Storage zone `smbsite-backups` (FTP / API).
2. Download: `curl -O -H "AccessKey: $BUNNY_STORAGE_PASSWORD" https://storage.bunnycdn.com/smbsite-backups/<filename>`
3. Provision a Neon dev branch: `neon branches create --name restore-test`
4. Restore: `gunzip -c <filename> | pg_restore --dbname=$RESTORE_BRANCH_DIRECT_URL --clean --if-exists`
5. Sanity check row counts:
   ```sql
   SELECT 'users' AS t, COUNT(*) FROM users
   UNION ALL SELECT 'consents', COUNT(*) FROM consents
   UNION ALL SELECT 'sessions', COUNT(*) FROM sessions;
   ```
6. Compare against expected counts from production at backup time.
7. Drop the restore branch when verification is complete.

## 5. Worker process operations

The `worker` process group runs `scripts/start-worker.ts`. Useful commands:
- Tail logs: `fly logs -a smbsite-prod --process worker`
- Restart: `fly machine restart -a smbsite-prod --process worker`
- Inspect failed jobs (BullMQ Bull Board UI not deployed in Phase 1 — use Upstash console or dump via worker's diagnostic endpoint added in Phase 5).

## 6. First-deploy checklist

- [ ] All `.env.example` values set as Fly secrets (`fly secrets set` for each)
- [ ] `SENTRY_DSN` ends in `.de.sentry.io` (verified by CI)
- [ ] Cloudflare WAF rule active (Step 1 above)
- [ ] Drizzle and Payload migrations both ran cleanly in deploy job
- [ ] Payload first admin created (Step 2 above)
- [ ] `/api/_sentry-test` produced a Sentry event (Step 3 above; flag toggled off after)
- [ ] First nightly backup landed in Bunny Storage; size > 1KiB (Step 4 verifiable next morning)
- [ ] Restore procedure dry-run succeeded (Step 4 above)
