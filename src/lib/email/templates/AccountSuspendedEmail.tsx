// Phase 4 Plan 04-07 — React Email template for account suspension notifications.
import React from 'react';
import { Html, Head, Body, Container, Heading, Text, Hr } from '@react-email/components';

export type AccountSuspendedEmailT = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

export interface AccountSuspendedEmailProps {
  /** Translator scoped to email.suspended (subject/body/supportNote). */
  t: AccountSuspendedEmailT;
  fullName: string;
  reason: string;
}

export function AccountSuspendedEmail({ t, fullName, reason }: AccountSuspendedEmailProps) {
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
          <Heading as="h1" style={{ fontSize: 24, fontWeight: 700, color: '#DC2626' }}>
            {t('subject')}
          </Heading>
          <Text style={{ fontSize: 16, whiteSpace: 'pre-line' }}>
            {t('body', { fullName, reason })}
          </Text>
          <Hr />
          <Text style={{ fontSize: 14, color: '#475569' }}>{t('supportNote')}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default AccountSuspendedEmail;
