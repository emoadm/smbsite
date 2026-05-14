// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as React from 'react';

// Quick 260514-q3u — Header nav + HeaderMobileNav RTL contract.
//
// Assertions are href-only (NOT label-text) because labels come from
// messages/bg.json — the i18n linter (scripts/lint-i18n.mjs) is the
// source-level contract for copy correctness. Mocking the translator
// to identity (`(key) => key`) keeps these tests resilient to copy
// edits while still verifying the routing graph.

const mockAuth = vi.fn();

// Mock next-intl server + client APIs to identity translators.
vi.mock('next-intl/server', () => ({
  getTranslations: async (_ns?: string) => (key: string) => key,
}));
vi.mock('next-intl', () => ({
  useTranslations: (_ns?: string) => (key: string) => key,
}));

// Mock auth() — Header reads session via `import { auth } from '@/lib/auth'`.
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

// Logout Server Action is referenced as a `<form action={logout}>` prop —
// stub it so the module graph loads cleanly under jsdom.
vi.mock('@/app/actions/logout', () => ({
  logout: vi.fn(),
}));

// Defensive — payload.config sometimes drags @next/env into the module
// graph when auth's transitive imports resolve. Newsletter composer test
// pattern (Phase 5 G2) does the same.
vi.mock('@/payload.config', () => ({
  default: {},
}));

import { Header } from '@/components/layout/Header';
import { HeaderMobileNav } from '@/components/layout/HeaderMobileNav';

const NAV_HREFS = ['/agenda', '/predlozheniya', '/problemi', '/faq'];

async function renderHeader() {
  // Header is an async Server Component — await it to get JSX, then render.
  const tree = await Header();
  return render(tree);
}

describe('Quick 260514-q3u — Header (anon)', () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockAuth.mockResolvedValue(null);
  });

  it('renders all 4 nav links and a login link', async () => {
    await renderHeader();

    for (const href of NAV_HREFS) {
      const matches = screen.getAllByRole('link').filter((el) => el.getAttribute('href') === href);
      expect(matches.length, `nav link with href=${href} must exist`).toBeGreaterThanOrEqual(1);
    }

    const loginLinks = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('href') === '/login');
    expect(loginLinks.length, 'login link must exist when anon').toBeGreaterThanOrEqual(1);
  });
});

describe('Quick 260514-q3u — Header (signed-in)', () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockAuth.mockResolvedValue({ user: { email: 'foo@bar.com' } });
  });

  it('renders the same 4 nav links and a logout submit button', async () => {
    await renderHeader();

    for (const href of NAV_HREFS) {
      const matches = screen.getAllByRole('link').filter((el) => el.getAttribute('href') === href);
      expect(matches.length, `nav link with href=${href} must exist when signed-in`).toBeGreaterThanOrEqual(1);
    }

    // Logout button — type="submit", inside a <form action={logout}>.
    const submits = screen
      .getAllByRole('button')
      .filter((el) => (el as HTMLButtonElement).type === 'submit');
    expect(submits.length, 'logout submit button must exist when signed-in').toBeGreaterThanOrEqual(
      1,
    );
  });
});

describe('Quick 260514-q3u — HeaderMobileNav', () => {
  const links = NAV_HREFS.map((href) => ({ href, label: href.replace('/', '') }));

  it('renders all 4 nav links in the DOM even when closed (SSR + crawler-discoverability)', () => {
    render(
      React.createElement(HeaderMobileNav, {
        links,
        loginHref: '/login',
        loginLabel: 'login',
        menuOpenLabel: 'menuOpen',
        menuCloseLabel: 'menuClose',
        isAuthed: false,
      }),
    );

    for (const href of NAV_HREFS) {
      const matches = screen.getAllByRole('link', { hidden: true }).filter(
        (el) => el.getAttribute('href') === href,
      );
      expect(matches.length, `mobile nav link with href=${href} must exist in DOM`).toBeGreaterThanOrEqual(1);
    }
  });

  it('toggle button has aria-expanded that flips on click', () => {
    render(
      React.createElement(HeaderMobileNav, {
        links,
        loginHref: '/login',
        loginLabel: 'login',
        menuOpenLabel: 'menuOpen',
        menuCloseLabel: 'menuClose',
        isAuthed: false,
      }),
    );

    const toggle = screen.getByRole('button', { name: /menuOpen|menuClose/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('shows login link in panel when not authed', () => {
    render(
      React.createElement(HeaderMobileNav, {
        links,
        loginHref: '/login',
        loginLabel: 'login',
        menuOpenLabel: 'menuOpen',
        menuCloseLabel: 'menuClose',
        isAuthed: false,
      }),
    );
    const loginMatches = screen
      .getAllByRole('link', { hidden: true })
      .filter((el) => el.getAttribute('href') === '/login');
    expect(loginMatches.length).toBeGreaterThanOrEqual(1);
  });
});
