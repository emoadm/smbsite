'use server';

import { revalidatePath } from 'next/cache';
import { signOut } from '@/lib/auth';

export async function logout(): Promise<void> {
  // Invalidate the layout cache so Header re-renders without the session.
  // Mirror of the verify-otp.ts revalidate; without it the cached signed-in
  // Header lingers after the redirect to /login.
  revalidatePath('/', 'layout');
  await signOut({ redirectTo: '/login' });
}
