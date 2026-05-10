// Phase 4 Plan 04-07 — React Email template for submission approval/rejection notifications.
// Mirrors structure of WelcomeEmail.tsx (same React import for tsx/classic JSX transform).
import React from 'react';
import { Html, Head, Body, Container, Heading, Text, Hr, Button } from '@react-email/components';

interface Props {
  variant: 'approved' | 'rejected';
  fullName: string;
  title: string;
  moderatorNote?: string;
  siteOrigin: string;
}

export function SubmissionStatusEmail({ variant, fullName, title, moderatorNote, siteOrigin }: Props) {
  const isApproved = variant === 'approved';
  const ctaHref = isApproved ? `${siteOrigin}/predlozheniya` : `${siteOrigin}/member/predlozheniya`;
  const ctaLabel = isApproved ? 'Виж публичния каталог' : 'Виж моите предложения';
  const heading = isApproved
    ? 'Вашето предложение беше одобрено'
    : 'Вашето предложение не беше одобрено';
  const body = isApproved
    ? `Предложението ти „${title}" беше прегледано и одобрено от редакционния екип. Вече е видимо публично.`
    : `Предложението ти „${title}" не беше одобрено.`;

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
            {heading}
          </Heading>
          <Text style={{ fontSize: 16 }}>Здравей, {fullName}!</Text>
          <Text style={{ fontSize: 16 }}>{body}</Text>
          {!isApproved && moderatorNote && (
            <>
              <Hr />
              <Text style={{ fontSize: 14, color: '#475569' }}>
                <strong>Бележка от редактора:</strong> {moderatorNote}
              </Text>
              <Hr />
            </>
          )}
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
            {ctaLabel}
          </Button>
          <Hr />
          <Text style={{ fontSize: 12, color: '#475569' }}>
            Получаваш това писмо, защото си член на платформата на коалиция Синя България.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default SubmissionStatusEmail;
