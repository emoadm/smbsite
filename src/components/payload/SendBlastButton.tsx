'use client';

import { useState } from 'react';
import { Button as PayloadButton } from '@payloadcms/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { sendBlast } from '@/app/actions/send-blast';
import { getAdminT } from '@/lib/email/i18n-direct';

// Phase 5 D-22 — admin custom 'use client' component.
// MUST use getAdminT (synchronous, direct messages/bg.json walker — Plan 05-03)
// because Payload admin shell does NOT mount NextIntlClientProvider.
// useTranslations from next-intl WILL THROW at runtime in this context.
const t = getAdminT('admin.newsletters');

export interface SendBlastButtonProps {
  newsletterId: string;
  scheduledAt?: string | null;
  lastTestSentAt?: string | null;
  lastEditedAfterTestAt?: boolean;
}

type GateState = 'never' | 'recent' | 'expired' | 'invalidated';

function computeGate(
  lastTest: string | null | undefined,
  edited: boolean | undefined,
): GateState {
  if (!lastTest) return 'never';
  if (edited === true) return 'invalidated';
  const ageMs = Date.now() - new Date(lastTest).getTime();
  return ageMs > 24 * 60 * 60 * 1000 ? 'expired' : 'recent';
}

export function SendBlastButton({
  newsletterId,
  scheduledAt,
  lastTestSentAt,
  lastEditedAfterTestAt,
}: SendBlastButtonProps) {
  const [postSendOpen, setPostSendOpen] = useState(false);
  const [postSendCount, setPostSendCount] = useState<number | null>(null);

  const gate = computeGate(lastTestSentAt, lastEditedAfterTestAt);
  const canSend = gate === 'recent';
  const tooltipKey =
    gate === 'never'
      ? 'gate.tooltip.never'
      : gate === 'expired'
        ? 'gate.expired'
        : gate === 'invalidated'
          ? 'gate.invalidated'
          : null;

  const ctaLabel = scheduledAt ? t('actions.sendBlast.scheduled') : t('actions.sendBlast.now');

  const onSend = async () => {
    const result = await sendBlast({ newsletterId });
    if (result.ok) {
      setPostSendCount(null);
      setPostSendOpen(true);
    } else {
      const sonner = await import('sonner');
      const reasonKey =
        result.reason === 'gate_never'
          ? 'gate.never'
          : result.reason === 'gate_expired'
            ? 'gate.expired'
            : result.reason === 'gate_invalidated'
              ? 'gate.invalidated'
              : 'toast.error';
      sonner.toast.error(t(reasonKey));
    }
  };

  const button = (
    <PayloadButton
      buttonStyle="primary"
      size="large"
      disabled={!canSend}
      onClick={onSend}
      aria-label={ctaLabel}
      type="button"
    >
      {ctaLabel}
    </PayloadButton>
  );

  return (
    <>
      {tooltipKey ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>{t(tooltipKey)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}

      <Dialog open={postSendOpen} onOpenChange={setPostSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('postSend.title')}</DialogTitle>
            <DialogDescription>
              {t('postSend.body', { count: postSendCount ?? 0, subject: '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <PayloadButton buttonStyle="primary" onClick={() => setPostSendOpen(false)}>
              {t('postSend.confirm')}
            </PayloadButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SendBlastButton;
