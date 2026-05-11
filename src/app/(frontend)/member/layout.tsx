import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login?next=/member');
  }
  if (!(session.user as { emailVerified?: Date | null }).emailVerified) {
    redirect('/auth/otp');
  }
  return <>{children}</>;
}
