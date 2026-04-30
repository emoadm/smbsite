import { isDisposableEmail } from 'disposable-email-domains-js';

export function isDisposable(email: string): boolean {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) return false;
  try {
    return isDisposableEmail(trimmed);
  } catch {
    return false;
  }
}
