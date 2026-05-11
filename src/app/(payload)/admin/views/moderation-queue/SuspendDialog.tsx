'use client';

// Phase 4 Plan 04-07 — SuspendDialog: operator can suspend a member from within ReviewDialog.
// Uses the direct bg.json import pattern (Payload admin shell has no next-intl Provider).

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import bg from '../../../../../../messages/bg.json';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from './ConfirmActionDialog';
import { suspendUser } from '@/lib/submissions/admin-actions';

const t = (bg as { admin: { moderation: Record<string, string> } }).admin.moderation as {
  suspendHeading: string;
  suspendBody: string;
  suspendDismiss: string;
  suspendAction: string;
  moderatorNoteLabel: string;
  moderatorNotePlaceholder: string;
};

interface Props {
  userId: string;
  fullName: string;
  onClose: () => void;
}

export function SuspendDialog({ userId, fullName, onClose }: Props) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onConfirm = () => {
    setError(null);
    startTransition(async () => {
      const r = await suspendUser({ userId, reason });
      if (r.ok) {
        router.refresh();
        onClose();
      } else {
        setError(r.error);
        setConfirming(false);
      }
    });
  };

  const heading = t.suspendHeading.replace('{name}', fullName);
  const reasonValid = reason.trim().length >= 10;

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{heading}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t.suspendBody}</p>
          <div className="mt-4 space-y-2">
            <label htmlFor="suspend-reason" className="text-sm font-semibold">
              {t.moderatorNoteLabel}
            </label>
            <Textarea
              id="suspend-reason"
              rows={2}
              placeholder={t.moderatorNotePlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={onClose} disabled={pending}>
              {t.suspendDismiss}
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !reasonValid}
              onClick={() => setConfirming(true)}
            >
              {t.suspendAction}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {confirming && (
        <ConfirmActionDialog
          heading={heading}
          body={t.suspendBody}
          confirmLabel={t.suspendAction}
          dismissLabel={t.suspendDismiss}
          confirmVariant="destructive"
          disabled={pending}
          onConfirm={onConfirm}
          onDismiss={() => setConfirming(false)}
        />
      )}
    </>
  );
}
