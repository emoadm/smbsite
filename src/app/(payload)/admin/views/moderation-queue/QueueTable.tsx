'use client';

import { useState } from 'react';
import bg from '../../../../../../messages/bg.json';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReviewDialog } from './ReviewDialog';
import type { ModerationQueueData, PendingRow } from '@/lib/submissions/admin-queries';

// Direct bg.json import — Payload admin shell does NOT wrap in a next-intl Provider.
const t = (
  bg as { admin: { queue: Record<string, string> } }
).admin.queue as {
  tabProposals: string;
  tabProblems: string;
  tabDsa: string;
  columnSubmittedAt: string;
  columnKind: string;
  columnTitleExcerpt: string;
  columnSubmitter: string;
  columnAction: string;
  kindProposal: string;
  kindProblem: string;
  kindDsa: string;
  reviewAction: string;
  empty: string;
};

interface Props {
  initialData: ModerationQueueData;
  currentUserRole: string;
}

function ageInHours(d: Date): number {
  return (Date.now() - new Date(d).getTime()) / 36e5;
}

function RowList({
  rows,
  onReview,
}: {
  rows: PendingRow[];
  onReview: (r: PendingRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">{t.empty}</p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t.columnSubmittedAt}</TableHead>
          <TableHead>{t.columnKind}</TableHead>
          <TableHead>{t.columnTitleExcerpt}</TableHead>
          <TableHead>{t.columnSubmitter}</TableHead>
          <TableHead>{t.columnAction}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const dt = new Date(r.created_at);
          const stale = ageInHours(dt) > 72;
          return (
            <TableRow key={r.id}>
              <TableCell className={stale ? 'text-warning' : ''}>
                {dt.toLocaleString('bg-BG', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {r.kind === 'proposal'
                    ? t.kindProposal
                    : r.kind === 'problem'
                      ? t.kindProblem
                      : t.kindDsa}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[400px] truncate">
                {(r.title ?? r.body).slice(0, 100)}
              </TableCell>
              <TableCell>{r.submitter.full_name}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => onReview(r)}>
                  {t.reviewAction}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function QueueTable({ initialData, currentUserRole }: Props) {
  const [reviewing, setReviewing] = useState<PendingRow | null>(null);

  return (
    <>
      <Tabs defaultValue="proposals" className="text-foreground">
        <TabsList>
          <TabsTrigger value="proposals">
            {t.tabProposals} ({initialData.counts.proposals})
          </TabsTrigger>
          <TabsTrigger value="problems">
            {t.tabProblems} ({initialData.counts.problems})
          </TabsTrigger>
          <TabsTrigger value="dsa">
            {t.tabDsa} ({initialData.counts.dsaReports})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="proposals">
          <RowList rows={initialData.proposals} onReview={setReviewing} />
        </TabsContent>
        <TabsContent value="problems">
          <RowList rows={initialData.problems} onReview={setReviewing} />
        </TabsContent>
        <TabsContent value="dsa">
          <RowList rows={initialData.dsaReports} onReview={setReviewing} />
        </TabsContent>
      </Tabs>
      {reviewing && (
        <ReviewDialog
          row={reviewing}
          currentUserRole={currentUserRole}
          onClose={() => setReviewing(null)}
        />
      )}
    </>
  );
}
