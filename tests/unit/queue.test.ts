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
