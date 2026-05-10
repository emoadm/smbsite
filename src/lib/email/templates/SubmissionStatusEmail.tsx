// Phase 4 Plan 04-07 — React Email template for submission approval/rejection notifications.
// Mirrors structure of WelcomeEmail.tsx (translator passed in by worker.tsx).
import React from 'react';
import { Html, Head, Body, Container, Heading, Text, Hr, Button } from '@react-email/components';

export type SubmissionStatusEmailT = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

export interface SubmissionStatusEmailProps {
  /** Translator scoped to email.submissionStatus.{approved|rejected} for body/cta;
   *  the worker loads it via loadT('email.submissionStatus.<variant>'). */
  t: SubmissionStatusEmailT;
  /** Translator scoped to email.submissionStatus for shared keys (memberFooter). */
  tShared: SubmissionStatusEmailT;
  variant: 'approved' | 'rejected';
  fullName: string;
  title: string;
  moderatorNote?: string;
  siteOrigin: string;
}

export function SubmissionStatusEmail({
  t,
  tShared,
  variant,
  fullName,
  title,
  moderatorNote,
  siteOrigin,
}: SubmissionStatusEmailProps) {
  const isApproved = variant === 'approved';
  const ctaHref = isApproved ? `${siteOrigin}/predlozheniya` : `${siteOrigin}/member/predlozheniya`;
  const bodyVars: Record<string, string> = isApproved
    ? { fullName, title }
    : { fullName, title, note: moderatorNote ?? '' };

  return (
    <Html lang="bg">
      <Head />
      <Body
        style={{
          fontFamily: 'Roboto, system-ui, sans-serif',
          backgroundColor: '#F1F5F9',
          color: '#0F172A',
        }}
      >
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#fff', padding: 32 }}>
          <Heading
            as="h1"
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: isApproved ? '#004A79' : '#DC2626',
            }}
          >
            {t('subject')}
          </Heading>
          <Text style={{ fontSize: 16, whiteSpace: 'pre-line' }}>{t('body', bodyVars)}</Text>
          <Button
            href={ctaHref}
            style={{
              backgroundColor: '#004A79',
              color: '#FFFFFF',
              padding: '12px 24px',
              borderRadius: 6,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            {t('cta')}
          </Button>
          <Hr />
          <Text style={{ fontSize: 12, color: '#475569' }}>{tShared('memberFooter')}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default SubmissionStatusEmail;
