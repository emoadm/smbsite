# Stack Research

**Domain:** Civic-tech / political advocacy platform (Bulgarian SMB sector)
**Researched:** 2026-04-29
**Confidence:** MEDIUM-HIGH overall (verified against official docs and multiple independent sources; a few areas flagged LOW)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.x (current stable) | Full-stack React framework — SSR, API routes, Server Actions | Largest ecosystem, Turbopack build speed, App Router gives co-located server logic, native support in every EU hosting option. Payload CMS 3.x requires Next.js 15+. |
| TypeScript | 5.x | Type safety across frontend and backend | Non-negotiable for a team maintaining auth, GDPR flows, and voting integrity over time. |
| PostgreSQL | 16.x | Primary relational database | ACID transactions for voting integrity (one vote per account per idea), mature full-text search for Bulgarian, JSON columns for flexible metadata, wide EU-hosted managed options. |
| Drizzle ORM | 0.45.x (stable) / 1.0.0-beta.2 (beta) | TypeScript-native SQL ORM | Edge-runtime compatible (no Rust binary), smallest bundle, SQL-like query API reduces abstraction leakage, instant type inference without a generate step. Fast cold-starts matter on serverless EU hosting. |
| Payload CMS | 3.84.x (current stable) | Headless CMS + editorial admin panel | Installs directly into the Next.js `/app` folder — no separate service. Native PostgreSQL support (stable in v3). Editors get a full admin UI. Zero SaaS dependency means all data stays on your EU infra. Code-first TypeScript config is version-controlled. |
| Auth.js (NextAuth) | v5 beta (5.0.0-beta.25+) | Authentication — email magic link / OTP, session management | Tight Next.js App Router integration, Drizzle adapter available, supports email OTP (6-digit code) as drop-in over magic links. Session stored in PostgreSQL. |
| Tailwind CSS | 4.x | Utility-first CSS | Full Tailwind v4 support shipped in shadcn/ui Feb 2025. 5x faster builds with Oxide engine. CSS-first config (no tailwind.config.js needed). |
| shadcn/ui | latest (all components updated for Tailwind v4 + React 19) | Accessible, copy-paste component library | Components are owned — no npm dependency, no vendor lock-in, fully customisable for Bulgarian branding/colour tokens. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-intl | 3.x | Bulgarian-only i18n (translation strings, locale routing) | All user-facing copy, error messages, email subjects, meta tags. Even with a single locale, next-intl gives structured message files and type-safe `t()` calls, which prevents hardcoded Bulgarian strings scattered across components. |
| zod | 3.x | Schema validation | All form inputs and Server Action payloads. Pair with `zod-i18n-map` to surface Bulgarian error messages. |
| React Hook Form | 7.x | Form state management | Registration, proposal submission, problem report, voting forms. Works with zod resolver. |
| @hookform/resolvers | 3.x | Zod bridge for React Hook Form | Required for RHF + Zod integration. |
| Cloudflare Turnstile | — (JS snippet) | Anti-bot / CAPTCHA for registration and voting | Invisible by default (no friction), GDPR-friendly (no personal data stored, no cookies required), free. Integrates with Next.js Server Actions via server-side verification. |
| Upstash Redis (@upstash/ratelimit) | latest | Rate-limiting for API routes and Server Actions | Serverless-native (HTTP, no persistent connection). Use for registration endpoint, voting endpoint, proposal submission. EU region available. |
| @upstash/redis | latest | Redis client for Upstash | Companion to ratelimit. |
| ipapi.co (or ipinfo.io) | REST API | IP geolocation (region/oblast) for QR scan attribution | Server-side only — never expose to client. Map IP → Bulgarian oblast for printed-letter campaign attribution. ipapi.co free tier = 30,000 requests/month; ipinfo.io = unlimited free country lookups. |
| Plausible Analytics | Cloud or self-hosted | Privacy-first, cookie-free web analytics | No cookie consent required (no cookies, no PII). Captures UTM params, referrer. EU-incorporated and EU-hosted. Script is 1 KB. No GDPR consent banner needed for analytics. |
| CookieYes | Free tier (up to 5k pageviews) / $10/month | Cookie consent banner | Required for Plausible embed scripts from third parties (if any) and for WhatsApp pixel / Meta Pixel if added later. Official Next.js integration docs. GDPR + CCPA. |
| Bunny.net (Bunny Stream + Bunny Storage) | CDN / storage | Video hosting, image CDN, file storage | Slovenian company = EU-headquartered = GDPR compliant by default with DPA available. EU-only CDN routing filter available. Video transcoding via Bunny Stream. Cost-effective (~$0.01/GB storage, ~$0.005/GB bandwidth EU). Next-intl-upload or direct REST API for uploads from Next.js. |
| Brevo (Sendinblue) | REST API v3 | Transactional email (confirmations, password reset) + newsletter / bulk campaigns | French company, EU data residency, DPA available, GDPR-first design, one API covers both transactional and newsletter. Built-in double opt-in, unsubscribe management, suppression lists. Generous free tier (300 emails/day). Avoids running two separate email services. |
| Resend | latest SDK | Alternative transactional-only email | US-based but DPA + EU-US Data Privacy Framework certified. Modern developer DX, tight Next.js / React Email integration. Use if Brevo transactional performance disappoints. |
| React Email | 3.x | Reusable email component templates | TypeScript React components rendered to HTML email. Works with both Brevo and Resend. Bulgarian text fully supported. |

### Infrastructure & Hosting

| Component | Recommendation | Why |
|-----------|---------------|-----|
| Application hosting | **Fly.io** (Frankfurt `fra` region, primary) | Docker-native, EU region with true data locality, no US CLOUD Act exposure for app traffic, pay-as-you-go (~$5–15/month for Next.js container), GitHub Actions CI/CD, managed Postgres MPG available. No cold starts for the app. |
| Alternative app hosting | **Hetzner + Coolify** (CX32, Helsinki or Falkenstein) | Cheapest EU hosting (~€7/month for server). Full sovereignty. **Warning:** Coolify disclosed 11 critical CVEs in Jan 2026 (CVSS 10.0 command injection). All patched in v4.0.0-beta.451+. Keep Coolify updated. Added ops burden vs Fly.io. Viable for budget-constrained teams comfortable with ops. |
| Database hosting | **Neon Serverless Postgres** (Frankfurt `aws-eu-central-1` region) | Serverless branching for staging/dev, scale-to-zero saves cost, SOC 2 Type 2 on Scale plan, Azure Germany West Central (Frankfurt) added May 2025. Pairs well with Drizzle. Free tier generous for early stage. |
| Alternative database | **Supabase** (eu-central-1 Frankfurt) | Adds Auth, Storage, and Realtime as bonus — but if using Payload CMS + Auth.js, those overlap. GDPR via DPA + SCCs. US-headquartered (CLOUD Act caveat) but EU data region available. |
| CDN / Media | **Bunny.net** | EU-headquartered (Slovenia), EU-only routing, DPA, competitive pricing. Handles video (Bunny Stream) + image CDN + file storage in one vendor. |
| Redis / rate limiting | **Upstash Redis** (EU-West region) | Serverless HTTP Redis. No persistent TCP connection needed. Free tier: 10,000 commands/day. Used for rate limiting only (registration, voting). |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm | Package manager | Faster installs, strict hoisting, disk-efficient. Use `pnpm` workspace if Payload CMS and app coexist in monorepo. |
| Drizzle Kit | Database migrations CLI | `drizzle-kit generate` + `drizzle-kit migrate`. Migrations as SQL files, version-controlled. |
| Prettier + ESLint | Code formatting and linting | Standard Next.js ESLint config + `prettier-plugin-tailwindcss` for class ordering. |
| Playwright | E2E testing | Test registration, voting, GDPR deletion flows end-to-end. |

---

## WhatsApp Integration — Reality Check

This is the highest-uncertainty component of the stack. Read this section carefully before committing to a timeline.

### Option A — WhatsApp Channels (Broadcast-only, FREE) — RECOMMENDED for v1

WhatsApp Channels is a free one-way broadcast tool built into WhatsApp. The channel admin posts content; subscribers receive it in their "Updates" tab. No API needed, no Meta Business Verification, no template approval process.

**Limitations:** No two-way messaging. No automation. No CRM. Subscribers opt-in manually. You cannot import a subscriber list — members must find and follow the channel themselves. You cannot send to a list you own; members follow the channel voluntarily.

**GDPR:** Handled by Meta/WhatsApp. You are not a controller of subscriber data because you never hold it.

**Workflow:** Create the WhatsApp Channel at https://www.whatsapp.com/channel/create. Share the channel link from the platform (email, landing page). Post updates manually or via the WhatsApp app. This is sufficient for broadcast-style "newsletter" updates for v1.

### Option B — WhatsApp Business API via BSP (Two-way, PAID) — v2+

If you need to send templated messages to a list you own (e.g., to all registered members), or automate responses, you need the WhatsApp Business API via a Business Solution Provider (BSP).

**Approval process:** Requires Meta Business Verification (submit business documents, typically 1–3 weeks). Requires phone number registration (cannot use a number already in WhatsApp Business App). Template messages must be pre-approved by Meta (1–24 hours each).

**Cost (as of July 2025 pricing change):** Per-template message billing. Marketing templates for EU recipients: approximately €0.11–0.22 per message. At 10,000 members, sending one update = €1,100–2,200 per blast. Utility/authentication templates are ~90% cheaper.

**Recommended BSP (if pursuing this route):** 360dialog — EU-based operation, lowest markup (zero message surcharge over Meta rates, €49/month subscription), provides raw Cloud API access compatible with standard Meta docs. Twilio is also viable but charges per-message markup on top of Meta rates.

**Timeline risk:** Meta Business Verification can block launch for weeks. Do not put WhatsApp Business API on the critical path for v1.

### Option C — Telegram Channel (fallback) — LOW adoption risk

Telegram channels support broadcast-only, free, with an open API (no approval process, bot automation, analytics). Telegram has active political channels in Bulgaria (politics is a top category per telemetr.io). However, WhatsApp is the dominant mobile messaging app in Bulgaria (70%+ penetration vs Telegram's ~15–20%), so Telegram reaches a different, smaller audience.

**Recommendation:** Launch with WhatsApp Channels (Option A) for broadcast. Plan WhatsApp Business API (Option B via 360dialog) for Phase 2 once Meta Business Verification is complete. Telegram as an opt-in additional channel if the audience shows interest.

---

## Email Deliverability — Bulgarian Recipients

Bulgarian recipients use Gmail, Abv.bg (Bulgaria's dominant local webmail), Yahoo Mail, and corporate Outlook. Abv.bg has stricter spam filters than Gmail.

**Required sender domain authentication:**
1. SPF record: add Brevo's sending servers to your domain's SPF TXT record.
2. DKIM: enable and verify DKIM in Brevo dashboard for your sending domain.
3. DMARC: set `p=quarantine` initially, then `p=reject` after 2–4 weeks of monitoring. Gmail bulk sender requirements mandate DMARC since Feb 2024; Outlook since May 2025.
4. Custom sending domain: never send from `@brevo.com` shared domain. Set up `mail.yourdomain.bg` or `no-reply@yourdomain.bg`.

**Abv.bg specifics:** Abv.bg (Mail.bg) is operated by ICN.BG. Their spam filters respond to domain reputation and authentication. New domains need a warm-up period (start with 50–100 emails/day, ramp over 2–4 weeks). Avoid trigger words common in political spam. Plain-text version of every HTML email is mandatory.

**Double opt-in:** Brevo natively supports double opt-in for newsletter subscribers. This is legally required under GDPR for marketing emails and also improves list quality (no fake registrations inflate counts).

**Unsubscribe:** Brevo inserts RFC 2369 `List-Unsubscribe` headers automatically. One-click unsubscribe link must be in every email per CAN-SPAM / GDPR. Brevo handles suppression lists.

---

## GDPR Component Map

| GDPR Requirement | How It's Met |
|-----------------|-------------|
| Cookie consent banner | CookieYes (free tier covers launch traffic) |
| Cookie-free analytics | Plausible (no cookies, no consent required for analytics itself) |
| Email unsubscribe / suppression | Brevo (automatic List-Unsubscribe + suppression list) |
| WhatsApp unsubscribe | WhatsApp Channels: subscribers opt-out by unfollowing |
| Right to erasure (account deletion) | Custom Next.js Server Action: wipe `users` table row + cascade delete votes, proposals, reports; remove from Brevo contact list via API |
| Data minimisation | Collect: name, email, registration source, votes, proposals only. No phone number unless explicitly added later. |
| Privacy policy page | Static Next.js page in Bulgarian |
| DPA with processors | Brevo DPA (in General Conditions), Bunny.net DPA (in dashboard), Neon DPA (Scale plan), Upstash DPA (available on request), CookieYes self-managed |
| IP geolocation (attribution) | Server-side only, not stored against user identity (stored as campaign-level aggregate: `oblast → scan count`). Minimizes PII risk. |
| UTM / referrer capture | Captured on first page load, stored in session, then written to `registration_source` field on signup. Not re-tracked. |

---

## Installation

```bash
# Bootstrap Payload CMS + Next.js 15 project
npx create-payload-app@latest

# Core dependencies
pnpm add drizzle-orm @auth/drizzle-adapter next-auth@beta \
  next-intl zod react-hook-form @hookform/resolvers \
  @upstash/redis @upstash/ratelimit

# Email
pnpm add @react-email/components resend brevo-javascript

# Dev dependencies
pnpm add -D drizzle-kit typescript @types/node \
  prettier prettier-plugin-tailwindcss eslint \
  eslint-config-next @playwright/test
```

Note: Payload CMS installs itself into the Next.js app folder via `create-payload-app`. Do not install `payload` separately into an existing Next.js project — use the scaffold, then migrate your pages into it.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Drizzle ORM | Prisma 7 | Prisma 7 (released late 2025) dropped the Rust binary — now pure TypeScript, edge-compatible. Choose Prisma if team is more comfortable with schema-first workflows and wants automated migration management. DX is slightly more guided. |
| Payload CMS | Directus | Directus wraps any existing DB schema — useful if you already have a DB structure. Less tightly integrated with Next.js (separate service). Payload is better for greenfield because admin panel and app share one process. |
| Payload CMS | Sanity | Sanity is SaaS with US data residency (no EU-only option). Avoid for this project due to GDPR data residency concerns. |
| Brevo (combined) | Postmark (transactional) + Brevo (newsletter) | If transactional deliverability is critical (e.g., magic links are bouncing), Postmark has best-in-class transactional inbox placement. Postmark stores data in US with SCCs. Split-vendor adds complexity. |
| Fly.io | Railway | Railway has a simpler DX (web-based, no CLI required). EU region available. Slightly pricier at scale. Less mature for persistent containers than Fly.io. Good fallback if team finds Fly.io CLI friction too high. |
| Neon | Supabase Postgres | Supabase bundles Auth + Storage + Realtime. Since we're using Auth.js + Payload CMS + Bunny.net, those extras overlap. Neon is leaner. Either works for EU data residency when using Frankfurt region. |
| Plausible | Umami (self-hosted) | Umami is fully self-hosted (runs on your Hetzner/Fly.io infra), zero data leaving your servers. More ops overhead. Plausible Cloud is simpler and already EU-hosted. |
| CookieYes | Cookiebot | Cookiebot doubled pricing in Aug 2025 to ~€30/domain/month. CookieYes free tier is sufficient for launch. Both are GDPR-compliant CMPs. |
| Bunny.net | Cloudinary | Cloudinary free tier limited; paid starts at $89/month. More powerful transformations (AI, 3D). Choose Cloudinary if editorial team needs heavy image manipulation (cropping, face detection). Bunny.net is sufficient for video hosting + basic image CDN. |
| Cloudflare Turnstile | hCaptcha | hCaptcha requires cookies (GDPR consent needed before challenge). Turnstile is invisible and cookieless. Prefer Turnstile unless Turnstile pass rate is unacceptably low. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Google Analytics (UA / GA4) | Sends data to Google US servers. EU DPAs have ruled GA4 illegal in several member states (Austria, France, Italy, Finland). Creates consent banner complexity and legal risk for a political platform. | Plausible Analytics |
| Google reCAPTCHA | Data sent to Google for ad fingerprinting. Requires GDPR consent. Performs poorly without third-party cookies. Creates privacy credibility problem for a civic advocacy site. | Cloudflare Turnstile |
| SendGrid | Owned by Twilio (US). Lost free tier in 2024. Deliverability issues with newer domains. No EU data residency. | Brevo or Postmark |
| Mailchimp | US company (Intuit), US data centers. Several EU DPAs have flagged Mailchimp as non-compliant for EU-only data residency needs. No native transactional email — forces two vendors. | Brevo (covers both transactional + newsletter) |
| Vercel (for hosting) | US company. Pro plan required for teams. No true EU data residency (CDN edge is EU but origin compute can be US). CLOUD Act exposure. $20/user/month pricing makes teams expensive. | Fly.io Frankfurt + Neon Frankfurt |
| Sanity CMS | SaaS with no EU-data-residency option. Dataset stored in US. GDPR compliance depends on SCCs with a US entity. | Payload CMS (self-hosted in EU) |
| Supabase Auth (instead of Auth.js) | If already using Payload CMS + Auth.js, adding Supabase Auth creates a third auth system. Supabase Auth is excellent on its own but redundant in this stack. | Auth.js v5 with Drizzle adapter |
| Firebase / Firestore | Google US infra. No EU data residency. Not suited for relational voting/proposal schema. | Neon PostgreSQL |
| MongoDB Atlas | NoSQL mismatch for relational voting integrity. Atlas free tier removed EU region. Payload CMS v3 supports PostgreSQL (stable); MongoDB adapter still available but PostgreSQL is the recommended path. | PostgreSQL via Neon |
| WhatsApp Business App (standard) | Hard limit of 256 broadcast contacts. No API. Cannot automate. Suitable only for personal use. | WhatsApp Channels (free) or Business API via BSP |

---

## Stack Patterns by Variant

**If hosting budget is very tight (<€15/month total):**
- Use Hetzner CX32 (€7/month) + Coolify (patched to latest) for app + PostgreSQL + Redis
- Replace Neon with self-hosted Postgres on same Hetzner box
- Replace Upstash with Redis container on Hetzner
- Replace Plausible Cloud with Umami (self-hosted on same box)
- Risk: single point of failure, more ops overhead, Coolify CVEs require vigilance

**If editorial team is non-technical:**
- Ensure Payload CMS admin UI is the only content editing interface
- Configure Payload CMS access control so editors can only touch "Posts" and "Ideas" collections
- Do not expose Drizzle Studio or direct DB access to editors

**If WhatsApp Business API approval succeeds before launch:**
- Use 360dialog as BSP (€49/month, zero message markup)
- Build a Server Action that calls 360dialog's Cloud API to send utility-category templates to opted-in subscribers
- Store `whatsapp_opt_in: boolean` and `whatsapp_phone` in users table
- Template category: "Utility" (not "Marketing") keeps per-message cost at ~€0.01–0.03/recipient

**If voting integrity becomes a political flashpoint:**
- Add phone number verification (SMS OTP) at registration time
- Use Twilio Verify or Telnyx (EU operations) for SMS OTPs
- Store `phone_verified: boolean` in users table; gate voting on `phone_verified = true`
- This is explicitly deferred to v2 per PROJECT.md but the schema should accommodate it

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Payload 3.84.x | Next.js 15.x required | Payload 3.x will NOT install on Next.js 14.x or below |
| Auth.js v5 beta | Next.js 14+ App Router | v5 is the correct version for App Router; v4 is Pages Router only |
| Drizzle ORM 0.45.x | @auth/drizzle-adapter latest | Use `@auth/drizzle-adapter` not the deprecated `next-auth/adapters` path |
| Tailwind CSS 4.x | shadcn/ui Feb 2025+ | All shadcn/ui components updated for Tailwind v4 + React 19 in Feb 2025 changelog |
| next-intl 3.x | Next.js 15 App Router | Stable. `bg` locale works with standard CLDR locale codes |

---

## Confidence Levels

| Area | Confidence | Notes |
|------|------------|-------|
| Next.js 15 + Payload CMS 3 integration | HIGH | Official Payload docs confirm Next.js 15 requirement; verified via multiple sources |
| Drizzle ORM version (0.45.x stable, 1.0 beta) | HIGH | Verified against npm and official Drizzle docs |
| Payload CMS version (3.84.x) | HIGH | Verified via npm; 3.84.1 published ~6 days ago as of research date |
| Auth.js v5 stability | MEDIUM | Officially in beta; community consensus is "stable enough for production" but breaking changes possible before final release |
| Brevo EU data residency | HIGH | Verified against Brevo official GDPR page and DPA documentation |
| Postmark EU data center | LOW-verified: NO EU DC | Postmark explicitly states servers are in US, SCCs only. This is why Brevo is preferred primary. |
| Resend EU data residency | MEDIUM | US-based but EU-US Data Privacy Framework certified + DPA with SCCs. Acceptable under current EU law but less clean than French-company Brevo. |
| Bunny.net GDPR posture | HIGH | Slovenian company (EU-incorporated), GDPR page, DPA, EU-only routing filter all verified |
| Neon Frankfurt EU region | HIGH | Frankfurt AWS region confirmed in May 2025 Neon changelog |
| Fly.io Frankfurt GDPR | MEDIUM | EU region confirmed; US company (CLOUD Act caveat acknowledged); community discusses this; suitable for most SME use cases |
| WhatsApp Business API cost/approval timeline | LOW | Meta policies change frequently; approval timeline is anecdotal 1–3 weeks but can stretch. Cost estimates based on July 2025 pricing model which may change again. |
| WhatsApp Channels broadcast | HIGH | Free, no approval needed, verified on Meta's product pages |
| Plausible cookie-free GDPR | HIGH | Confirmed by multiple independent analyses; Plausible's own legal documentation |
| IP geolocation for QR attribution (server-side only) | MEDIUM | ipapi.co and ipinfo.io verified for free tiers; GDPR risk is low if IP is not stored against user identity |
| Abv.bg deliverability specifics | LOW | No authoritative technical documentation found; based on community knowledge of Bulgarian email landscape |

---

## Sources

- [Payload CMS 3.0 — official launch post](https://payloadcms.com/posts/blog/payload-30-the-first-cms-that-installs-directly-into-any-nextjs-app)
- [Payload CMS PostgreSQL docs](https://payloadcms.com/docs/database/postgres)
- [Payload npm (v3.84.1 confirmed)](https://www.npmjs.com/package/payload)
- [Auth.js v5 migration guide](https://authjs.dev/getting-started/migrating-to-v5)
- [Drizzle vs Prisma 2026 — makerkit.dev](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma)
- [Drizzle ORM npm (0.45.2 confirmed)](https://www.npmjs.com/package/drizzle-orm)
- [Tailwind v4 + shadcn/ui changelog](https://ui.shadcn.com/docs/changelog/2025-02-tailwind-v4)
- [next-intl App Router docs](https://next-intl.dev/docs/getting-started/app-router)
- [Brevo GDPR compliance](https://www.brevo.com/company/gdpr/)
- [Brevo DPA](https://help.brevo.com/hc/en-us/articles/15403782599570)
- [Postmark EU privacy](https://postmarkapp.com/eu-privacy) — confirmed NO EU datacenter
- [Resend GDPR journey](https://resend.com/blog/gdpr)
- [Bunny.net GDPR](https://bunny.net/gdpr/)
- [Bunny.net EU-only routing](https://bunny.net/blog/introducing-routing-filters-gdpr-friendly-eu-only-cdn-routing/)
- [Neon Frankfurt region (May 2025 changelog)](https://neon.com/docs/changelog/2025-05-09)
- [Supabase GDPR discussion](https://github.com/orgs/supabase/discussions/2341)
- [Fly.io GDPR community thread](https://community.fly.io/t/gdpr-compliant-when-hosting-applications-to-european-users/18056)
- [Hetzner + Coolify Next.js guide](https://jb.desishub.com/blog/deploy-nextjs-using-coolify-and-hezner)
- [Coolify critical CVEs Jan 2026](https://thehackernews.com/2026/01/coolify-discloses-11-critical-flaws.html)
- [Plausible vs Matomo comparison](https://plausible.io/vs-matomo)
- [CookieYes vs Cookiebot](https://www.cookieyes.com/blog/cookieyes-vs-cookiebot/)
- [Cloudflare Turnstile vs hCaptcha](https://passwordprotectedwp.com/hcaptcha-vs-cloudflare-turnstile/)
- [Upstash rate limiting docs](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- [WhatsApp Business Platform pricing](https://business.whatsapp.com/products/platform-pricing)
- [WhatsApp API pricing July 2025 changes](https://gallabox.com/whatsapp-business-pricing-July-2025-update)
- [360dialog vs Twilio comparison](https://www.kommunicate.io/blog/twilio-vs-360dialog-a-comparison/)
- [EU email marketing — Brevo vs Mailchimp](https://eupick.com/blog/eu-email-marketing-comparison/)
- [DMARC/SPF/DKIM 2026 requirements](https://www.duocircle.com/email-security/dmarc-spf-dkim-2026-email-authentication-regulatory-requirement-best-practice)

---

*Stack research for: SMBsite — civic-tech political advocacy platform (Bulgaria, EU-hosted, GDPR)*
*Researched: 2026-04-29*
