import type { AdminViewServerProps } from 'payload';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import bg from '../../../../../../messages/bg.json';
import { fetchModerationQueue } from '@/lib/submissions/admin-queries';
import { QueueTable } from './QueueTable';

// Phase 4 EDIT-04 / EDIT-05 — Moderation queue custom Payload admin view.
// Registered at admin.components.views.moderationQueue in payload.config.ts.
//
// next-intl note: Payload admin shell does NOT wrap RSC components in a
// next-intl Provider. We load messages/bg.json directly (mirrors
// src/lib/email/worker.tsx loadT pattern) — small, predictable, no
// provider dependency.
//
// Role gate: ['admin', 'editor', 'super_editor'] — mirrors assertEditorOrAdmin
// extension from Task 1. Non-editors see denial copy BEFORE any data fetch.

const t = (bg as { admin: { queue: Record<string, unknown> } }).admin.queue as {
  pageTitle: string;
  pendingSummary: string;
  denied: string;
  loginRequired: string;
  empty: string;
};

export async function ModerationQueueView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const {
    req: { user, i18n, payload },
    locale,
    visibleEntities,
  } = initPageResult;

  // Login gate — no data before this passes
  if (!user) {
    return (
      <DefaultTemplate
        i18n={i18n}
        locale={locale}
        params={params}
        payload={payload}
        visibleEntities={visibleEntities}
      >
        <Gutter>
          <p>{t.loginRequired}</p>
        </Gutter>
      </DefaultTemplate>
    );
  }

  // Role gate — D-13 + ASVS V4. Non-editors see denial copy BEFORE fetchModerationQueue.
  // ['admin','editor','super_editor'] — super_editor added Phase 4 EDIT-07.
  const role = (user as { role?: string }).role ?? '';
  if (!['admin', 'editor', 'super_editor'].includes(role)) {
    return (
      <DefaultTemplate
        i18n={i18n}
        locale={locale}
        params={params}
        payload={payload}
        visibleEntities={visibleEntities}
      >
        <Gutter>
          <p>{t.denied}</p>
        </Gutter>
      </DefaultTemplate>
    );
  }

  const data = await fetchModerationQueue('pending');
  const summaryText = (t.pendingSummary as string)
    .replace('{proposals}', String(data.counts.proposals))
    .replace('{problems}', String(data.counts.problems))
    .replace('{dsa}', String(data.counts.dsaReports));

  return (
    <DefaultTemplate
      i18n={i18n}
      locale={locale}
      params={params}
      payload={payload}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <h1>{t.pageTitle}</h1>
        <p>{summaryText}</p>
        <QueueTable initialData={data} currentUserRole={role} />
      </Gutter>
    </DefaultTemplate>
  );
}
