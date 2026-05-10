// Phase 4 Plan 04-07 — React Email template for account suspension notifications.
// Mirrors structure of WelcomeEmail.tsx (same React import for tsx/classic JSX transform).
import React from 'react';
import { Html, Head, Body, Container, Heading, Text, Hr } from '@react-email/components';

interface Props {
  fullName: string;
  reason: string;
}

export function AccountSuspendedEmail({ fullName, reason }: Props) {
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
            style={{ fontSize: 24, fontWeight: 700, color: '#DC2626' }}
          >
            Акаунтът ти е временно спрян
          </Heading>
          <Text style={{ fontSize: 16 }}>Здравей, {fullName}!</Text>
          <Text style={{ fontSize: 16 }}>
            Акаунтът ти беше временно спрян от редакционния екип на коалицията.
          </Text>
          <Hr />
          <Text style={{ fontSize: 14, color: '#475569' }}>
            <strong>Причина:</strong> {reason}
          </Text>
          <Hr />
          <Text style={{ fontSize: 14, color: '#475569' }}>
            За въпроси се свържи с екипа на коалицията.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default AccountSuspendedEmail;
