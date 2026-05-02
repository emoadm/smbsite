import React from 'react';
import { Html, Head, Body, Container, Heading, Text, Button } from '@react-email/components';

export type WelcomeEmailT = (key: string, vars?: Record<string, string | number>) => string;

export interface WelcomeEmailProps {
  t: WelcomeEmailT;
  fullName?: string;
}

export function WelcomeEmail({ t, fullName }: WelcomeEmailProps) {
  const firstName = (fullName ?? '').trim().split(/\s+/)[0] ?? '';
  const greeting = firstName
    ? t('greetingNamed', { firstName })
    : t('greetingAnonymous');
  return (
    <Html lang="bg">
      <Head />
      <Body
        style={{
          fontFamily: 'Roboto, system-ui, sans-serif',
          backgroundColor: '#FFFFFF',
          color: '#0F172A',
        }}
      >
        <Container style={{ maxWidth: 480, padding: 24 }}>
          <Heading
            as="h1"
            style={{ fontSize: 28, fontWeight: 600, color: '#004A79' }}
          >
            {t('heading')}
          </Heading>
          <Text style={{ fontSize: 16 }}>{greeting}</Text>
          <Text style={{ fontSize: 16 }}>{t('body')}</Text>
          <Button
            href="https://example.invalid/member"
            style={{
              backgroundColor: '#004A79',
              color: '#FFFFFF',
              padding: '12px 24px',
              borderRadius: 6,
              textDecoration: 'none',
            }}
          >
            {t('cta')}
          </Button>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;
