import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { oblastDisplayName } from '@/lib/oblast-names';
import type { MyProposalRow, MyProblemRow } from '@/lib/submissions/queries';

type Props =
  | { kind: 'proposal'; row: MyProposalRow }
  | { kind: 'problem'; row: MyProblemRow };

// UI-SPEC §S5 — exact badge class strings per status.
// DO NOT modify these strings — they are the spec-locked invariant.
const STATUS_CLASSES: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border border-warning/20',
  approved: 'bg-success/10 text-success border border-success/20',
  rejected: 'bg-destructive/10 text-destructive border border-destructive/20',
  hidden: 'bg-muted text-muted-foreground border border-border',
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'pending') return <Clock className="size-3 mr-1" aria-hidden="true" />;
  if (status === 'approved')
    return <CheckCircle2 className="size-3 mr-1" aria-hidden="true" />;
  if (status === 'rejected') return <XCircle className="size-3 mr-1" aria-hidden="true" />;
  return null;
}

/**
 * SubmissionStatusCard — RSC card for one submission row.
 *
 * Renders: status Badge (UI-SPEC §S5) + date + title/excerpt + topic + level/oblast
 * (problems) + moderator rejection note (when status=rejected AND note non-empty).
 *
 * Accepts a discriminated-union prop:
 *   { kind: 'proposal'; row: MyProposalRow } | { kind: 'problem'; row: MyProblemRow }
 *
 * Server component — no 'use client'.
 */
export async function SubmissionStatusCard(props: Props) {
  const tStatus = await getTranslations('submission.status');
  const tTopic = await getTranslations('submission.topics');
  const tLevel = await getTranslations('problem.level');

  const statusKey = props.row.status;
  const badgeClasses = STATUS_CLASSES[statusKey] ?? STATUS_CLASSES.pending;
  const dateText = props.row.created_at.toLocaleDateString('bg-BG');

  return (
    <Card className="flex flex-col gap-3 rounded-xl border bg-card p-6">
      {/* Top row: status badge + date */}
      <div className="flex items-center justify-between">
        <Badge className={badgeClasses}>
          <StatusIcon status={statusKey} />
          {tStatus(statusKey as 'pending' | 'approved' | 'rejected')}
        </Badge>
        <span
          className="text-sm font-semibold text-muted-foreground"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {dateText}
        </span>
      </div>

      {/* Title (proposals) or body excerpt (problems) */}
      {props.kind === 'proposal' ? (
        <h2 className="font-display text-2xl font-extrabold text-balance line-clamp-2">
          {props.row.title ?? '—'}
        </h2>
      ) : (
        <p className="text-base line-clamp-3">{props.row.body}</p>
      )}

      {/* Topic line */}
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold">Тема:</span>{' '}
        {tTopic(props.row.topic as 'taxes')}
      </p>

      {/* Level + oblast (problems only) */}
      {props.kind === 'problem' && props.row.level && (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Ниво:</span>{' '}
          {props.row.level === 'local'
            ? `${tLevel('local')} — ${oblastDisplayName(props.row.oblast)}`
            : tLevel('national')}
        </p>
      )}

      {/* Rejection note — UI-SPEC §S5 blockquote-style */}
      {props.row.status === 'rejected' && props.row.moderator_note && (
        <div className="mt-2 border-l-2 border-muted pl-3 text-sm text-muted-foreground italic">
          <span className="font-semibold not-italic">{tStatus('rejectionNotePrefix')}</span>{' '}
          <span>{props.row.moderator_note}</span>
        </div>
      )}
    </Card>
  );
}
