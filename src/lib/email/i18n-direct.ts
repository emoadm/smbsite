// Phase 5 — shared message-walker for contexts where next-intl is unreliable.
//
// TWO exports, ONE underlying walker:
//   - loadT(namespace)    : worker / async server context (BullMQ, Server Actions
//                           that need a t-factory aligned with worker.tsx output).
//   - getAdminT(namespace): synchronous, client-callable. Used by Payload admin
//                           custom 'use client' components (Plan 05-07
//                           NewsletterComposer.tsx + SendBlastButton.tsx).
//                           The Payload admin shell does NOT mount
//                           NextIntlClientProvider, so calling
//                           useTranslations(...) from next-intl inside admin
//                           custom components throws at runtime. getAdminT
//                           reads messages/bg.json directly — no React hook,
//                           no provider, no async — and returns a t(key, vars)
//                           function with the same shape as next-intl's t().
//
// Both factories share identical behavior:
//   - dot-notation key lookup within the namespace (e.g., 'actions.sendBlast.now'
//     walks admin.newsletters → actions → sendBlast → now)
//   - ICU placeholder replacement via {key} → value
//   - unknown keys passthrough as the key string itself (same as worker.tsx)

import bg from '../../../messages/bg.json';

export type EmailT = (key: string, vars?: Record<string, string | number>) => string;

function buildT(namespace: string): EmailT {
  const dict = namespace
    .split('.')
    .reduce<Record<string, unknown>>(
      (node, key) => (node?.[key] as Record<string, unknown>) ?? {},
      bg as Record<string, unknown>,
    );

  return (key: string, vars?: Record<string, string | number>) => {
    // Support dot-notation sub-key lookup within the namespace
    // e.g., t('actions.sendBlast.now') walks dict.actions.sendBlast.now
    const raw = key
      .split('.')
      .reduce<unknown>(
        (node, k) => (typeof node === 'object' && node !== null ? (node as Record<string, unknown>)[k] : undefined),
        dict as unknown,
      );

    if (typeof raw !== 'string') return key;
    if (!vars) return raw;
    return Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      raw,
    );
  };
}

export function loadT(namespace: string): EmailT {
  return buildT(namespace);
}

export function getAdminT(namespace: string): EmailT {
  return buildT(namespace);
}
