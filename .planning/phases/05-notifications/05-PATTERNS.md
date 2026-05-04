# Phase 5: Notifications — Pattern Map

**Mapped:** 2026-05-04
**Files analyzed:** 18 new + 5 modified = 23
**Analogs found:** 22 / 23 (one file — `lexical-to-html.ts` — has no codebase analog; planner uses RESEARCH.md Pattern 5)

> Pattern excerpts cite source file + line range. `[VERIFIED:path]` markers point to read-verified bytes in the working tree as of 2026-05-04. Planner: every concrete excerpt is meant to be **copied with minimal renaming** — no analog is "loose inspiration."

---

## File Classification

### NEW files (Phase 5 creates)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/collections/Newsletters.ts` | model (Payload collection) | CRUD (admin-managed) | `src/collections/Users.ts` | role-match (different fields, same `CollectionConfig` shape + access control + slug pattern) |
| `src/globals/CommunityChannels.ts` | model (Payload Global) | CRUD (single-row) | `src/collections/Users.ts` (closest analog — codebase has no Globals yet) | partial (Global API differs from Collection but `access` + `fields` blocks identical) |
| `src/lib/email/templates/NewsletterEmail.tsx` | component (React Email template) | transform (props → HTML) | `src/lib/email/templates/WelcomeEmail.tsx` | exact role + flow; planner extends with topic chip + content slot per RESEARCH §Example A |
| `src/lib/newsletter/recipients.ts` | service (DB query) | request-response | `src/app/(payload)/admin/views/attribution/actions.ts` (Drizzle aggregate query w/ role gate) | role-match (different table; same `db.select` + `sql\`...\`` raw-SQL escape valve documented in RESEARCH §Pattern 2) |
| `src/lib/newsletter/lexical-to-html.ts` | utility (AST transform) | transform | **NO ANALOG** | none — planner uses RESEARCH §Pattern 5 verbatim |
| `src/lib/newsletter/brevo-sync.ts` | service (external API) | request-response | `src/lib/email/brevo.ts` | exact role + flow; new helper extends Brevo `fetch` with `/v3/contacts` body |
| `src/lib/newsletter/preview.ts` | service (Server Action — RSC render) | request-response | `src/app/(payload)/admin/views/attribution/actions.ts` (`'use server'` + `assertEditorOrAdmin()`) | role-match |
| `src/lib/unsubscribe/hmac.ts` | utility (crypto) | transform | `src/lib/auth-utils.ts` (existing HMAC OTP hash) | role-match (same `node:crypto` shape; planner uses RESEARCH §Pattern 4) |
| `src/lib/email/newsletter-worker.tsx` (or extension to `worker.tsx`) | service (worker handler) | event-driven (BullMQ job) | `src/lib/email/worker.tsx` + `src/lib/attribution/worker.ts` | exact (extend the same switch — D-21 says reuse, not duplicate) |
| `src/app/api/unsubscribe/route.ts` | controller (Node-runtime API route) | request-response (POST + GET) | `src/app/api/cookie-consent/route.ts` | exact role; same Drizzle `consents` INSERT + Node-runtime declaration |
| `src/app/(frontend)/member/preferences/page.tsx` | component (RSC page) | request-response | `src/app/(frontend)/member/page.tsx` | exact (same route group, same auth-via-layout, same `MainContainer` + `getTranslations` shape) |
| `src/app/(frontend)/community/page.tsx` | component (RSC page) | request-response (auth-conditional render) | `src/app/(frontend)/agenda/page.tsx` (static-ish public page) + `src/app/(frontend)/member/layout.tsx` (auth check) | role-match — public page that calls `auth()` to branch; combine both analogs |
| `src/app/(frontend)/unsubscribed/page.tsx` | component (RSC page) | request-response | `src/app/(frontend)/agenda/page.tsx` | role-match — static confirmation page |
| `src/app/actions/send-blast.ts` | service (Server Action) | event-driven (enqueue) | `src/app/actions/register.ts` + `src/app/(payload)/admin/views/attribution/actions.ts` | role-match — same `'use server'` + role gate + `addEmailJob(...)` shape |
| `src/app/actions/send-test.ts` | service (Server Action) | event-driven | `src/app/actions/register.ts` | role-match — same enqueue pattern |
| `src/app/actions/save-preferences.ts` | service (Server Action) | CRUD (consents append-only) | `src/app/actions/register.ts` (consents batch INSERT) | exact data-flow match |
| `src/app/actions/cancel-scheduled.ts` | service (Server Action) | event-driven (BullMQ job remove) | `src/app/actions/register.ts` (Server Action shape) + RESEARCH §Pattern 6 + Pitfall 3 | partial — pattern is Phase-5-novel; analog provides only the Server Action wrapping |
| `src/app/(payload)/admin/components/NewsletterPreview.tsx` (custom Payload field component) | component | request-response (debounced server call) | `src/app/(payload)/admin/views/attribution/AttributionDashboard.tsx` | role-match (client component inside Payload admin shell, calls `'use server'` actions) |

### MODIFIED files (Phase 5 extends)

| File | Role | Data Flow | Modification | Analog Pattern |
|------|------|-----------|--------------|----------------|
| `src/lib/email/queue.ts` | infra (BullMQ producer) | event-driven | Extend `EmailJobKind` + `EmailJobPayload` | self-analog: extend in place; same `addEmailJob` signature stays |
| `src/lib/email/worker.tsx` | service (worker switch) | event-driven | Add `newsletter-blast`, `newsletter-send-recipient`, `newsletter-test`, `unsubscribe-brevo-retry` cases | self-analog: same `switch (kind)` shape (RESEARCH §Pattern 1) |
| `src/lib/email/brevo.ts` | service (HTTP client) | request-response | Add `headers?: Record<string,string>` to `BrevoSendArgs` (RFC 8058 List-Unsubscribe override) | self-analog |
| `src/lib/logger.ts` | infra (Pino) | n/a | Extend `REDACT` array with `'to'` + `'recipient_email'` (D-24) | self-analog |
| `src/db/schema/consents.ts` | model | n/a | Extend `CONSENT_KINDS` const with 4 new newsletter topic values | self-analog (table shape unchanged) |
| `src/db/schema/auth.ts` | model | n/a | Add `preferred_channel: text` nullable column to `users` | self-analog (existing `pgTable` columns) |
| `src/app/actions/register.ts` | service (Server Action) | CRUD | Replace single `kind='newsletter'` row with 4 topic rows when checkbox checked (D-09) | self-analog: same `tx.insert(consents).values([...])` block (lines 117-137); see RESEARCH §Pattern 7 for the 7-row replacement |
| `src/app/(frontend)/member/page.tsx` | component | request-response | Add 2 cards: "Настройки" + "Общностни канали" | self-analog: existing card grid block at lines 28-59 — append two more `<Card>` entries |
| `src/components/layout/Footer.tsx` | component | request-response | Replace "Каналите стартират скоро" placeholder (lines 92-100) with read-time-conditional links from `CommunityChannels` Global | self-analog: existing footer-grid column 4 |
| `src/payload.config.ts` | config | n/a | Register `Newsletters` collection + `CommunityChannels` Global + extend `admin.components` map | self-analog (lines 17-26 already register Phase 02.1's view) |
| `src/app/(payload)/admin/importMap.js` | config | n/a | Add Newsletters preview component import (Pitfall 7 — must match `Component` path exactly) | self-analog |
| `messages/bg.json` | i18n | n/a | Add 5 namespaces: `member.preferences`, `community`, `email.newsletter`, `admin.newsletters`, `unsubscribe` | self-analog |

---

## Pattern Assignments

### `src/collections/Newsletters.ts` (model, Payload collection)

**Analog:** `src/collections/Users.ts` [VERIFIED:src/collections/Users.ts:1-32]

**Imports + access control pattern** (lines 1-19):
```typescript
import type { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
  slug: 'admin_users',
  auth: true,
  admin: { useAsTitle: 'email' },
  access: {
    read:   ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [...],
};
```

**Apply to `Newsletters.ts`:** keep the `CollectionConfig` shape; tighten `access` to require `role IN ('admin','editor')` (D-25 — see Shared Pattern §Role Gate). Use `useAsTitle: 'subject'`. Add Lexical RTE field via `lexicalEditor()` (already imported globally — see `src/payload.config.ts:2`). Slug `newsletters`. Phase 1 D-25 lesson on slug-collisions (the `users → admin_users` rename) does NOT apply — `newsletters` and `community_channels` do not collide with Drizzle tables.

**Status enum field (D-01):**
```typescript
{
  name: 'status',
  type: 'select',
  defaultValue: 'draft',
  options: [
    { label: 'Чернова',     value: 'draft' },
    { label: 'Планиран',    value: 'scheduled' },
    { label: 'Изпраща се',  value: 'sending' },
    { label: 'Изпратен',    value: 'sent' },
    { label: 'Неуспешен',   value: 'failed' },
    { label: 'Отказан',     value: 'cancelled' },
  ],
}
```
(mirrors `src/collections/Users.ts:23-30` `role` select shape; Bulgarian labels per D-08/D-22).

---

### `src/globals/CommunityChannels.ts` (model, Payload Global)

**Analog:** `src/collections/Users.ts` [VERIFIED:src/collections/Users.ts:1-32] — codebase has zero existing Globals; Global config shape from Payload 3 docs (RESEARCH §Standard Stack — `payload@3.84.1` Globals first-class).

**Pattern (synthesized from Users.ts + Payload Global API):**
```typescript
import type { GlobalConfig } from 'payload';

export const CommunityChannels: GlobalConfig = {
  slug: 'community-channels',
  access: {
    read:   () => true,                                          // public read (RSC consumption)
    update: ({ req }) => ['admin', 'editor'].includes(
      ((req.user as { role?: string } | null)?.role) ?? '',
    ),
  },
  admin: { description: 'Канали за общността (WhatsApp + Telegram)' },
  fields: [
    { name: 'whatsappChannelUrl', type: 'text' },
    { name: 'whatsappVisible',    type: 'checkbox', defaultValue: false },
    { name: 'telegramChannelUrl', type: 'text' },
    { name: 'telegramVisible',    type: 'checkbox', defaultValue: false },
    { name: 'bgDescription',      type: 'textarea' },            // /community page intro copy
  ],
};
```

Register in `src/payload.config.ts` `globals: [CommunityChannels]`.

---

### `src/lib/email/templates/NewsletterEmail.tsx` (component, React Email)

**Analog:** `src/lib/email/templates/WelcomeEmail.tsx` [VERIFIED:src/lib/email/templates/WelcomeEmail.tsx:1-53]

**Imports** (lines 1-2):
```tsx
import React from 'react';
import { Html, Head, Body, Container, Heading, Text, Button } from '@react-email/components';
```

**Translator + greeting prop pattern** (lines 4-15):
```tsx
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
```

**Body styling pattern (Sinya tokens hard-coded inline)** (lines 17-30):
```tsx
return (
  <Html lang="bg">
    <Head />
    <Body style={{
      fontFamily: 'Roboto, system-ui, sans-serif',
      backgroundColor: '#FFFFFF',
      color: '#0F172A',
    }}>
      <Container style={{ maxWidth: 480, padding: 24 }}>
        <Heading as="h1" style={{ fontSize: 28, fontWeight: 600, color: '#004A79' }}>
          {t('heading')}
        </Heading>
```

**Apply to `NewsletterEmail.tsx`:**
- Keep `t` translator + `firstName` extraction verbatim (consistency with worker `loadT` — Shared Pattern §next-intl in workers).
- Bump `<Container maxWidth>` to **600** (UI-SPEC §2 email standard; WelcomeEmail's 480 is OTP-card sized).
- Add `<Head>` body per UI-SPEC §3.3 D-18 charset declaration:
  ```tsx
  <Head>
    <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
    <meta charSet="utf-8" />
  </Head>
  ```
- Add topic chip + content slot per RESEARCH §Code Examples Example A. Use `dangerouslySetInnerHTML` ONLY for the Lexical-to-HTML output (sanitized at source by our converter; NEVER on raw editor input).
- Add `<Preview>{previewText}</Preview>` after `<Head>` (research-only addition; not in WelcomeEmail).
- Footer pattern: 2 `<Text>` blocks (preferences link + unsubscribe link) + 1 copyright line. Style per UI-SPEC §2 email-specific spacing.

**Anti-pattern lock:** The `'fontWeight: 600'` in WelcomeEmail line 28 is for the OTP heading (`Heading 3` weight). For NewsletterEmail h1 use `fontWeight: 800` per UI-SPEC §3.2 (Gilroy ExtraBold). Do not blindly copy.

---

### `src/lib/email/newsletter-worker.tsx` (or extension of `worker.tsx`) (service, BullMQ handler)

**Analog:** `src/lib/email/worker.tsx` [VERIFIED:src/lib/email/worker.tsx:1-108]

**Connection + IORedis singleton pattern** (lines 15-22):
```typescript
function workerConnection(): IORedis {
  const url = process.env.UPSTASH_REDIS_URL!;
  return new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: url.startsWith('rediss://') ? {} : undefined,
  });
}
```

**`loadT` direct-import pattern (worker is outside Next.js request scope)** (lines 30-46):
```typescript
function loadT(namespace: string): EmailT {
  const dict = namespace
    .split('.')
    .reduce<Record<string, unknown>>(
      (node, key) => (node?.[key] as Record<string, unknown>) ?? {},
      bg as Record<string, unknown>,
    );
  return (key: string, vars?: Record<string, string | number>) => {
    const raw = (dict as Record<string, string>)[key];
    if (typeof raw !== 'string') return key;
    if (!vars) return raw;
    return Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      raw,
    );
  };
}
```

**Switch handler pattern** (lines 48-84):
```typescript
async function processor(job: Job<EmailJobPayload>): Promise<{ messageId: string }> {
  const { to, kind, otpCode, fullName } = job.data;
  let subject = '';
  let html = '';
  let text = '';

  switch (kind) {
    case 'register-otp': {
      const t = loadT('email.registerOtp');
      subject = t('subject');
      const props = { t, code: otpCode!, fullName: fullName ?? '', validityHours: 48 };
      html = await render(<OtpEmail {...props} />);
      text = await render(<OtpEmail {...props} />, { plainText: true });
      break;
    }
    // ... other cases ...
  }

  const tFrom = loadT('email.from');
  return sendBrevoEmail({
    to: { email: to, name: fullName },
    subject,
    htmlContent: html,
    textContent: text,
    from: { email: process.env.EMAIL_FROM_TRANSACTIONAL ?? '...', name: tFrom('name') },
  });
}
```

**Apply to newsletter-blast handler (D-05 fan-out):**
1. `case 'newsletter-blast'`: query recipients (Drizzle DISTINCT ON — Pattern 2 of RESEARCH); for each row, enqueue a `newsletter-send-recipient` sub-job (no Brevo call here — fan-out only).
2. `case 'newsletter-send-recipient'`: render `NewsletterEmail` with HMAC-signed unsub URL; call `sendBrevoEmail` with **explicit `headers`** (RESEARCH §Pattern 3) so the RFC 8058 List-Unsubscribe overrides Brevo's auto-injection (Pitfall 2). Use `EMAIL_FROM_NEWSLETTER` env var (NOT the transactional one — D-20).
3. `case 'newsletter-test'`: same as send-recipient but to a single recipient (the editor's own email), unsub URL is a sentinel (e.g. `#preview`), no Brevo blocklist effect.
4. `case 'unsubscribe-brevo-retry'`: call `brevoBlocklist(unsubEmail)`; throw on failure → BullMQ retries (D-14).

**Anti-pattern lock:** Phase 02.1 worker (`src/lib/attribution/worker.ts:5,32`) uses **`@/`-aliased imports** (`import { db } from '@/db'`); Phase 1 worker (`src/lib/email/worker.tsx:8-13`) uses **relative imports** (`'./templates/OtpEmail'`). Both run under the `tsx scripts/start-worker.ts` runtime. The Phase 1 file's comment at line 1-4 explains React must be in scope — `import React from 'react'` MUST be present at top of any new worker file using JSX.

---

### `src/lib/email/queue.ts` modification (infra, BullMQ producer)

**Analog:** `src/lib/email/queue.ts` itself [VERIFIED:src/lib/email/queue.ts:1-91] (extending in place)

**Triple-guard test-bypass pattern (line 64-77 — the `isTestBuild` + `isLocalUrl` gate) MUST be preserved when modifying:**
```typescript
const url = process.env.UPSTASH_REDIS_URL;
const isTestBuild =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === '1x00000000000000000000AA' &&
  process.env.NODE_ENV === 'test';
const isLocalUrl = !!url && (url.includes('localhost') || url.includes('127.0.0.1'));
if (!url || isLocalUrl || isTestBuild) {
  if (process.env.NODE_ENV === 'production' && !isTestBuild && !isLocalUrl) {
    throw new Error('UPSTASH_REDIS_URL must be set in production');
  }
  return;
}
await getQueue().add(payload.kind, payload, {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
});
```

**Apply:** Extend the `EmailJobKind` union and `EmailJobPayload` interface only. **Do NOT touch the test-bypass logic** — it is protected by `tests/unit/queue.test.ts` (line 17-21 — Pitfall E lock). For delayed-send (D-04), pass `{ delay, jobId }` per RESEARCH §Pattern 6:
```typescript
await getQueue().add(payload.kind, payload, {
  jobId: payload.kind === 'newsletter-blast' ? `newsletter-${payload.newsletterId}` : undefined,
  delay: payload.delayMs,
  attempts: 5,
  backoff: { type: 'exponential', delay: 30_000 },   // RESEARCH 'Claude's Discretion'
  ...
});
```

---

### `src/app/api/unsubscribe/route.ts` (controller, Node-runtime API route)

**Analog:** `src/app/api/cookie-consent/route.ts` [VERIFIED:src/app/api/cookie-consent/route.ts:1-69]

**Imports + Drizzle consents INSERT pattern** (lines 1-9, 50-67):
```typescript
import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { consents } from '@/db/schema';
import { auth } from '@/lib/auth';

const POLICY_VERSION = '2026-04-29';

// ... handler body ...

const versionTag = POLICY_VERSION;
const rows = [
  { user_id: userId, kind: 'cookies', granted: true, version: versionTag },
  { user_id: userId, kind: 'cookies', granted: !!decision.analytics,
    version: `${versionTag}#analytics` },
  // ...
];
await db.insert(consents).values(rows);
return NextResponse.json({ ok: true, anonAudited: false, userAudited: true });
```

**Apply to `/api/unsubscribe`:**
1. **Add Node-runtime declaration** (consistency with `src/app/api/admin-bootstrap/route.ts:17`): `export const runtime = 'nodejs';`
2. Export BOTH `GET` and `POST` handlers (RFC 8058 — mailbox providers POST `List-Unsubscribe=One-Click`; users click GET in the email footer). Pattern: thin handlers delegating to a shared `handle(req)` function (RESEARCH §Code Examples Example B).
3. Verify HMAC token via `verifyUnsubToken` (NEW `src/lib/unsubscribe/hmac.ts`); on `!ok` redirect to `/unsubscribed?reason=expired` (or `bad-sig`/`malformed`).
4. INSERT 4 rows in a single `db.insert(consents).values([...])` (mirror cookie-consent route line 51-65 — array literal, batch INSERT). Use `POLICY_VERSION` constant (already shared with `src/app/actions/register.ts:58`).
5. **Brevo blocklist call: `await` (D-14 same-session sync) but wrap in `try/catch` and on failure enqueue `unsubscribe-brevo-retry`** (RESEARCH §Pitfall 4):
```typescript
try {
  await brevoBlocklist(userEmail);
} catch (err) {
  logger.warn({ user_id: userId, err: String(err) }, 'unsubscribe.brevo_sync_failed');
  await addEmailJob({ to: userEmail, kind: 'unsubscribe-brevo-retry', unsubEmail: userEmail });
}
```

**Anti-pattern lock:** Cookie-consent route uses `auth()` to grab user identity. `/api/unsubscribe` MUST NOT require auth (D-14 — public endpoint; identity comes from HMAC payload `uid`).

---

### `src/lib/unsubscribe/hmac.ts` (utility, crypto helper)

**Analog:** `src/lib/auth-utils.ts` (existing HMAC OTP hash — same `node:crypto` shape) — codebase analog confirmed via:
```bash
grep -rn "createHmac\|timingSafeEqual" /Users/emoadm/projects/SMBsite/src/lib/
```
Result: `src/lib/auth-utils.ts` is the only existing `node:crypto` consumer. Code shape verified by `tests/unit/otp-generator.test.ts`.

**Pattern:** Use RESEARCH §Pattern 4 verbatim (`signUnsubToken` + `verifyUnsubToken` with `createHmac('sha256', SECRET()).digest('base64url')` + `timingSafeEqual` for constant-time compare). Defer secret read to first call (RESEARCH §Pitfall 8 — module-eval-time env-var bug from Phase 02.1).

---

### `src/app/(frontend)/member/preferences/page.tsx` (component, RSC page)

**Analog:** `src/app/(frontend)/member/page.tsx` [VERIFIED:src/app/(frontend)/member/page.tsx:1-62]

**Imports + RSC pattern** (lines 1-7, 17-19):
```tsx
import Link from 'next/link';
import { BookOpen, HelpCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { MainContainer } from '@/components/layout/MainContainer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MemberWelcomeBanner } from '@/components/member/MemberWelcomeBanner';
import { Timeline } from '@/components/member/Timeline';

export default async function MemberPage() {
  const t = await getTranslations('member.welcome');
  return (
    <MainContainer width="page">
```

**Auth-via-layout pattern** (already enforced by `src/app/(frontend)/member/layout.tsx`) — preferences page lives inside `(frontend)/member/` so it inherits the `auth()` redirect [VERIFIED:src/app/(frontend)/member/layout.tsx:4-12]. **DO NOT** re-add `auth()` in the page itself.

**Apply to preferences page:**
- `MainContainer width="form"` (UI-SPEC §2 — preferences is form-width, not page-width).
- `getTranslations('member.preferences')`.
- Preferences read query: server-side Drizzle call to `recipients.ts` helper that returns the *latest consent per (user, kind)* for the 4 newsletter topics. **NEVER UPDATE `consents`**; the form action INSERTs a new row (D-13 append-only — see `src/app/actions/register.ts:117-137` for the canonical INSERT pattern).
- Form via shadcn `Switch` component (NEW — `pnpm dlx shadcn add switch`); see UI-SPEC §6.

**Code shape:**
```tsx
export default async function PreferencesPage() {
  const session = await auth();                    // already non-null per layout
  const userId = session!.user!.id;
  const current = await getCurrentPreferences(userId);   // src/lib/newsletter/recipients.ts
  return (
    <MainContainer width="form">
      <h1 className="font-display text-3xl">{t('heading')}</h1>
      <PreferencesForm initial={current} />          {/* client component with use-form-action */}
    </MainContainer>
  );
}
```

---

### `src/app/(frontend)/community/page.tsx` (component, RSC page — preview-vs-redeem)

**Analogs:** Two — combine.

**Static page shape:** `src/app/(frontend)/agenda/page.tsx` [VERIFIED:src/app/(frontend)/agenda/page.tsx:1-60]
```tsx
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('agenda');
  // ...
}

export default async function AgendaPage() {
  const t = await getTranslations('agenda');
  return (
    <MainContainer width="prose">
      <SectionEyebrow>{t('leadEyebrow')}</SectionEyebrow>
      <h1 className="mt-2 mb-6 font-display text-3xl">{t('title')}</h1>
```

**Auth conditional rendering:** `src/app/(frontend)/member/layout.tsx` [VERIFIED:src/app/(frontend)/member/layout.tsx:4-12]
```tsx
const session = await auth();
if (!session?.user) {
  redirect('/login?next=/member');
}
```

**Apply to `/community`:**
1. **DO NOT use `revalidate` constant** — D-12 says coalition swaps URLs from Payload Global; static caching breaks that. Use `dynamic = 'force-dynamic'` (matching `src/app/api/attr/init/route.ts` per Pitfall pattern).
2. Read `CommunityChannels` Global via Payload `getPayload({config}).findGlobal({slug: 'community-channels'})`.
3. Branch on `auth()`:
   ```tsx
   const session = await auth();
   const isMember = !!session?.user;
   const channels = await payload.findGlobal({ slug: 'community-channels' });
   // ...
   {isMember && channels.whatsappVisible
     ? <a href={channels.whatsappChannelUrl}>...</a>
     : <Link href="/register">{t('teaserCta')}</Link>}
   ```
4. **NO `redirect()`** — anonymous visitors stay on the page (preview-vs-redeem, not gated). Differs from member/layout.tsx behavior.

**Anti-pattern lock:** agenda/page.tsx uses `revalidate = 3600` for static caching. /community CANNOT cache because (a) channel URLs are Global-managed (operator-edit without redeploy — D-12); (b) auth-conditional branch must run per-request.

---

### `src/app/actions/save-preferences.ts` (Server Action, append-only consents)

**Analog:** `src/app/actions/register.ts` [VERIFIED:src/app/actions/register.ts:1-151]

**Server Action header + Zod parse + transaction pattern** (lines 1-16, 33-52, 102-138):
```typescript
'use server';

import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { z } from '@/lib/zod-i18n';
import { db } from '@/db';
import { users, consents } from '@/db/schema';

const RegistrationSchema = z.object({
  // ... per-field zod ...
});

export type ActionState =
  | { ok: true; nextHref: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

const POLICY_VERSION = '2026-04-29';

export async function register(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  // ... validate, rate-limit ...
  const parsed = RegistrationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  await db.transaction(async (tx) => {
    // ...
    await tx.insert(consents).values([
      { user_id: userId, kind: 'privacy_terms', granted: true, version: POLICY_VERSION },
      { user_id: userId, kind: 'cookies',       granted: true, version: POLICY_VERSION },
      { user_id: userId, kind: 'newsletter',    granted: data.consent_newsletter === 'on',
        version: POLICY_VERSION },
      // ...
    ]);
  });
}
```

**Apply to `save-preferences.ts`:**
1. Same `'use server'` directive + `ActionState` discriminated-union return shape.
2. Auth via `auth()` (NOT `assertEditorOrAdmin` — preferences are member-self-service, not admin-only).
3. Zod schema for the 4 toggles + `preferred_channel` radio:
   ```typescript
   const PreferencesSchema = z.object({
     newsletter_general: z.union([z.literal('on'), z.literal('')]).optional(),
     newsletter_voting:  z.union([z.literal('on'), z.literal('')]).optional(),
     newsletter_reports: z.union([z.literal('on'), z.literal('')]).optional(),
     newsletter_events:  z.union([z.literal('on'), z.literal('')]).optional(),
     preferred_channel:  z.enum(['whatsapp', 'telegram', 'none']).optional(),
   });
   ```
4. INSERT 4 consent rows (one per topic) per RESEARCH §Pattern 7 — copy register.ts:117-137 array shape, change to topic kinds.
5. UPDATE `users.preferred_channel` (this column is NOT append-only — it lives on users, not consents):
   ```typescript
   await db.update(users).set({ preferred_channel: parsed.data.preferred_channel ?? null })
     .where(eq(users.id, userId));
   ```
6. **Brevo contacts list update (D-13)**: fire-and-forget `void brevoSync(userId, parsed.data).catch(...)` (RESEARCH §Anti-Patterns: keep request <200ms; retry via `unsubscribe-brevo-retry` queue path).

---

### `src/app/actions/send-blast.ts` + `send-test.ts` + `cancel-scheduled.ts` (admin Server Actions)

**Analog:** `src/app/(payload)/admin/views/attribution/actions.ts` [VERIFIED:src/app/(payload)/admin/views/attribution/actions.ts:1-134]

**Role gate pattern** (lines 33-41 — copy verbatim, do NOT re-implement):
```typescript
async function assertEditorOrAdmin(): Promise<void> {
  const payload = await getPayload({ config });
  const h = await headers();
  const { user } = await payload.auth({ headers: h });
  const role = (user as { role?: string } | null)?.role ?? '';
  if (!['admin', 'editor'].includes(role)) {
    throw new Error('Forbidden — editor or admin role required');
  }
}
```

**Server Action gate-first pattern** (lines 54-55, 105-106):
```typescript
export async function fetchAttributionAggregates(filter: AttributionFilter): Promise<AttributionAggregates> {
  await assertEditorOrAdmin();
  // ... data work ...
}
```

**Apply:**
1. **Extract `assertEditorOrAdmin` to a shared module** (e.g., `src/lib/auth/role-gate.ts`) — Phase 5 introduces 3 new admin Server Actions + 1 worker call site; cut-and-paste duplication is wrong. Phase 02.1 used a private helper because there was only one consumer.
2. EVERY new admin Server Action calls `await assertEditorOrAdmin()` as line 1 (defense-in-depth — Phase 02.1 D-13 + UI-SPEC §0 D-25). `tests/unit/dashboard-role-gate.test.ts` has the lock-in test pattern at lines 41-47 — Phase 5 plan adds an analog test for newsletter Server Actions.
3. `send-blast.ts`: validate Newsletter doc (status=draft, lastTestSentAt within 24h, body non-empty), call `addEmailJob({kind:'newsletter-blast', newsletterId, ...})`. UPDATE Payload doc `status='scheduled'|'sending'`. The 24h gate is a server-side check — never trust client.
4. `send-test.ts`: `addEmailJob({kind:'newsletter-test', to: editor.email, ...})`. UPDATE Payload doc `lastTestSentAt: new Date()`.
5. `cancel-scheduled.ts`: per RESEARCH §Pitfall 3:
   ```typescript
   // 1. UPDATE status='cancelled' BEFORE BullMQ touch
   await db.update(...).set({ status: 'cancelled' });
   // 2. Best-effort job removal
   try { await job.remove() } catch { /* now active; worker will see status='cancelled' and skip */ }
   ```

---

### `src/payload.config.ts` modification (config)

**Analog:** `src/payload.config.ts` itself [VERIFIED:src/payload.config.ts:1-39]

**Existing custom-view registration** (lines 17-26):
```typescript
admin: {
  user: Users.slug,
  importMap: { baseDir: path.resolve(dirname) },
  components: {
    views: {
      attribution: {
        Component: '/src/app/(payload)/admin/views/attribution/AttributionView#AttributionView',
        path: '/views/attribution',
      },
    },
  },
},
collections: [Users],
editor: lexicalEditor(),
```

**Apply (extending in place):**
- Add to `collections`: `[Users, Newsletters]`.
- Add: `globals: [CommunityChannels]`.
- The `editor: lexicalEditor()` already exists — `Newsletters.fields[].richText` automatically uses Lexical (no per-collection editor override needed for v1; UI-SPEC §0 D-01 restrictive blocks list is enforced via `lexicalEditor({ features: () => [...] })` if needed at field-level — see RESEARCH §Don't Hand-Roll for Lexical AST handling).
- If a custom Newsletters preview pane component is added, register under `admin.components.collections.newsletters.fields.body.Edit` (or similar) AND add to `importMap.js` per Pitfall 7. **Do NOT** put a `page.tsx` in the `(payload)/admin/views/newsletter-*/` tree — Phase 02.1 burned a day on shadow-routing. See `tests/unit/dashboard-role-gate.test.ts:60-75` for the importMap-registration lock-in pattern to extend.

---

### `src/app/(frontend)/member/page.tsx` modification (component)

**Analog:** itself [VERIFIED:src/app/(frontend)/member/page.tsx:28-59]

**Existing card grid** (lines 28-59):
```tsx
<div className="mt-16 grid gap-6 md:grid-cols-2">
  <Card>
    <CardHeader>
      <BookOpen className="h-6 w-6 text-primary" strokeWidth={1.5} />
      <h3 className="mt-2 font-display text-xl">{t('cards.agenda.title')}</h3>
    </CardHeader>
    <CardContent>
      <p className="text-base text-muted-foreground">{t('cards.agenda.body')}</p>
      <Link href="/agenda" className="mt-4 inline-block text-primary underline-offset-4 hover:underline">
        {t('cards.agenda.title')} →
      </Link>
    </CardContent>
  </Card>
  <Card>
    {/* faq card */}
  </Card>
</div>
```

**Apply:** Append 2 more `<Card>` entries (Settings + Channels) after the FAQ card. Change `md:grid-cols-2` → `md:grid-cols-2 lg:grid-cols-4` (UI-SPEC §5.5 layout). Use lucide icons `Bell` (preferences) and `Users` or `MessageSquare` (community). i18n keys: `member.welcome.cards.preferences.{title,body}` + `member.welcome.cards.community.{title,body}`. Links: `/member/preferences` + `/community`.

---

### `src/components/layout/Footer.tsx` modification (component)

**Analog:** itself [VERIFIED:src/components/layout/Footer.tsx:91-100]

**Existing channel-column placeholder** (lines 91-100):
```tsx
<div>
  <h2 className="font-display text-base">{t('channelsHeading')}</h2>
  <p className="mt-3 text-sm text-muted-foreground">{t('channelsPending')}</p>
  {/*
    When coalition delivers WhatsApp + Telegram URLs, replace this
    paragraph with a <ul> of <Link> entries. Tracked under
    D-CoalitionChannels in STATE.md deferred items.
  */}
</div>
```

**Apply:** Replace the `<p>` placeholder with auth-conditional links. Footer is async server component (already — line 19 `export async function Footer()`). Read `CommunityChannels` Global + `auth()` session, branch like `/community/page.tsx`. **Anonymous-visible behavior:** show a link to `/community` (NOT external URL — preserves the registration funnel per D-11). **Member-visible behavior:** show direct external link if `*Visible` is true, else fall back to `/community`.

---

### `messages/bg.json` modification (i18n)

**Analog:** itself + `tests/unit/attribution-i18n.test.ts` lock-in pattern [VERIFIED:tests/unit/attribution-i18n.test.ts:1-76]

**Tone-lock test pattern** (lines 33-37):
```typescript
it('uses formal-respectful tone — no vocative Уважаеми forms (D-21)', () => {
  const blob = JSON.stringify(bg.auth.register.source);
  expect(blob).not.toMatch(/Уважаеми/);
  expect(blob).not.toMatch(/Уважаема/);
});
```

**Greppable enum lock pattern** (lines 7-16, 25-31):
```typescript
const SOURCE_ENUM = [
  'qr_letter', 'email_coalition', 'sinya_site', /* ... */
] as const;

it('contains all 8 locked enum values (D-10) with non-empty Bulgarian labels', () => {
  const s = bg.auth.register.source;
  for (const key of SOURCE_ENUM) {
    expect(s[key], `auth.register.source.${key}`).toBeTruthy();
    expect(typeof s[key], `auth.register.source.${key} is string`).toBe('string');
  }
});
```

**Apply:** New `tests/unit/newsletter-i18n.test.ts`:
- `TOPIC_ENUM = ['newsletter_general', 'newsletter_voting', 'newsletter_reports', 'newsletter_events']`
- Iterate over each, assert `bg.email.newsletter.topicChip[topic]`, `bg.member.preferences.topics[topic]`, `bg.admin.newsletters.topics[topic]` all return non-empty strings.
- Tone-lock blob check across all 5 new namespaces.
- D-08 Bulgarian label fixture: `bg.member.preferences.topics.newsletter_general === 'Общи обявявания'` etc. (UI-SPEC §0 / D-08).

---

## Shared Patterns

### Authentication / Role Gate (D-25)

**Source:** `src/app/(payload)/admin/views/attribution/actions.ts:33-41` [VERIFIED]

```typescript
async function assertEditorOrAdmin(): Promise<void> {
  const payload = await getPayload({ config });
  const h = await headers();
  const { user } = await payload.auth({ headers: h });
  const role = (user as { role?: string } | null)?.role ?? '';
  if (!['admin', 'editor'].includes(role)) {
    throw new Error('Forbidden — editor or admin role required');
  }
}
```

**Apply to:**
- `src/app/actions/send-blast.ts` (first line of fn body)
- `src/app/actions/send-test.ts` (first line of fn body)
- `src/app/actions/cancel-scheduled.ts` (first line of fn body)
- `src/lib/newsletter/preview.ts` (first line of fn body — RESEARCH §Code Examples Example C)
- `Newsletters` collection `access` block (Payload-side) AND every Server Action body (defense in depth — Phase 02.1 D-13 lineage)

**Recommendation for Phase 5:** extract this helper to `src/lib/auth/role-gate.ts` (NEW shared module) and import everywhere. The Phase 02.1 inline copy was acceptable for one site; Phase 5 has 4+ call sites.

**Singular `role` not plural `roles` lock:** `tests/unit/dashboard-role-gate.test.ts:12-17` [VERIFIED] forbids `(user as any).roles`. Phase 5 must keep singular form.

### Member Authentication (preferences page)

**Source:** `src/app/(frontend)/member/layout.tsx:4-12` [VERIFIED:src/app/(frontend)/member/layout.tsx:4-12]

```typescript
const session = await auth();
if (!session?.user) {
  redirect('/login?next=/member');
}
if (!(session.user as { emailVerified?: Date | null }).emailVerified) {
  redirect('/auth/otp');
}
```

**Apply to:** All routes under `(frontend)/member/` — including the new `preferences/page.tsx` — inherit this layout's auth check. **No additional `auth()` call needed** in pages under `member/`. Banner / member-only widgets still call `auth()` to read `firstName` (see `src/components/member/MemberWelcomeBanner.tsx:24` — `const session = await auth();`).

### Append-Only Consents Write (D-13)

**Source:** `src/app/actions/register.ts:117-137` [VERIFIED:src/app/actions/register.ts:117-137]

```typescript
await tx.insert(consents).values([
  { user_id: userId, kind: 'privacy_terms', granted: true, version: POLICY_VERSION },
  { user_id: userId, kind: 'cookies',       granted: true, version: POLICY_VERSION },
  { user_id: userId, kind: 'newsletter',    granted: data.consent_newsletter === 'on',
    version: POLICY_VERSION },
  { user_id: userId, kind: 'political_opinion', granted: data.consent_political === 'on',
    version: POLICY_VERSION },
]);
```

**Apply to:**
- `src/app/actions/register.ts` modification — replace single `kind:'newsletter'` row with 4 topic rows (D-09; per RESEARCH §Pattern 7).
- `src/app/actions/save-preferences.ts` — same pattern, 4 topic rows on every save.
- `src/app/api/unsubscribe/route.ts` — same pattern, 4 rows ALL with `granted: false`.

**Anti-pattern lock:** **NEVER UPDATE or DELETE consents rows** — Phase 1 D-13. The cookie-consent route uses `version: \`${versionTag}#analytics\`` suffix [VERIFIED:src/app/api/cookie-consent/route.ts:51-65] when granular sub-categories don't exist as enum kinds; Phase 5 does NOT need this trick because newsletter sub-topics ARE first-class kinds.

### Drizzle Schema Extension Pattern (extending CONSENT_KINDS const)

**Source:** `src/db/schema/consents.ts:4-9` [VERIFIED:src/db/schema/consents.ts:4-9]

```typescript
export const CONSENT_KINDS = [
  'privacy_terms',
  'cookies',
  'newsletter',
  'political_opinion',
] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];
```

**Apply:** Append the 4 new values (D-08):
```typescript
export const CONSENT_KINDS = [
  'privacy_terms',
  'cookies',
  'newsletter',                  // legacy — Phase 1 (read-time blanket grant per D-09)
  'newsletter_general',          // NEW
  'newsletter_voting',           // NEW
  'newsletter_reports',          // NEW
  'newsletter_events',           // NEW
  'political_opinion',
] as const;
```

The DB column is `text` (line 22 — `kind: text('kind').notNull()`); no migration needed for the consents table itself. The `users.preferred_channel` column DOES require a Drizzle migration (`pnpm db:generate`).

**Migration constraint (Phase 02.1 lesson — Worktree caveat):** Phase 02.1 LEARNINGS notes `db:push` requires `DIRECT_URL` which worktrees may not have. Use `pnpm db:generate` to emit a SQL migration file; CI's existing migrate job applies on push to main. See `src/migrations/20260501_160443_init.ts` as the existing migration shape.

### Pino REDACT Extension (D-24)

**Source:** `src/lib/logger.ts:3-12` [VERIFIED:src/lib/logger.ts:3-12]

```typescript
const REDACT = [
  'email',
  'password',
  'ip',
  'x-forwarded-for',
  'cf-connecting-ip',
  'name',
  'full_name',
  'raw_ip', // Phase 2.1 D-19 / D-21 belt-and-braces — see src/lib/attribution/worker.ts
];
```

**Apply:** Append `'to'` and `'recipient_email'` (D-24). The `'email'` entry already redacts top-level `email` keys; newsletter worker's `to` field needs explicit listing because `to` is BullMQ payload convention. Add a `// Phase 5 D-24 — newsletter worker per-recipient send results` comment.

**Test pattern:** `tests/unit/logger.test.ts` already exists; extend with assertion that `'to'` appears in REDACT.

### Forbidden-Token / Greppable Enum Lock (test discipline)

**Source:** Phase 02.1 D-19 lineage — `tests/unit/attribution-i18n.test.ts:33-37` [VERIFIED] + `tests/unit/dashboard-role-gate.test.ts:12-17` [VERIFIED]

**Apply to Phase 5:**
- `tests/unit/newsletter-i18n.test.ts` — tone-lock + topic enum greppable label assertion (per `attribution-i18n.test.ts:25-31`).
- `tests/unit/newsletter-template.test.ts` — source-grep on `NewsletterEmail.tsx` for `charset="utf-8"`, `lang="bg"`, AND no Cyrillic literal regex `/[Ѐ-ӿ]/` per `tests/unit/queue.test.ts:40-43` (existing OtpEmail no-Cyrillic-literal lock).
- `tests/unit/newsletter-topic-enum.test.ts` — assert `CONSENT_KINDS` contains all 4 new values; greppable lock-in.

### Fire-and-Forget External Sync (Brevo opt-in)

**Source:** `src/app/api/attr/init/route.ts` (line 33-35 of test [VERIFIED:tests/integration/attr-init-route.test.ts:32-35]):
```typescript
expect(src).toMatch(/void addAttributionJob\(/);
expect(src).toMatch(/\.catch\(\(\) =>/);
```

**Apply to:** Brevo opt-in sync at registration, Brevo preferences sync on `save-preferences`. The unsubscribe-route Brevo sync is NOT fire-and-forget per D-14 (must `await` for same-session promise).

### React Email Worker `loadT` Pattern

**Source:** `src/lib/email/worker.tsx:30-46` [VERIFIED] + `src/app/(payload)/admin/views/attribution/AttributionView.tsx:4-21` [VERIFIED]

The worker is **outside Next.js request scope** so `getTranslations()` from `next-intl/server` is unreliable. Direct-import of `messages/bg.json` + custom `loadT` namespace walker is the established pattern.

```typescript
import bg from '../../../messages/bg.json';

function loadT(namespace: string): EmailT {
  const dict = namespace.split('.').reduce<Record<string, unknown>>(
    (node, key) => (node?.[key] as Record<string, unknown>) ?? {},
    bg as Record<string, unknown>,
  );
  return (key, vars) => { /* ... ICU placeholder replacement ... */ };
}
```

**Apply to:** `src/lib/newsletter/preview.ts` Server Action (mirrors the pattern; Server Actions can use `getTranslations` BUT for visual consistency with worker output, both paths should produce identical strings — re-use the worker's `loadT` factory). Same applies to any custom Payload admin RSC view that touches email-namespace messages.

### Node-Runtime Declaration on API Routes

**Source:** `src/app/api/admin-bootstrap/route.ts:17` [VERIFIED] — `export const runtime = 'nodejs';`

Test lock-in pattern: `tests/integration/attr-init-route.test.ts:7-9` [VERIFIED]:
```typescript
it('declares Node runtime (Pitfall 3 — Edge cannot import IORedis)', () => {
  expect(src).toMatch(/export const runtime\s*=\s*'nodejs'/);
});
```

**Apply to:** `src/app/api/unsubscribe/route.ts` — REQUIRED because the route imports `addEmailJob` (which imports IORedis) for the unsubscribe-brevo-retry fallback.

---

## No Analog Found

| File | Role | Data Flow | Reason | Fallback |
|------|------|-----------|--------|----------|
| `src/lib/newsletter/lexical-to-html.ts` | utility (AST transform) | transform | Codebase has no Lexical-rendering code (Phase 02.1 admin views render aggregates, not Lexical content). | Use RESEARCH §Pattern 5 verbatim — `convertLexicalToHTML` from `@payloadcms/richtext-lexical/html` with custom `upload` converter for image width/height attrs (RESEARCH §Pitfall 1). |

---

## Key Patterns Summary (Quick Reference)

The following patterns recur across multiple Phase 5 surfaces. Planner: build plans around these axes.

| Pattern | Established by | Phase 5 applications |
|---------|----------------|----------------------|
| **BullMQ producer triple-guard test bypass** | `src/lib/email/queue.ts:60-77` | All `addEmailJob` extensions |
| **BullMQ worker switch + `loadT` direct-bg-import** | `src/lib/email/worker.tsx:30-84` | Newsletter worker handlers |
| **Append-only consents batch INSERT** | `src/app/actions/register.ts:117-137` | register modification, save-preferences, unsubscribe route |
| **`assertEditorOrAdmin()` defense-in-depth** | `src/app/(payload)/admin/views/attribution/actions.ts:33-41` | All admin Server Actions + worker writes to Payload docs |
| **Fire-and-forget external API sync** | tested in `tests/integration/attr-init-route.test.ts:32-35` | Brevo opt-in sync at registration, save-preferences |
| **Same-session-await + retry-queue fallback** | RESEARCH §Pitfall 4 (no analog yet — Phase 5 introduces) | Unsubscribe route Brevo blocklist sync |
| **HMAC-signed stateless token (no JWT)** | `src/lib/auth-utils.ts` (existing OTP HMAC) | `src/lib/unsubscribe/hmac.ts` |
| **Node-runtime API route + Drizzle insert** | `src/app/api/cookie-consent/route.ts:1-67` | `/api/unsubscribe/route.ts` |
| **Payload custom view + importMap explicit registration** | `src/app/(payload)/admin/importMap.js` + `src/payload.config.ts:17-26` | Newsletter composer custom preview component |
| **Pino REDACT extension** | `src/lib/logger.ts:3-12` | Add `'to'` / `'recipient_email'` (D-24) |
| **next-intl namespace tone-lock + greppable enum** | `tests/unit/attribution-i18n.test.ts` | All 5 new bg.json namespaces |
| **`(frontend)/member/` layout-managed auth** | `src/app/(frontend)/member/layout.tsx:4-12` | `preferences/page.tsx` (no per-page `auth()` call) |
| **Public preview-vs-redeem RSC** | NEW (combine `agenda/page.tsx` static shape + `member/layout.tsx` `auth()` branch) | `/community/page.tsx`, footer channel links |
| **React Email template w/ Sinya tokens inline** | `src/lib/email/templates/WelcomeEmail.tsx:17-30` | `NewsletterEmail.tsx` (extend with `<Preview>`, charset meta, topic chip, content slot) |
| **Drizzle `as const` schema-extension** | `src/db/schema/consents.ts:4-9` | `CONSENT_KINDS` 4-value extension |

---

## Metadata

**Analog search scope:** `src/collections/`, `src/lib/email/`, `src/lib/attribution/`, `src/db/schema/`, `src/app/api/`, `src/app/actions/`, `src/app/(frontend)/`, `src/app/(payload)/admin/`, `src/components/layout/`, `src/components/member/`, `tests/unit/`, `tests/integration/`.

**Files scanned:** 23 source files + 4 test files + 1 i18n catalogue.

**Pattern extraction date:** 2026-05-04.

**Verification:** Every `[VERIFIED:path]` excerpt is bytes from the working tree as of the extraction date. Line numbers cited are stable for these revisions.

**Read-only constraint honored:** No source files modified. PATTERNS.md is the only file written.
