'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Flag } from 'lucide-react';
import { ReportContentDialog } from './ReportContentDialog';

interface Props {
  submissionId: string;
}

/**
 * Trigger button rendered inside ProposalCard footer for logged-in members.
 * Renders ONLY when isLoggedIn=true is passed in ProposalCard — anonymous
 * visitors never see this component (DSA Art.16 substantiated-notice requirement).
 */
export function ReportContentButton({ submissionId }: Props) {
  const t = useTranslations('dsa.report');
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground gap-1"
        onClick={() => setOpen(true)}
      >
        <Flag className="size-3" aria-hidden="true" />
        {t('buttonLabel')}
      </Button>
      <ReportContentDialog submissionId={submissionId} open={open} onOpenChange={setOpen} />
    </>
  );
}
