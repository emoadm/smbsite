import { readFileSync } from 'fs';
import { join } from 'path';
import { getTranslations } from 'next-intl/server';
import { oblastDisplayName } from '@/lib/oblast-names';
import type { OblastAggRow } from '@/lib/submissions/public-queries';

interface Props {
  aggregates: OblastAggRow[];
}

function quartileTierClass(count: number, sortedCounts: number[]): string {
  if (sortedCounts.length === 0) return 'fill-muted';
  // Quartile boundaries (asc): q25, q50, q75
  const q = (p: number) =>
    sortedCounts[Math.min(sortedCounts.length - 1, Math.floor(p * sortedCounts.length))];
  const q25 = q(0.25);
  const q50 = q(0.5);
  const q75 = q(0.75);
  if (count >= q75) return 'fill-primary'; // tier 4
  if (count >= q50) return 'fill-primary/60'; // tier 3
  if (count >= q25) return 'fill-secondary/70'; // tier 2
  return 'fill-secondary/40'; // tier 1
}

export async function OblastMap({ aggregates }: Props) {
  const t = await getTranslations('problem.heatmap');

  // Build oblast → count map (non-suppressed only)
  const counts = new Map<string, number>();
  for (const r of aggregates) counts.set(r.oblast, r.count);
  const sortedCounts = Array.from(counts.values()).sort((a, b) => a - b);

  // Read SVG from disk and produce an enriched inline string.
  // Content is from a trusted on-disk asset (Plan 04-01 controlled BG-01..BG-28 IDs).
  // No user input reaches this string — T-04-05-03 mitigated.
  const svgPath = join(process.cwd(), 'public', 'maps', 'bg-oblasts.svg');
  const rawSvg = readFileSync(svgPath, 'utf8');

  // For each ISO code, replace the path's class/aria attributes via a regex transform.
  // We insert aria-label and class attributes keyed off id="BG-XX".
  const enriched = rawSvg.replace(
    /<path([^>]*?)id="(BG-\d{2})"([^>]*?)\/?>/g,
    (match, before, isoCode, after) => {
      const count = counts.get(isoCode);
      const displayName = oblastDisplayName(isoCode);
      const cls =
        count !== undefined ? quartileTierClass(count, sortedCounts) : 'fill-muted';
      const ariaLabel =
        count !== undefined
          ? `${displayName}: ${count} сигнала`
          : `${displayName}: ${t('suppressed')}`;
      return `<path${before}id="${isoCode}" class="${cls} stroke-border stroke-1 transition-colors hover:opacity-80 focus:outline focus:outline-2 focus:outline-primary" tabindex="0" role="img" aria-label="${ariaLabel}"${after}/>`;
    },
  );

  return (
    <div
      role="group"
      aria-label={t('ariaMapLabel')}
      className="w-full"
      // Inline SVG injection via dangerouslySetInnerHTML — content is from a trusted
      // on-disk asset whose ISO IDs we control (Plan 04-01 Task 1). No user input
      // reaches this string. T-04-05-03 mitigated.
      dangerouslySetInnerHTML={{ __html: enriched }}
    />
  );
}
