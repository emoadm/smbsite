# Phase 2: Public Surface (Pre-Warmup) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 02-public-surface-pre-warmup
**Areas discussed:** Landing page structure, content authorship, hero media, FAQ scope, logo asset, color palette, typography, /member content, channel readiness, auth rebrand scope, legal text status

---

## 1a — Landing-page structure

| Option | Description | Selected |
|--------|-------------|----------|
| A. Single long landing page with anchor sections | hero → problem → vision → CTA → FAQ; nav links jump within | |
| B. Multi-page agitation set | `/`, `/about`, `/problems`, `/agenda`, `/faq` | |
| C. Hybrid | single long `/` + `/agenda` + `/faq` | ✓ |

**User's choice:** C
**Notes:** PUB-03 satisfied with real pages without 5× the content load.

---

## 1b — Content authorship

| Option | Description | Selected |
|--------|-------------|----------|
| A. Coalition writes everything | Claude scaffolds with placeholders; nothing ships until coalition delivers | |
| B. Claude drafts everything, user edits | Fastest; risk of off-tone phrasing | |
| C. Hybrid | Claude drafts FAQ + scaffolding; coalition writes hero + agenda | ✓ |
| D. Lorem-Cyrillic placeholders | Visually realistic dummy text, replaced before warmup | |

**User's choice:** C
**Notes:** Pairs with structure choice C — political copy stays human, mechanical copy ships immediately.

---

## 1c — Hero media

| Option | Description | Selected |
|--------|-------------|----------|
| A. Real video from day one | Coalition delivers ~30-60s pitch via Bunny Stream | |
| B. Still image now, VideoPlayer slot scaffolded | Drop-in via single config change later | ✓ |
| C. Image + animated motion | Subtle parallax/fade-in, no video at all in Phase 2 | |
| D. Embedded YouTube placeholder | Cookie consent complexity + non-EU residency | |

**User's choice:** B
**Notes:** Decouples video production from launch; PUB-01 satisfied structurally.

---

## 1d — FAQ scope

| Option | Description | Selected |
|--------|-------------|----------|
| A. Trust & legitimacy | "Кой стои зад платформата?" / "Това политическа партия ли е?" | |
| B. Privacy & data | "Какво правите с данните ми?" / "Мога ли да изтрия акаунта си?" | |
| C. What members actually do | "Какво се случва след регистрация?" / "Как се гласува?" | ✓ |
| D. Coalition specifics | "Какво е Синя България?" / "Имате ли депутати?" | |
| E. Skip — minimal stub only | One-paragraph contact placeholder | |

**User's choice:** C only
**Notes:** Privacy → `/legal/privacy`; trust → `/agenda`. FAQ stays operational and short.

---

## 2a — Logo asset

| Option | Description | Selected |
|--------|-------------|----------|
| A. Coalition provides high-res SVG | Vector, single source of truth; blocked until delivery | ✓ |
| B. Scrape from sinyabulgaria.bg | Variable quality, unblocked | |
| C. Hybrid: scrape now, request high-res in parallel | Quality improves opportunistically | |
| D. Commission a clean SVG redraw | Brand-fidelity / IP concerns | |

**User's choice:** A
**Notes:** Hard blocker on coalition delivery. Tracked as `D-CoalitionLogoSVG`.

---

## 2b — Color palette extraction

| Option | Description | Selected |
|--------|-------------|----------|
| A. WebFetch sinyabulgaria.bg, extract from CSS | Very accurate (uses live values) | |
| B. User pastes hex values directly | Highest accuracy if brand doc is at hand | |
| C. Extract from logo via image quantization | Logo-faithful, may miss web shades | |
| D. Hybrid — extract from live site, user redlines | Best balance | ✓ |

**User's choice:** D
**Notes:** Claude proposes tokens; user has final say where canonical values differ.

---

## 2c — Typography (initial)

| Option | Description | Selected |
|--------|-------------|----------|
| A. Roboto only (Phase 1 baseline) | Clean but visually ordinary | |
| B. Add Cyrillic display font (Manrope/Unbounded/Playfair) | Distinctive headline voice | (superseded by Gilroy) |
| C. Match sinyabulgaria.bg's existing font | Brand-consistent | |
| D. Defer typography to v2 | Roboto-only + tracked TODO | |

**User input:** "We use Gilroy free font set for the coalition visuals" — user volunteered the canonical coalition font, superseding the option list.

---

## 2c-confirm — Gilroy scope

| Option | Description | Selected |
|--------|-------------|----------|
| A. Free 2-weight set (Light + ExtraBold) | ExtraBold for headlines + Roboto for body | ✓ |
| B. Full paid Gilroy family | Gilroy across entire site, drop Roboto | |
| C. Free 2-weight pushed harder | Gilroy Light for body | |

**User's choice:** A
**Notes:** Light reserved for very-large display text; Roboto stays for body.

---

## 3a — Channels readiness

| Option | Description | Selected |
|--------|-------------|----------|
| A. Both channels exist + URLs available | Best member experience | |
| B. Channels not yet created → "очаквайте скоро" | Honest but weaker | ✓ |
| C. One channel ready, one not | Realistic middle ground | |
| D. Defer channel UX entirely | Cleanest if neither ready, weakest /member content | |

**User's choice:** B
**Notes:** Coalition-side parallel task to create channels. Tracked as `D-CoalitionChannels`. Quick task swap-in once URLs exist.

---

## 3b — /member page contents

| Option | Description | Selected |
|--------|-------------|----------|
| A. Registration-confirmed banner | "Регистрацията ви е потвърдена. Добре дошли, [name]." | ✓ |
| B. "Какво следва" timeline | Bulleted next-steps view | ✓ |
| C. Links back to landing | `/agenda`, `/faq` callouts | ✓ |
| D. "Покани приятел" CTA | Share link with referral attribution | |
| E. Profile / preferences | Show/edit name, sector, role | |
| F. Email-update preference toggle | "Да/Не" subscription control | |

**User's choice:** A + B + C
**Notes:** D belongs with Phase 2.1 referral attribution; E/F belong in Phase 6 GDPR self-service.

---

## 4a — Auth pages rebrand scope

| Option | Description | Selected |
|--------|-------------|----------|
| A. Full rebrand | Sinya colors + Gilroy + supportive microcopy + branded forms | |
| B. Light rebrand | Color tokens + Gilroy headline; no microcopy/form changes | ✓ |
| C. No rebrand | Stay as Phase 1 baseline | |
| D. Rebrand /register only | Asymmetric polish | |

**User's choice:** B
**Notes:** Token application is essentially "free" once tokens exist in globals.css. Full editorial polish on auth flows can wait.

---

## 4b — Legal text status

| Option | Description | Selected |
|--------|-------------|----------|
| A. Coalition has lawyer-reviewed final text ready | Drop in real text, remove draft Alert | |
| B. Lawyer review in progress | Ship drafts, swap final via quick task | |
| C. Coalition hasn't started review | Phase 2 ships drafts; warmup gated on legal sign-off | ✓ |
| D. Lawyer review out of scope | Risky compliance posture | |

**User's choice:** C
**Notes:** Adds new blocker on warmup launch. Tracked as `D-LawyerReviewLegal` in deferred items.

---

## Claude's Discretion

- Cookie banner visual treatment (footer / floating / gradient)
- Landing page section micro-ordering and dividers
- Spacing / typography scale (h1/h2/h3 ramp, line-heights)
- `/agenda` and `/faq` layout templates (Card vs flat, sidebar vs anchor nav)
- Hero image treatment (full-bleed vs contained, overlay opacity, crop)
- Animation / motion (subtle fade-in only, no autoplay or carousels)
- Internal anchor IDs for the long landing page
- OG metadata / Twitter Card setup

## Deferred Ideas

See CONTEXT.md `<deferred>` section for the structured list. Notable coalition external dependencies that emerged during this discussion:

- `D-CoalitionLogoSVG` (BLOCKING)
- `D-CoalitionContent-Hero` (placeholder mechanism)
- `D-CoalitionContent-Agenda` (placeholder mechanism)
- `D-CoalitionChannels` (warmup-gated)
- `D-LawyerReviewLegal` (warmup-gated, NEW)

Real video, full auth-page editorial polish, referral mechanism, A/B display-font testing, and Payload editorial workflow for landing copy were also deferred.
