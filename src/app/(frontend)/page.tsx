import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Hero } from '@/components/landing/Hero';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { VisionSection } from '@/components/landing/VisionSection';
import { CTASection } from '@/components/landing/CTASection';
import { FAQTeaserSection } from '@/components/landing/FAQTeaserSection';

/**
 * Phase 2 landing — replaces the Phase 1 redirect. ISR per RESEARCH §1
 * (revalidate=3600 emits Cache-Control: s-maxage=3600, stale-while-revalidate=...).
 * Do NOT set `export const dynamic` to a fully-static value — the Header
 * layout calls auth()/cookies() and must remain dynamically rendered
 * (RESEARCH anti-pattern lines 577-584).
 *
 * Per UI-SPEC §13.1: anonymous visitors hit Cloudflare cache; authenticated
 * visitors bypass cache (cookie-vary configured in plan 02-07 middleware/runbook).
 */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const tSite = await getTranslations('site');
  return {
    title: tSite('metadataTitle'),
    description: tSite('metadataDescription'),
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: tSite('brandName'),
      locale: 'bg_BG',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', images: ['/og-image.png'] },
  };
}

export default async function LandingPage() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <VisionSection />
      <CTASection />
      <FAQTeaserSection />
    </>
  );
}
