import type { AdminViewServerProps } from 'payload';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import bg from '../../../../../../messages/bg.json';
import { fetchAttributionAggregates, type AttributionFilter } from './actions';
import { AttributionDashboard } from './AttributionDashboard';

// Phase 2.1 attribution dashboard (D-12, D-13, ATTR-07).
// Custom Payload admin view registered at admin.components.views.attribution.
//
// next-intl note: Payload admin shell does NOT wrap RSC components in a
// next-intl Provider. We load messages/bg.json directly (mirrors
// src/lib/email/worker.tsx loadT pattern) — small, predictable, no
// provider dependency.

const t = (bg as { attribution: { dashboard: Record<string, unknown> } }).attribution.dashboard as {
  title: string;
  subtitle: string;
  denied: string;
  loginRequired: string;
};

function defaultFilter(): AttributionFilter {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { dateFrom: sevenDaysAgo.toISOString(), dateTo: now.toISOString() };
}

function parseFilter(searchParams: { [k: string]: string | string[] | undefined }): AttributionFilter {
  const def = defaultFilter();
  const get = (k: string) => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };
  return {
    dateFrom: get('dateFrom') ?? def.dateFrom,
    dateTo: get('dateTo') ?? def.dateTo,
    oblast: get('oblast'),
    utmSource: get('utmSource'),
    qrFlag: get('qrFlag'),
    selfReportedSource: get('selfReportedSource'),
  };
}

export async function AttributionView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req: { user, i18n, payload }, locale, visibleEntities } = initPageResult;

  // Role gate — D-13 + ASVS V4. NO Drizzle query runs before this passes.
  if (!user) {
    return (
      <DefaultTemplate i18n={i18n} locale={locale} params={params} payload={payload} visibleEntities={visibleEntities}>
        <Gutter><p>{t.loginRequired}</p></Gutter>
      </DefaultTemplate>
    );
  }
  const role = (user as { role?: string }).role ?? '';
  // Phase 4 EDIT-07 — super_editor inherits attribution access
  if (!['admin', 'editor', 'super_editor'].includes(role)) {
    return (
      <DefaultTemplate i18n={i18n} locale={locale} params={params} payload={payload} visibleEntities={visibleEntities}>
        <Gutter><p>{t.denied}</p></Gutter>
      </DefaultTemplate>
    );
  }

  const sp = (await searchParams) ?? {};
  const filter = parseFilter(sp);
  const data = await fetchAttributionAggregates(filter);

  return (
    <DefaultTemplate i18n={i18n} locale={locale} params={params} payload={payload} visibleEntities={visibleEntities}>
      <Gutter>
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
        <AttributionDashboard initialFilter={filter} initialData={data} />
      </Gutter>
    </DefaultTemplate>
  );
}
