interface BrevoSendArgs {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent: string;
  from?: { email: string; name?: string };
  /**
   * Phase 5 D-14 / RFC 8058 — explicit headers override Brevo's auto-injected
   * List-Unsubscribe (Pitfall 2 from RESEARCH). Pass List-Unsubscribe and
   * List-Unsubscribe-Post here for newsletter sends.
   */
  headers?: Record<string, string>;
}

export async function sendBrevoEmail(args: BrevoSendArgs): Promise<{ messageId: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY not configured');
  const fromEmail =
    args.from?.email ?? process.env.EMAIL_FROM_TRANSACTIONAL ?? 'no-reply@auth.example.invalid';

  const body: Record<string, unknown> = {
    to: [args.to],
    sender: { email: fromEmail, name: args.from?.name ?? '' },
    subject: args.subject,
    htmlContent: args.htmlContent,
    textContent: args.textContent,
  };
  if (args.headers && Object.keys(args.headers).length > 0) {
    body.headers = args.headers;
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const respBody = await res.text();
    throw new Error(`Brevo send failed: ${res.status} ${respBody.slice(0, 200)}`);
  }
  const json = (await res.json()) as { messageId: string };
  return { messageId: json.messageId };
}
