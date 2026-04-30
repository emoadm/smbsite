import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['bg'],
  defaultLocale: 'bg',
  localePrefix: 'never',
});

export type AppLocale = (typeof routing.locales)[number];
