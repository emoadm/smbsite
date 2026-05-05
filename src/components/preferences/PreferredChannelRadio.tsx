'use client';

import { useState, useTransition } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { savePreferredChannel } from '@/app/actions/save-preferences';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export interface PreferredChannelRadioProps {
  initialChannel: 'whatsapp' | 'telegram' | 'none' | null;
}

export function PreferredChannelRadio({ initialChannel }: PreferredChannelRadioProps) {
  const t = useTranslations('member.preferences');
  const [channel, setChannel] = useState<'whatsapp' | 'telegram' | 'none' | null>(
    initialChannel,
  );
  const [isPending, startTransition] = useTransition();

  const onChange = (next: string) => {
    const validChannel: 'whatsapp' | 'telegram' | 'none' | null =
      next === 'whatsapp' || next === 'telegram' || next === 'none' ? next : null;
    setChannel(validChannel);
    startTransition(async () => {
      const result = await savePreferredChannel({ channel: validChannel });
      if (result.ok) {
        toast.success(t('toast.saved'));
      } else {
        setChannel(initialChannel);
        toast.error(t('toast.error'));
      }
    });
  };

  return (
    <RadioGroup
      value={channel ?? 'none'}
      onValueChange={onChange}
      disabled={isPending}
    >
      <div className="flex items-center gap-3 py-2">
        <RadioGroupItem value="whatsapp" id="ch-whatsapp" />
        <Label htmlFor="ch-whatsapp">{t('channel.options.whatsapp')}</Label>
      </div>
      <div className="flex items-center gap-3 py-2">
        <RadioGroupItem value="telegram" id="ch-telegram" />
        <Label htmlFor="ch-telegram">{t('channel.options.telegram')}</Label>
      </div>
      <div className="flex items-center gap-3 py-2">
        <RadioGroupItem value="none" id="ch-none" />
        <Label htmlFor="ch-none">{t('channel.options.none')}</Label>
      </div>
    </RadioGroup>
  );
}

export default PreferredChannelRadio;
