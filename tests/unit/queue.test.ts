import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { addEmailJob } from '@/lib/email/queue';


describe('NOTIF-08 — BullMQ + Upstash queue (Pitfall E)', () => {
  it('addEmailJob resolves <200ms in dev/test (D-19)', async () => {
    const t0 = Date.now();
    await addEmailJob({
      to: 'u@example.invalid',
      kind: 'register-otp',
      otpCode: '123456',
    });
    const dt = Date.now() - t0;
    expect(dt).toBeLessThan(200);
  });

  it('source declares Pitfall E connection settings', () => {
    const src = readFileSync('src/lib/email/queue.ts', 'utf8');
    expect(src).toContain('maxRetriesPerRequest: null');
    expect(src).toContain('enableReadyCheck: false');
  });

  it('Brevo client sends both htmlContent and textContent (Pitfall J)', () => {
    const src = readFileSync('src/lib/email/brevo.ts', 'utf8');
    expect(src).toMatch(/htmlContent:/);
    expect(src).toMatch(/textContent:/);
  });

  it('messages/bg.json#email.registerOtp uses nominative greeting (D-27 / B-1)', () => {
    const bg = JSON.parse(readFileSync('messages/bg.json', 'utf8')) as Record<string, any>;
    const named = bg?.email?.registerOtp?.greetingNamed ?? '';
    const anon = bg?.email?.registerOtp?.greetingAnonymous ?? '';
    expect(named).toContain('Здравей');
    expect(anon).toContain('Здравей');
    const blob = JSON.stringify(bg.email);
    expect(blob).not.toMatch(/Уважаеми/);
    expect(blob).not.toMatch(/Уважаема/);
  });

  it('OtpEmail.tsx contains no Cyrillic literals (B-1 / PUB-05)', () => {
    const src = readFileSync('src/lib/email/templates/OtpEmail.tsx', 'utf8');
    expect(src).not.toMatch(/[Ѐ-ӿ]/);
  });

  it('worker handles all 3 EmailJobKind values', () => {
    const src = readFileSync('src/lib/email/worker.tsx', 'utf8');
    expect(src).toContain("case 'register-otp':");
    expect(src).toContain("case 'login-otp':");
    expect(src).toContain("case 'welcome':");
  });
});

describe('Phase 5 D-21 — EmailJobKind / EmailJobPayload extension', () => {
  it('source declares all 4 new EmailJobKind values', () => {
    const src = readFileSync('src/lib/email/queue.ts', 'utf8');
    expect(src).toMatch(/'newsletter-blast'/);
    expect(src).toMatch(/'newsletter-send-recipient'/);
    expect(src).toMatch(/'newsletter-test'/);
    expect(src).toMatch(/'unsubscribe-brevo-retry'/);
  });

  it('source declares forward fields newsletterId / userId / topic / unsubEmail / delayMs', () => {
    const src = readFileSync('src/lib/email/queue.ts', 'utf8');
    expect(src).toMatch(/newsletterId\?:\s*string/);
    expect(src).toMatch(/userId\?:\s*string/);
    expect(src).toMatch(/topic\?:\s*string/);
    expect(src).toMatch(/unsubEmail\?:\s*string/);
    expect(src).toMatch(/delayMs\?:\s*number/);
  });

  it('addEmailJob accepts newsletter-test in <200ms in dev/test', async () => {
    const t0 = Date.now();
    await addEmailJob({ to: 'editor@example.invalid', kind: 'newsletter-test', newsletterId: 'abc-123' });
    expect(Date.now() - t0).toBeLessThan(200);
  });

  it('source uses deterministic jobId for newsletter-blast (RESEARCH Pattern 6)', () => {
    const src = readFileSync('src/lib/email/queue.ts', 'utf8');
    // Strip comments to avoid self-invalidating grep
    const code = src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    expect(code).toMatch(/jobId\s*=\s*`newsletter-\$\{payload\.newsletterId\}`/);
  });
});

describe('Phase 5 D-14 — Brevo headers parameter (RFC 8058 override)', () => {
  it('BrevoSendArgs declares optional headers Record<string,string>', () => {
    const src = readFileSync('src/lib/email/brevo.ts', 'utf8');
    expect(src).toMatch(/headers\?:\s*Record<string,\s*string>/);
  });

  it('sendBrevoEmail merges headers into JSON body when present', () => {
    const src = readFileSync('src/lib/email/brevo.ts', 'utf8');
    // Strip comments before grepping
    const code = src.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join('\n');
    expect(code).toMatch(/body\.headers\s*=\s*args\.headers/);
  });
});

describe('Phase 5 — env validator extended', () => {
  it('check-env.ts mentions all 3 new required vars', () => {
    const src = readFileSync('scripts/check-env.ts', 'utf8');
    expect(src).toContain('EMAIL_FROM_NEWSLETTER');
    expect(src).toContain('UNSUBSCRIBE_HMAC_SECRET');
    expect(src).toContain('SITE_ORIGIN');
  });
});
