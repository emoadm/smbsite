import { getTranslations } from 'next-intl/server';

/**
 * Vertical numbered timeline for the /member welcome page (UI-SPEC §5.5).
 *
 * Renders 3 items hardcoded against `member.welcome.next.items[0..2]`
 * (D-09 — fixed three-step "what comes next" sequence: weekly email,
 * channels coming soon per D-10, first voting initiatives). Pure CSS,
 * no library — numeric badge uses Gilroy ExtraBold in `--color-primary`
 * with white digit per UI-SPEC §5.5.
 */
export async function Timeline() {
  const t = await getTranslations('member.welcome.next.items');
  const items = [0, 1, 2];
  return (
    <ol className="mt-6 space-y-8">
      {items.map((i) => (
        <li key={i} className="flex gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-base font-extrabold text-primary-foreground"
            aria-hidden
          >
            {i + 1}
          </div>
          <div>
            <h3 className="font-display text-xl">{t(`${i}.title`)}</h3>
            <p className="mt-2 text-base text-muted-foreground">
              {t(`${i}.body`)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
