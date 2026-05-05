import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Phase 5 — newsletter worker switch routes 4 new kinds', () => {
  it('switch handler exists for each new EmailJobKind', () => {
    const src = readFileSync('src/lib/email/worker.tsx', 'utf8');
    expect(src).toMatch(/case\s+['"]newsletter-blast['"]/);
    expect(src).toMatch(/case\s+['"]newsletter-send-recipient['"]/);
    expect(src).toMatch(/case\s+['"]newsletter-test['"]/);
    expect(src).toMatch(/case\s+['"]unsubscribe-brevo-retry['"]/);
  });

  it('imports NewsletterEmail + renderLexicalToHtml + signUnsubToken + getNewsletterRecipients + brevoBlocklist', () => {
    const src = readFileSync('src/lib/email/worker.tsx', 'utf8');
    expect(src).toMatch(/from ['"][.][^'"]*templates\/NewsletterEmail['"]/);
    expect(src).toMatch(/from ['"][.][^'"]*newsletter\/lexical-to-html['"]/);
    expect(src).toMatch(/from ['"][.][^'"]*unsubscribe\/hmac['"]/);
    expect(src).toMatch(/from ['"][.][^'"]*newsletter\/recipients['"]/);
    expect(src).toMatch(/from ['"][.][^'"]*newsletter\/brevo-sync['"]/);
  });

  it('preserves Phase 1 cases verbatim (register-otp / login-otp / welcome)', () => {
    const src = readFileSync('src/lib/email/worker.tsx', 'utf8');
    expect(src).toMatch(/case\s+['"]register-otp['"]/);
    expect(src).toMatch(/case\s+['"]login-otp['"]/);
    expect(src).toMatch(/case\s+['"]welcome['"]/);
  });

  it('preserves React import comment (esbuild JSX transform note)', () => {
    const src = readFileSync('src/lib/email/worker.tsx', 'utf8');
    expect(src).toMatch(/import\s+React\s+from\s+['"]react['"]/);
  });
});
