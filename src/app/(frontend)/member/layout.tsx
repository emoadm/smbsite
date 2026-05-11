import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login?next=/member');
  }
  if (!(session.user as { emailVerified?: Date | null }).emailVerified) {
    redirect('/auth/otp');
  }
  // Phase 4 D-A2 — live status check (session does NOT embed status; this prevents stale-cache bypass).
  // PATTERNS.md Pattern 6: the redirect is the next-navigation gate (session JWT not mutated).
  const userId = (session.user as { id: string }).id;
  const [u] = await db.select({ status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
  if (u?.status === 'suspended') {
    redirect('/suspended');
  }
  return <>{children}</>;
}
