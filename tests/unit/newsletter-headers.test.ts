import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('src/lib/email/worker.tsx', 'utf8');

describe('Phase 5 NOTIF-02 — RFC 8058 headers (Pattern 3, Pitfall 2)', () => {
  it('newsletter-send-recipient declares both List-Unsubscribe headers', () => {
    expect(SRC).toContain("'List-Unsubscribe'");
    expect(SRC).toContain("'List-Unsubscribe-Post'");
    expect(SRC).toContain("'List-Unsubscribe=One-Click'");
  });

  it('newsletter-send-recipient builds unsubUrl with /api/unsubscribe?token=', () => {
    expect(SRC).toMatch(/\/api\/unsubscribe\?token=/);
  });

  it('newsletter-send-recipient calls signUnsubToken from the unsubscribe/hmac module', () => {
    expect(SRC).toMatch(/import.*signUnsubToken.*from\s+['"][.][^'"]*unsubscribe\/hmac['"]/);
    expect(SRC).toMatch(/signUnsubToken\(/);
  });

  it('newsletter-send-recipient uses EMAIL_FROM_NEWSLETTER (D-20 sender split)', () => {
    expect(SRC).toMatch(/process\.env\.EMAIL_FROM_NEWSLETTER/);
  });

  it('newsletter-blast aborts when status is cancelled (Pitfall 3)', () => {
    const code = SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(code).toMatch(/status\s*===\s*['"]cancelled['"]/);
  });

  it('newsletter-blast fans out via addEmailJob({kind: "newsletter-send-recipient", ...})', () => {
    const code = SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    expect(code).toMatch(/addEmailJob\([^)]*kind:\s*['"]newsletter-send-recipient['"]/s);
  });

  it('newsletter-test unsubUrl carries the test=1 guard (no Brevo blocklist effect)', () => {
    // Test sends previously used `unsubUrl: '#preview'` so the link rendered
    // dead in the inbox (operator couldn't verify what recipients see).
    // The current shape is a real signed token URL with `&test=1` appended;
    // src/app/api/unsubscribe/route.ts honors the flag by short-circuiting
    // before the `consents` INSERT and the brevoBlocklist() call. The
    // editor sees the redirect flow without getting suppressed at the ESP.
    const code = SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    expect(code).toMatch(/signUnsubToken\(editorUserId\)/);
    expect(code).toMatch(/&test=1/);
  });

  it('unsubscribe-brevo-retry calls brevoBlocklist (D-14 retry path)', () => {
    expect(SRC).toMatch(/brevoBlocklist\(/);
  });

  it('per-recipient log uses user_id key, not email/to', () => {
    const lines = SRC.split('\n');
    const idx = lines.findIndex((l) => l.includes('newsletter-send-recipient.success'));
    expect(idx).toBeGreaterThan(0);
    const window = lines.slice(Math.max(0, idx - 5), idx + 2).join('\n');
    expect(window).toMatch(/user_id:/);
    expect(window).toMatch(/brevo_message_id:/);
    expect(window).not.toMatch(/\bto:/);
  });
});
