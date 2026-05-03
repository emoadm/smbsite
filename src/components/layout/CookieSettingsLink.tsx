'use client';

/**
 * Renders the "Настройки за бисквитки" footer link. Calls window.revisitCkyConsent()
 * (CookieYes runtime API) when clicked — reopens the consent banner without page
 * navigation. UI-SPEC §9.2.
 *
 * The window.revisitCkyConsent function is attached to the global window object
 * by the CookieYes hosted script after it loads. The typeof === 'function' guard
 * handles the case where:
 *   - CookieYes script hasn't finished loading yet
 *   - NEXT_PUBLIC_COOKIEYES_SITE_KEY isn't set (dev environment)
 * In both cases the click is a silent no-op rather than a runtime error.
 */
export function CookieSettingsLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (
          typeof window !== 'undefined' &&
          typeof (window as unknown as { revisitCkyConsent?: () => void }).revisitCkyConsent === 'function'
        ) {
          (window as unknown as { revisitCkyConsent: () => void }).revisitCkyConsent();
        }
      }}
      className="text-accent hover:underline cursor-pointer text-left"
    >
      {label}
    </button>
  );
}
