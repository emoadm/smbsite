'use client';

import { useEffect, useRef, useState } from 'react';
import { renderPreview, type PreviewArgs } from '@/lib/newsletter/preview';
import { getAdminT } from '@/lib/email/i18n-direct';

// Phase 5 NOTIF-09 / UI-SPEC §5.4 — live preview iframe.
//
// Debounced (500ms) server-action render → iframe srcdoc.
// The iframe is sandboxed (allow-same-origin) for defense-in-depth even though
// the converter (Plan 05-03) sanitizes at source.
//
// i18n: getAdminT (NOT useTranslations) — Payload admin shell does NOT mount
// NextIntlClientProvider; useTranslations would throw.

const t = getAdminT('admin.newsletters');

export interface LivePreviewIframeProps {
  args: PreviewArgs;
  onError?: (err: string) => void;
}

export function LivePreviewIframe({ args, onError }: LivePreviewIframeProps) {
  const [html, setHtml] = useState<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      void (async () => {
        try {
          const out = await renderPreview(args);
          setHtml(out);
        } catch (err) {
          onError?.(err instanceof Error ? err.message : String(err));
        }
      })();
    }, 500);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [args, onError]);

  return (
    <iframe
      title={t('preview.title')}
      sandbox="allow-same-origin"
      srcDoc={html}
      className="w-full h-[820px] border border-border rounded-md bg-card"
    />
  );
}

export default LivePreviewIframe;
