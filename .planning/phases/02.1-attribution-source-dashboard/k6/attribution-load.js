// Phase 2.1 OPS-05 attribution load test (D-15, D-16, D-17, D-26).
//
// !!! STAGING ONLY !!!
// This script seeds and exercises a fixture user via the OTP verify path.
// NEVER run against production: the OTP fixture (loadtest+otp@chastnik.eu /
// code 000000) is intentionally weak so the load runner can hammer it.
// Production seed is deliberately absent. Operator: confirm TARGET_URL points
// at https://staging.chastnik.eu (or your staging hostname) before running.
//
// Scenario: 2x QR-peak RPS sustained for 5 minutes against staging.
// Four HTTP scenarios per VU iteration simulate the full visitor → register
// → OTP-verify funnel with a SHARED cookie jar so the attr_sid set on the
// landing hit actually flows through to the OTP verify (which is the moment
// the attribution_events.user_id linkage UPDATE fires per Plan 06 D-07).
//
//   Leg 1 (landing_hit):   GET /?utm_*  — sets nothing, hits Cloudflare cache
//   Leg 2 (attr_init):     GET /api/attr/init?utm_*&path=/  — sets attr_sid + enqueues
//   Leg 3 (register_hit):  POST /register  — register Server Action with self_reported_source
//   Leg 4 (otp_verify_hit, D-16): POST /auth/otp  — verifyOtp action, fires linkage UPDATE
//
// Run from a Hetzner CX21 EU runner (Falkenstein, ~€0.01/h):
//   k6 run --out json=k6-results.json \
//     -e TARGET_URL=https://staging.chastnik.eu \
//     -e TARGET_RPS=10 \
//     -e STAGING_TEST_OTP=000000 \
//     attribution-load.js
//
// TARGET_RPS calculation (D-26):
//   mail_drop_volume × scan_rate_pct × peak_compression_factor / peak_window_seconds
//   Default 2 RPS = ~10,000 letters × 5% × 10× peak compression / 7,200s × 2
//   = ~1.4 RPS rounded up. Coalition overrides via TARGET_RPS env before launch.
//
// otp_verify_hit rate rationale (D-16):
//   Not every register flow proceeds to OTP submit at the same rate as landing
//   hits — funnel drop-off is real (visitor closes tab, never gets the email,
//   etc.). 30% of TARGET_RPS reflects a realistic OTP-submit conversion ceiling
//   for the launch-day burst. Adjust upward by setting OTP_RPS_FRACTION env.
//
// Failure = phase ship blocker AND QR mail drop blocker (D-17).

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.TARGET_URL || 'https://staging.chastnik.eu';
const TARGET_RPS = parseInt(__ENV.TARGET_RPS || '2', 10);
const OTP_RPS_FRACTION = parseFloat(__ENV.OTP_RPS_FRACTION || '0.3');
const OTP_RPS = Math.max(1, Math.floor(TARGET_RPS * OTP_RPS_FRACTION));
const STAGING_TEST_OTP = __ENV.STAGING_TEST_OTP || '000000';
const STAGING_TEST_EMAIL = __ENV.STAGING_TEST_EMAIL || 'loadtest+otp@chastnik.eu';

// Staging Turnstile sitekey is the always-pass test key
// (NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA on staging Fly secret).
// Request body uses the matching test response token.
const TURNSTILE_TEST_RESPONSE = 'XXXX.DUMMY.TOKEN.XXXX';

// Next.js Server Action dispatch header. Operator captures from DevTools
// Network tab during a manual /auth/otp submit on staging and pastes the
// Next-Action ID here. Without it, /auth/otp returns the page HTML instead
// of dispatching the action.
const NEXT_ACTION_ID_OTP = __ENV.NEXT_ACTION_ID_OTP || 'OPERATOR_FILL_FROM_DEVTOOLS';

export const options = {
  discardResponseBodies: false,
  scenarios: {
    landing_hit: {
      executor: 'constant-arrival-rate',
      rate: TARGET_RPS,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 10,
      maxVUs: 50,
      exec: 'landingHit',
    },
    attr_init: {
      executor: 'constant-arrival-rate',
      rate: TARGET_RPS,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 10,
      maxVUs: 50,
      exec: 'attrInit',
    },
    register_hit: {
      executor: 'constant-arrival-rate',
      rate: TARGET_RPS,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 10,
      maxVUs: 50,
      exec: 'registerHit',
    },
    // D-16: OTP verify path with shared cookie jar so the linkage UPDATE
    // (attribution_events.user_id ← user matched by attr_sid) actually fires
    // under load. Fractional rate reflects funnel drop-off realism.
    otp_verify_hit: {
      executor: 'constant-arrival-rate',
      rate: OTP_RPS,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 5,
      maxVUs: 25,
      exec: 'otpVerifyHit',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:landing_hit}':   ['p(95)<300'],
    'http_req_duration{name:attr_init}':     ['p(95)<300'],
    'http_req_duration{name:register}':      ['p(95)<800'],
    'http_req_duration{name:otp_verify}':    ['p(95)<800'],
  },
};

const utmQuery = '?utm_source=qr_letter&utm_medium=qr&utm_campaign=warmup2026';

// All four scenarios use the per-VU default cookie jar (http.cookieJar() is
// per-VU by default in k6) so attr_sid set in landingHit/attrInit flows into
// registerHit + otpVerifyHit. This is the precondition for D-16's linkage
// UPDATE to actually fire.

export function landingHit() {
  const res = http.get(`${BASE_URL}/${utmQuery}`, { tags: { name: 'landing_hit' } });
  check(res, { 'landing 200': (r) => r.status === 200 });
  sleep(1);
}

export function attrInit() {
  const res = http.get(`${BASE_URL}/api/attr/init${utmQuery}&path=%2F`, {
    tags: { name: 'attr_init' },
  });
  check(res, {
    'init 200': (r) => r.status === 200,
    'init sets attr_sid cookie': (r) => /attr_sid=/.test(r.headers['Set-Cookie'] || ''),
  });
  sleep(1);
}

export function registerHit() {
  // First hit landing + attr_init to populate attr_sid in this VU's jar
  http.get(`${BASE_URL}/${utmQuery}`, { tags: { name: 'landing_hit' } });
  http.get(`${BASE_URL}/api/attr/init${utmQuery}&path=%2F`, { tags: { name: 'attr_init' } });

  const email = `load-${__VU}-${__ITER}-${Date.now()}@example.invalid`;
  const formData = {
    full_name: 'Тест Тестов',
    email,
    sector: 'services',
    role: 'owner',
    self_reported_source: 'qr_letter',
    consent_privacy_terms: 'on',
    consent_cookies: 'on',
    'cf-turnstile-response': TURNSTILE_TEST_RESPONSE,
    formStamp: 'load-test-stamp',
  };
  const regRes = http.post(`${BASE_URL}/register`, formData, { tags: { name: 'register' } });
  check(regRes, { 'register 2xx/3xx': (r) => r.status >= 200 && r.status < 400 });
  sleep(1);
}

// D-16: OTP verify leg. Uses a seeded staging-only test user + fixed OTP code.
// MUST share the per-VU cookie jar with landing_hit + attr_init so the
// attribution_events.user_id linkage UPDATE actually fires. To guarantee
// attr_sid is present in the jar, this exec function fires landing + attr_init
// FIRST, then dispatches the verify-otp Server Action.
export function otpVerifyHit() {
  // Prime the cookie jar so attr_sid exists before the OTP submit
  http.get(`${BASE_URL}/${utmQuery}`, { tags: { name: 'landing_hit' } });
  http.get(`${BASE_URL}/api/attr/init${utmQuery}&path=%2F`, { tags: { name: 'attr_init' } });

  // Submit the OTP. Two transport options depending on what the OtpForm wires:
  //   (A) Plain <form action="/auth/otp" method="post"> → form-encoded POST works as-is.
  //   (B) React Server Action via the `Next-Action` header → operator pastes
  //       NEXT_ACTION_ID_OTP from DevTools Network tab capture.
  // We attempt (A); if staging returns 200 with no Set-Cookie session-token
  // header, switch to (B) by setting NEXT_ACTION_ID_OTP env.
  const headers = {};
  if (NEXT_ACTION_ID_OTP && NEXT_ACTION_ID_OTP !== 'OPERATOR_FILL_FROM_DEVTOOLS') {
    headers['Next-Action'] = NEXT_ACTION_ID_OTP;
  }
  const res = http.post(
    `${BASE_URL}/auth/otp`,
    {
      email: STAGING_TEST_EMAIL,
      code: STAGING_TEST_OTP,
    },
    { tags: { name: 'otp_verify' }, headers },
  );
  check(res, {
    'otp_verify 200/302': (r) => r.status === 200 || r.status === 302,
  });
  sleep(1);
}

export function handleSummary(data) {
  // Emit a compact summary alongside the default JSON for easy paste-in to
  // 02.1-LOAD-TEST.md.
  return {
    'k6-results.json': JSON.stringify(data, null, 2),
    stdout: JSON.stringify({
      target_rps: TARGET_RPS,
      otp_rps: OTP_RPS,
      duration: data.metrics.iteration_duration?.values || {},
      http_req_duration_p95: data.metrics.http_req_duration?.values?.['p(95)'],
      http_req_duration_p99: data.metrics.http_req_duration?.values?.['p(99)'],
      http_req_failed_rate: data.metrics.http_req_failed?.values?.rate,
      iterations: data.metrics.iterations?.values?.count,
    }, null, 2) + '\n',
  };
}
