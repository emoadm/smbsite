'use client';

import { useEffect, useState } from 'react';

/**
 * Sticky-on-md+ list of agenda h2 anchors (UI-SPEC §5.3).
 *
 * On mobile collapses to a `<details>` block; on md+ renders as a sticky
 * sidebar nav. Items are passed as props (auto-generation from MDX headings
 * is deferred). Active-section tracking via `IntersectionObserver` adds an
 * accent style on the link whose section is currently in view.
 *
 * `IntersectionObserver` use is wrapped in a `typeof window` SSR guard.
 */
export function TableOfContents({
  items,
  label,
  variant = 'both',
}: {
  items: { id: string; label: string }[];
  label: string;
  variant?: 'mobile' | 'desktop' | 'both';
}) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '');
  const showMobile = variant === 'mobile' || variant === 'both';
  const showDesktop = variant === 'desktop' || variant === 'both';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  return (
    <>
      {showMobile && (
        <details className="mb-6 rounded-md border border-border bg-surface p-4 md:hidden">
          <summary className="font-display text-base">{label}</summary>
          <ul className="mt-3 space-y-2 text-sm">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="text-primary hover:underline"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
      {showDesktop && (
        <nav
          aria-label={label}
          className="sticky top-24 hidden self-start md:block"
        >
          <ul className="space-y-3 text-sm">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={
                    item.id === activeId
                      ? 'font-display text-primary'
                      : 'text-muted-foreground hover:text-primary'
                  }
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
