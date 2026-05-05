import { test } from '@playwright/test';

// Phase 5 NOTIF-04 / NOTIF-05 / D-11 / UI-SPEC §5.2 — /community page variants.

test.describe('Phase 5 — /community page (preview-vs-redeem)', () => {
  test.skip('anonymous visitor sees teaser cards with /register CTA — never the raw URL', async () => {
    // Wave 4 plan 05-11 owns full execution.
    // 1. Clear cookies; navigate to /community.
    // 2. Assert page HTML does NOT contain whatsapp.com/channel/ or t.me/.
    // 3. Assert teaser CTAs have href /register?next=/community.
  });

  test.skip('authenticated member sees real external URLs (when channels visible)', async () => {
    // Wave 4 plan 05-11 owns full execution.
    // 1. Login fixture (member).
    // 2. Pre-condition: editor seeds CommunityChannels Global with valid URLs + Visible=true.
    // 3. Navigate to /community.
    // 4. Assert member-variant CTAs have target="_blank" and href matches configured URLs.
  });

  test.skip('page renders 1 h1 and 1 h2 (the explainer; card titles are h3)', async () => {
    // Wave 4 plan 05-11 owns full execution against a running dev server.
    // Heading hierarchy: page h1 → explainer h2 → card h3.
  });
});
