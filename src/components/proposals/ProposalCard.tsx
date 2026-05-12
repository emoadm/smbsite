import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { PublicProposalRow } from '@/lib/submissions/public-queries';
import { ReportContentButton } from '@/components/dsa/ReportContentButton';

interface Props {
  proposal: PublicProposalRow;
  /** When true, renders the DSA Art.16 report button in the card footer.
   *  Must only be set for authenticated members — anonymous visitors MUST see
   *  no DSA report UI (DSA Art.16 requires substantiated notice with contact info). */
  isLoggedIn?: boolean;
}

export async function ProposalCard({ proposal, isLoggedIn = false }: Props) {
  const tTopic = await getTranslations('submission.topics');
  const tProposals = await getTranslations('submission.proposals');
  const date = proposal.approved_at?.toLocaleDateString('bg-BG') ?? '';

  return (
    <Card className="flex flex-col gap-4 rounded-xl border bg-card p-6 hover:ring-1 hover:ring-secondary/50 transition-shadow">
      <Badge variant="outline" className="self-start text-xs">
        {tTopic(proposal.topic as 'taxes')}
      </Badge>
      <h2
        className="font-display text-2xl font-extrabold line-clamp-3"
        style={{ textWrap: 'balance' } as React.CSSProperties}
      >
        {proposal.title ?? '—'}
      </h2>
      <p className="text-base text-muted-foreground line-clamp-2">{proposal.body}</p>
      <Separator />
      <p className="text-sm font-semibold text-muted-foreground">
        {/* D-C1 canonical byline — never a member name; comes from i18n key */}
        {tProposals('anonymousByline')} · <span style={{ fontFeatureSettings: '"tnum"' }}>{date}</span>
      </p>
      {isLoggedIn && (
        <div className="flex justify-end mt-2">
          <ReportContentButton submissionId={proposal.id} />
        </div>
      )}
    </Card>
  );
}
