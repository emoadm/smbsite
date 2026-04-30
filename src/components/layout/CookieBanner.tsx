'use client';

import Script from 'next/script';

export function CookieBanner() {
  const siteKey = process.env.NEXT_PUBLIC_COOKIEYES_SITE_KEY;
  if (!siteKey) return null;
  return (
    <>
      <Script
        id="cookieyes"
        src={`https://cdn-cookieyes.com/client_data/${siteKey}/script.js`}
        strategy="afterInteractive"
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
    </>
  );
}
