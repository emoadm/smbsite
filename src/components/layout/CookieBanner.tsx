'use client';

import Script from 'next/script';

/**
 * CookieYes hosted-script loader. Phase 2 corrections:
 * - strategy "afterInteractive" -> "beforeInteractive" (RESEARCH §3 + Cause 4
 *   of d-ci-app-failures: scripts injected after page render race the
 *   Playwright + the consent enforcement gate).
 * - Inline <style> applies Sinya tokens (UI-SPEC §9.2). Token-driven so
 *   palette changes in globals.css propagate without dashboard work.
 * - Bridge stays afterInteractive — it listens for cookieyes_consent_update
 *   events; doesn't bootstrap CookieYes itself.
 *
 * The bridge POSTs decisions to /api/cookie-consent for the Phase 1 audit
 * log. That endpoint is unchanged.
 *
 * Fallback path (if A5 verification fails — Webpack injects `crossorigin`
 * on next/script-rendered tags causing CookieYes CDN to fail silently):
 * delete this file's <Script id="cookieyes"> tag and add a raw <script
 * async defer src=...> directly in (frontend)/layout.tsx JSX, mirroring
 * register/page.tsx:11-25 (Cause-4 pattern). Keep this file's bridge +
 * <style> block; only the CookieYes loader moves.
 */
export function CookieBanner() {
  const siteKey = process.env.NEXT_PUBLIC_COOKIEYES_SITE_KEY;
  if (!siteKey) return null;

  return (
    <>
      <Script
        id="cookieyes"
        src={`https://cdn-cookieyes.com/client_data/${siteKey}/script.js`}
        strategy="beforeInteractive"
      />
      <Script id="cookieyes-bridge" strategy="afterInteractive">
        {`(function(){
          function post(decision){
            fetch('/api/cookie-consent', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ decision: decision }),
              credentials: 'same-origin',
            }).catch(function(){});
          }
          document.addEventListener('cookieyes_consent_update', function(e){
            var d = (e && e.detail) || {};
            post({ analytics: !!d.analytics, marketing: !!d.advertisement });
          });
        })();`}
      </Script>
      <style>{`
        /* Sinya overrides for CookieYes-injected DOM (UI-SPEC §9.2). */
        .cky-consent-container {
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          box-shadow: 0 8px 32px -8px rgba(0, 74, 121, 0.15);
        }
        .cky-btn-accept {
          background: var(--color-primary);
          color: var(--color-primary-foreground);
        }
        .cky-btn-reject {
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-foreground);
        }
        .cky-btn-customize {
          color: var(--color-primary);
          text-underline-offset: 4px;
        }
        div[data-cky-tag="powered-by"],
        div[data-cky-tag="detail-powered-by"] { display: none; }
      `}</style>
    </>
  );
}
