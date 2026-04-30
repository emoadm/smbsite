const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileResult {
  ok: boolean;
  errorCodes?: string[];
}

export async function verifyTurnstile(
  token: string,
  remoteIp?: string,
): Promise<TurnstileResult> {
  if (!token) return { ok: false, errorCodes: ['missing-input-response'] };
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, errorCodes: ['missing-secret'] };

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const res = await fetch(SITEVERIFY, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) return { ok: false, errorCodes: [`http-${res.status}`] };
    const json = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
    return json.success
      ? { ok: true }
      : { ok: false, errorCodes: json['error-codes'] ?? ['unknown'] };
  } catch {
    return { ok: false, errorCodes: ['fetch-failed'] };
  }
}
