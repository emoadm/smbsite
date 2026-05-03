'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import bg from '../../../../../../messages/bg.json';
import { oblastDisplayName } from '@/lib/oblast-names';
import { fetchAttributionCsv, type AttributionAggregates, type AttributionFilter } from './actions';

type DashboardCopy = {
  filters: { dateRange: string; applyFilters: string; clearFilters: string };
  tables: {
    byUtmSource: string;
    byOblast: string;
    byQrFlag: string;
    bySelfReportedSource: string;
  };
  columns: {
    utmSource: string;
    oblast: string;
    qrFlag: string;
    selfReportedSource: string;
    count: string;
    registered: string;
  };
  export: string;
  unknown: string;
  noData: string;
  totalSessions: string;
  totalRegistered: string;
};

const t = (bg as { attribution: { dashboard: DashboardCopy } }).attribution.dashboard;

type Props = {
  initialFilter: AttributionFilter;
  initialData: AttributionAggregates;
};

export function AttributionDashboard({ initialFilter, initialData }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<AttributionFilter>(initialFilter);
  const [downloading, setDownloading] = useState(false);

  const data = initialData; // Server-rendered fresh on every navigation; no refetch needed client-side.

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams ?? undefined);
    params.set('dateFrom', filter.dateFrom);
    params.set('dateTo', filter.dateTo);
    for (const k of ['oblast', 'utmSource', 'qrFlag', 'selfReportedSource'] as const) {
      const v = filter[k];
      if (v) params.set(k, v);
      else params.delete(k);
    }
    router.push(`?${params.toString()}`);
  };

  const clearFilters = () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    setFilter({ dateFrom: sevenDaysAgo.toISOString(), dateTo: now.toISOString() });
    router.push('?');
  };

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const csv = await fetchAttributionCsv(filter);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attribution-${filter.dateFrom.slice(0, 10)}-${filter.dateTo.slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  // Bar list helper for by-oblast table
  const oblastMax = Math.max(1, ...data.byOblast.map((r) => r.count));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 16 }}>
      {/* Filters */}
      <fieldset style={{ border: '1px solid var(--theme-elevation-100)', padding: 16, borderRadius: 6 }}>
        <legend>{t.filters.dateRange}</legend>
        <label>
          {t.filters.dateRange}{' '}
          <input
            type="date"
            value={filter.dateFrom.slice(0, 10)}
            onChange={(e) => setFilter({ ...filter, dateFrom: new Date(e.target.value).toISOString() })}
          />
          {' — '}
          <input
            type="date"
            value={filter.dateTo.slice(0, 10)}
            onChange={(e) => setFilter({ ...filter, dateTo: new Date(e.target.value).toISOString() })}
          />
        </label>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button type="button" onClick={applyFilters}>{t.filters.applyFilters}</button>
          <button type="button" onClick={clearFilters}>{t.filters.clearFilters}</button>
          <button type="button" onClick={downloadCsv} disabled={downloading}>
            {downloading ? '…' : t.export}
          </button>
        </div>
      </fieldset>

      {/* Totals — Phase 1 D-27: zero hardcoded Cyrillic. Labels come from
          bg.attribution.dashboard.totalSessions / totalRegistered (Plan 03). */}
      <p>
        <strong>{t.totalSessions}: {data.totalSessions}</strong> · {t.totalRegistered}: {data.totalRegistered}
      </p>

      {/* By UTM Source */}
      <section>
        <h2>{t.tables.byUtmSource}</h2>
        <AggregateTable
          rows={data.byUtmSource}
          keyHeader={t.columns.utmSource}
          countHeader={t.columns.count}
          unknownLabel={t.unknown}
        />
      </section>

      {/* By Oblast — table + bar list */}
      <section>
        <h2>{t.tables.byOblast}</h2>
        {data.byOblast.length === 0 ? (
          <p>{t.noData}</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>{t.columns.oblast}</th>
                <th style={{ textAlign: 'right', width: 100 }}>{t.columns.count}</th>
                <th style={{ width: '50%' }}>{/* bar */}</th>
              </tr>
            </thead>
            <tbody>
              {data.byOblast.map((r) => {
                const pct = (r.count / oblastMax) * 100;
                return (
                  <tr key={r.key}>
                    <td>{oblastDisplayName(r.key)}</td>
                    <td style={{ textAlign: 'right' }}>{r.count}</td>
                    <td>
                      <div style={{ background: 'var(--theme-elevation-100)', height: 12, borderRadius: 3 }}>
                        <div style={{ width: `${pct}%`, background: 'var(--theme-success-500, #2563eb)', height: 12, borderRadius: 3 }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* By QR Flag */}
      <section>
        <h2>{t.tables.byQrFlag}</h2>
        <AggregateTable
          rows={data.byQrFlag}
          keyHeader={t.columns.qrFlag}
          countHeader={t.columns.count}
          unknownLabel={t.unknown}
        />
      </section>

      {/* By Self-Reported Source */}
      <section>
        <h2>{t.tables.bySelfReportedSource}</h2>
        <AggregateTable
          rows={data.bySelfReportedSource}
          keyHeader={t.columns.selfReportedSource}
          countHeader={t.columns.registered}
          unknownLabel={t.unknown}
        />
      </section>
    </div>
  );
}

function AggregateTable({
  rows,
  keyHeader,
  countHeader,
  unknownLabel,
}: {
  rows: Array<{ key: string; count: number }>;
  keyHeader: string;
  countHeader: string;
  unknownLabel: string;
}) {
  if (rows.length === 0) return <p>{t.noData}</p>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left' }}>{keyHeader}</th>
          <th style={{ textAlign: 'right', width: 120 }}>{countHeader}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <td>{r.key === 'unknown' || r.key === 'none' ? unknownLabel : r.key}</td>
            <td style={{ textAlign: 'right' }}>{r.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
