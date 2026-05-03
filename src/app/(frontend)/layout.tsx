import { roboto, gilroy } from '@/lib/fonts';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CookieBanner } from '@/components/layout/CookieBanner';
import { AttrInit } from '@/components/attribution/AttrInit';
import '@/styles/globals.css';

export async function generateMetadata() {
  const t = await getTranslations('site');
  return {
    title: t('metadataTitle'),
    description: t('metadataDescription'),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const tA11y = await getTranslations('a11y');

  return (
    <html lang={locale} className={`${roboto.variable} ${gilroy.variable}`}>
      <body className="bg-background text-foreground font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Sofia">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            {tA11y('skipToContent')}
          </a>
          <Header />
          <main id="main-content" className="min-h-[calc(100vh-14rem)]">{children}</main>
          <Footer />
          <CookieBanner />
          <AttrInit />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
