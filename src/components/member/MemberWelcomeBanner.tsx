import { CheckCircle2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { Card } from '@/components/ui/card';

/**
 * Member welcome card (UI-SPEC §5.5, Pattern P3 + P8).
 *
 * Reads the active session via `auth()` and extracts `firstName` using the
 * canonical idiom from `OtpEmail.tsx:14` —
 *   `(fullName ?? '').trim().split(/\s+/)[0] ?? ''`
 * — to keep behavior consistent across the codebase.
 *
 * Renders a shadcn Card with a success-colored left border and a lucide
 * `CheckCircle2` icon. The page-title `<h1>` lives in this component for
 * `/member` (Pattern P9 — raw `<h1>` with `font-display`, never CardTitle;
 * UI-SPEC §8.1 mandates exactly one h1 per page).
 *
 * If the session has no name, falls back to the `bodyFallback` translation
 * key (UI-SPEC §7.4).
 */
export async function MemberWelcomeBanner() {
  const t = await getTranslations('member.welcome.banner');
  const session = await auth();
  const fullName =
    (session?.user as { name?: string } | undefined)?.name ?? '';
  const firstName = fullName.trim().split(/\s+/)[0] ?? '';
  return (
    <Card className="border-l-4 border-l-success p-6">
      <div className="flex gap-4">
        <CheckCircle2
          className="h-7 w-7 shrink-0 text-success"
          strokeWidth={1.5}
        />
        <div>
          <h1 className="font-display text-3xl">{t('heading')}</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {firstName ? t('body', { firstName }) : t('bodyFallback')}
          </p>
        </div>
      </div>
    </Card>
  );
}
