'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          appearance?: 'always' | 'execute' | 'interaction-only';
        },
      ) => string;
      reset: (id: string) => void;
    };
  }
}

/**
 * H-4 fix: invisible Turnstile populates the cf-turnstile-response field asynchronously.
 * Without coordination, fast submitters or users with privacy extensions blocking the script
 * silently fail Zod validation server-side. This widget exposes its load/ready/error state via
 * `onStatusChange` so the parent form can disable its submit button until the token is present
 * AND can render a recovery message when the script fails to load within the timeout.
 */
export type TurnstileStatus = 'loading' | 'ready' | 'error';

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

  useEffect(() => {
    // Fail-loud timeout: if the script never loads (extension blocks it), surface a recoverable
    // error to the user instead of letting the submit silently 401 server-side.
    const timeout = setTimeout(() => {
      if (status === 'loading') setStatus('error');
    }, 5_000);
    return () => clearTimeout(timeout);
  }, [status]);

  useEffect(() => {
    if (!ref.current || !window.turnstile) return;
    idRef.current = window.turnstile.render(ref.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
      appearance: 'interaction-only',
      callback: () => setStatus('ready'),
      'error-callback': () => setStatus('error'),
    });
  }, []);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
        onError={() => setStatus('error')}
      />
      {/* The widget injects `<input name="cf-turnstile-response" ...>` into this container */}
      <div
        ref={ref}
        className="cf-turnstile"
        data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      />
    </>
  );
}
