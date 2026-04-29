# Feature Research

**Domain:** Civic-tech political advocacy platform (SME sector, Bulgaria)
**Researched:** 2026-04-29
**Confidence:** HIGH (table stakes, GDPR); MEDIUM (differentiators, EU specifics); LOW (eIDAS integration timelines)

---

## Platform Context

SMBsite is a structured-deliberation platform — not a petition site and not a forum. The primary
value loop is: visit agitation page → register (name + email) → vote on ideas → submit proposals /
report problems → receive updates via email + WhatsApp. Political weight = registered member count
× demonstrated activity. Every feature decision must be evaluated against that loop.

Reference platforms consulted: Decidim, Consul Democracy, pol.is, CitizenOS, Loomio, Change.org,
Avaaz, Bulgaria's peticii.com landscape, We the People, openPetition.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | v1? | Notes |
|---------|--------------|------------|-----|-------|
| Email + name registration with email confirmation | Every civic platform; proves real inbox | S | YES | Email confirmation is also a political integrity control, not just UX |
| Login / logout / password reset | Basic auth hygiene | S | YES | Magic-link flow is simpler than passwords for low-tech audience |
| Public agitation / landing pages (text, video, images) | Entry point for QR/UTM traffic; must be no-auth | S | YES | Static-ish pages; CMS-editable by editors |
| Approve / disapprove voting on ideas | Core engagement mechanic; users expect binary vote minimum | S | YES | One vote per account per idea; server-enforced |
| Idea/proposal catalog with browsing and search | Users expect to find content without scrolling endlessly | M | YES | Filter by category, status, level (local/central); full-text search later |
| User-submitted proposal form | Participation beyond voting; signals seriousness | M | YES | Goes to moderation queue before publish |
| User-submitted problem report with local/central tag | Structured reporting; makes data useful for editors | M | YES | Tag at submission time; editors can re-tag |
| Editorial moderation panel | Editors must review submissions before publish | M | YES | Status states: pending → approved/rejected/returned. Reason field on reject. |
| Email newsletter delivery | Main retention channel for low-tech users | M | YES | Transactional + broadcast; must support one-click unsubscribe (GDPR + Google/Yahoo 2024 enforcement) |
| One-click email/WhatsApp unsubscribe | GDPR Art.7(3), Art.21; also Google/Yahoo bulk sender rules | S | YES | Applied within 48 hours per regulation |
| GDPR privacy policy page + cookie consent banner | Legal requirement; users trained to expect it post-2018 | S | YES | Cookie banner must record and store consent; no dark patterns |
| GDPR right to erasure (account + data deletion) | GDPR Art.17; users who know their rights will ask | M | YES | Self-service in profile; deletes personal data, anonymizes content OR deletes content |
| GDPR data export (right of portability) | GDPR Art.20; less commonly exercised but legally required | M | YES | JSON/CSV of user's data; can be async (email download link) |
| Attribution: UTM parameter capture | Standard marketing infrastructure; needed for QR campaign | S | YES | Capture utm_source, utm_medium, utm_campaign, utm_content at registration |
| Attribution: HTTP referer capture | Supplements UTM for social/organic traffic | S | YES | Stored at registration time |
| Attribution: "where did you hear about us" field | Qualitative signal for unmeasured channels | S | YES | Dropdown with "direct mail / friend / social media / web search / other" |
| Attribution: IP geolocation to region/oblast | Map QR-from-direct-mail to geographic area | M | YES | On first visit / registration; use MaxMind GeoLite2 or similar; store oblast-level only (not full IP for GDPR) |
| User profile page (own view) | Users expect to see their submissions and votes | S | YES | Shows: name (display), submitted proposals, voted ideas, membership date |
| Mobile-responsive UI | Bulgaria mobile penetration is high; QR codes land on mobile | M | YES | Not a native app; responsive web. Touch targets, readable fonts at 375px width |
| Bulgarian-language UI throughout | Target audience; untranslated UI is a trust signal failure | S | YES | Includes all form labels, error messages, email templates |
| Notification: email digest of new ideas / votes | Users expect to know when their vote was counted; newsletters keep them coming back | M | YES (basic) | Initially: confirmation email + periodic newsletter. Per-event notifications are v1.x |
| WhatsApp channel / broadcast integration | Dominant mobile channel in BG; promised in value prop | L | YES (basic) | Broadcast-only (WhatsApp Channels free tier); no two-way API needed for v1 |
| Content visibility: idea count / vote totals displayed | Social proof; users need to see the platform is alive | S | YES | Public vote totals on each idea. Submitter name display is a pending decision (see PROJECT.md) |

### Differentiators (Competitive Advantage)

Features that set SMBsite apart. Not required for launch, but create sustained competitive advantage.

| Feature | Value Proposition | Complexity | v1? | Notes |
|---------|-------------------|------------|-----|-------|
| Geographic vote clustering by oblast | Shows political weight is spatially distributed, not just metro-concentrated; gives editors story angles | M | NO (v1.x) | Requires oblast-tagging at registration (v1 via IP geolocation) + map visualization layer |
| Idea status tracking ("what happened next") | Closes the feedback loop; turns platform from petition sink into advocacy tracker | M | NO (v1.x) | Editors post status updates on ideas: "submitted to ministry", "debated in parliament", etc. Decidim calls this Accountability component |
| Editorial curation + "editor's pick" flagging | Signals quality to new users; reduces cold-start problem | S | YES | Editors can mark ideas as featured; shown prominently in catalog |
| Sector tagging on ideas / problems (retail, construction, services...) | SME owners identify by sector; surfacing relevant ideas increases engagement | S | v1.x | Multi-tag on submit; filter in catalog |
| Proposal co-signatures (endorsements) | Converts votes into named endorsements for political weight; Change.org / Decidim model | M | v1.x | "X members endorse this proposal." Shown on proposal page |
| Vote + comment stats dashboard for editors | Editors need aggregate view to prioritize content and report to coalition | M | YES (internal) | Editor-only. Counts per idea, registration trend, attribution breakdown. Not public analytics |
| Voting anomaly detection (rate-spike alerts) | Platform is a political target; coordinated fake voting is a real threat | L | NO (v2) | Flag accounts with anomalous vote velocity or IP clustering for moderator review |
| Public accountability report ("what we've achieved") | Builds trust that advocacy has real-world impact; motivates re-engagement | M | NO (v1.x) | Static-ish page updated by editors with outcomes. Links back to specific ideas. |
| Real-name display option (submitter chooses) | Transparency strengthens political weight of proposals | S | PENDING | Key decision not yet made (PROJECT.md). Build the toggle, defer policy. |
| Structured idea lifecycle states | Draft → Pending review → Published → Under consideration → Resolved / Declined | M | YES (partial) | v1 needs at least: pending / published / rejected. Additional states add accountability layer |

### Anti-Features (Deliberately NOT Building)

Features that seem natural to request but create problems disproportionate to value.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Open free-text forum / threaded discussion | Users want to discuss; community feeling | Moderation burden explodes linearly with users; hostile actors flood with off-topic content; political platforms attract coordinated abuse; out of scope (PROJECT.md) | Comments on specific ideas (scoped, bounded). WhatsApp channel for community chat. |
| Anonymous proposal submission | Lower barrier to submit; privacy protection | Enables submission of low-quality, abusive, or false-flag proposals with no accountability; creates moderation inflation; erodes political credibility of the dataset | Allow pseudonymous display names. Editors review before publish. |
| Public downvote / "не одобрявам" without guard | Users want to express disagreement | Downvote brigading is trivially easy on political platforms; hostile actors coordinate mass disapproval on specific proposals to suppress legitimate voices | Keep approve/disapprove vote but limit visibility of raw disapproval count. Show net score or only approval count publicly. Or: make disapprove votes editor-visible only. |
| Native iOS / Android app | Perceived professionalism; push notifications | 3-5x dev cost over responsive web; app store approval delays; maintenance divergence; out of scope (PROJECT.md) | Progressive Web App (PWA) for home screen install + push notifications. Add post-v1 if metrics demand it. |
| Multi-language interface (EN/RU/TR) | Broader audience | Target audience is Bulgarian SME owners; translation creates maintenance debt; political messaging loses nuance in translation; out of scope (PROJECT.md) | Bulgarian only in v1. English for international coalition transparency if needed v2+. |
| Paid features / subscriptions / donation portal | Monetization | Changes the platform's identity from civic tool to commercial product; creates regulatory complications; out of scope (PROJECT.md) | Political weight metric stays: member count + activity. No money on platform. |
| Per-recipient personalised QR codes | Granular attribution per direct mail recipient | High GDPR risk (links physical address + IP + behavior); significant print logistics cost; out of scope (PROJECT.md) | Single campaign QR with IP geolocation to oblast for geographic attribution |
| Real-time chat / live comments | Community feel; modern UX expectation | Real-time infrastructure cost; live moderation requirement; scope creep toward forum | Asynchronous comments scoped to ideas. Editor-moderated. |
| Social login (Facebook/Google OAuth) | Reduces friction at registration | Ties platform identity to third-party services; privacy concern for politically sensitive audience; GDPR data-sharing implications with third parties | Email-only registration. Magic link or password reset. |
| Weighted / ranked-choice voting | More nuanced preference expression | Significantly increases UX complexity for low-tech audience; makes vote counts harder to communicate politically ("we have X members who approve") | Binary approve/disapprove for v1. Score voting or endorsement count as differentiator in v1.x. |
| Gamification (points, badges, leaderboards) | Engagement retention | Creates incentive to vote/submit for points rather than genuine conviction; can be gamed; cheapens political message; inappropriate tone for advocacy platform | Real-world impact updates ("this idea was discussed in Parliament") as engagement driver instead |
| Automatic social media cross-posting | Reach / viral potential | Requires OAuth tokens, rate-limit management, platform policy compliance per network; scope creep | Editors manually share via their personal/organisational accounts. "Share this idea" copy button for users. |
| AI-generated proposal writing assistance | Lowers submission barrier | Inflates proposal volume with low-quality content; undermines authenticity of member voice; moderation burden | Clear submission guidelines and example proposals. Editor feedback on returned proposals. |

---

## Feature Dependencies

```
Public agitation pages
    (no deps)

Email registration + confirmation
    └──required by──> All authenticated features below

Login / logout / password reset
    └──required by──> User profile, voting, proposal submit

Idea catalog (read-only)
    └──required by──> Voting
    └──required by──> Proposal submit
    └──required by──> Editor moderation panel

Approve/disapprove voting
    └──requires──> Idea catalog
    └──requires──> Email registration

User-submitted proposals
    └──requires──> Email registration
    └──requires──> Editor moderation panel (review queue)

Problem reports
    └──requires──> Email registration
    └──requires──> Editor moderation panel (review queue)

Editor moderation panel
    └──requires──> User-submitted proposals OR problem reports (content to moderate)
    └──requires──> Role-based access (editor vs member)

Email newsletter
    └──requires──> Email registration
    └──requires──> One-click unsubscribe

Attribution capture (UTM / referer / geolocation)
    └──requires──> Registration form (UTM/referer stored at reg time)
    └──feeds──> Editor analytics dashboard

GDPR: right to erasure
    └──requires──> Account management (profile page)
    └──requires──> Data inventory (knowing what to delete)

GDPR: data export
    └──requires──> Account management
    └──requires──> Data inventory

Cookie consent banner
    └──enhances──> GDPR privacy policy page

WhatsApp channel
    └──independent──> (manual management outside platform; platform links to channel)

--- v1.x features ---

Geographic vote clustering
    └──requires──> Oblast field on user (captured via IP geolocation in v1)
    └──requires──> Map visualization component

Idea status / accountability tracking
    └──requires──> Published ideas (v1)
    └──requires──> Editor ability to post status updates

Sector tagging
    └──requires──> Tag taxonomy (editor-managed)
    └──enhances──> Idea catalog (filter)

Proposal co-signatures / endorsements
    └──requires──> Published proposals
    └──requires──> Email registration

Voting anomaly detection
    └──requires──> Vote event log with timestamp + IP
    └──requires──> Admin alert system
```

### Dependency Notes

- **Email confirmation is a political integrity gate, not just UX:** Without confirmed email, vote counts are meaningless. Every active feature requires confirmed registration.
- **Editor moderation panel must ship with user-submitted content:** These cannot be decoupled. Accepting user submissions without a review queue is a political liability.
- **Attribution capture must happen at registration time:** UTM params and referer are lost once the user navigates away. Capture in session storage on landing, persist to user record on registration.
- **GDPR self-service requires knowing your data model first:** Data export and deletion are only buildable once you have a complete inventory of what personal data is stored where. Build data model first, GDPR tools second.
- **WhatsApp is intentionally decoupled:** The platform links to a WhatsApp Channel. The channel is managed manually by editors. No API integration needed for v1 — this avoids the WhatsApp Business API approval delay and cost risk (noted in PROJECT.md constraints).

---

## MVP Definition

### Launch With (v1)

Minimum viable to run the direct-mail QR campaign and begin registering members.

- [ ] Public agitation pages (text, video, images) — no auth required
- [ ] Email + name registration with email confirmation
- [ ] Login / logout / password reset
- [ ] Idea catalog (editor-published ideas, browsable/filterable)
- [ ] Approve/disapprove voting (one vote per user per idea)
- [ ] User-submitted proposal form (goes to moderation queue)
- [ ] Problem report form with local/central tag (goes to moderation queue)
- [ ] Editor moderation panel (review, approve, reject with reason, publish)
- [ ] Email newsletter (broadcast from editors) with one-click unsubscribe
- [ ] Attribution capture: UTM, HTTP referer, "how did you hear" field, IP-to-oblast geolocation
- [ ] GDPR: privacy policy page + cookie consent banner (no dark patterns)
- [ ] GDPR: one-click email unsubscribe
- [ ] GDPR: account deletion (right to erasure) — self-service in profile
- [ ] GDPR: data export (right of portability) — async download link via email
- [ ] User profile page (own view: submissions, votes, member since)
- [ ] Editor analytics dashboard (registration trend, attribution breakdown, vote counts per idea)
- [ ] Bulgarian UI throughout (forms, emails, error messages)
- [ ] Mobile-responsive design (375px+ viewport)
- [ ] Rate limiting + CAPTCHA on registration and voting endpoints
- [ ] Visual identity: Синя България colors + logo, modern design

### Add After Validation (v1.x)

Add when v1 has >500 registered members or editorial team requests.

- [ ] Sector tagging on ideas / problems + filter in catalog — trigger: editors need to segment content
- [ ] Idea lifecycle status updates (accountability tracking) — trigger: first real-world outcomes exist
- [ ] Geographic vote visualization by oblast — trigger: membership spread across regions
- [ ] Proposal co-signatures / named endorsements — trigger: proposals gaining traction
- [ ] Per-event email notifications (new idea matching your sector, status update on voted idea) — trigger: newsletter open rates drop, users request alerts
- [ ] Public accountability / outcomes report page — trigger: first verifiable result achieved
- [ ] "Editor's pick" / featured idea flagging in catalog — trigger: catalog has >50 ideas

### Future Consideration (v2+)

Defer until product-market fit established (>5,000 members, proven engagement loop).

- [ ] Voting anomaly detection with admin alerts — defer: cost/complexity; handle manually at small scale
- [ ] Progressive Web App (PWA) for push notifications + home screen install — defer: validate mobile web engagement first
- [ ] eIDAS / Evrotrust SME verification — defer: fragile (Bulgaria missed EUDI wallet deadline, integration interfaces not stable until 2026+); high friction at registration
- [ ] Opinion clustering / Polis-style visualization — defer: requires volume of votes that v1 won't have
- [ ] Multilingual interface — defer: out of scope per PROJECT.md; revisit if coalition expands internationally
- [ ] AI-moderation assistance (flagging) — defer: governance policy must precede tooling

---

## Feature Prioritization Matrix

| Feature | User Value | Build Cost | Priority |
|---------|------------|------------|---------|
| Public agitation pages | HIGH | LOW | P1 |
| Registration + email confirmation | HIGH | LOW | P1 |
| Idea catalog + voting | HIGH | MEDIUM | P1 |
| User proposal / problem submit | HIGH | MEDIUM | P1 |
| Editor moderation panel | HIGH (ops) | MEDIUM | P1 |
| Email newsletter + unsubscribe | HIGH | MEDIUM | P1 |
| GDPR: privacy policy + cookie consent | HIGH (legal) | LOW | P1 |
| GDPR: deletion + export | HIGH (legal) | MEDIUM | P1 |
| Attribution capture (UTM/IP) | HIGH (ops) | LOW | P1 |
| Mobile-responsive UI | HIGH | MEDIUM | P1 |
| Rate limiting + CAPTCHA | HIGH (integrity) | MEDIUM | P1 |
| User profile page | MEDIUM | LOW | P1 |
| Editor analytics dashboard | HIGH (ops) | MEDIUM | P1 |
| Sector tagging + filter | MEDIUM | LOW | P2 |
| Idea status / accountability tracking | HIGH | MEDIUM | P2 |
| Geographic vote clustering | MEDIUM | MEDIUM | P2 |
| Named endorsements / co-signatures | MEDIUM | MEDIUM | P2 |
| Per-event notifications | MEDIUM | MEDIUM | P2 |
| Voting anomaly detection | HIGH (integrity) | HIGH | P3 |
| PWA / push notifications | MEDIUM | HIGH | P3 |
| eIDAS verification | LOW (for v1 audience) | XL | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Decidim | Consul Democracy | Change.org / Avaaz | CitizenOS | Our Approach |
|---------|---------|-----------------|-------------------|-----------|--------------|
| Auth model | Email + social; optional verification | Email | Email | Email | Email only (no social login) |
| Voting | Binary support + weighted budgeting | Upvote + budget allocation | Signature count | Binary vote + discussion phase | Approve/disapprove binary; one per user per idea |
| Proposal lifecycle | Draft → Published → Accepted/Rejected with amendments | Submitted → Verified → Voted → Official | Published immediately | Idea → Discussion → Vote phase | Pending → Published → Under consideration → Resolved; editor controls transitions |
| Moderation | Reported content queue; moderator roles | Verification of proposals before voting | Platform review for ToS | Admin approval | Editor-first: all user content reviewed before publish |
| Notifications | Per-event email + digest | Email notifications | Email on signatures | Email | Email newsletter + per-event (v1.x) |
| Attribution / analytics | Admin dashboard; basic | Admin dashboard | N/A (petition focus) | N/A | Attribution-first: UTM + IP geolocation + "how did you hear" |
| GDPR self-service | Full (download, delete, consent management) | Basic | Basic | Limited | Full: delete + export self-service |
| Mobile | Responsive web | Responsive web | Responsive + apps | Responsive | Responsive web; PWA deferred |
| Downvote/oppose | Against comments + oppose on proposals | No downvote | No downvote | Pro/con arguments | Disapprove vote kept; raw count visibility TBD |
| Geographic clustering | Geolocation tagging on proposals | Geolocation maps | No | No | IP-to-oblast on registration; map visualization in v1.x |

---

## Bulgarian / EU Specifics

### GDPR Requirements (HIGH confidence — EU regulation, universally applicable)

- **Art.6: Lawful basis** — Registration consent must be explicit, granular, and separately given for (a) platform membership, (b) email newsletter, (c) WhatsApp contact. Cannot bundle. Consent must be as easy to withdraw as to give.
- **Art.7: Consent withdrawal** — Email unsubscribe must be one-click, no re-authentication required, effective within 48 hours. This is also enforced technically by Google/Yahoo since Feb 2024 for bulk senders.
- **Art.13/14: Transparency** — Privacy policy must list: what data, why, how long, who has access, data processors (email provider, hosting provider, analytics if any). Must be in Bulgarian.
- **Art.17: Right to erasure** — Self-service deletion required. Platform must delete personal data and either delete or anonymize associated content (proposals, votes). Must process within 30 days, confirm via email.
- **Art.20: Data portability** — Export of user's personal data in machine-readable format (JSON/CSV). Async generation + email link is acceptable.
- **Art.25: Privacy by design** — Collect minimum data needed. IP geolocation: store oblast-level result only, do not log or store raw IP address beyond the geolocation lookup. Retention policy documented.
- **Cookie consent** — Must use opt-in consent (not opt-out) for non-essential cookies (analytics, tracking). Technical/necessary cookies (session, security) do not require consent. Banner must not use dark patterns (pre-checked boxes, misleading colors, buried reject options). CJEU Planet49 ruling applies.
- **Data processors** — Email provider, hosting provider, and any analytics tool must have signed DPAs (Data Processing Agreements). EU-based hosting preferred; if non-EU, adequacy decision or SCCs required.
- **Breach notification** — GDPR Art.33: must notify Bulgarian CPDP (Commission for Personal Data Protection) within 72 hours of discovering a data breach.

### EU Web Accessibility Directive (MEDIUM confidence)

- Directive 2016/2102 mandates WCAG 2.1 Level AA for public sector bodies. SMBsite is operated by a political party coalition, not a public sector body — the Directive technically applies to public authorities. However:
  - The European Accessibility Act (EAA), which came into force June 2025, extends accessibility requirements to a broader range of private organizations providing services to the public.
  - Best practice is to target WCAG 2.1 Level AA regardless of legal obligation: (a) it is increasingly expected by users, (b) accessibility failures generate negative media coverage for political entities, (c) SME audience is diverse in age and technical ability.
- Specific requirements: sufficient color contrast (4.5:1 for normal text), keyboard navigation, screen reader compatible form labels, alt text on images, captions on videos (important for agitation video content).
- Bulgarian-language UI already satisfies the "language of service" expectation for the target audience.

### eIDAS / Bulgarian e-ID (LOW confidence — situation is in flux)

- Evrotrust's scheme was notified to the EU Commission in July 2023 as Bulgaria's official eIDAS scheme (Level of Assurance: Substantial).
- Bulgaria missed the November 2024 deadline for eIDAS 2.0 implementing acts and is behind on the European Digital Identity (EUDI) Wallet rollout — draft legislation only appeared for consultation in February 2026. EU wallets are not expected to be practically deployable in Bulgaria until late 2026 at the earliest.
- **Conclusion for SMBsite:** eIDAS verification as a registration option is technically available via Evrotrust's SDK, but:
  - It adds significant friction for an audience being asked to register via a QR code on a letter
  - The EUDI Wallet infrastructure is not stable enough to commit to in v1
  - Business verification (confirming the user is actually an SME owner) is not something eIDAS currently addresses well — it identifies the person, not their business role
  - **Decision: Defer to v2+ and only if the political benefit of verified SME credentials justifies the registration conversion hit**

### WhatsApp in Bulgaria (MEDIUM confidence)

- WhatsApp is the dominant mobile messaging app in Bulgaria (as in most of Eastern Europe). WhatsApp Channels (broadcast-only, free) is the appropriate v1 integration:
  - No API approval needed
  - Platform links to the channel (external, not embedded)
  - Editors manage the channel manually
  - Followers self-subscribe by scanning a WhatsApp link/QR code
- WhatsApp Business API (two-way messaging, automation) requires Meta approval, monthly subscription, and per-message costs. Do not build this for v1.
- Telegram as fallback: if WhatsApp Business API approval fails or is too slow, Telegram channels are a viable substitute with simpler API, but WhatsApp has higher penetration for the SME demographic.

### Bulgarian Political Platform Context

- No major Bulgarian political party currently operates a structured-deliberation member portal with voting and proposal submission. Most use static websites + Facebook pages.
- peticii.com and openPetition operate in Bulgaria but as generic petition platforms without the SME focus or structured idea catalog / lifecycle.
- The government's own e-petition platform (OGP commitment BG0090) remains limited in scope and institutional integration.
- **Competitive gap:** A structured, branded, sector-specific advocacy platform with transparent vote counts is genuinely novel in the Bulgarian political landscape. The design and UX bar is therefore set by international platforms (Change.org, Decidim), not Bulgarian competitors.

---

## Integrity and Abuse Risks (Platform-Specific)

Given SMBsite is operated by a political coalition, it is a specific target for hostile action. These
are not abstract concerns — they affect feature design decisions.

| Risk | Mechanism | Mitigation |
|------|-----------|------------|
| Fake account flood | Automated mass registration to inflate member count | Email confirmation (confirmed email required to vote); CAPTCHA + rate limiting on registration endpoint |
| Coordinated vote brigading | Organized group votes to inflate or suppress specific ideas | One vote per confirmed account per idea; server-side enforcement; anomaly detection flag in v2 |
| Spam proposal submission | Flooding moderation queue with off-topic or hostile content | All user content goes to moderation queue before publish; rate limit on submissions per account |
| Credential stuffing / account takeover | Taking over legitimate accounts to vote fraudulently | Strong password policy / magic link auth; rate limit on login attempts; email alerts on unusual login |
| Screenshot manipulation | Taking screenshot of vote counts and editing before sharing | Public vote count displays that can be independently verified; use vote count in platform URL for deep-link sharing |
| Data breach + political embarrassment | Exfiltrating member list (name + email) for opposition research | Minimum data collection; EU hosting; encrypted at rest; access-logged; breach notification plan |

---

## Sources

- [Decidim Features](https://decidim.org/features/) — official feature list
- [Decidim Components Documentation](https://docs.decidim.org/en/develop/features/components.html) — component inventory
- [Decidim Anonymous Proposals Discussion](https://staging.meta.decidim.org/processes/roadmap/f/122/proposals/17381) — anonymity tradeoffs
- [Consul Democracy](https://consuldemocracy.org/) — feature comparison
- [Consul Democracy — Democracy Technologies](https://democracy-technologies.org/tool/consul/) — comparative analysis
- [Avaaz Community Petitions](https://secure.avaaz.org/community_petitions/en/about/) — petition platform UX
- [pol.is / Polis](https://compdemocracy.org/polis/) — opinion clustering deliberation
- [Polis — Democracy Technologies](https://democracy-technologies.org/tool/polis/) — platform profile
- [CitizenOS Platform](https://citizenos.com/platform/) — structured deliberation workflow
- [Loomio — Democracy Technologies](https://democracy-technologies.org/tool/loomio/) — decision-making tool
- [Evrotrust Bulgaria eIDAS scheme](https://discover.evrotrust.com/eid-scheme-en) — national eID
- [Bulgaria draft digital ID law — Biometric Update](https://www.biometricupdate.com/202602/bulgaria-publishes-draft-digital-id-law-but-likely-to-fail-on-eudi-wallet-deadline) — EUDI wallet delay
- [EU Web Accessibility Directive FAQ](https://web-directive.eu/) — WCAG 2.1 AA requirements
- [GDPR Art.17 Right to Erasure](https://gdpr-info.eu/art-17-gdpr/) — deletion requirement
- [One-click unsubscribe compliance](https://www.valimail.com/blog/one-click-unsubscribe/) — Google/Yahoo 2024 enforcement
- [Vote brigading — Wikipedia](https://en.wikipedia.org/wiki/Vote_brigading) — brigading mechanics
- [OGP Bulgaria e-petition commitment BG0090](https://www.opengovpartnership.org/members/bulgaria/commitments/bg0090/) — local civic tech landscape
- [Comparison of civic technology platforms — Wikipedia](https://en.wikipedia.org/wiki/Comparison_of_civic_technology_platforms)

---

*Feature research for: SMBsite — civic-tech political advocacy platform, Bulgaria*
*Researched: 2026-04-29*
