'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: (code?: string) => void;
          'expired-callback'?: () => void;
          appearance?: 'always' | 'execute' | 'interaction-only';
        },
      ) => string;
      reset: (id: string) => void;
    };
  }
}

export type TurnstileStatus = 'loading' | 'ready' | 'error';

/**
 * api.js is loaded with `?render=explicit` by the Server Component at
 * `src/app/(frontend)/(auth)/register/page.tsx` (raw <script async defer>).
 * That ensures the script tag is in the initial SSR HTML, which (a) loads
 * earlier than next/script's post-hydration injection in production, and
 * (b) makes AUTH-08 (Playwright spec asserting script presence on /register)
 * pass on first attempt without retries — see
 * .planning/debug/d-ci-app-failures.md Cause 4.
 *
 * We always call `window.turnstile.render()` ourselves (`?render=explicit`
 * disables auto-render) — that is the only reliable way to wire `callback`
 * and `error-callback` into React state. We poll `window.turnstile` until
 * api.js finishes executing.
 *
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY` must be inlined at build time — see
 * Dockerfile builder stage and scripts/deploy-fly.sh for how it's passed
 * via Docker build args.
 */
export function TurnstileWidget({
  onStatusChange,
}: {
  onStatusChange?: (s: TurnstileStatus) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | null>(null);
  const [status, setStatus] = useState<TurnstileStatus>('loading');

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  const renderWidget = useCallback(() => {
    if (idRef.current || !ref.current || !window.turnstile) return;
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!sitekey) {
      console.error('[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY missing — was build arg passed?');
      setStatus('error');
      return;
    }
    idRef.current = window.turnstile.render(ref.current, {
      sitekey,
      appearance: 'interaction-only',
      callback: () => setStatus('ready'),
      'error-callback': (code) => {
        console.error('[turnstile] error-callback', { code });
        setStatus('error');
      },
      'expired-callback': () => setStatus('loading'),
    });
  }, []);

  // Cover the case where api.js is already cached and ready before mount.
  useEffect(() => {
    renderWidget();
  }, [renderWidget]);

  // Fail-loud timeout: a privacy extension blocked api.js, or the network is dead.
  // 12s is generous — `interaction-only` mode legitimately takes a few seconds before
  // showing the manual checkbox if Cloudflare's automatic challenge is inconclusive.
  useEffect(() => {
    if (status !== 'loading') return;
    const timeout = setTimeout(() => {
      if (status === 'loading') setStatus('error');
    }, 12_000);
    return () => clearTimeout(timeout);
  }, [status]);

  // api.js is loaded by the parent Server Component
  // (see src/app/(frontend)/(auth)/register/page.tsx). Poll for window.turnstile
  // until the script finishes executing and exposes the global.
  useEffect(() => {
    if (idRef.current || window.turnstile) {
      renderWidget();
      return;
    }
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      if (window.turnstile) {
        clearInterval(interval);
        renderWidget();
      } else if (attempts >= 120) {
        // 12s — matches the existing fail-loud timeout effect above.
        clearInterval(interval);
        // status will flip to 'error' via the timeout effect.
      }
    }, 100);
    return () => clearInterval(interval);
  }, [renderWidget]);

  return <div ref={ref} />;
}
