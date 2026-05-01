---
created: 2026-05-01
priority: medium
phase: 1
resolves_phase: 2
tags: [ops, cloudflare, security, deferred]
---

# Activate Cloudflare WAF rule blocking non-Cloudflare origin hits

## Status
Deferred from Phase 1 plan 01-12 (T-12-origin-bypass mitigation).

The OPS-RUNBOOK Step 1 / D-22 / OPS-01 calls for a custom WAF rule that blocks any request to `chastnik.eu` whose source IP is not in Cloudflare's published edge ranges. The rule was not activated during Phase 1 because the `$cloudflare_ip_ranges` managed list is not exposed on the free Cloudflare plan, and building a custom IP list was deferred for momentum.

## Why deferred for now
- No live user data in Phase 1 — origin-bypass is low impact (attacker would need to discover the Fly hostname `smbsite-prod.fly.dev` first; nothing publicly leaks it).
- App-layer Upstash rate limits from plan 01-06 already throttle mass-registration / OTP-flood scenarios at the practical-attack layer.
- Phase 1 sign-off prioritises shipping the warmup-list registration flow.

## How to resolve (do before Phase 2 ships public agitation pages)
Pick one:

1. **Build a custom IP list** (~10 min one-time):
   - Cloudflare → WAF → Tools → Lists → Create new list `cf_origin_ips` (IP address type).
   - Paste the 22 Cloudflare IPv4+v6 ranges from https://www.cloudflare.com/ips/.
   - Cloudflare → Security → WAF → Custom rules → Create rule:
     - Expression: `(not ip.src in $cf_origin_ips) and (http.host eq "chastnik.eu")`
     - Action: Block
   - Add a 6-month calendar reminder to refresh the list (Cloudflare changes IPs rarely, but does change them).

2. **Cloudflare Authenticated Origin Pulls + nginx/Caddy in front of Fly app**:
   - Heavier setup; only needed if the app handles regulated data and origin-bypass becomes a critical threat.

3. **Cloudflare Transform Rule + shared-secret header**:
   - Add `X-CF-Origin-Auth: <random-secret>` via Cloudflare Transform Rule.
   - Add a Next.js middleware check that rejects requests missing the header.
   - Cleanest long-term solution but requires app code change + redeploy.

## Verification after activation
```bash
curl -I https://smbsite-prod.fly.dev/    # expect 403 (Cloudflare WAF blocks direct Fly hits)
curl -I https://chastnik.eu/             # expect 200 (proxied path still works)
```
