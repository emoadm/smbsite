interface BrevoSendArgs {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent: string;
  from?: { email: string; name?: string };
}

export async function sendBrevoEmail(args: BrevoSendArgs): Promise<{ messageId: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY not configured');
  const fromEmail =
    args.from?.email ?? process.env.EMAIL_FROM_TRANSACTIONAL ?? 'no-reply@auth.example.invalid';

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      to: [args.to],
      sender: { email: fromEmail, name: args.from?.name ?? '' },
      subject: args.subject,
      htmlContent: args.htmlContent,
      textContent: args.textContent,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo send failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { messageId: string };
  return { messageId: json.messageId };
}
