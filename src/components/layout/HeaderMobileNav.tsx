'use client';

// Quick 260514-q3u — mobile hamburger drawer for the 4 public nav surfaces.
//
// Design contract (Q3U-02):
//   - Rendered only on viewport < md (parent wraps us in `md:hidden`).
//   - The 4 nav links + the optional login link MUST be in the DOM
//     unconditionally so SSR ships them to crawlers + no-JS clients.
//     Open/close is communicated via the `hidden` attribute + aria,
//     not by conditional mounting.
//   - Toggle is the only interactive element with `aria-expanded` +
//     `aria-controls`. Backdrop and Escape dismiss the panel.
//   - All copy comes via props (Header.tsx is the Server Component
//     that reads `getTranslations('nav')`); this child stays i18n-clean.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type NavLink = { href: string; label: string };

type Props = {
  links: NavLink[];
  loginHref: string;
  loginLabel: string;
  menuOpenLabel: string;
  menuCloseLabel: string;
  isAuthed: boolean;
};

const PANEL_ID = 'header-mobile-nav-panel';

export function HeaderMobileNav({
  links,
  loginHref,
  loginLabel,
  menuOpenLabel,
  menuCloseLabel,
  isAuthed,
}: Props) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef(() => setOpen(false));
  closeRef.current = () => setOpen(false);

  // Escape-to-close while panel is open. Listener is scoped to `open`
  // so we don't keep a global handler attached when the drawer is idle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const onLinkClick = useCallback(() => setOpen(false), []);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        aria-label={open ? menuCloseLabel : menuOpenLabel}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </Button>

      {/* Backdrop — only when open, so it doesn't intercept clicks on the
          page below. Closing the panel by tapping outside is the
          accessibility expectation for a top-anchored drawer. */}
      {open ? (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 top-14 z-30 bg-background/40 md:hidden"
        />
      ) : null}

      <div
        id={PANEL_ID}
        hidden={!open}
        aria-hidden={!open}
        className="absolute inset-x-0 top-14 z-40 border-b border-border bg-background shadow-md md:hidden"
      >
        <nav className="flex flex-col gap-1 p-4">
          {links.map((link) => (
            <Button
              key={link.href}
              asChild
              variant="ghost"
              size="sm"
              className="justify-start"
            >
              <Link href={link.href} onClick={onLinkClick}>
                {link.label}
              </Link>
            </Button>
          ))}
          {!isAuthed ? (
            <>
              <div className="my-2 border-t border-border" aria-hidden="true" />
              <Button asChild variant="default" size="sm" className="justify-start">
                <Link href={loginHref} onClick={onLinkClick}>
                  {loginLabel}
                </Link>
              </Button>
            </>
          ) : null}
        </nav>
      </div>
    </>
  );
}
