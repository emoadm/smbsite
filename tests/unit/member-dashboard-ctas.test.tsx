// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import * as React from 'react';

// Quick 260514-q3u — /member dashboard CTA + secondary-card href contract.
//
// Test strategy (Q3U-03, Q3U-04):
//   - Mock next-intl translator + MemberWelcomeBanner + Timeline so the
//     page renders without DB / auth() hits.
//   - Await the async Server Component to get JSX, then render and
//     assert all expected hrefs are reachable in the DOM.
//   - Assertions are href-only — labels come from messages/bg.json,
//     enforced separately by scripts/lint-i18n.mjs.

vi.mock('next-intl/server', () => ({
  getTranslations: async (_ns?: string) => (key: string) => key,
}));
vi.mock('next-intl', () => ({
  useTranslations: (_ns?: string) => (key: string) => key,
}));

// Stub child Server Components — they pull DB / auth() which would crash
// in the unit test runtime.
vi.mock('@/components/member/MemberWelcomeBanner', () => ({
  MemberWelcomeBanner: () =>
    React.createElement('div', { 'data-testid': 'welcome-banner-stub' }),
}));
vi.mock('@/components/member/Timeline', () => ({
  Timeline: () => React.createElement('div', { 'data-testid': 'timeline-stub' }),
}));

// Defensive — payload / drizzle paths sometimes transitively load via
// the auth route. Stub the payload config to prevent module-load crashes.
vi.mock('@/payload.config', () => ({
  default: {},
}));

import MemberPage from '@/app/(frontend)/member/page';

afterEach(() => {
  cleanup();
});

const EXPECTED_NEW_HREFS = [
  '/member/predlozhi',
  '/member/signaliziray',
  '/member/predlozheniya',
  '/member/signali',
];

const EXPECTED_EXISTING_HREFS = [
  '/agenda',
  '/faq',
  '/member/preferences',
  '/community',
];

async function renderMemberPage() {
  // MemberPage is an async Server Component — await for JSX.
  const tree = await (MemberPage as () => Promise<React.ReactElement>)();
  return render(tree);
}

describe('Quick 260514-q3u — /member dashboard primary CTAs (Q3U-03)', () => {
  it('renders 2 primary action links: /member/predlozhi and /member/signaliziray', async () => {
    const { container } = await renderMemberPage();
    for (const href of ['/member/predlozhi', '/member/signaliziray']) {
      const anchor = container.querySelector(`a[href="${href}"]`);
      expect(anchor, `primary action link to ${href} must exist`).not.toBeNull();
    }
  });
});

describe('Quick 260514-q3u — /member dashboard secondary cards (Q3U-04)', () => {
  it('renders 2 new secondary card links: /member/predlozheniya and /member/signali', async () => {
    const { container } = await renderMemberPage();
    for (const href of ['/member/predlozheniya', '/member/signali']) {
      const anchor = container.querySelector(`a[href="${href}"]`);
      expect(anchor, `secondary card link to ${href} must exist`).not.toBeNull();
    }
  });
});

describe('Quick 260514-q3u — existing 4 dashboard cards unchanged (no regression)', () => {
  it('still renders /agenda, /faq, /member/preferences, /community', async () => {
    const { container } = await renderMemberPage();
    for (const href of EXPECTED_EXISTING_HREFS) {
      const anchor = container.querySelector(`a[href="${href}"]`);
      expect(anchor, `existing dashboard link to ${href} must still exist`).not.toBeNull();
    }
  });
});

describe('Quick 260514-q3u — /member dashboard total link surface', () => {
  it('contains all 6 new hrefs across primary actions + secondary cards', async () => {
    const { container } = await renderMemberPage();
    for (const href of EXPECTED_NEW_HREFS) {
      const anchor = container.querySelector(`a[href="${href}"]`);
      expect(anchor, `expected new dashboard href ${href}`).not.toBeNull();
    }
  });
});
