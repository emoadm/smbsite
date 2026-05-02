'use client';

import Script from 'next/script';
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
 * api.js is loaded with `?render=explicit` so Cloudflare does not auto-render any
 * `<div class="cf-turnstile">`. We always call `window.turnstile.render()` ourselves
 * once the script signals ready — that is the only reliable way to wire `callback`
 * and `error-callback` into React state. Without explicit render, an auto-rendered
 * widget would validate but never inform React, leaving the submit button disabled.
 *
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY` must be inlined at build time — see Dockerfile
 * builder stage and scripts/deploy-fly.sh for how it's passed via Docker build args.
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

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        async
        defer
        onReady={renderWidget}
        onError={() => {
          console.error('[turnstile] api.js failed to load');
          setStatus('error');
        }}
      />
      <div ref={ref} />
    </>
  );
}
