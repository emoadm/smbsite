import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { MainContainer } from '@/components/layout/MainContainer';
import { Button } from '@/components/ui/button';
import { SubmissionStatusCard } from '@/components/submissions/SubmissionStatusCard';
import { getMyProposals } from '@/lib/submissions/queries';

/**
 * /member/predlozheniya — PROP-03 — member's own proposal status list.
 *
 * Per-user view: never cached (force-dynamic per T-04-04-03).
 * Session comes from MemberLayout via auth() — layout already redirects unauthenticated users.
 *
 * Security: userId is read from session.user.id server-side only.
 * getMyProposals enforces submitter_id filter (T-04-04-01 IDOR mitigation).
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('submission.myProposals');
  return { title: t('pageTitle') };
}

export default async function MyProposalsPage() {
  const t = await getTranslations('submission.myProposals');
  const session = await auth();
  const userId = (session!.user as { id: string }).id;
  const rows = await getMyProposals(userId);

  return (
    <MainContainer width="prose">
      <div className="flex items-center justify-between gap-4 pt-12">
        <h1 className="font-display text-4xl font-extrabold">{t('pageTitle')}</h1>
        <Button asChild size="sm">
          <Link href="/member/predlozhi">+ {t('newCta')}</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-4 py-16 text-center">
          <h2 className="font-display text-2xl">{t('emptyHeading')}</h2>
          <p className="text-muted-foreground">{t('emptyBody')}</p>
          <Button asChild>
            <Link href="/member/predlozhi">{t('emptyCta')}</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.id}>
              <SubmissionStatusCard kind="proposal" row={row} />
            </li>
          ))}
        </ul>
      )}
    </MainContainer>
  );
}
