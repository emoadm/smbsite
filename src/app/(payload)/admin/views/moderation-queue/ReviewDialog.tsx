'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import bg from '../../../../../../messages/bg.json';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ConfirmActionDialog } from './ConfirmActionDialog';
import { approveSubmission, rejectSubmission } from './actions';
import type { PendingRow } from './actions';

// Direct bg.json import — Payload admin shell does NOT wrap in a next-intl Provider.
const t = (bg as { admin: { moderation: Record<string, string> } }).admin.moderation as {
  submitterDetailsToggle: string;
  submitterRegisteredOn: string;
  submitterRoleSector: string;
  submitterSource: string;
  moderatorNoteLabel: string;
  moderatorNotePlaceholder: string;
  approveHeading: string;
  approveBody: string;
  approveDismiss: string;
  approveAction: string;
  rejectHeading: string;
  rejectBody: string;
  rejectDismiss: string;
  rejectAction: string;
};

export function ReviewDialog({
  row,
  currentUserRole,
  onClose,
}: {
  row: PendingRow;
  currentUserRole: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState<'approve' | 'reject' | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onConfirmApprove = () => {
    setError(null);
    startTransition(async () => {
      const r = await approveSubmission({ submissionId: row.id });
      if (r.ok) {
        router.refresh();
        onClose();
      } else {
        setError(r.error);
        setConfirming(null);
      }
    });
  };

  const onConfirmReject = () => {
    setError(null);
    startTransition(async () => {
      const r = await rejectSubmission({ submissionId: row.id, note });
      if (r.ok) {
        router.refresh();
        onClose();
      } else {
        setError(r.error);
        setConfirming(null);
      }
    });
  };

  const kindLabel =
    row.kind === 'proposal'
      ? 'Преглед на предложение'
      : row.kind === 'problem'
        ? 'Преглед на сигнал'
        : 'Преглед на DSA сигнал';

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{kindLabel}</DialogTitle>
          </DialogHeader>

          {/* Submitter accordion — collapsed by default; D-C1 internal surface */}
          <Accordion type="single" collapsible>
            <AccordionItem value="submitter">
              <AccordionTrigger>{t.submitterDetailsToggle}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>Подател:</strong> {row.submitter.full_name} ({row.submitter.email})
                </p>
                <p>
                  {t.submitterRoleSector} {row.submitter.role}, {row.submitter.sector}
                </p>
                {row.submitter.self_reported_source && (
                  <p>
                    {t.submitterSource} {row.submitter.self_reported_source}
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Separator className="my-4" />

          {/* Submission content */}
          <div className="space-y-2">
            {row.title && (
              <p>
                <strong>Заглавие:</strong> {row.title}
              </p>
            )}
            <p>
              <strong>Тема:</strong> {row.topic}
            </p>
            {row.level && (
              <p>
                <strong>Ниво:</strong> {row.level} {row.oblast && `— ${row.oblast}`}
              </p>
            )}
            <p className="whitespace-pre-wrap">
              <strong>Описание:</strong>
              <br />
              {row.body}
            </p>
          </div>

          <Separator className="my-4" />

          {/* Moderator note */}
          <div className="space-y-2">
            <label htmlFor="moderator-note" className="text-sm font-semibold">
              {t.moderatorNoteLabel}
            </label>
            <Textarea
              id="moderator-note"
              rows={3}
              placeholder={t.moderatorNotePlaceholder}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 justify-end mt-4">
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => setConfirming('reject')}
            >
              {t.rejectAction}
            </Button>
            <Button
              variant="default"
              disabled={pending}
              onClick={() => setConfirming('approve')}
            >
              {t.approveAction}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {confirming === 'approve' && (
        <ConfirmActionDialog
          heading={t.approveHeading}
          body={t.approveBody}
          confirmLabel={t.approveAction}
          dismissLabel={t.approveDismiss}
          confirmVariant="default"
          disabled={pending}
          onConfirm={onConfirmApprove}
          onDismiss={() => setConfirming(null)}
        />
      )}
      {confirming === 'reject' && (
        <ConfirmActionDialog
          heading={t.rejectHeading}
          body={t.rejectBody}
          confirmLabel={t.rejectAction}
          dismissLabel={t.rejectDismiss}
          confirmVariant="destructive"
          disabled={pending || note.trim().length < 5}
          onConfirm={onConfirmReject}
          onDismiss={() => setConfirming(null)}
        />
      )}
    </>
  );
}
