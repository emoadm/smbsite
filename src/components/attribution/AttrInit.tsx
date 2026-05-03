'use client';

import { useEffect } from 'react';

// Phase 2.1 attribution init trigger (D-22).
//
// Why a client component fetching a separate Node route instead of an
// Edge-middleware cookie set: the public landing page MUST remain anonymously
// cacheable on Cloudflare for PUB-02. A Set-Cookie in the page response
// causes Cloudflare to BYPASS cache for every visitor (RESEARCH.md Pitfall 2).
// The fix: page renders Set-Cookie-free; this client component fires
// /api/attr/init AFTER hydration to set the cookie + enqueue the attribution
// job. One extra round-trip on first visit is the accepted trade-off (D-22).
//
// Why no UI and no error reporting: attribution is invisible instrumentation.
// A failure here means we lose one visit's UTM data — never a user-visible
// problem. The worker's BullMQ failure handler logs to Sentry.

export function AttrInit() {
  useEffect(() => {
    try {
      // Forward current URL's UTM params + path to the init route. The route
      // also reads cf-connecting-ip server-side, which the client does not
      // have access to.
      const u = new URL(window.location.href);
      const params = new URLSearchParams();
      for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
        const v = u.searchParams.get(k);
        if (v) params.set(k, v);
      }
      params.set('path', u.pathname);
      // keepalive: true keeps the request in flight even if the user
      // navigates away within the first 100ms (rare but possible on QR scans
      // where users tap, glance, then close the tab).
      void fetch(`/api/attr/init?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        keepalive: true,
      }).catch(() => {
        // swallow — invisible instrumentation
      });
    } catch {
      // swallow — defense against bizarre browser environments
    }
    // Empty deps: fire exactly once on mount, even if the layout re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
