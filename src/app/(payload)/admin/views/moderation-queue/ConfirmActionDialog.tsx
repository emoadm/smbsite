'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  heading: string;
  body: string;
  confirmLabel: string;
  dismissLabel: string;
  confirmVariant?: 'default' | 'destructive';
  disabled?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

/**
 * Reusable nested confirm dialog for moderation actions (approve / reject).
 * Action-specific dismiss labels are enforced by the caller (ReviewDialog)
 * per UI-SPEC §S7: "Не одобрявай" for approve, "Не отхвърляй" for reject.
 */
export function ConfirmActionDialog({
  heading,
  body,
  confirmLabel,
  dismissLabel,
  confirmVariant = 'default',
  disabled,
  onConfirm,
  onDismiss,
}: Props) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="outline" onClick={onDismiss} disabled={disabled}>
            {dismissLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={disabled}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
