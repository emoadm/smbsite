import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Hr,
  Link,
  Preview,
} from '@react-email/components';

export type NewsletterEmailT = (key: string, vars?: Record<string, string | number>) => string;

export type NewsletterTopic =
  | 'newsletter_general'
  | 'newsletter_voting'
  | 'newsletter_reports'
  | 'newsletter_events';

export interface NewsletterEmailProps {
  t: NewsletterEmailT;
  fullName?: string;
  subject: string;
  previewText: string;
  topic: NewsletterTopic;
  bodyHtml: string;
  unsubUrl: string;
  preferencesUrl: string;
  year: number;
}

// Phase 5 D-17 / UI-SPEC §4.4 — single brand accent for ALL topics (brand restraint).
// Topic context is conveyed via chip TEXT label, NEVER chip color.
const ACCENT = '#004A79';

export function NewsletterEmail({
  t,
  fullName,
  subject,
  previewText,
  topic,
  bodyHtml,
  unsubUrl,
  preferencesUrl,
  year,
}: NewsletterEmailProps) {
  const firstName = (fullName ?? '').trim().split(/\s+/)[0] ?? '';
  const greeting = firstName
    ? t('greetingNamed', { firstName })
    : t('greetingAnonymous');

  return (
    <Html lang="bg">
      <Head>
        {/* Phase 5 D-18 — defense-in-depth charset (Pitfall 5). Both meta variants. */}
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta charSet="utf-8" />
      </Head>
      <Preview>{previewText}</Preview>
      <Body
        style={{
          fontFamily: '"Roboto", system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif',
          backgroundColor: '#FFFFFF',
          color: '#0F172A',
          margin: 0,
          padding: 0,
        }}
      >
        <Container style={{ maxWidth: 600, padding: 24, margin: '0 auto' }}>
          {/* Topic chip — UI-SPEC §4.4 single accent for all 4 topics */}
          <Text
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              backgroundColor: ACCENT,
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 4,
              letterSpacing: '0.04em',
              textTransform: 'uppercase' as const,
              margin: '0 0 16px 0',
            }}
          >
            {t(`topicChip.${topic}`)}
          </Text>

          {/* Subject as h1 — UI-SPEC §3.2 Gilroy ExtraBold 800 */}
          <Heading
            as="h1"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: ACCENT,
              fontFamily: '"Gilroy", "Roboto", system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif',
              lineHeight: 1.2,
              margin: '0 0 16px 0',
            }}
          >
            {subject}
          </Heading>

          {/* Greeting — Phase 1 D-26 nominative only */}
          <Text style={{ fontSize: 16, lineHeight: 1.6, margin: '0 0 16px 0' }}>{greeting}</Text>

          {/* Lexical to HTML content slot — bodyHtml comes from renderLexicalToHtml (sanitized at source) */}
          {/* eslint-disable-next-line react/no-danger */}
          <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />

          <Hr style={{ borderColor: '#E2E8F0', margin: '32px 0' }} />

          {/* RFC 8058 footer — preferences link */}
          <Text style={{ fontSize: 12, lineHeight: 1.5, color: '#475569', margin: '0 0 16px 0' }}>
            {t('footer.preferencesIntro')}{' '}
            <Link href={preferencesUrl} style={{ color: ACCENT, textDecoration: 'underline' }}>
              {t('footer.preferencesLink')}
            </Link>
          </Text>

          {/* RFC 8058 footer — one-click unsub link (D-14) */}
          <Text style={{ fontSize: 12, lineHeight: 1.5, color: '#475569', margin: '0 0 16px 0' }}>
            {t('footer.unsubIntro')}{' '}
            <Link href={unsubUrl} style={{ color: ACCENT, textDecoration: 'underline' }}>
              {t('footer.unsubLink')}
            </Link>
          </Text>

          {/* Topic line — context for inbox-skimming reader */}
          <Text style={{ fontSize: 12, lineHeight: 1.5, color: '#475569', margin: '0 0 16px 0' }}>
            {t('footer.topicLine', { topicLabel: t(`topicChip.${topic}`) })}
          </Text>

          <Hr style={{ borderColor: '#E2E8F0', margin: '24px 0' }} />

          {/* Copyright + organization */}
          <Text style={{ fontSize: 11, lineHeight: 1.4, color: '#94A3B8', margin: '0 0 4px 0' }}>
            {t('footer.organization')}
          </Text>
          <Text style={{ fontSize: 11, lineHeight: 1.4, color: '#94A3B8', margin: '0 0 4px 0' }}>
            {t('footer.contactLine')}
          </Text>
          <Text style={{ fontSize: 11, lineHeight: 1.4, color: '#94A3B8', margin: 0 }}>
            {t('footer.copyright', { year })}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default NewsletterEmail;
