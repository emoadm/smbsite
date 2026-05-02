'use client';

import { useTranslations } from 'next-intl';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

/**
 * FAQ accordion (UI-SPEC §6.1, §7.3).
 *
 * Wraps the shadcn Accordion (Radix-backed) in single-open + collapsible mode
 * — the canonical FAQ pattern. Used by `/faq` (count=6) and the homepage
 * FAQ-teaser (count=4). Reading translations through `useTranslations`
 * (Client hook) is required because this component carries `'use client'`.
 *
 * The `count` prop is hardcoded by length; if the bg.json items array length
 * differs, `t(`items.${i}.question`)` throws at render — caught by next-intl
 * strict mode at build time.
 */
export function FAQAccordion({
  namespace = 'faq',
  count = 6,
}: {
  namespace?: string;
  count?: number;
}) {
  const t = useTranslations(namespace);
  const indices = Array.from({ length: count }, (_, i) => i);
  return (
    <Accordion type="single" collapsible className="w-full">
      {indices.map((i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger className="font-display text-base md:text-lg">
            {t(`items.${i}.question`)}
          </AccordionTrigger>
          <AccordionContent className="text-base text-muted-foreground">
            {t(`items.${i}.answer`)}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
