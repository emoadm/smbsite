import { getTranslations } from 'next-intl/server';
import { Vote, Lightbulb, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * 3-card responsive grid for the vision section (UI-SPEC §5.2 + §7.2).
 *
 * Mobile = 1 column; md+ = 3 columns. Icons map 1:1 to the ordered cards in
 * `landing.vision.cards[0..2]`:
 *   0 -> Vote (voting on ideas)
 *   1 -> Lightbulb (proposals for solutions)
 *   2 -> AlertCircle (problem reports)
 *
 * Lucide stroke renders in `--color-primary` (Sinya navy) at the project's
 * preferred 1.5 stroke weight.
 */
export async function ValuePropGrid() {
  const t = await getTranslations('landing.vision.cards');
  const items = [
    { icon: Vote, key: 0 },
    { icon: Lightbulb, key: 1 },
    { icon: AlertCircle, key: 2 },
  ] as const;
  return (
    <div className="grid gap-6 md:grid-cols-3 md:gap-8">
      {items.map(({ icon: Icon, key }) => (
        <Card key={key}>
          <CardHeader>
            <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
            <h3 className="mt-2 font-display text-xl">{t(`${key}.title`)}</h3>
          </CardHeader>
          <CardContent>
            <p className="text-base text-muted-foreground">{t(`${key}.body`)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
