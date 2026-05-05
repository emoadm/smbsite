import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PAGE_SRC = readFileSync('src/app/(frontend)/community/page.tsx', 'utf8');
const CARD_SRC = readFileSync('src/components/community/ChannelCard.tsx', 'utf8');

describe('Phase 5 NOTIF-04 / NOTIF-05 / D-12 — /community page invariants', () => {
  it('uses dynamic = "force-dynamic" (D-12 — no caching; auth-conditional)', () => {
    expect(PAGE_SRC).toMatch(/export const dynamic\s*=\s*['"]force-dynamic['"]/);
  });

  it('does NOT use revalidate constant', () => {
    const code = PAGE_SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(code).not.toMatch(/export const revalidate\s*=/);
  });

  it('reads CommunityChannels Global via findGlobal', () => {
    expect(PAGE_SRC).toMatch(/findGlobal\(\s*\{\s*slug:\s*['"]community-channels['"]/);
  });

  it('imports auth() and branches on session?.user', () => {
    expect(PAGE_SRC).toMatch(/from\s+['"]@\/lib\/auth['"]/);
    expect(PAGE_SRC).toMatch(/await\s+auth\(\)/);
    expect(PAGE_SRC).toMatch(/session\?\.user/);
  });

  it('does NOT call redirect() — public preview-vs-redeem (D-11)', () => {
    const code = PAGE_SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    expect(code).not.toMatch(/redirect\(['"]\/login/);
    expect(code).not.toMatch(/redirect\(['"]\/register/);
  });

  it('uses MainContainer width="page"', () => {
    expect(PAGE_SRC).toMatch(/width=["']page["']/);
  });

  it('uses lucide MessageCircle, Send, Hourglass icons', () => {
    expect(PAGE_SRC).toMatch(/MessageCircle/);
    expect(PAGE_SRC).toMatch(/\bSend\b/);
    expect(PAGE_SRC).toMatch(/Hourglass/);
  });

  it('anonymous CTA href is /register?next=/community — NOT the raw URL', () => {
    const code = PAGE_SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(code).toMatch(/['"]\/register\?next=\/community['"]/);
    expect(code).not.toMatch(/https:\/\/whatsapp\.com\/channel/);
    expect(code).not.toMatch(/https:\/\/t\.me\//);
  });

  it('uses force-dynamic + getPayload for fresh per-request data', () => {
    expect(PAGE_SRC).toMatch(/getPayload\(\{\s*config\s*\}\)/);
  });
});

describe('Phase 5 — ChannelCard component', () => {
  it('exports ChannelCard with 3 variants', () => {
    expect(CARD_SRC).toMatch(/export\s+(function|const)\s+ChannelCard/);
    expect(CARD_SRC).toMatch(/'teaser'/);
    expect(CARD_SRC).toMatch(/'redeem'/);
    expect(CARD_SRC).toMatch(/'placeholder'/);
  });

  it('placeholder variant does NOT render a CTA button', () => {
    expect(CARD_SRC).toMatch(/variant\s*!==\s*['"]placeholder['"]/);
  });

  it('external CTA uses rel="noopener" (security)', () => {
    expect(CARD_SRC).toMatch(/rel=["']noopener( noreferrer)?["']/);
  });

  it('card title element is <h3> — heading hierarchy lock', () => {
    const code = CARD_SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(code).toMatch(/<h3[^>]*>\{title\}<\/h3>/);
    expect(code).not.toMatch(/<h2[^>]*>\{title\}/);
  });
});

describe('Phase 5 D-10 / UI-SPEC §5.2.4 — Footer Column 4 conditional links', () => {
  const FOOTER_SRC = readFileSync('src/components/layout/Footer.tsx', 'utf8');

  it('imports auth from @/lib/auth', () => {
    expect(FOOTER_SRC).toMatch(/import\s*\{\s*auth\s*\}\s*from\s+['"]@\/lib\/auth['"]/);
  });

  it('reads CommunityChannels Global via findGlobal', () => {
    expect(FOOTER_SRC).toMatch(
      /findGlobal\(\s*\{\s*slug:\s*['"]community-channels['"]/,
    );
  });

  it('branches on isMember + whatsappActive + telegramActive', () => {
    expect(FOOTER_SRC).toMatch(/whatsappActive/);
    expect(FOOTER_SRC).toMatch(/telegramActive/);
    expect(FOOTER_SRC).toMatch(/isMember/);
  });

  it('member-variant external link uses rel="noopener"', () => {
    const code = FOOTER_SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    expect(code).toMatch(/rel=["']noopener( noreferrer)?["']/);
  });

  it('anonymous fallback links to /community (not the raw URL)', () => {
    const code = FOOTER_SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    expect(code).toMatch(/href=["']\/community["']/);
  });

  it('preserves the channelsPending translation key as the both-channels-invisible fallback', () => {
    expect(FOOTER_SRC).toMatch(/channelsPending/);
  });

  it('preserves CookieSettingsLink + copyright in legal column / footer footer', () => {
    expect(FOOTER_SRC).toMatch(/CookieSettingsLink/);
    expect(FOOTER_SRC).toMatch(/copyright/);
  });
});
