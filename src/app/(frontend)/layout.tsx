import { Roboto, Roboto_Slab } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import '@/styles/globals.css';

const roboto = Roboto({
  weight: ['400', '600'],
  subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
  display: 'swap',
  variable: '--font-roboto',
});

const robotoSlab = Roboto_Slab({
  weight: ['600'],
  subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
  display: 'swap',
  variable: '--font-roboto-slab',
});

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

  return (
    <html lang={locale} className={`${roboto.variable} ${robotoSlab.variable}`}>
      <body className="bg-background text-foreground font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Sofia">
          <Header />
          <main className="min-h-[calc(100vh-14rem)]">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
