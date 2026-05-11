import { getTranslations } from 'next-intl/server';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { oblastDisplayName } from '@/lib/oblast-names';

interface Props {
  rows: Array<{ oblast: string; count: number; topTopic: string | null }>;
  nationalRow: { count: number; topTopic: string | null } | null;
}

export async function OblastBreakdownTable({ rows, nationalRow }: Props) {
  const t = await getTranslations('problem.heatmap.table');
  const tTopic = await getTranslations('submission.topics');

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('columnOblast')}</TableHead>
          <TableHead className="text-right">{t('columnCount')}</TableHead>
          <TableHead>{t('columnTopTopic')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {nationalRow && (
          <TableRow className="bg-muted/30">
            <TableCell className="font-semibold">{t('nationalLabel')}</TableCell>
            <TableCell
              className="text-right"
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              {nationalRow.count}
            </TableCell>
            <TableCell>
              {nationalRow.topTopic ? tTopic(nationalRow.topTopic as 'taxes') : '—'}
            </TableCell>
          </TableRow>
        )}
        {rows.map((r) => (
          <TableRow key={r.oblast} className="hover:bg-muted/50">
            <TableCell>{oblastDisplayName(r.oblast)}</TableCell>
            <TableCell
              className="text-right"
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              {r.count}
            </TableCell>
            <TableCell>
              {r.topTopic ? tTopic(r.topTopic as 'taxes') : '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
