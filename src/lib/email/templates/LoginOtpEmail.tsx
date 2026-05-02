import React from 'react';
import { Html, Head, Body, Container, Heading, Text, Section } from '@react-email/components';

export type LoginOtpEmailT = (key: string, vars?: Record<string, string | number>) => string;

export interface LoginOtpEmailProps {
  t: LoginOtpEmailT;
  code: string;
  validityMinutes: number;
}

export function LoginOtpEmail({ t, code, validityMinutes }: LoginOtpEmailProps) {
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
          <Text style={{ fontSize: 16 }}>{t('greeting')}</Text>
          <Text style={{ fontSize: 16 }}>{t('intro')}</Text>
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Text
              style={{ fontSize: 32, letterSpacing: '0.4em', fontWeight: 600 }}
            >
              {code}
            </Text>
          </Section>
          <Text style={{ fontSize: 14, color: '#475569' }}>
            {t('footer', { validityMinutes })}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default LoginOtpEmail;
