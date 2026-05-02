# Phase 2: Public Surface (Pre-Warmup) - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a branded, explanatory public surface that converts QR/warmup visitors into registered members BEFORE the email warmup ladder begins. Scope:

1. **Public landing page at `/`** — replaces the current "redirect to /register" behavior; explains the coalition's mission, the platform's purpose, and gives a clear "join the community" CTA
2. **Two supporting pages** — `/agenda` (coalition-authored political program), `/faq` (operational "what members do" Q&A)
3. **Sinya brand identity applied** — color palette + Gilroy headline font + official high-res logo from coalition; tokens land in `globals.css`
4. **Real `/member` welcome page** — replaces the placeholder; gives newly-registered members confirmation, an honest "what comes next" timeline, and links back to landing content
5. **Auth pages light-rebrand** — `/login`, `/register`, `/auth/otp` adopt the new color tokens + Gilroy headline (no microcopy / form-structure changes)
6. **Cookie consent banner live** — CookieYes, granular categories
7. **Legal pages remain as Phase 1 drafts** — lawyer-final text deferred (see `<deferred>`); warmup launch becomes gated on legal sign-off

**Explicitly NOT in this phase:**
- UTM/QR/oblast attribution capture (Phase 2.1)
- Source attribution dashboard (Phase 2.1)
- "Where did you hear about us" registration field (Phase 2.1)
- Final lawyer-reviewed legal text (deferred — coalition external dependency)
- Real video content in hero (scaffolded only — content delivered later)
- Idea catalog / voting (Phase 3)
- Member account self-service / preferences / GDPR export (Phase 6)
- Newsletter / channel notifications (Phase 5; channels themselves are coalition-side parallel work)

</domain>

<decisions>
## Implementation Decisions

### Page Structure & Content

- **D-01:** Landing-page architecture is **hybrid** — single long scrollable `/` (hero → problem → vision → CTA → FAQ-teaser → footer) plus two real pages: `/agenda` (deeper political program) and `/faq` (operational questions). PUB-03's "navigation between agitation pages" is satisfied by the three real URLs; most content lives on `/`.
- **D-02:** Content authorship is **hybrid**. **Claude drafts**: FAQ Q&A in formal-respectful Bulgarian, all scaffolding/microcopy (form labels, error states, navigation, footer), `/member` welcome timeline copy, cookie consent banner copy. **Coalition writes**: hero headline + sub-headline, the entire `/agenda` page (political program, vision, coalition specifics). Plan must include a `[ТЕКСТ ОТ КОАЛИЦИЯ]` placeholder mechanism so coalition copy can drop in via content prop without code changes.
- **D-03:** Hero ships with a **strong still image** (sourced from coalition photo or stock-of-Bulgaria + logo overlay). A `<VideoPlayer>` slot exists in the hero layout but renders only when a `videoUrl` content prop is set. Coalition can drop in a Bunny Stream URL later via single config change. PUB-01's "video" requirement is satisfied structurally; literal video content is post-launch.
- **D-04:** **FAQ scope is operational only** — "what members actually do" questions ("Какво се случва след регистрация?", "Как се гласува?", "Колко често ще ме търсите?"). Privacy/data questions live on `/legal/privacy`; trust/legitimacy/political-program questions live on `/agenda`. FAQ stays focused and short (5-8 Q&As).

### Branding & Visual Identity

- **D-05:** Coalition logo asset = **high-res official SVG provided by coalition**. This is a BLOCKING dependency for plan-phase execution. Track as `D-CoalitionLogoSVG` in deferred items. No fallback path — Phase 2 cannot ship without the real logo.
- **D-06:** Color palette extraction = **WebFetch sinyabulgaria.bg → propose Tailwind v4 tokens → user redlines**. Claude inspects the live site's CSS / computed styles, extracts the dominant brand hexes (primary blue, accent yellow, neutrals), proposes `--color-primary`, `--color-accent`, etc. as tokens in `globals.css`. User redlines any value where canonical brand guidelines differ before merge.
- **D-07:** Typography = **Gilroy ExtraBold (free distribution) for headlines + Roboto for body**. Free Gilroy has only 2 weights (Light 300, ExtraBold 800); ExtraBold is used for hero headlines, page titles (h1/h2), and the agenda. Light is reserved for very-large display text only (e.g. hero numerals, metric callouts). Body, FAQ, microcopy, and form labels stay on Roboto. `.woff2` files self-hosted in `public/fonts/` with `@font-face` in `globals.css`. Canonical free distribution source: fontesk.com or equivalent (need to confirm in plan-phase).
- **D-08:** **No pixel-imitation of sinyabulgaria.bg** (carried forward from Phase 1 D-26). Use the palette + logo + Gilroy as visual anchors but design the layout / spacing / interactions as a modern web landing page. Coalition identity continuity matters; layout fidelity does not.

### `/member` Welcome Page

- **D-09:** Page contents in v1 = **registration-confirmed banner + "Какво следва" timeline + links to `/agenda` and `/faq`**. The banner uses the user's `full_name` from the session ("Регистрацията ви е потвърдена. Добре дошли, [name]."). Timeline copy is bulleted/visual: (1) седмично обновление на имейла, (2) отварят се общностните канали, (3) първи граждански инициативи за гласуване. The timeline must explicitly state when in absolute terms each step happens — Phase 2 plan should pull these from coalition input or use placeholder dates.
- **D-10:** **Channels (WhatsApp Channel + Telegram) are NOT yet created**. Page ships with "Каналите ни в WhatsApp и Telegram стартират скоро. Ще получиш линкове по имейл, щом са готови." Tracked as a coalition-side parallel task; once URLs exist, swap in via a quick task. This is captured as a deferred item.
- **D-11:** **Member account self-service deferred to Phase 6** — no profile editing, no email-preference toggle, no "delete my account" link. v1 `/member` is read-only welcome content.

### Auth Pages Rebrand

- **D-12:** All 3 auth pages (`/login`, `/register`, `/auth/otp`) get a **light rebrand** — color tokens + Gilroy headline application only. No new microcopy ("why we need your name + email"), no form-structure redesign, no new component variants. Effectively a "free upgrade" once design tokens land in `globals.css` since the existing shadcn-default form components inherit the new palette automatically.
- **D-13:** **Auth-pages full editorial polish (microcopy, supportive copy, branded form variants) is deferred** — not Phase 2 scope. Revisit if conversion data shows form abandonment after warmup data exists.

### Legal Pages

- **D-14:** Phase 2 ships `/legal/privacy` and `/legal/terms` as **Phase 1 drafts** (with the existing "проект, последна редакция [date]" Alert banner kept). Coalition has NOT started lawyer review yet.
- **D-15:** **Warmup launch becomes gated on lawyer-review completion**. This adds a hard external dependency on top of the existing Phase 1 sign-off gates (Postmaster Tools, warmup ladder, restore dry-run). Captured in `<deferred>` and must be reflected in `STATE.md` deferred items table.

### Cookie Consent

- **D-16:** **CookieYes integration scope** = standard banner from CookieYes hosted script (already provisioned via `NEXT_PUBLIC_COOKIEYES_SITE_KEY`). Granular categories per GDPR-01: necessary / analytics / marketing. Banner triggers on first visit and blocks no interaction (does not gate access to landing content). Final visual styling decision (footer-attached vs floating modal vs gradient-fade) is **Claude's discretion** based on what looks best with Sinya tokens.

### Localization

- **D-17:** Carried from Phase 1 D-27: **Bulgarian-only via `next-intl`**. ALL new strings — landing copy, agenda copy, FAQ Q&A, `/member` content, hero CTA, footer, cookie banner microcopy — go through `messages/bg.json`. Zero hardcoded Cyrillic in components. Tone = formal-respectful, contemporary, never vocative (D-26 Phase 1).

### Performance & Caching

- **D-18:** PUB-02 success criterion (Slow 4G < 2s, CDN-cached) requires the landing page to be a **Server Component with static generation** where possible — no per-request server work, no DB queries on the public path. Cloudflare CDN caching headers must be set so the public surface is fully edge-cached. Anonymous visitors should never trigger origin compute on `/`, `/agenda`, `/faq`. Authenticated users continue to see the same pages but with header session indicator.

### Claude's Discretion

The following details are not user-decided and Claude has implementation flexibility:

- **Cookie banner visual treatment** — footer-attached / floating / gradient — pick what looks best with the new Sinya tokens
- **Landing page section order beyond the locked sequence** (hero → problem → vision → CTA → FAQ-teaser) — exact micro-ordering and section dividers
- **Spacing / typography scale** — exact pixel ramp for h1/h2/h3, line-heights, paragraph widths — propose during plan-phase
- **`/agenda` and `/faq` layout templates** — propose Card vs flat / sidebar nav vs anchor-only
- **Image treatment in hero** — full-bleed vs contained, overlay opacity, subject crop — propose with the chosen still image
- **Animation / motion** — subtle fade-in on scroll is allowed; nothing distracting; absolutely no autoplay video or spinning carousels (formal-respectful tone)
- **Internal anchor IDs** for the long landing page (`#mission`, `#vision`, `#cta`)
- **OG metadata + Twitter Card setup** for social sharing (use coalition logo as default OG image)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project decisions
- `.planning/PROJECT.md` — Core value statement ("разбира идеята достатъчно..."), constraints (Bulgarian UI, GDPR, branding mandate from sinyabulgaria.bg), key decisions table, WhatsApp/Telegram channel decision
- `.planning/REQUIREMENTS.md` — Authoritative requirements list. Phase 2 covers PUB-01, PUB-02, PUB-03, PUB-04, GDPR-01, GDPR-02, GDPR-03

### Roadmap & state
- `.planning/ROADMAP.md` § "Phase 2: Public Surface (Pre-Warmup)" — Goal, depends-on, success criteria. Plan-phase must verify each of the 4 success criteria
- `.planning/STATE.md` — Current position, blockers, deferred items table (must be updated with D-CoalitionLogoSVG, D-CoalitionChannels, D-LawyerReviewLegal, D-CoalitionContent-Hero+Agenda)

### Phase 1 carry-forward
- `.planning/phases/01-foundation/01-CONTEXT.md` § Decisions — D-26 (branding scope), D-27 (Bulgarian-only via next-intl), D-28 (mobile-first responsive), and the post-decisions notes on color palette extraction and branding fidelity
- `.planning/phases/01-foundation/01-OPS-RUNBOOK.md` — Operator-side warmup checklist that this phase needs to complete before
- `.planning/phases/01-foundation/01-DELIVERABILITY-CHECKLIST.md` § H — Phase 1 sign-off section that gates warmup; legal-review item to be added here

### External brand reference
- `https://www.sinyabulgaria.bg` — Live coalition site. Source of truth for palette extraction (D-06) and visual identity continuity. Plan-phase will WebFetch this to extract computed CSS values.

### Existing code that constrains this phase
- `src/components/layout/Header.tsx` — Already-built header with logo placeholder and session indicator; landing page reuses this directly
- `src/components/layout/MainContainer.tsx` — Existing layout shell with `width="form"` and `width="legal"` variants; needs new `width="landing"` or "marketing" variant
- `src/styles/globals.css` — Tailwind v4 token destination; new Sinya tokens land here
- `src/app/(frontend)/page.tsx` — Currently `redirect()` to /register or /member; this is the file the new landing page replaces
- `src/app/(frontend)/member/page.tsx` — Current placeholder; gets replaced with the welcome content
- `messages/bg.json` — All new strings land here under new top-level keys (`landing.*`, `agenda.*`, `faq.*`, `member.welcome.*`, `cookie.*`)
- `src/app/(frontend)/legal/privacy/page.tsx` and `terms/page.tsx` — Stay as Phase 1 drafts; only change is potential token-driven color updates inherited from `globals.css`

### Tech stack constraints (CLAUDE.md)
- `./CLAUDE.md` — Tailwind v4 + shadcn/ui Feb 2025; Next.js 15 App Router; Bulgarian content via next-intl 3.x; CookieYes for cookie consent; Bunny.net for media (Bunny Stream for video, image CDN for images); Plausible for analytics (already wired)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`Header.tsx`** with logo + session-aware right side — used as-is on landing
- **`MainContainer.tsx`** layout shell — currently has `form` and `legal` width variants; landing/agenda/faq pages need a wider variant (probably `landing` = full-bleed or `marketing` = max-w-7xl)
- **shadcn `Card`, `Button`, `Alert`** — sufficient for FAQ accordion items, CTA buttons, draft-marker on legal pages
- **next-intl `getTranslations`** — already wired throughout; new pages plug in via `getTranslations('landing')`, etc.
- **`Footer` (likely exists in `(frontend)/layout.tsx`)** — verify in plan-phase; if missing, build with required legal links (Privacy / Terms / Контакт)

### Established Patterns
- Server Components for all `(frontend)` routes — auth pages pull session in the same render
- All Cyrillic strings via `next-intl` keys, never hardcoded — strict pattern from Phase 1
- shadcn components are ours (no npm dep); customizing is direct file edits
- Color tokens used as Tailwind `bg-primary`, `text-primary-foreground` — landing page just uses these tokens; new Sinya values backfill into the token definitions, not new utility classes
- Auth pages now use raw `<h1>` (per quick task 260502-vau pattern) — landing/agenda/faq h1s follow same pattern, no shadcn `CardTitle` for page titles

### Integration Points
- **Root `/` route** — currently `redirect(session?.user ? '/member' : '/register')`; replace with the actual landing component. Authenticated users see same landing content (no redirect away) but Header shows logged-in state
- **`/legal/privacy` and `/legal/terms`** — receive new colors via globals.css token update; no other content changes
- **Cookie consent script** — CookieYes integration was scaffolded in Phase 1 with `NEXT_PUBLIC_COOKIEYES_SITE_KEY`; verify in plan-phase that the script tag is loading and configure categories
- **Plausible analytics** — already wired; landing page needs no extra setup; outbound link clicks (channel CTAs) should fire custom events for warmup-funnel measurement

</code_context>

<specifics>
## Specific Ideas

- **Sinya brand reference site**: `https://www.sinyabulgaria.bg` — palette source of truth, logo source of truth (until coalition delivers high-res SVG)
- **Gilroy free distribution**: 2 weights (Light 300 + ExtraBold 800), self-hosted via `@font-face`. Canonical free source TBD in plan-phase (fontesk.com is one option)
- **Tone reference (Phase 1 carry-forward)**: formal-respectful, contemporary, never vocative. Mirror PROJECT.md / REQUIREMENTS.md prose register
- **Coalition members as warmup recipients**: friends, family, party staff, early SMB supporters per Phase 1 D-18. They will arrive via direct invitation links during warmup, NOT via the QR campaign (which is Phase 2.1+ launch). Implication: landing page must work as a "soft launch" surface for known recipients in addition to the eventual cold-traffic surface
- **/agenda content style**: should mirror the depth and seriousness of sinyabulgaria.bg's existing political content. Coalition-authored. Likely 800-2000 words split into thematic sections

</specifics>

<deferred>
## Deferred Ideas

### Coalition external dependencies (parallel to Phase 2 build)
- **D-CoalitionLogoSVG** — high-res official Sinya logo SVG. BLOCKING for Phase 2 final ship. Coalition delivers; until then, Phase 2 build can proceed with the live-site asset as a placeholder.
- **D-CoalitionContent-Hero** — hero headline + sub-headline copy. Coalition writes; placeholder mechanism in plan.
- **D-CoalitionContent-Agenda** — entire `/agenda` page text. Coalition writes; ship with `[ТЕКСТ ОТ КОАЛИЦИЯ]` placeholder until delivered.
- **D-CoalitionChannels** — WhatsApp Channel + Telegram channel creation, plus URLs to swap into `/member`. Coalition creates; quick task swaps in URLs once available. Must complete before warmup launch.
- **D-LawyerReviewLegal** — final lawyer-reviewed Privacy Policy + Terms of Use text. Coalition has NOT started review. NEW BLOCKER on warmup launch (in addition to existing Phase 1 sign-off gates). Adds to STATE.md deferred items.

### Punted to later phases
- **UTM/QR/oblast attribution capture, "where did you hear about us" registration field, Payload source-attribution dashboard** → Phase 2.1 (already split out)
- **Real video content in hero** → post-launch quick task once coalition delivers the file
- **Payload editorial workflow for landing copy / agenda updates** → Phase 4 if it becomes valuable; v1 ships with hardcoded Bulgarian strings via next-intl
- **Member account self-service** (profile editing, email preference toggle, delete-my-account button) → Phase 6 GDPR self-service
- **Referral / "purvani priateli" mechanism** → Phase 2.1 (referral attribution belongs with the broader source dashboard)
- **Auth pages full editorial polish** (microcopy, supportive copy, branded form variants) → revisit after warmup conversion data exists
- **Final FAQ trust+privacy+coalition Q&A buckets** — only operational FAQ ships in v1; trust/privacy questions are answered on `/legal/privacy` and `/agenda` instead
- **A/B testing display fonts on hero** → defer; Gilroy is locked for v1

### Reviewed Todos (not folded)
None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-public-surface-pre-warmup*
*Context gathered: 2026-05-02*
