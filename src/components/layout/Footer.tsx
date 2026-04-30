import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export async function Footer() {
  const t = await getTranslations('footer');
  const year = new Date().getFullYear();
  return (
    <footer className="bg-surface mt-12">
      <div className="mx-auto flex max-w-[1140px] flex-col items-start gap-6 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
        <nav
          aria-label={t('legalGroupAria')}
          className="flex flex-col gap-2 md:flex-row md:gap-6"
        >
          <Link href="/legal/privacy" className="text-accent hover:underline">
            {t('privacy')}
          </Link>
          <Link href="/legal/terms" className="text-accent hover:underline">
            {t('terms')}
          </Link>
          <a href="mailto:contact@example.invalid" className="text-accent hover:underline">
            {t('contact')}
          </a>
        </nav>
        <p>{t('copyright', { year })}</p>
      </div>
    </footer>
  );
}
