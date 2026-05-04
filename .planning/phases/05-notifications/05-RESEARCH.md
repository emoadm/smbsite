# Phase 5: Notifications — Research

**Researched:** 2026-05-04
**Domain:** Newsletter pipeline, GDPR-compliant unsubscribe, member preferences UI, off-site channel surface
**Confidence:** HIGH for stack & API contracts; MEDIUM-HIGH for pitfalls; LOW for one Brevo-specific detail (custom List-Unsubscribe header — researched but contradicting Brevo statements; recommendation hedged below)

## Summary

Phase 5 is an extension of the *already-shipped* Phase 1 BullMQ + Brevo + React Email pipeline (proven by AUTH-03, NOTIF-08). All locked decisions in `05-CONTEXT.md` align with current best practice and the existing codebase. The technical risk is concentrated in three places: (1) **Brevo's auto-injected `List-Unsubscribe` vs. the RFC 8058 one-click contract** — the API accepts a `headers` object that can override Brevo's default, but Brevo itself reserves the right to inject one; (2) **`@payloadcms/richtext-lexical/html` Lexical-to-HTML conversion** — works synchronously when uploads are pre-populated, but image (upload) nodes have a known bug history (#14214, #12218) that requires custom converters; (3) **Outlook desktop image-blocking + Cyrillic rendering** — both are solved problems with documented patterns, but unit-test gates (vitest source-grep + render-snapshot for charset) catch regressions cheaper than mailbox tests.

The plan can confidently extend `EmailJobKind`, reuse the existing `addEmailJob` enqueue path, reuse the existing Pino REDACT pattern, reuse the Phase 02.1 `assertEditorOrAdmin()` defense-in-depth, and reuse the Drizzle append-only `consents` table without schema migration. The two NEW integration points — Lexical→HTML conversion and HMAC-signed unsubscribe tokens — both have battle-tested library shapes documented below.

**Primary recommendation:** Extend, do not duplicate. Reuse `src/lib/email/queue.ts` and `worker.tsx`, add `newsletter-blast` and `newsletter-test` job kinds, render through a single `NewsletterEmail.tsx` master template that wraps a `convertLexicalToHTML`-rendered content slot. For one-click unsubscribe: **set the `headers` parameter on the Brevo API call explicitly** so we *override* Brevo's default and point at our own `/api/unsubscribe` Node-runtime endpoint. Use `crypto.createHmac('sha256', secret)` over a `base64url(JSON({user_id, iat}))` payload — no JWT library needed.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Newsletter compose UI (Lexical RTE + live preview) | Frontend Server (Payload admin RSC) | API (Server Action for preview HTML) | Payload Newsletters collection + custom view; preview via debounced Server Action mirrors Phase 02.1 pattern |
| Newsletter send dispatch | API (Server Action `sendBlast`) | Job Queue (BullMQ producer) | Editor click returns immediately (≤200ms); fan-out is in worker |
| Recipient query at dispatch | Job Queue (Worker, single Drizzle query) | Database (Postgres) | Query runs at job-dispatch time per D-05; one row per recipient becomes a sub-job |
| Per-recipient send | Job Queue (Worker) | External (Brevo API) | Existing Brevo client + retry/backoff path |
| RFC 8058 one-click endpoint | API (`/api/unsubscribe` Node-runtime route) | Database + External (Brevo blocklist) | POST/GET handler; await Brevo blocklist sync; INSERT 4 consents rows |
| Member preferences UI | Frontend Server (RSC) + Browser (form) | API (Server Action `updatePreferences`) | Reuses Phase 1 (auth)/member layout |
| /community public surface | CDN / Static (anon teaser) | Frontend Server (auth-conditional reveal) | Anon page is cacheable; server-side `auth()` check gates real URLs (D-11) |
| CommunityChannels Global | Database (Payload Globals) | Frontend Server (read at request time) | Single-row, editable from `/admin/globals/community-channels` |
| HMAC token sign / verify | API (Node runtime helpers) | — | `node:crypto` — no DB lookup |
| ESP suppression sync | API (during /api/unsubscribe) | Job Queue (retry sub-job on failure) | D-14: `await brevoBlocklist(email)`; failure enqueues retry |

## Standard Stack

### Core (already locked in CLAUDE.md + Phase 1)
| Library | Version | Purpose | Why Standard |
|---|---|---|---|
| `bullmq` | 5.76.5 [VERIFIED: npm 2026-05-04] | Async job queue (newsletter blast + sub-job fan-out + delayed schedule) | Already in dependencies; Upstash-compatible; native `delay` option. |
| `ioredis` | 5.10.1 [VERIFIED: package.json] | Redis client for BullMQ producer/worker | Already configured singleton at `src/lib/email/queue.ts:16-27`. |
| `@react-email/components` | 1.0.12 [VERIFIED: npm 2026-05-04] | Email template primitives | Already used by `OtpEmail.tsx`, `WelcomeEmail.tsx`. Note `package.json` pins **0.1.0**; Plan 5 should NOT bump (D-23 visual lock). |
| `@react-email/render` | 2.0.8 [VERIFIED: npm 2026-05-04] | Render React → HTML + plaintext | Already used by `worker.tsx:8`. Note `package.json` pins **1.1.0**; do NOT bump unless cross-checked with template visuals. |
| `@payloadcms/richtext-lexical` | 3.84.1 [VERIFIED: package.json] | Lexical RTE + Lexical-to-HTML converter | Already a dependency. Sub-path `@payloadcms/richtext-lexical/html` exposes `convertLexicalToHTML` [CITED: payloadcms.com/docs/rich-text/converters]. |
| `payload` | 3.84.1 [VERIFIED: package.json] | CMS — Newsletters collection + CommunityChannels Global | Globals are first-class in Payload 3 [CITED: payloadcms.com/docs/configuration/globals]. |
| `drizzle-orm` | 0.45.2 [VERIFIED: package.json] | DB layer (consents read/write, users update) | Native multi-row INSERT via `.values([...])` [CITED: orm.drizzle.team/docs/insert]. |
| `zod` | 3.24.2 [VERIFIED: package.json] | Validation (preferences form, unsubscribe token payload, send-blast Server Action) | Already pervasive. |
| `next-intl` | 4.11.0 [VERIFIED: package.json] | Bulgarian-only i18n | Already used; tone-lock test pattern established (Phase 02.1). |
| `pino` + `@logtail/pino` | 10.3.1 / 0.5.5 [VERIFIED: package.json] | Structured logs with REDACT | Already used; extend REDACT array per D-24. |

### New (Phase 5 introduces)
| Library | Version | Purpose | When to Use |
|---|---|---|---|
| `node:crypto` (built-in) | Node 20+ | HMAC-SHA256 sign + verify for unsubscribe token | Phase 5 D-16. No additional dependency. |

**Explicit non-additions:** Do NOT add `jsonwebtoken`, `jose`, or any JWT library — D-16 calls for HMAC-signed payload, not a full JWT (no JWS header, no algorithm negotiation, no key rotation pipeline). `crypto.createHmac` is sufficient and 1/20 the surface area.

### Alternatives Considered
| Instead of | Could Use | Tradeoff (why we don't) |
|---|---|---|
| `convertLexicalToHTML` (Payload built-in) | Hand-rolled walker | Hand-rolled gives full control over inline styles for Outlook compat, but reimplements paragraph/heading/link/list emit logic that Payload already ships. Recommendation: use Payload's converter + override the **upload (image)** node converter with a custom one that adds `width`/`height` HTML attrs (image-block bug history, see Pitfalls §1). |
| Redis Streams | BullMQ (chosen) | BullMQ is already shipped (Phase 1 D-19) — no benefit to switching. |
| JWT (HS256) | Raw HMAC over base64url(JSON) | JWT adds parsing surface for `alg:none` confusion attacks [CITED: aquilax.ai/blog/jwt-algorithm-confusion-auth-bypass]. Raw HMAC is simpler and just as secure. |
| Self-hosted Mailpit suppression list | Brevo `emailBlacklisted: true` via `/v3/contacts` | The platform already pays for Brevo; no need for a parallel suppression source of truth. |

**Installation:** No new packages. Phase 5 is a pure feature-extension on the existing stack.

**Version verification (npm view, 2026-05-04):**
```bash
$ npm view bullmq version            # 5.76.5
$ npm view @react-email/render version  # 2.0.8 (pkg pins 1.1.0 — DO NOT bump w/o visual review)
$ npm view @react-email/components version  # 1.0.12 (pkg pins 0.1.0)
$ npm view @payloadcms/richtext-lexical version  # 3.84.1 (pkg matches)
$ npm view payload version            # 3.84.1 (pkg matches)
$ npm view drizzle-orm version        # 0.45.2 (pkg matches)
```

## Architecture Patterns

### System Architecture Diagram

```
                                    +---------------------------+
                                    |  Editor (admin role)      |
                                    |  /admin/collections/...   |
                                    +-------------+-------------+
                                                  |
                                       composes Newsletter
                                                  v
                                    +---------------------------+
                                    | Payload Newsletters coll. |--+ Lexical AST
                                    |   (DB: payload-managed)   |  |
                                    +-------------+-------------+  |
                                                  |                |
                                          "Send blast" click       |
                                                  v                |
                                    +---------------------------+  | live preview
                                    |  Server Action            |  | (debounced)
                                    |    sendBlast()            |<-+ convertLexicalToHTML
                                    |  - assertEditorOrAdmin()  |  | ─> sanitized HTML
                                    |  - validate gate (24h)    |  |
                                    |  - addEmailJob(blast)     |  v iframe srcdoc
                                    +-------------+-------------+
                                                  |
                                  enqueue 'newsletter-blast' (delay if scheduledAt)
                                                  v
              +---------------------------------------------------------------+
              | BullMQ (Upstash Redis)   [shared with email + attribution]    |
              +---------------------------------------------------------------+
                                                  |
                                                  v
                              +---------------------------------+
                              | Worker (scripts/start-worker.ts)|
                              |   case 'newsletter-blast':      |
                              |     1. query recipient list     |
                              |        (latest consent per      |
                              |         user × topic, granted)  |
                              |     2. for each recipient:      |
                              |          enqueue 'newsletter-   |
                              |          send-recipient' sub-job|
                              +-------------+-------------------+
                                            |
                                  one job per recipient
                                            v
                              +---------------------------------+
                              | Worker (same process):          |
                              |   case 'newsletter-send-recip': |
                              |     - render NewsletterEmail.tsx|
                              |     - sign HMAC unsub token     |
                              |     - call sendBrevoEmail with  |
                              |       custom headers{           |
                              |         'List-Unsubscribe':...  |
                              |         'List-Unsubscribe-Post' |
                              |       }                         |
                              +-------------+-------------------+
                                            |
                                            v
                              +---------------------------------+
                              | Brevo /v3/smtp/email            |
                              +---------------------------------+


            (parallel: unsubscribe path)

   email recipient ─click─> /api/unsubscribe?token=...   (Node runtime)
                                       |
                                       v
                            +-----------------------------+
                            | verify HMAC (constant-time) |
                            | check iat within 90d        |
                            | INSERT 4 consents rows      |
                            |   (granted=false)           |
                            | await Brevo POST /v3/contacts|
                            |   {emailBlacklisted: true} |
                            | (failure -> enqueue retry) |
                            +-----------+-----------------+
                                        |
                                        v
                            redirect /unsubscribed?email=hashed_uid
```

### Recommended Project Structure

```
src/
├── collections/
│   ├── Users.ts                       # existing (Phase 02.1)
│   └── Newsletters.ts                 # NEW — Lexical RTE collection
├── globals/
│   └── CommunityChannels.ts           # NEW — single-row Global
├── lib/
│   ├── email/
│   │   ├── queue.ts                   # extend EmailJobKind enum
│   │   ├── worker.tsx                 # add newsletter-* cases
│   │   ├── brevo.ts                   # extend sendBrevoEmail to accept `headers`
│   │   └── templates/
│   │       ├── OtpEmail.tsx           # existing
│   │       ├── WelcomeEmail.tsx       # existing
│   │       └── NewsletterEmail.tsx    # NEW — master template w/ content slot
│   ├── newsletter/                    # NEW module — analog of src/lib/attribution/
│   │   ├── recipients.ts              # latest-consent-per-(user,kind) query + back-compat
│   │   ├── lexical-to-html.ts         # convertLexicalToHTML wrapper + custom upload converter
│   │   ├── brevo-sync.ts              # blocklist + unblock helpers
│   │   └── preview.ts                 # Server-Action render-and-sanitize for iframe
│   └── unsubscribe/
│       └── hmac.ts                    # NEW — sign + verify
├── app/
│   ├── (frontend)/
│   │   ├── community/page.tsx         # NEW — preview-vs-redeem
│   │   ├── unsubscribed/page.tsx      # NEW — confirmation
│   │   └── member/
│   │       ├── page.tsx               # extend — add Настройки + Канали cards
│   │       └── preferences/page.tsx   # NEW — 4 toggles + channel radio
│   └── api/
│       └── unsubscribe/route.ts       # NEW — Node runtime
└── messages/bg.json                   # add 5 namespaces
```

### Pattern 1: Extending `EmailJobKind` enum + worker switch

```typescript
// src/lib/email/queue.ts — minimal diff
export type EmailJobKind =
  | 'register-otp'
  | 'login-otp'
  | 'welcome'
  | 'newsletter-blast'           // NEW — fan-out trigger (one per send)
  | 'newsletter-send-recipient'  // NEW — per-recipient sub-job
  | 'newsletter-test'            // NEW — single-recipient (D-02 test gate)
  | 'unsubscribe-brevo-retry';   // NEW — retry path when /api/unsubscribe Brevo call failed

export interface EmailJobPayload {
  to: string;
  kind: EmailJobKind;
  // existing fields...
  // newsletter-blast:
  newsletterId?: string;          // Payload doc ID
  // newsletter-send-recipient:
  userId?: string;
  topic?: NewsletterTopic;        // for HMAC scope and footer text
  // unsubscribe-brevo-retry:
  unsubEmail?: string;
}
```

### Pattern 2: Recipient query — latest-consent-per-user-and-topic with backward compat

The CRITICAL detail: pre-Phase-5 registrants have a single `consents` row with `kind='newsletter'`. Phase 5's read query MUST honor that legacy grant *unless* an explicit topic-specific row supersedes it.

**Precedence (per D-09 + canonical_refs):**
1. If a row exists with `kind='newsletter_${topic}'` → use it (granted_at DESC LIMIT 1).
2. Else if a row exists with `kind='newsletter'` → use it as a blanket grant.
3. Else → no consent (excluded from blast).

**SQL using PostgreSQL `DISTINCT ON`** [CITED: postgresqltutorial.com/postgresql-select-distinct]:

```sql
-- For topic = 'newsletter_voting'
WITH per_user_topic AS (
  SELECT DISTINCT ON (user_id)
    user_id, granted, granted_at
  FROM consents
  WHERE kind = 'newsletter_voting'
  ORDER BY user_id, granted_at DESC
),
per_user_blanket AS (
  SELECT DISTINCT ON (user_id)
    user_id, granted, granted_at
  FROM consents
  WHERE kind = 'newsletter'
  ORDER BY user_id, granted_at DESC
)
SELECT u.id, u.email, u.full_name
FROM users u
LEFT JOIN per_user_topic t  ON t.user_id = u.id
LEFT JOIN per_user_blanket b ON b.user_id = u.id
WHERE
  u.email_verified IS NOT NULL
  AND (
    -- Explicit topic grant wins
    (t.user_id IS NOT NULL AND t.granted = true)
    -- OR no topic row AND blanket grant
    OR (t.user_id IS NULL AND b.granted = true)
  );
```

**Drizzle skeleton:** Wrap as a single SQL query via `db.execute(sql\`...\`)` — Drizzle's relational query builder has no first-class `DISTINCT ON` (verified — last documented examples use raw SQL via `sql\`\`` template).

### Pattern 3: One-click unsubscribe via Brevo API `headers` parameter

Brevo's `/v3/smtp/email` API accepts an arbitrary `headers` object [VERIFIED: developers.brevo.com/reference/sendtransacemail; webfetch 2026-05-04]. Brevo automatically injects a List-Unsubscribe header on emails when a `headers` key for that field is NOT present [CITED: brevo.com/blog/list-unsubscribe-header]. Setting it explicitly is the documented override path.

```typescript
// src/lib/email/brevo.ts — extend interface
interface BrevoSendArgs {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent: string;
  from?: { email: string; name?: string };
  headers?: Record<string, string>;  // NEW
}

// In worker, for newsletter-send-recipient:
const unsubUrl = `${process.env.SITE_ORIGIN}/api/unsubscribe?token=${token}`;
const headers = {
  'List-Unsubscribe': `<${unsubUrl}>, <mailto:unsubscribe@news.chastnik.eu?subject=unsubscribe>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
};
```

**RFC 8058 wire format** [CITED: rfc-editor.org/rfc/rfc8058.html]:
- `List-Unsubscribe` header value: comma-separated list of `<URI>` values; HTTPS URI required for one-click.
- `List-Unsubscribe-Post` header value: literal string `List-Unsubscribe=One-Click`.
- Mailbox provider sends an HTTPS `POST` with body `List-Unsubscribe=One-Click` to the URL when the user clicks the inbox-level unsubscribe button.

### Pattern 4: HMAC-signed unsubscribe token (no JWT library)

```typescript
// src/lib/unsubscribe/hmac.ts
import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = () => {
  const s = process.env.UNSUBSCRIBE_HMAC_SECRET;
  if (!s) throw new Error('UNSUBSCRIBE_HMAC_SECRET not set');
  return s;
};
const TTL_MS = 90 * 24 * 3600 * 1000;

interface UnsubPayload { uid: string; iat: number; }

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString('base64url');

export function signUnsubToken(uid: string): string {
  const payload: UnsubPayload = { uid, iat: Date.now() };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', SECRET()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyUnsubToken(
  token: string,
): { ok: true; uid: string } | { ok: false; reason: 'malformed' | 'bad-sig' | 'expired' } {
  const [body, sig] = token.split('.');
  if (!body || !sig) return { ok: false, reason: 'malformed' };

  const expected = createHmac('sha256', SECRET()).update(body).digest('base64url');
  // constant-time compare
  const a = Buffer.from(sig, 'base64url');
  const b = Buffer.from(expected, 'base64url');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad-sig' };
  }

  let payload: UnsubPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof payload.uid !== 'string' || typeof payload.iat !== 'number') {
    return { ok: false, reason: 'malformed' };
  }
  if (Date.now() - payload.iat > TTL_MS) return { ok: false, reason: 'expired' };
  return { ok: true, uid: payload.uid };
}
```

**Why no JWT?** The classic `alg:none` JWT-confusion attack [CITED: aquilax.ai/blog/jwt-algorithm-confusion-auth-bypass] is impossible here because we never parse the algorithm — the format is fixed (`base64url(json).base64url(sig)`), the algorithm is hard-coded HMAC-SHA256, and there's no header to negotiate.

### Pattern 5: Lexical → HTML rendering (sync) with custom upload converter

```typescript
// src/lib/newsletter/lexical-to-html.ts
import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html';
import type {
  HTMLConvertersFunction,
  DefaultNodeTypes,
} from '@payloadcms/richtext-lexical';
import type { SerializedEditorState } from 'lexical';

// Outlook ignores CSS width/height; HTML attrs are mandatory (Pitfall §1)
const converters: HTMLConvertersFunction<DefaultNodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  upload: ({ node }) => {
    const url = node.value?.url ?? '';                     // Bunny CDN URL
    const w = node.value?.width ?? 600;
    const h = node.value?.height ?? 'auto';
    const alt = node.value?.alt ?? '';
    return `<img src="${url}" alt="${alt}" width="${w}" height="${h}" style="display:block;max-width:100%;height:auto" />`;
  },
});

export function renderLexicalToHtml(data: SerializedEditorState): string {
  return convertLexicalToHTML({ data, converters });
}
```

**Caveats** [CITED: github.com/payloadcms/payload/issues/14214, /issues/12218]: Default upload converter has historical bugs in 3.x. Override is mandatory for newsletter context anyway (Outlook needs HTML width/height attrs, not CSS).

### Pattern 6: BullMQ delayed job + cancel-by-jobId

```typescript
// Schedule
const jobId = `newsletter-${newsletterId}`;  // deterministic; allows duplicate-prevention
await getQueue().add(
  'newsletter-blast',
  { kind: 'newsletter-blast', newsletterId, to: '' },  // 'to' unused for fan-out trigger
  { jobId, delay: scheduledAtMs - Date.now(), attempts: 5, backoff: { type: 'exponential', delay: 30_000 } },
);

// Cancel before fire
const job = await getQueue().getJob(`newsletter-${newsletterId}`);
if (job) await job.remove();
```

**Constraint** [CITED: docs.bullmq.io/guide/jobs/job-ids]: `jobId` may not contain `:` and may not be all-digits. UUIDs work; `newsletter-<uuid>` works.

**Atomicity** [CITED: docs.bullmq.io/guide/jobs/removing-job]: `job.remove()` throws if the job is in *active* state. For a delayed job that hasn't fired yet, remove is safe and atomic at the Redis Lua level. **Race window:** between `getJob()` and `remove()`, the job could have transitioned to active — handle by catching the error and surfacing "Sending already started" to the editor.

### Pattern 7: Single-checkbox-multi-row consent write (Drizzle batch INSERT)

Drizzle natively emits a single `INSERT ... VALUES (..),(..),(..),(..)` from `.values([{...},{...},...])` [CITED: orm.drizzle.team/docs/insert]. This is one round-trip, atomic via the surrounding transaction.

```typescript
// in src/app/actions/register.ts — modify existing transaction
await tx.insert(consents).values([
  { user_id: userId, kind: 'privacy_terms', granted: true,  version: POLICY_VERSION },
  { user_id: userId, kind: 'cookies',       granted: true,  version: POLICY_VERSION },
  // 4 newsletter-topic rows ALL with the same boolean (single checkbox semantics, D-09)
  { user_id: userId, kind: 'newsletter_general',  granted: data.consent_newsletter === 'on', version: POLICY_VERSION },
  { user_id: userId, kind: 'newsletter_voting',   granted: data.consent_newsletter === 'on', version: POLICY_VERSION },
  { user_id: userId, kind: 'newsletter_reports',  granted: data.consent_newsletter === 'on', version: POLICY_VERSION },
  { user_id: userId, kind: 'newsletter_events',   granted: data.consent_newsletter === 'on', version: POLICY_VERSION },
  { user_id: userId, kind: 'political_opinion',   granted: data.consent_political === 'on',  version: POLICY_VERSION },
]);
// One SQL statement, 7 rows, single transaction. No race possible.
```

**Migration question (D-09 backward compat):** The existing single `kind='newsletter'` row from Phase 1 registrants stays untouched in the DB. The read query (Pattern 2) honors it as a blanket grant.

### Anti-Patterns to Avoid
- **Sending newsletters synchronously from the Server Action** — must enqueue (success criterion #1).
- **Using `dangerouslySetInnerHTML` to inject Lexical HTML** — sanitize via the converter; never bypass.
- **Storing the unsubscribe token in the DB** — defeats the point of HMAC stateless validation (D-16).
- **Using JWT library for the token** — adds attack surface for `alg:none` confusion; not justified.
- **Hand-rolled walker for Lexical AST** — Payload ships one; reuse it (override only the upload node).
- **Editing/deleting `consents` rows** — Phase 1 D-13 lock: append-only.
- **Bypassing Brevo for the suppression sync** — D-14 requires same-session ESP sync; unsubscribe is not "done" until Brevo agrees.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Lexical AST → HTML | Recursive walker | `convertLexicalToHTML` from `@payloadcms/richtext-lexical/html` | Default converters cover paragraph/heading/link/list out of the box; we only customize `upload`. |
| Job ID generation for duplicate prevention | UUID lookup table | BullMQ `jobId` option (custom string, dedupes inserts) | BullMQ ignores duplicate `jobId` adds — built-in idempotency. |
| Token signing | JWT library (jose / jsonwebtoken) | `node:crypto.createHmac` | JWT is overkill; raw HMAC has narrower attack surface. |
| Email charset declaration | Custom `<meta>` injection in HTML string | `<Head />` from `@react-email/components` + render at `Content-Type: text/html; charset=utf-8` in Brevo body | React Email + Brevo Content-Type header = both layers covered (Pitfall 10 from PITFALLS.md). |
| Newsletter recipient list pagination | Hand-rolled cursor | Single Drizzle query → array of jobs (one per recipient is the pagination unit) | Each recipient's send is its own job — BullMQ is the queue. Don't paginate; fan out. |
| One-click unsubscribe page | Custom React form | Static `/unsubscribed/page.tsx` + `/api/unsubscribe` POST/GET handler | Mailbox providers POST with body `List-Unsubscribe=One-Click`; the route handler accepts both methods. |
| Suppression list management | Self-hosted suppression DB | Brevo `POST /v3/contacts` with `emailBlacklisted: true` | Already paid for; brevo blocks at the ESP level, which is the integration point that matters. |
| Live preview iframe sandboxing | Custom DOM-purify pipeline | `<iframe srcdoc={html} sandbox="allow-same-origin" />` | The HTML came from our own converter; it's already sanitized at source. Sandbox is defense-in-depth. |

**Key insight:** The phase contains *zero* novel infrastructure problems. Every technical question has a documented stack answer. Risk concentrates in **integration polish** (Cyrillic + Outlook + Bunny image attrs) and **GDPR sequencing** (Brevo round-trip latency, late opt-out honor).

## Runtime State Inventory

> Phase 5 is a feature-add, not a rename/refactor. State inventory is included for completeness because the phase introduces new persistent state.

| Category | Items Found | Action Required |
|---|---|---|
| Stored data | (a) `consents` table — extend `CONSENT_KINDS` const with 4 newsletter topic values; existing legacy `kind='newsletter'` rows preserved (read-time precedence — D-09). (b) `users.preferred_channel` new nullable column. (c) Payload-managed `newsletters` collection table (auto-DDL on boot). (d) Payload-managed `community_channels` Global table (auto-DDL on boot). | Drizzle migration for users column; const-array extension is a code-only change (text column already accepts the new values). |
| Live service config | (a) Brevo: sender domain `news.chastnik.eu` DKIM CNAME `mail2._domainkey.news.chastnik.eu` MUST exist before first send (STATE.md `D-Phase5-prep`). (b) Brevo blocklist (suppression list) — populated from D-14 unsubscribe path; pre-existing complaints already on it. (c) Coalition WhatsApp Channel + Telegram URLs — operator pastes into `/admin/globals/community-channels` post-deploy. | Operator: DNS add (D-Phase5-prep). Coalition: URL paste post-deploy (D-CoalitionChannels). |
| OS-registered state | None — all newsletter scheduling lives in BullMQ/Redis, not in cron/launchd/Task Scheduler. | None. |
| Secrets/env vars | (a) `UNSUBSCRIBE_HMAC_SECRET` — NEW. (b) `EMAIL_FROM_NEWSLETTER` — NEW (separate from `EMAIL_FROM_TRANSACTIONAL` per Phase 1 D-16/17). (c) `SITE_ORIGIN` — required for unsub URL building (may already exist for OG/sitemap). (d) Existing `BREVO_API_KEY`, `UPSTASH_REDIS_URL` reused. | Operator: `fly secrets set UNSUBSCRIBE_HMAC_SECRET=$(openssl rand -base64 64) -a smbsite-prod`. Operator: `fly secrets set EMAIL_FROM_NEWSLETTER=newsletter@news.chastnik.eu`. Phase 02.1 lesson "build-time env vars at module-eval time" applies — if any of these are read at module init, add to `deploy.yml --build-arg` block too. |
| Build artifacts / installed packages | None new (no new packages). Drizzle migration file generated by `drizzle-kit generate` and committed. | Run `pnpm db:generate` in worktree (per Phase 02.1 lesson — `db:push` requires DIRECT_URL which worktrees don't have). CI's existing migrate job applies on push to main. |

**The canonical question (post-rename hygiene) is N/A** — no string is being renamed.

## Common Pitfalls

### Pitfall 1: Outlook desktop image rendering — fixed `width`/`height` HTML attributes are non-negotiable

**What goes wrong:** Bunny.net image embedded with CSS-only sizing renders at native pixel dimensions in Outlook desktop, breaking layout. Image-blocked-by-default mode then shows a blank rectangle with no alt text fallback.

**Why it happens** [CITED: tedgoas.com/blog/outlook-email-rendering, litmus.com/blog/the-ultimate-guide-to-email-image-blocking]: Outlook ignores CSS `width`/`height`; only HTML `<img width="N" height="M">` attributes are honored. Without them, the image-blocked placeholder collapses and alt text never shows. Outlook also prefaces alt text with a long security warning string, so concise alt text is critical.

**How to avoid:**
- Custom upload converter (Pattern 5) emits `width`/`height` HTML attrs, always.
- Default `width=600` for Bunny full-bleed images; height passed through from Payload media metadata.
- `alt` text mandatory in Payload media collection field schema (`alt: { required: true }`).

**Warning signs:** Editor uploads an image and live preview shows correct size; first test send to Outlook desktop shows native-pixel rendering or empty placeholder.

### Pitfall 2: Brevo's auto-injected List-Unsubscribe vs. our explicit one

**What goes wrong:** Brevo silently injects its own `List-Unsubscribe` header pointing at `https://api.brevo.com/...` even when we set our own. Mailbox providers see two headers, pick the wrong one (per RFC, the FIRST), and our DB never sees the unsubscribe.

**Why it happens** [CITED: help.brevo.com/hc/.../19100260472850-FAQs-About-list-unsubscribe-and-list-help-headers, brevo.com/blog/list-unsubscribe-header]: Brevo's deliverability team explicitly stated that they do NOT remove auto-injected headers because transactional and marketing flows can't be distinguished at the SMTP/API layer. **However**, the API does accept a `headers` parameter [VERIFIED: developers.brevo.com/reference/sendtransacemail], which is the documented override path. Empirical confirmation needed.

**How to avoid:**
- Set both `List-Unsubscribe` and `List-Unsubscribe-Post` in the Brevo `headers` parameter (Pattern 3).
- **Pre-flight test:** Send one newsletter to a Gmail inbox, view the raw headers (Show Original), confirm only ONE `List-Unsubscribe` header is present and it points to `news.chastnik.eu`. If two are present, fall back to using Brevo's built-in unsub URL with a custom landing page.
- Phase 5 plan 0X: include a "raw-header inspect" task in the test-send (D-02) checklist.

**Warning signs:** First production send shows duplicate `List-Unsubscribe` headers; editor's test-send to self shows Brevo's `https://newsletter.brevo.com/...` URL in the Gmail "More" menu instead of `news.chastnik.eu`.

**[ASSUMED]** Brevo's `headers` parameter overrides — not contradicts — the auto-injected default. This is the documented pattern but not empirically verified for List-Unsubscribe specifically. **Plan must include the pre-flight test as a gate before first production send.**

### Pitfall 3: BullMQ delayed-job race when canceling

**What goes wrong:** Editor clicks "Cancel scheduled" in the admin UI between the millisecond when BullMQ promotes the delayed job to active and the millisecond `job.remove()` runs. The job fires anyway; recipients get the cancelled newsletter.

**Why it happens** [CITED: docs.bullmq.io/guide/queues/removing-jobs, github.com/taskforcesh/bullmq/issues/807]: BullMQ's delayed→active transition is a Redis Lua script. `job.remove()` of an *active* job throws. The application sees a thrown error and assumes "remove failed = job still scheduled", but actually the job is now mid-flight.

**How to avoid:**
- The `Newsletters` collection has a `status` field. The Server Action that handles "Cancel scheduled":
  1. CHECK `status === 'scheduled'`. If not, refuse.
  2. UPDATE `status = 'cancelled'` (in Drizzle, before BullMQ touch).
  3. `try { await job.remove() } catch { /* job is now active — see (4) */ }`
  4. Worker on each recipient sub-job: re-check `status` from Payload DB; if `cancelled`, skip the send.
- This double-check (DB status + BullMQ remove) makes the cancel atomic from the user's perspective even if the underlying queue race occurred.

**Warning signs:** A scheduled newsletter that was visibly "cancelled" in the admin UI shows up in recipient inboxes anyway.

### Pitfall 4: Brevo blocklist sync latency exceeds the 1s budget

**What goes wrong:** D-14 promises "ESP suppression sync within the same session." Brevo's `POST /v3/contacts` round-trip from Fly.io Frankfurt averages 300-700ms. Combined with the HMAC verify + 4 INSERTs, the unsubscribe route p95 may exceed 1s; mailbox provider considers the click "stuck" and either retries (creating a duplicate row of granted=false) or marks the mail as "unsubscribe failed."

**Why it happens:** Brevo's API is in EU but not edge-deployed; cold connection + TLS handshake adds latency.

**How to avoid:**
- **Inline-await on the Brevo call** with a 5s timeout (matches typical mailbox provider patience).
- On timeout/failure: enqueue an `unsubscribe-brevo-retry` job with `attempts: 5` so eventual consistency is guaranteed.
- The 4 consent INSERTs are the source of truth; Brevo is downstream. The user IS unsubscribed the moment the consent rows land.
- Idempotent at the Brevo side: re-POSTing `emailBlacklisted: true` on an already-blocked email is a no-op (Brevo treats as upsert).
- Add metric: `unsubscribe.brevo_sync_p95_ms` to Better Stack — alert if > 800ms over 1h window.

**Warning signs:** Spike in `unsubscribe-brevo-retry` enqueues; user reports "I keep getting newsletters even though I unsubscribed."

### Pitfall 5: Cyrillic glyph corruption in `Content-Type` (Pitfall 10 from PITFALLS.md)

**What goes wrong:** React Email renders `<Html lang="bg">` and our HTML has Cyrillic. We send via Brevo with `htmlContent: html`. If Brevo's API request `Content-Type` header does not include `charset=utf-8` explicitly, OR our outbound HTTP does not declare it, Outlook desktop applies its locale default (Windows-1251 in Russian Outlook, KOI8-R in older variants) and renders mojibake.

**Why it happens** [CITED: codetwo.com/kb/incorrect-characters-in-emails, support.microsoft.com/.../email-message-body-is-garbled]: Email clients trust the SMTP `Content-Type` header over the HTML `<meta>` tag. The fetch in `src/lib/email/brevo.ts:18` already sets `'content-type': 'application/json'` for the API request — that's the JSON contract, NOT the email Content-Type.

**How to avoid:**
- Brevo's API serves the email with their default `Content-Type: text/html; charset=utf-8` — verified in headers of received emails from Phase 1's existing OTP/welcome sends.
- React Email's `<Head />` should include explicit `<meta charset="utf-8" />` as defense-in-depth (NOT relying on the implicit one from `@react-email/components`).
- Vitest source-grep test: `expect(NewsletterEmailSrc).toContain('charset="utf-8"')` — fails fast if a refactor strips the meta.
- Render-snapshot test: `const html = await render(<NewsletterEmail .../>); expect(html).toContain('charset="utf-8"'); expect(html).toMatch(/[Ѐ-ӿ]/);` — confirms both charset declared AND Cyrillic glyphs survive render.

**Warning signs:** Phase 1 OTP emails received in Outlook desktop already show correct Cyrillic — that's a positive baseline. New regression: an editor copy-pastes from Word into Lexical and gets non-UTF-8 codepoints; the converter must normalize via `String.normalize('NFC')` on text emit.

### Pitfall 6: Member-toggle vs. blast-dispatch race (D-05 timing audit)

**What goes wrong:** Member toggles `newsletter_voting` off at T+0. Editor clicks "Send blast" at T+50ms. Worker picks up the job at T+200ms, queries the recipient list at T+250ms. Does the member's opt-out get honored?

**Why it happens / How D-05 handles it:** D-05 says recipient-list snapshotting is at *dispatch time* (T+250ms). The member's toggle INSERT'd a `granted=false` row at T+0; the worker's `DISTINCT ON (user_id) ORDER BY granted_at DESC` query at T+250ms picks it up. Member is NOT in the list. ✅

**Edge case:** The member toggles off WHILE the worker is iterating (toggle at T+251ms; worker has already SELECT'd recipients into memory at T+250ms). Member receives the newsletter at T+300ms.

**How to avoid:**
- Document this 50ms window as accepted. GDPR doesn't prohibit a single-message lag; it prohibits ongoing sends after withdrawal.
- The `unsubscribe-brevo-retry` retry pattern (Pitfall 4) ALSO handles this: even if a stale-cached recipient gets the mail, their next click on the footer unsubscribe is honored within the 1s budget.
- Per-recipient sub-job worker can do a freshness check: re-query `latest consent for (user, topic)` immediately before the actual Brevo POST. Trade-off: 1 extra DB hit per recipient on every send. **Recommendation: don't add this freshness check** — the 50ms window is acceptable; the cost is one DB query per recipient × N recipients per send.

**Warning signs:** Member complains "I unsubscribed and got an email 5 seconds later." If frequency is < 0.1% of sends, document and dismiss; if > 1%, add the freshness check.

### Pitfall 7: Payload importMap shadow-routing (Phase 02.1 lesson)

**What goes wrong:** New Newsletters collection includes a custom field component (e.g., a "live preview" pane). Phase 02.1 burned a day on this exact bug.

**Why it happens** [CITED: 02.1-LEARNINGS.md, Surprises §"Payload importMap"]: Payload 3.84's catchall route + `importMap.js` is the routing layer. A sibling `page.tsx` next to a custom Component file hijacks the route. The same trap applies to custom field components for Newsletters or CommunityChannels.

**How to avoid:**
- All custom Payload components for Phase 5 live in dedicated files (e.g., `src/components/payload/NewsletterPreview.tsx`), NEVER in `page.tsx`.
- Explicitly register in `src/app/(payload)/admin/importMap.js` — even though Payload claims to auto-resolve, Phase 02.1 proved manual registration is required.
- Add a vitest assertion: every custom Component path in `payload.config.ts` MUST appear in `importMap.js` (regex match).

**Warning signs:** New Newsletters admin route renders blank page or default Payload edit screen instead of the custom preview pane.

### Pitfall 8: Build-time env-var requirement (Phase 02.1 lesson)

**What goes wrong:** New `UNSUBSCRIBE_HMAC_SECRET` is read at module-eval time of a top-level imported module → `next build` fails on staging.

**Why it happens** [CITED: 02.1-LEARNINGS.md "build-time env vars at module-eval time"]: Auth.js, Drizzle init, and now potentially the unsub HMAC module evaluate top-level. Missing env at build = 500 error at first request OR build crash.

**How to avoid:**
- Per Pattern 4: secret is read inside `SECRET()` getter, not at top-level. This defers eval to first call.
- `deploy.yml` `secrets:` block: pass `UNSUBSCRIBE_HMAC_SECRET` and `EMAIL_FROM_NEWSLETTER` as `--build-arg` AND `fly secrets set` (mirrors existing Phase 02.1 setup).
- `scripts/check-env.ts` (already invoked by `pnpm build`) extends to assert these secrets exist in non-test environments.

**Warning signs:** Staging Docker build fails at `next build` step with "UNSUBSCRIBE_HMAC_SECRET not set."

## Code Examples

### Example A: NewsletterEmail.tsx skeleton (master template + content slot)

```tsx
// src/lib/email/templates/NewsletterEmail.tsx
import React from 'react';
import {
  Html, Head, Body, Container, Heading, Text, Section, Hr, Link,
  Img, Preview,
} from '@react-email/components';

export type NewsletterEmailT = (key: string, vars?: Record<string, string | number>) => string;

export interface NewsletterEmailProps {
  t: NewsletterEmailT;
  fullName?: string;
  subject: string;
  previewText: string;
  topic: 'newsletter_general' | 'newsletter_voting' | 'newsletter_reports' | 'newsletter_events';
  bodyHtml: string;     // Lexical → HTML output (already sanitized by our converter)
  unsubUrl: string;     // signed HMAC URL
  preferencesUrl: string;
  year: number;
}

const TOPIC_CHIP: Record<NewsletterEmailProps['topic'], string> = {
  newsletter_general: '#004A79',
  newsletter_voting:  '#C8102E',
  newsletter_reports: '#0F4C81',
  newsletter_events:  '#1B5E20',
};

export function NewsletterEmail(p: NewsletterEmailProps) {
  const firstName = (p.fullName ?? '').trim().split(/\s+/)[0] ?? '';
  const greeting = firstName
    ? p.t('greetingNamed', { firstName })
    : p.t('greetingAnonymous');

  return (
    <Html lang="bg">
      <Head>
        {/* explicit charset — Outlook compat (Pitfall 5) */}
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta charSet="utf-8" />
      </Head>
      <Preview>{p.previewText}</Preview>
      <Body style={{
        fontFamily: 'Roboto, system-ui, sans-serif',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
      }}>
        <Container style={{ maxWidth: 600, padding: 24 }}>
          {/* topic chip */}
          <Text style={{ display: 'inline-block', padding: '4px 12px',
            backgroundColor: TOPIC_CHIP[p.topic], color: '#FFFFFF', fontSize: 12,
            borderRadius: 4 }}>
            {p.t(`topicChip.${p.topic}`)}
          </Text>

          <Heading as="h1" style={{ fontSize: 28, fontWeight: 800, color: '#004A79',
            fontFamily: 'Gilroy, Roboto, system-ui, sans-serif' }}>
            {p.subject}
          </Heading>

          <Text style={{ fontSize: 16 }}>{greeting}</Text>

          {/* Lexical→HTML content slot — already sanitized + has width/height attrs */}
          <Section dangerouslySetInnerHTML={{ __html: p.bodyHtml }} />

          <Hr />

          <Text style={{ fontSize: 12, color: '#475569' }}>
            {p.t('footer.preferencesIntro')}{' '}
            <Link href={p.preferencesUrl}>{p.t('footer.preferencesLink')}</Link>
          </Text>
          <Text style={{ fontSize: 12, color: '#475569' }}>
            {p.t('footer.unsubIntro')}{' '}
            <Link href={p.unsubUrl}>{p.t('footer.unsubLink')}</Link>
          </Text>
          <Text style={{ fontSize: 11, color: '#94A3B8' }}>
            {p.t('footer.copyright', { year: p.year })}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default NewsletterEmail;
```

### Example B: Unsubscribe route handler (Node runtime)

```typescript
// src/app/api/unsubscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { consents } from '@/db/schema';
import { verifyUnsubToken } from '@/lib/unsubscribe/hmac';
import { addEmailJob } from '@/lib/email/queue';
import { brevoBlocklist } from '@/lib/newsletter/brevo-sync';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const POLICY_VERSION = '2026-04-29';
const TOPIC_KINDS = [
  'newsletter_general', 'newsletter_voting',
  'newsletter_reports', 'newsletter_events',
] as const;

async function handle(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  const v = verifyUnsubToken(token);
  if (!v.ok) {
    return NextResponse.redirect(new URL('/unsubscribed?reason=' + v.reason, req.url));
  }

  const userId = v.uid;

  // INSERT 4 granted=false rows
  await db.insert(consents).values(
    TOPIC_KINDS.map(kind => ({
      user_id: userId,
      kind,
      granted: false,
      version: POLICY_VERSION,
    })),
  );

  // ESP sync — same-session promise (D-14)
  try {
    // fetch user's email from DB (need it for Brevo blocklist call)
    // ... (omitted for brevity)
    await brevoBlocklist(userEmail);
  } catch (err) {
    logger.warn({ user_id: userId, err: String(err) }, 'unsubscribe.brevo_sync_failed');
    await addEmailJob({
      to: userEmail,
      kind: 'unsubscribe-brevo-retry',
      unsubEmail: userEmail,
    });
  }

  return NextResponse.redirect(new URL('/unsubscribed', req.url));
}

export async function GET(req: NextRequest)  { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }  // RFC 8058
```

### Example C: Live preview Server Action (debounced)

```typescript
// src/lib/newsletter/preview.ts
'use server';
import { renderLexicalToHtml } from './lexical-to-html';
import { render } from '@react-email/render';
import { NewsletterEmail } from '@/lib/email/templates/NewsletterEmail';
import { assertEditorOrAdmin } from '@/lib/auth/role-gate';
import { loadT } from '@/lib/email/i18n-direct';  // analog of worker.tsx loadT

export interface PreviewArgs {
  subject: string;
  previewText: string;
  topic: 'newsletter_general' | 'newsletter_voting' | 'newsletter_reports' | 'newsletter_events';
  lexicalAst: unknown;
}

export async function renderPreview(args: PreviewArgs): Promise<string> {
  await assertEditorOrAdmin();
  const t = loadT('email.newsletter');
  const bodyHtml = renderLexicalToHtml(args.lexicalAst as never);
  return await render(
    <NewsletterEmail
      t={t}
      subject={args.subject}
      previewText={args.previewText}
      topic={args.topic}
      bodyHtml={bodyHtml}
      unsubUrl="#preview"           // dummy in preview
      preferencesUrl="#preview"
      year={new Date().getFullYear()}
    />,
  );
}
```

**Client side:** debounce 300ms, set on `<iframe srcdoc={html} sandbox="allow-same-origin">`. p95 budget achievable: render → ~50ms; convertLexicalToHTML → ~10ms; React Email render → ~80ms; round-trip ~150ms; comfortable under 300ms.

### Example D: Vitest tests (Cyrillic + tone-lock + topic enum)

```typescript
// tests/unit/newsletter-i18n.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const bg = JSON.parse(readFileSync('messages/bg.json', 'utf8')) as Record<string, any>;

const TOPICS = ['newsletter_general', 'newsletter_voting',
                'newsletter_reports', 'newsletter_events'] as const;

describe('Phase 5 — D-08 / D-22 — newsletter namespaces', () => {
  it('email.newsletter has greetingNamed using nominative form (D-22, Pitfall 5)', () => {
    const ns = bg.email?.newsletter;
    expect(ns?.greetingNamed).toMatch(/Здравей/);
    expect(JSON.stringify(ns)).not.toMatch(/Уважаеми/);
    expect(JSON.stringify(ns)).not.toMatch(/Уважаема/);
  });

  it('all 4 topic chips have non-empty Bulgarian labels (D-08)', () => {
    for (const topic of TOPICS) {
      expect(bg.email.newsletter.topicChip[topic]).toBeTruthy();
      expect(bg.member.preferences.topics[topic]).toBeTruthy();
      expect(bg.admin.newsletters.topics[topic]).toBeTruthy();
    }
  });

  it('member.preferences + community + unsubscribe namespaces are tone-locked', () => {
    for (const ns of ['member.preferences', 'community', 'admin.newsletters', 'unsubscribe']) {
      const blob = JSON.stringify(ns.split('.').reduce((a: any, k) => a?.[k], bg) ?? {});
      expect(blob, ns).not.toMatch(/Уважаеми/);
      expect(blob, ns).not.toMatch(/Уважаема/);
    }
  });
});

// tests/unit/newsletter-template.test.ts
import { render } from '@react-email/render';
import React from 'react';
import { NewsletterEmail } from '@/lib/email/templates/NewsletterEmail';

describe('Phase 5 — D-17 / D-18 — NewsletterEmail render', () => {
  it('declares charset utf-8 explicitly in head', async () => {
    const html = await render(<NewsletterEmail
      t={(k: string) => k}
      subject="Тест"
      previewText="Preview"
      topic="newsletter_general"
      bodyHtml="<p>Здравей, Ж Щ Ъ Ю Я ѝ</p>"
      unsubUrl="#" preferencesUrl="#" year={2026}
    />);
    expect(html).toMatch(/charset=["']?utf-8/i);
    // Cyrillic glyphs survived render
    expect(html).toMatch(/Ж/);
    expect(html).toMatch(/Щ/);
    expect(html).toMatch(/Ъ/);
    expect(html).toMatch(/Ю/);
    expect(html).toMatch(/Я/);
    expect(html).toMatch(/ѝ/);
    // No raw HTML escape sequences
    expect(html).not.toMatch(/=\?UTF-8\?B\?/);
  });
});

// tests/unit/newsletter-schema.test.ts — forbidden-token grep (Phase 02.1 lineage)
describe('Phase 5 — schema invariants', () => {
  it('CONSENT_KINDS contains all 4 newsletter topics (D-08)', () => {
    const src = readFileSync('src/db/schema/consents.ts', 'utf8');
    expect(src).toMatch(/'newsletter_general'/);
    expect(src).toMatch(/'newsletter_voting'/);
    expect(src).toMatch(/'newsletter_reports'/);
    expect(src).toMatch(/'newsletter_events'/);
    // Backward-compat: old 'newsletter' kind STILL in array
    expect(src).toMatch(/'newsletter'/);
  });

  it('Pino REDACT extended with email recipient fields (D-24)', () => {
    const src = readFileSync('src/lib/logger.ts', 'utf8');
    expect(src).toMatch(/'to'/);
    expect(src).toMatch(/'recipient_email'/);
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| List-Unsubscribe header optional | Required for bulk senders by Gmail/Yahoo | Feb 2024 | Phase 5 NOTIF-02 success criterion is binding [CITED: moosend.com/blog/email-deliverability/]. |
| `convertLexicalToHTML` not in core | Shipped in `@payloadcms/richtext-lexical/html` | Payload 3.x stable | Drop-in for our content slot; custom converters layered as `HTMLConvertersFunction` [CITED: payloadcms.com/docs/rich-text/converters]. |
| BullMQ delayed job removal API churn | Stable `queue.getJob(id).remove()` since v5.x | bullmq 5.x | Phase 5 cancel-scheduled action is straightforward [CITED: docs.bullmq.io/guide/jobs/job-ids]. |
| JWT for stateless tokens | Raw HMAC sufficient when format is fixed | — | JWT confusion attacks [CITED: aquilax.ai/blog/jwt-algorithm-confusion-auth-bypass] argue for narrowest possible token format; HMAC + base64url(JSON) is the minimal correct shape. |

**Deprecated/outdated:**
- WhatsApp Business API for political-party broadcast — out of scope (PROJECT.md, confirmed; Phase 5 only links to free WhatsApp Channels broadcast).
- Brevo API v2 — Phase 5 uses v3 `/v3/smtp/email` and `/v3/contacts` (already used in Phase 1 for transactional; same client).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | Brevo's `headers` parameter overrides (does not duplicate) the auto-injected `List-Unsubscribe` header | Pitfalls §2 / Pattern 3 | One-click unsubscribe routes to Brevo's URL instead of ours; same-session DB sync (D-14) breaks. **Mitigation: pre-flight raw-header inspect MUST be a plan task before first production send.** |
| A2 | `convertLexicalToHTML` synchronous variant works inside React Email's `render()` flow when called from a Node-runtime worker | Pattern 5 / Example A | Lexical→HTML must move to async variant; acceptable since worker is async anyway. Verify with smoke test in Wave 0. |
| A3 | Brevo's `POST /v3/contacts` with `emailBlacklisted: true` is idempotent and round-trips in <800ms p95 from Fly.io Frankfurt | Pitfalls §4 | If latency exceeds 1s, the `/api/unsubscribe` route blows past the budget. Mitigation: 5s timeout + retry sub-job ensures eventual consistency. |
| A4 | The single Drizzle `INSERT ... VALUES (..),(..),(..),(..)` for 4-7 consent rows compiles and ships under Drizzle 0.45.2's PostgreSQL adapter without surprises | Pattern 7 | Drizzle's native batch insert syntax is well-documented; risk is low. |
| A5 | Outlook desktop honors HTML `width`/`height` even when image is blocked, preserving alt-text rendering space | Pitfalls §1 | If alt text still doesn't render, UX impact only — recipient sees a blank rectangle but the unsubscribe footer below still works. |
| A6 | The Phase 1 OTP/welcome emails already render Cyrillic correctly in production Outlook desktop (positive baseline) | Pitfalls §5 | If the baseline is wrong, we have a broader problem than Phase 5. **Plan task: verify with a real test send to Outlook desktop before scoping any new template work.** |
| A7 | `payload migrate` CLI is broken on payload@3.84+tsx@4.21+Node 22 (per Phase 02.1 STATE.md), so Phase 5 schema changes go through Drizzle Kit only | Runtime State Inventory | If Payload migrations are needed for the Newsletters collection or CommunityChannels Global, we need a workaround. **Recommendation: rely on Payload's auto-DDL on boot for collection/global tables — that's how Phase 02.1 ships. Custom Drizzle schema changes (users.preferred_channel) go via `pnpm db:generate` + commit + CI applies.** |
| A8 | UNSUBSCRIBE_HMAC_SECRET can be lazy-loaded inside getter so it doesn't fail at build time | Pitfalls §8 / Pattern 4 | If a transitive import evaluates the secret at module-eval, build fails. Mitigation already in Pattern 4 design. |

## Open Questions

1. **Newsletter draft autosave: Payload-native vs custom?**
   - What we know: Payload 3.x ships native draft autosave on collections.
   - What's unclear: Interaction with the 24h test-send freshness gate (D-02) — does autosave count as an "edit" that invalidates the gate?
   - Recommendation: **Yes, autosave invalidates the gate.** Implement as: `lastTestSentAt` field on Newsletters; any field-edit hook (Payload `beforeChange`) NULLs it; `Send blast` button checks `lastTestSentAt > now() - 24h`.

2. **Anti-abuse on the unsubscribe endpoint:**
   - What we know: HMAC + 90-day TTL prevents direct attacker forging.
   - What's unclear: Does an attacker with one valid email's token and the leaked token (e.g., shoulder-surf, email forwarded) get to unsubscribe someone else?
   - Recommendation: Yes — and that's acceptable. Unsubscribe is a destructive-but-reversible action (member resubs at /member/preferences). Worst case, an opponent unsubscribes 100 members who then re-grant; cost is low. Don't add CAPTCHA to unsub (UX disaster + Pitfall 5 from PITFALLS.md "unsubscribe requires login = bad").

3. **Newsletter analytics in v1:**
   - What we know: Brevo provides open/click metrics; CONTEXT.md doesn't require dashboarding.
   - Recommendation: **Out of scope for Phase 5.** Coalition can read Brevo's dashboard directly. v2 can pull metrics into the Payload dashboard if useful.

4. **Lexical allowed-blocks list enforcement:**
   - What we know: D-01 says "no raw HTML, no custom blocks." Payload's Lexical editor accepts a `features` array.
   - Recommendation: Disable upload-features-other-than-image, code-block, custom-block in the Newsletters collection's `lexicalEditor({ features: ... })` config. Greppable test: `expect(newslettersCollectionSrc).not.toMatch(/CodeBlock|CustomBlock/)`.

5. **Test-send recipient: editor's actual email vs. an alias?**
   - What we know: D-02 says "Send test to me."
   - Recommendation: Use `auth().user.email`. Editor bears the test-send burden; this is correct accountability.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Brevo API access | Newsletter send + blocklist sync | ✓ (Phase 1 D-19 confirmed) | v3 REST | None — required |
| Upstash Redis | BullMQ queue | ✓ (Phase 1 D-19 / D-21 confirmed) | latest | None — required |
| Bunny.net pull zone | Newsletter inline images | ✓ (provisioned per CLAUDE.md) | — | None — required |
| Cloudflare DNS access for `news.chastnik.eu` | DKIM + DMARC | Operator-side: pending `D-Phase5-prep` | — | **BLOCKING first send** |
| `UNSUBSCRIBE_HMAC_SECRET` Fly.io secret | HMAC sign/verify | Operator-side: NOT YET SET | — | None — must be set before Wave 0 |
| `EMAIL_FROM_NEWSLETTER` env var | Newsletter sender address | Operator-side: NOT YET SET | — | Falls back to `EMAIL_FROM_TRANSACTIONAL` if unset (acceptable for dev); BLOCKING for first prod send. |
| Coalition WhatsApp Channel + Telegram URLs | `/community` page real URLs | Coalition-side: pending `D-CoalitionChannels` | — | Payload Global ships with `*Visible: false` placeholder per D-12; coalition pastes URLs post-deploy. |
| Node 20+ runtime | `node:crypto.timingSafeEqual` | ✓ (Phase 02.1 already on Node 22 for undici@7) | 22 | None |

**Missing dependencies with no fallback:**
- DKIM CNAME for `news.chastnik.eu` — must be added in Cloudflare before any newsletter send.
- `UNSUBSCRIBE_HMAC_SECRET` — must be set in Fly.io secrets + GitHub Actions secrets before deploy.

**Missing dependencies with fallback:**
- Coalition channel URLs — D-12 placeholder mechanism handles graceful degradation.

## Validation Architecture

### Test Framework
| Property | Value |
|---|---|
| Framework | Vitest 2.1.8 (unit) + Playwright 1.49.1 (e2e) |
| Config file | `vitest.config.ts`, `playwright.config.ts` (existing) |
| Quick run command | `pnpm test:unit` |
| Full suite command | `pnpm test:unit && pnpm test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| NOTIF-01 | Member subscribes at registration | unit + e2e | `pnpm test:unit -- newsletter-register.test.ts` + `pnpm test:e2e -- preferences.spec.ts` | ❌ Wave 0 |
| NOTIF-02 | List-Unsubscribe header in every newsletter | integration | `pnpm test:unit -- newsletter-headers.test.ts` (snapshots Brevo args) | ❌ Wave 0 |
| NOTIF-03 | One-click unsubscribe + ESP sync | integration | `pnpm test:unit -- unsubscribe-route.test.ts` (mocked Brevo) | ❌ Wave 0 |
| NOTIF-04 | Visible WhatsApp Channel link | e2e | `pnpm test:e2e -- community.spec.ts` (anon teaser + auth real URL) | ❌ Wave 0 |
| NOTIF-05 | Visible Telegram link | e2e | (same as NOTIF-04) | — |
| NOTIF-06 | Cyrillic + nominative greetings | unit (render snapshot) | `pnpm test:unit -- newsletter-template.test.ts` | ❌ Wave 0 |
| NOTIF-09 | Editor blast from admin | e2e | `pnpm test:e2e -- newsletter-blast.spec.ts` (manual Brevo sandbox) | ❌ Wave 0 |

### Dimensions (Nyquist coverage)

#### Unit
- **What:** Token sign/verify, recipient query precedence, Lexical→HTML converter, Cyrillic + charset assertions, REDACT extension, tone-lock, schema-grep invariants.
- **Where:** `tests/unit/newsletter-*.test.ts`, `tests/unit/unsubscribe-hmac.test.ts`.
- **How:** Vitest source-grep + render-snapshot.
- **Sample assertion:** `expect(verifyUnsubToken(signUnsubToken('uid'))).toEqual({ ok: true, uid: 'uid' });`

#### Integration
- **What:** /api/unsubscribe end-to-end (token → 4 INSERTs → Brevo mock → redirect); recipient query against in-memory pgmem; BullMQ delayed enqueue + cancel race.
- **Where:** `tests/integration/unsubscribe-route.test.ts`, `tests/integration/recipient-query.test.ts`.
- **How:** vitest with `pg-mem` for DB layer; `nock` or `msw-node` for Brevo mocking.
- **Sample assertion:** `expect(consentRows).toHaveLength(4); expect(consentRows.every(r => r.granted === false)).toBe(true);`

#### Contract
- **What:** Brevo API request body shape (headers parameter included, sender/to/htmlContent/textContent intact); HMAC token format stable across releases.
- **Where:** `tests/unit/newsletter-headers.test.ts`.
- **How:** Snapshot of `sendBrevoEmail` args; assert exact `List-Unsubscribe` and `List-Unsubscribe-Post` strings.
- **Sample assertion:** `expect(brevoArgs.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');`

#### E2E
- **What:** Editor flow (login → compose → preview → test-send → blast); member flow (toggle topic off → editor sends → member NOT in recipient list); /community auth gating.
- **Where:** `tests/e2e/newsletter-blast.spec.ts`, `tests/e2e/preferences.spec.ts`, `tests/e2e/community.spec.ts`, `tests/e2e/unsubscribe.spec.ts`.
- **How:** Playwright; uses `MailHog`-equivalent (or Brevo sandbox tag) for capturing sends.
- **Sample assertion:** `await expect(page.getByTestId('community-whatsapp-link')).toHaveAttribute('href', /whatsapp\.com\/channel/);`

#### Performance (Nyquist sampling)
- **What:** Live preview p95 < 300ms server-render; /api/unsubscribe p95 < 1000ms (D-14 implicit).
- **Where:** Inline timing in vitest integration tests.
- **How:** `Date.now()` deltas around the render and the request handler.
- **Sample assertion:** `const t0 = Date.now(); await renderPreview({...}); expect(Date.now() - t0).toBeLessThan(300);`

#### Security
- **What:** ASVS V4 role gate (assertEditorOrAdmin) on `sendBlast` + Newsletters write + CommunityChannels write; ASVS V5 input validation (Zod on Server Actions); ASVS V6 HMAC constant-time compare; ASVS V7 no-PII-in-logs.
- **Where:** `tests/unit/role-gate-newsletter.test.ts`, `tests/unit/unsubscribe-hmac.test.ts`.
- **How:** Mock session with `role='member'`; assert Server Action throws.
- **Sample assertion:** `await expect(sendBlast({...}, { user: { role: 'member' } })).rejects.toThrow(/Forbidden/);`

#### GDPR
- **What:** Append-only consents (no UPDATE/DELETE); REDACT covers `to`, `recipient_email`; HMAC token TTL enforced; deletion cascades (Phase 6 promise — Phase 5 ensures FK shape preserves it).
- **Where:** `tests/unit/newsletter-schema.test.ts`, `tests/unit/logger.test.ts`.
- **How:** Source-grep + structured log capture.
- **Sample assertion:** `expect(loggerSrc).toMatch(/'to'/); expect(loggerSrc).toMatch(/'recipient_email'/);`

#### Observability
- **What:** Per-recipient send logs include `{user_id, status, brevo_message_id}`, NOT email.
- **Where:** `tests/unit/newsletter-worker-log.test.ts`.
- **How:** Capture pino output via `pino.destination(buffer)` in tests.
- **Sample assertion:** `const logLines = capturedLogs(); expect(logLines.every(l => !l.includes('@'))).toBe(true);`

### Sampling Rate
- **Per task commit:** `pnpm test:unit -- newsletter-*` (sub-30s).
- **Per wave merge:** `pnpm test:unit && pnpm test:e2e -- newsletter-* preferences community unsubscribe`.
- **Phase gate:** Full suite green + manual mailbox test-send to Gmail + Outlook desktop + abv.bg + mail.bg before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `tests/unit/newsletter-i18n.test.ts` — covers D-08 / D-22
- [ ] `tests/unit/newsletter-template.test.ts` — covers D-17 / D-18 (charset + glyph render)
- [ ] `tests/unit/newsletter-schema.test.ts` — covers D-09 (CONSENT_KINDS extension) + D-24 (REDACT)
- [ ] `tests/unit/unsubscribe-hmac.test.ts` — covers D-16 (sign + verify + TTL)
- [ ] `tests/unit/newsletter-headers.test.ts` — covers NOTIF-02 (List-Unsubscribe + Post)
- [ ] `tests/unit/recipient-query.test.ts` — covers D-05 + D-09 backward compat
- [ ] `tests/integration/unsubscribe-route.test.ts` — covers NOTIF-03 end-to-end
- [ ] `tests/e2e/newsletter-blast.spec.ts` — covers NOTIF-09
- [ ] `tests/e2e/preferences.spec.ts` — covers NOTIF-01 + D-06 / D-07
- [ ] `tests/e2e/community.spec.ts` — covers NOTIF-04 + NOTIF-05 + D-11 (preview-vs-redeem)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | yes | Existing Auth.js v5 session — Phase 5 reuses for /member/preferences gate |
| V3 Session Management | yes | Existing httpOnly + SameSite=Lax session cookies |
| V4 Access Control | **YES — critical** | `assertEditorOrAdmin()` on sendBlast Server Action + Newsletters collection access policy + CommunityChannels Global write policy. Defense-in-depth = page-component check + Server Action re-check (Phase 02.1 pattern). |
| V5 Input Validation | yes | Zod schemas on `sendBlast({newsletterId, scheduledAt})`, `updatePreferences({topic, granted})`, `cancelScheduled({newsletterId})`, unsubscribe token (no Zod — HMAC verify is the gate). |
| V6 Cryptography | yes | `node:crypto.createHmac('sha256', ...)` + `timingSafeEqual` for token verify. NEVER `===` on signatures (timing oracle). |
| V7 Logging | yes | Pino REDACT extended with `'to'`, `'recipient_email'`. Per-recipient log includes `user_id_pseudonymous` only. |
| V8 Data Protection | yes | HMAC secret in Fly.io secrets, never logged. Email rendered in worker; recipient list never written to disk. |
| V9 Communications | yes | Brevo API over HTTPS; List-Unsubscribe URL is HTTPS-only (RFC 8058 hard requirement). |
| V13 Web Service | yes | `/api/unsubscribe` accepts both GET (footer click) and POST (RFC 8058 one-click); both validate token identically. |

### Known Threat Patterns for {Next.js + Payload + Brevo + BullMQ stack}

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Token forgery (attacker crafts unsubscribe link) | Spoofing | HMAC-SHA256 signature; secret in Fly.io secrets only |
| Token replay after expiry | Tampering | 90-day TTL via `iat` + `Date.now() - iat <= TTL_MS` |
| Timing oracle on signature compare | Information Disclosure | `crypto.timingSafeEqual` (not `===`) |
| Unsubscribe DOS (mass POST to /api/unsubscribe) | Denial of Service | Existing Upstash rate limit (Phase 1 D-19); per-IP 10/min on the route |
| Editor-impersonation send-blast (CSRF) | Spoofing | Auth.js session-cookie; Server Action's built-in CSRF (per Server Action contract) |
| Privilege escalation: member triggers sendBlast directly | Elevation of Privilege | `assertEditorOrAdmin()` re-check on every Server Action call |
| Lexical-injection HTML in newsletter (XSS) | Tampering | `convertLexicalToHTML` is the trusted boundary; reject Lexical AST node types not in allowed list (paragraph, heading-2/3, link, list, image-upload only) |
| ESP suppression race (member opts out, send fires anyway) | — (UX/GDPR) | Pitfall 6 timing audit; 50ms window accepted with documented escalation path |
| Email injection via crafted display name | Tampering | `nameValidator()` already strips control chars (Phase 1); applies to Brevo `to.name` field |
| Double-send via duplicate `Send blast` clicks | — (data integrity) | Use deterministic `jobId = newsletter-${id}`; BullMQ ignores duplicate jobIds |

## Sources

### Primary (HIGH confidence)
- [Payload CMS Lexical Converters docs](https://payloadcms.com/docs/rich-text/converters) — `convertLexicalToHTML` import + signature + custom converter shape
- [Payload CMS Globals config](https://payloadcms.com/docs/configuration/globals) — single-row Global pattern
- [Payload CMS Migrations](https://payloadcms.com/docs/database/migrations) — `--skip-empty`, `--force-accept-warning` flags for non-TTY
- [BullMQ Job IDs](https://docs.bullmq.io/guide/jobs/job-ids) — custom jobId constraints + duplicate-prevention semantics
- [BullMQ Removing Jobs](https://docs.bullmq.io/guide/queues/removing-jobs) — `job.remove()` semantics; locked-active throws
- [BullMQ Delayed Jobs](https://docs.bullmq.io/guide/jobs/delayed) — `delay` option + `changeDelay()`
- [Brevo Send Transactional Email API](https://developers.brevo.com/reference/sendtransacemail) — verified `headers` parameter accepts custom values
- [Brevo Create Contact API](https://developers.brevo.com/reference/create-contact) — `emailBlacklisted: true` for suppression sync
- [Brevo Get Blocked Contacts API](https://developers.brevo.com/reference/get-transac-blocked-contacts) — listing endpoint for audits
- [RFC 8058 (List-Unsubscribe-Post)](https://www.rfc-editor.org/rfc/rfc8058.html) — exact header wire format
- [Drizzle ORM Insert docs](https://orm.drizzle.team/docs/insert) — multi-row VALUES in single statement
- [PostgreSQL DISTINCT ON tutorial](https://www.postgresqltutorial.com/postgresql-select-distinct/) — fastest latest-per-group pattern
- [React Email Head component](https://react.email/docs/components/head) — meta charset injection
- [`@payloadcms/richtext-lexical` npm](https://www.npmjs.com/package/@payloadcms/richtext-lexical) — version verification 3.84.1
- [BullMQ npm](https://www.npmjs.com/package/bullmq) — version verification 5.76.5

### Secondary (MEDIUM confidence — cross-referenced)
- [Brevo List-Unsubscribe FAQ](https://help.brevo.com/hc/en-us/articles/19100260472850-FAQs-About-list-unsubscribe-and-list-help-headers-in-emails) — auto-injection behavior; mitigated by explicit headers param
- [Brevo Blog — List-Unsubscribe Header](https://www.brevo.com/blog/list-unsubscribe-header/) — RFC 8058 mention + 2024 Gmail/Yahoo requirement
- [Mailgun — RFC 8058 Guide](https://www.mailgun.com/blog/deliverability/what-is-rfc-8058/) — wire format examples
- [Litmus — Outlook Image Blocking Guide](https://www.litmus.com/blog/the-ultimate-guide-to-email-image-blocking) — fixed width/height attribute requirement
- [Ted Goas — Outlook Email Rendering](https://www.tedgoas.com/blog/outlook-email-rendering/) — CSS-vs-HTML attr behavior in Outlook
- [Email Almanac — Character Sets](https://reviewmyemails.com/emailalmanac/content-and-creative/internationalization-localization-fonts-rtl/how-to-handle-different-character-sets-unicode) — UTF-8 + Cyrillic specifics
- [JSX Email Conditional Component](https://jsx.email/docs/components/conditional) — alternative for MSO-conditional comments if needed
- [AquilaX — JWT alg:none Confusion](https://aquilax.ai/blog/jwt-algorithm-confusion-auth-bypass) — justification for raw HMAC over JWT

### Tertiary (LOW — flagged ASSUMED)
- Brevo `headers` parameter overrides auto-injected List-Unsubscribe — DOCUMENTED via API spec but EMPIRICAL confirmation required (Pitfall §2 / A1).
- Brevo POST /v3/contacts blocklist sync p95 latency — assumed ≤800ms based on Phase 1 transactional latency (A3).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package verified against npm 2026-05-04 + already installed.
- Architecture: HIGH — patterns mirror shipped Phase 1 + Phase 02.1 patterns; no new infra primitives.
- Pitfalls: MEDIUM-HIGH — most are inherited from Phase 1 / 02.1 lessons or PITFALLS.md research; Pitfall 2 (Brevo header override) is the one assumption requiring pre-flight test.
- Validation Architecture: HIGH — directly extends the Phase 02.1 forbidden-token grep + tone-lock + render-snapshot patterns.
- HMAC token format: HIGH — `node:crypto` is std-lib; pattern is canonical.
- Brevo header override behavior: **MEDIUM** (logged as A1 — plan must include pre-flight raw-header inspect).

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (stable stack — most data sources are well-established and don't change weekly; the one volatile element is Brevo's behavior, which can drift if they change auto-injection policy).
