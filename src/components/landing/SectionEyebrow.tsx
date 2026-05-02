import type { ReactNode } from 'react';

/**
 * Tiny caps Roboto 14px eyebrow label rendered in `--color-secondary` (sky).
 *
 * Stylistic helper used above section h2s on `/` and `/agenda` per
 * UI-SPEC §6 component inventory. Pure presentational — accepts any
 * already-translated children (the caller owns the i18n call so the
 * eyebrow itself is i18n-agnostic).
 */
export function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm uppercase tracking-wider text-secondary">
      {children}
    </p>
  );
}
