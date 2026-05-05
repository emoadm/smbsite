/**
 * Phase 5 D-14 — Brevo ESP blocklist helpers.
 *
 * brevoBlocklist: marks an email as blacklisted in Brevo (POST /v3/contacts).
 * brevoUnblock:   removes the blacklist flag (PUT /v3/contacts/{email}).
 *
 * Both are idempotent — Brevo treats re-blocklist as an upsert.
 *
 * NOTE: This stub was created by Plan 05-06 as a Rule 3 auto-fix (blocking
 * dependency). The full implementation (with brevoUnblock + newsletter-worker
 * integration) is delivered by Plan 05-05. Both exports are used by:
 *   - /api/unsubscribe route (05-06): brevoBlocklist for immediate ESP sync
 *   - worker.tsx newsletter-worker (05-05): brevoBlocklist + brevoUnblock
 *
 * Why inline-await + no queue here? D-14: "same-session sync attempt with
 * retry-queue safety net." The caller (05-06 route) wraps this in try/catch
 * and enqueues 'unsubscribe-brevo-retry' on failure.
 */

function BREVO_API_KEY(): string {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error('BREVO_API_KEY not set');
  return key;
}

/**
 * Mark an email address as blacklisted in Brevo.
 * Throws on non-2xx response so the caller can fall back to the retry queue.
 */
export async function brevoBlocklist(email: string): Promise<void> {
  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email,
      emailBlacklisted: true,
      updateEnabled: true, // upsert — idempotent
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Brevo blocklist failed: ${res.status} ${text}`);
  }
}

/**
 * Remove the blacklist flag from an email address in Brevo.
 * Used by the preferences page (Plan 05-08) when a user re-subscribes.
 */
export async function brevoUnblock(email: string): Promise<void> {
  const encoded = encodeURIComponent(email);
  const res = await fetch(`https://api.brevo.com/v3/contacts/${encoded}`, {
    method: 'PUT',
    headers: {
      'api-key': BREVO_API_KEY(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ emailBlacklisted: false }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Brevo unblock failed: ${res.status} ${text}`);
  }
}
