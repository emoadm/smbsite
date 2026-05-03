'use server';

import { getPayload } from 'payload';
import { headers } from 'next/headers';
import config from '@/payload.config';
import { db } from '@/db';
import { attribution_events, users } from '@/db/schema';
import { sql, gte, lte, and, eq } from 'drizzle-orm';

// Phase 2.1 attribution dashboard Server Actions (D-12, D-13).
// All queries are direct Drizzle aggregates — attribution_events is NOT a
// Payload collection. Role re-check defends against direct Server Action
// invocation outside the dashboard (ASVS V4 defense in depth).

export interface AttributionFilter {
  dateFrom: string; // ISO timestamp
  dateTo: string;   // ISO timestamp
  oblast?: string;
  utmSource?: string;
  qrFlag?: string;
  selfReportedSource?: string;
}

export interface AttributionAggregates {
  byUtmSource: Array<{ key: string; count: number }>;
  byOblast: Array<{ key: string; count: number }>;
  byQrFlag: Array<{ key: string; count: number }>;
  bySelfReportedSource: Array<{ key: string; count: number }>;
  totalSessions: number;
  totalRegistered: number;
}

async function assertEditorOrAdmin(): Promise<void> {
  const payload = await getPayload({ config });
  const h = await headers();
  const { user } = await payload.auth({ headers: h });
  const role = (user as { role?: string } | null)?.role ?? '';
  if (!['admin', 'editor'].includes(role)) {
    throw new Error('Forbidden — editor or admin role required');
  }
}

function buildWhere(filter: AttributionFilter) {
  const conds = [
    gte(attribution_events.first_seen_at, new Date(filter.dateFrom)),
    lte(attribution_events.first_seen_at, new Date(filter.dateTo)),
  ];
  if (filter.oblast) conds.push(eq(attribution_events.first_oblast, filter.oblast));
  if (filter.utmSource) conds.push(eq(attribution_events.first_utm_source, filter.utmSource));
  if (filter.qrFlag) conds.push(eq(attribution_events.first_qr_flag, filter.qrFlag));
  return and(...conds);
}

export async function fetchAttributionAggregates(filter: AttributionFilter): Promise<AttributionAggregates> {
  await assertEditorOrAdmin();
  const where = buildWhere(filter);

  const byUtmSourceRows = await db
    .select({ key: attribution_events.first_utm_source, count: sql<number>`count(*)::int` })
    .from(attribution_events)
    .where(where)
    .groupBy(attribution_events.first_utm_source)
    .orderBy(sql`count(*) desc`);

  const byOblastRows = await db
    .select({ key: attribution_events.first_oblast, count: sql<number>`count(*)::int` })
    .from(attribution_events)
    .where(where)
    .groupBy(attribution_events.first_oblast)
    .orderBy(sql`count(*) desc`);

  const byQrFlagRows = await db
    .select({ key: attribution_events.first_qr_flag, count: sql<number>`count(*)::int` })
    .from(attribution_events)
    .where(where)
    .groupBy(attribution_events.first_qr_flag)
    .orderBy(sql`count(*) desc`);

  const bySelfReportedSourceRows = await db
    .select({ key: users.self_reported_source, count: sql<number>`count(*)::int` })
    .from(attribution_events)
    .innerJoin(users, eq(attribution_events.user_id, users.id))
    .where(where)
    .groupBy(users.self_reported_source)
    .orderBy(sql`count(*) desc`);

  const totalRows = await db
    .select({
      total: sql<number>`count(*)::int`,
      registered: sql<number>`count(${attribution_events.user_id})::int`,
    })
    .from(attribution_events)
    .where(where);

  return {
    byUtmSource: byUtmSourceRows.map((r) => ({ key: r.key ?? 'unknown', count: r.count })),
    byOblast: byOblastRows.map((r) => ({ key: r.key ?? 'unknown', count: r.count })),
    byQrFlag: byQrFlagRows.map((r) => ({ key: r.key ?? 'none', count: r.count })),
    bySelfReportedSource: bySelfReportedSourceRows.map((r) => ({ key: r.key ?? 'unknown', count: r.count })),
    totalSessions: totalRows[0]?.total ?? 0,
    totalRegistered: totalRows[0]?.registered ?? 0,
  };
}

export async function fetchAttributionCsv(filter: AttributionFilter): Promise<string> {
  await assertEditorOrAdmin();
  const where = buildWhere(filter);
  const rows = await db
    .select({
      attr_sid: attribution_events.attr_sid,
      first_utm_source: attribution_events.first_utm_source,
      first_utm_medium: attribution_events.first_utm_medium,
      first_oblast: attribution_events.first_oblast,
      first_qr_flag: attribution_events.first_qr_flag,
      first_seen_at: attribution_events.first_seen_at,
      user_id: attribution_events.user_id,
    })
    .from(attribution_events)
    .where(where)
    .orderBy(attribution_events.first_seen_at);

  const header = 'attr_sid,first_utm_source,first_utm_medium,first_oblast,first_qr_flag,first_seen_at,user_id';
  const escape = (v: unknown) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = rows.map((r) =>
    [r.attr_sid, r.first_utm_source, r.first_utm_medium, r.first_oblast, r.first_qr_flag, r.first_seen_at?.toISOString(), r.user_id]
      .map(escape)
      .join(','),
  );
  return [header, ...lines].join('\n');
}
