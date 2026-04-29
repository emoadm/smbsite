# Pitfalls Research

**Domain:** Civic-tech / political advocacy community platform (Bulgaria, SMB sector)
**Researched:** 2026-04-29
**Confidence:** HIGH for GDPR / political-platform specifics (official sources); MEDIUM for Bulgarian operational specifics; HIGH for WhatsApp restrictions (official Meta policy)

---

## Critical Pitfalls

### Pitfall 1: Vote Integrity — Sockpuppet and Coordinated Brigading Attack

**Severity:** CRITICAL

**What goes wrong:**
An opponent registers dozens or hundreds of fake accounts — using disposable email addresses or real addresses from a botnet — and coordinates mass upvotes/downvotes on specific proposals. A single Telegram group with 200 participants can visibly flip a proposal's approval rating overnight. Once a screenshot of the skewed result circulates, the platform's credibility collapses regardless of whether admins later correct it.

**Why it happens:**
Email-only registration with no cool-down between registration and voting lets one person script the entire flow in minutes. Platforms routinely underestimate how low the barrier is for opponents: free disposable email services, VPNs, and simple automation are accessible to any politically motivated actor with moderate technical skills. Bulgaria's digital disinformation ecosystem is documented as active — TikTok deleted 423,000+ fake Bulgarian-linked profiles in late 2024.

**How to avoid:**
1. Enforce email verification before any vote counts. An unverified address must not increment any counter. This is already in PROJECT.md constraints and must be treated as non-negotiable.
2. Add a mandatory cooling period (minimum 24h, recommended 48h) between email confirmation and first vote. This breaks scripted mass-registration flows.
3. Apply per-IP and per-device-fingerprint rate limiting on registration (max 3 registrations per IP per 24h) and on votes (1 vote per user per idea, enforced server-side — never trust client).
4. Require CAPTCHA (hCaptcha or Cloudflare Turnstile, not reCAPTCHA due to GDPR/data-transfer concerns) on the registration form, not just on login.
5. Log vote velocity: if a proposal gains more than X votes in Y minutes (define thresholds based on your baseline), freeze the result pending review and alert moderators. Do not display a live running total that can be gamed for a screenshot — show counts with a delay of a few minutes or only after a minimum vote threshold.
6. For higher-integrity decisions, require optional business identifier (NRA number/BULSTAT) verification as a secondary trust signal — not as a hard gate, but as a quality filter for surfacing "verified business owner" votes separately.
7. Device fingerprinting (via open-source FingerprintJS or similar) can detect accounts sharing devices even across different IPs. Device fingerprint ≠ IP: this is more resilient against VPN use.

**Warning signs:**
- A proposal receives a burst of 20+ votes within one hour from accounts all created within the last 48 hours.
- Multiple accounts share the same registration IP subnet.
- Spike in registration rate that doesn't correlate with any known campaign action (no new mail drop, no social post).
- Unusual email domain distribution (e.g., 40 accounts from the same obscure domain).

**Phase to address:**
Registration phase (must be done before voting is enabled). Voting integrity rules are architectural — retrofitting them after launch is very difficult.

---

### Pitfall 2: GDPR Article 9 — Political Opinion as Special Category Data

**Severity:** CRITICAL

**What goes wrong:**
By collecting name + email and recording which proposals a member voted for, supports, or authored, the platform is implicitly building a profile of political opinion. Under GDPR Article 9, "personal data revealing political opinions" is special category data requiring explicit (not implied) consent or the narrow not-for-profit exception under Art. 9(2)(d). The CPDP (Bulgarian DPA) has already fined a political party €12,770 (25,000 BGN) for processing personal data (including names) as party supporters without proper legal basis — in that case, the data subjects had not consented to being listed. The same enforcement logic applies to a web platform that records voting behavior and associates it with a named, identified person.

**Why it happens:**
Developers build the "interesting" features (voting, profiles) first and assume GDPR compliance means "add a cookie banner and privacy policy." They miss that recording votes tied to a real name is special category processing, not ordinary processing, and that it requires a distinctly higher consent bar.

**How to avoid:**
1. In the registration flow, obtain two separate consents with separate checkboxes (unchecked by default): (a) general platform membership and contact, and (b) explicit consent for recording and publishing voting activity and proposals. Document the legal basis for each type of processing separately.
2. Consult with a Bulgarian data protection lawyer before launch to confirm the appropriate legal basis: the not-for-profit member exception (Art. 9(2)(d)) only applies if the platform is operated by a bona fide political association and the processing is strictly for internal member purposes. If vote tallies are public, the exception may not apply.
3. Decide the "names visible on votes" question (currently unresolved in PROJECT.md) before building the voting system. If names are public, you need explicit consent; if votes are anonymous/aggregated, you may have more latitude. Build for the decided model — changing it post-launch risks a breach.
4. Record the consent decision (timestamp, version of privacy policy accepted) in the database. You must be able to demonstrate consent to the CPDP on request.
5. Do not mix the consent for email/WhatsApp newsletters with the consent for recording political opinions. Switching legal bases after the fact is prohibited under GDPR (confirmed by ICO guidance and EDPB guidelines).

**Warning signs:**
- Privacy policy drafted but no data flow map documenting which data is special category.
- Voting system built with vote records tied to user IDs without a clear documented legal basis.
- Single combined "I agree to terms and privacy policy" checkbox on registration.

**Phase to address:**
Before registration is built. The consent and data model must be settled at architecture time, not retrofitted.

---

### Pitfall 3: Incomplete "Right to Be Forgotten" — Logs, Backups, Downstream Processors

**Severity:** CRITICAL

**What goes wrong:**
A user clicks "delete my account." The app deletes the user row and their posts. Six months later the CPDP receives a complaint. The user's email is still in: the email marketing provider's suppression list (correct), the application error logs (each vote and login event logged with email), the database backups from last month, the analytics platform (session tied to hashed email), and the WhatsApp Business API provider's contact list. The deletion was cosmetically complete but substantively partial. A documented fine of 160,674 EUR was issued in another EU case specifically for failure to demonstrate effective deletion beyond manually-maintained logs.

**Why it happens:**
Developers delete from the primary database and consider the job done. Logs are treated as infrastructure, not personal data. Backup schedules are set-and-forget. Third-party processors (email ESP, analytics, WhatsApp provider) are not inventoried.

**How to avoid:**
1. Build a Data Processing Register before writing deletion code: list every system that receives or stores personal data (app DB, email ESP, WhatsApp provider, analytics, error logs, CDN logs, database backups).
2. For each processor: document whether deletion is propagated automatically, manually on request, or via "beyond use" schedule.
3. Structured logs must not contain email addresses or names in plaintext — log user IDs only. On deletion, pseudonymize or zero out the user ID reference in logs if technically feasible, or document a log rotation schedule (e.g., logs purged after 90 days) and communicate this to data subjects in the privacy policy.
4. For database backups: adopt the ICO "beyond use" approach — maintain a deletion register that records "user ID X deleted at time T." When a backup is eventually restored, apply the deletion register before any access. Do not restore a backup that contains a deleted user's data for any purpose other than disaster recovery.
5. Build the account deletion flow as a queued, multi-step job that explicitly invokes deletion APIs at each downstream processor. Log completion of each step. This log is evidence of compliance — keep it (the log of the deletion event itself is not personal data if it references user IDs, not names/emails).
6. Test deletion end-to-end before launch by creating a test account, exercising all features, then deleting and auditing all systems.

**Warning signs:**
- No documented list of third-party data processors.
- Deletion implemented as a single SQL `DELETE` statement.
- Application logs contain email addresses.
- No mention of backup handling in the privacy policy.

**Phase to address:**
Registration phase (data model), but the processor register must be started at project kickoff. Deletion testing should be a launch gate.

---

### Pitfall 4: WhatsApp Business API — Political Content Prohibition

**Severity:** CRITICAL

**What goes wrong:**
Meta's WhatsApp Business Platform Policy explicitly prohibits use by "Political Parties, Politicians, Political Candidates, and Political Campaigns." An account used to send campaign updates from a political coalition is in direct violation of policy. The account will be restricted, suspended, or permanently banned — potentially during a peak campaign moment. Recovery is slow; Meta's enforcement queue for appeals can take weeks. The SMBsite is a platform of a political coalition (Синя България), making this prohibition directly applicable.

**Why it happens:**
Teams assume that because WhatsApp Business API is generally available and widely used for marketing, it applies to all marketing use cases. The political restriction is buried in the policy and not prominently marketed by WhatsApp API resellers who want the sale.

**How to avoid:**
1. Do not use WhatsApp Business API (Cloud API or BSP-hosted API) for outbound campaign communications from the coalition. The use case as described in PROJECT.md falls squarely within the prohibited category.
2. Evaluate WhatsApp Channels (broadcast-only, free, no API needed) — users subscribe, you broadcast. This model is less interactive but is operationally within policy for public-facing announcements. Verify current policy status before building.
3. As a parallel or primary channel: use Telegram Channel/Group (no policy restrictions on political content, widely used in Bulgaria). The PROJECT.md already identifies Telegram as an alternative.
4. If WhatsApp API is pursued anyway (e.g., through a content framing that emphasizes business advice, not political campaigning), get a legal opinion on whether the use case crosses the policy line — and prepare for account suspension as a contingency. Build the email channel as the primary, resilient notification path so that loss of WhatsApp does not kill the platform's communication capability.
5. Never send bulk unsolicited first-contact messages via WhatsApp API regardless of framing — this is a spam violation independent of political content rules.

**Warning signs:**
- Plan documents say "WhatsApp Business API for campaign updates" without noting the political content prohibition.
- Budget allocated to BSP (Business Solution Provider) setup without policy review.
- No fallback notification channel if WhatsApp is suspended.

**Phase to address:**
Architecture / infrastructure phase — before any WhatsApp integration is built. Channel strategy must be settled first.

---

## Serious Pitfalls

### Pitfall 5: Email Deliverability — Sender Reputation Collapse on First Send

**Severity:** SERIOUS

**What goes wrong:**
The site launches, collects 5,000 members via the direct mail QR campaign, and sends the first newsletter. The domain is brand-new. SPF, DKIM, and DMARC are set up but the domain has zero sending history. The ESP flags the first large batch; Gmail marks 15% as spam because the domain reputation is zero; 200 people hit "report spam" because they forgot they registered. Complaint rate exceeds Google/Yahoo's 0.3% threshold. The domain is now on a blocklist. Subsequent emails go to spam for all recipients, not just the early complainers. Sender reputation, once damaged, does not self-heal.

**Why it happens:**
Teams configure email technically (SPF/DKIM/DMARC) and assume delivery is solved. Domain warm-up — the gradual increase of sending volume over 4-8 weeks — is treated as optional. The direct mail campaign creates a large initial list that is used immediately rather than ramped into.

**How to avoid:**
1. Start domain warm-up at least 4 weeks before the QR campaign letters are mailed. Send transactional emails (registration confirmations, password resets) from the domain from day one of development. This builds reputation before any bulk send.
2. For the first newsletter: segment the list and send to your most engaged, recently-verified subset first (e.g., registrations from the last 7 days). Start at 500/day, double every 3-5 days.
3. Use a dedicated sending subdomain for newsletters (e.g., `news.smb-platform.bg`) separate from the transactional domain (`mail.smb-platform.bg`). Newsletter reputation damage does not infect transactional confirmations.
4. Set up Google Postmaster Tools and monitor spam rate from day one. Any single send that produces >0.1% complaints requires investigation before the next send.
5. Subject lines and content for a political platform trigger spam filters more readily than commercial email — avoid words like "официален", "СПЕШНО", "ВАЖНО" in all-caps; avoid excessive exclamation marks; do not attach files to first emails.
6. Provide a clearly-labeled one-click unsubscribe in every email (required by Google/Yahoo since February 2024 for bulk senders). Do not make users log in to unsubscribe.
7. Verify all collected email addresses before sending. At minimum, run syntax validation and MX record lookup. Bounce rate above 2% in early sends will damage reputation.

**Warning signs:**
- No warm-up schedule documented before the QR mail drop date.
- First newsletter to the full list rather than a verified segment.
- Google Postmaster Tools not configured.
- Unsubscribe link requires login or multi-step confirmation.

**Phase to address:**
Infrastructure phase (ESP setup, domain configuration) must precede the QR campaign launch by at least 4 weeks.

---

### Pitfall 6: QR Campaign Launch Surge — Infrastructure Collapse

**Severity:** SERIOUS

**What goes wrong:**
The direct mail campaign drops 20,000+ letters. Within 48 hours, 8,000 people scan the QR code. The landing page and registration server, sized for steady-state operation, cannot handle the spike. The site is slow, returns 503 errors, or crashes. Users who fail to register do not retry — the coalition's one chance for a first impression with that audience is lost. Unlike a website that can be fixed and traffic will return, a physical mail campaign is one-shot: the letter was read once.

**Why it happens:**
Developers test locally or in a staging environment and deploy to a small server. The QR campaign creates a demand spike unlike anything the platform sees at steady state. The Coinbase Super Bowl QR ad in 2022 (20M hits/minute) is the canonical example of this failure mode — the difference is Coinbase recovered quickly and had brand recognition; a political platform does not get a second chance with the same physical mailing.

**How to avoid:**
1. The landing page that the QR code points to must be a static or CDN-cached page. It must not hit the database or require authentication. It presents the pitch and a "Register" call-to-action. This page must survive 50,000 concurrent requests without server involvement.
2. Put the registration API behind a queue: accept the registration form, enqueue the email confirmation job, return a "thank you" immediately. Do not perform synchronous DB writes on the critical path during surge. The queue decouples the surge from the processing.
3. Use a queue or virtual waiting room (Cloudflare Waiting Room or equivalent) for the registration form itself. During the first 48h after the mail drop, a 30-second wait is acceptable; a 503 error is not.
4. Auto-scaling must be pre-configured and tested, not assumed. If hosting on a PaaS (e.g., Railway, Render, Fly.io), verify scale-up behavior under synthetic load before the mail drop. If on a VPS, size for peak, not steady state.
5. Run a load test simulating the expected QR campaign peak (target: 2x your expected peak, sustained for 15 minutes) at least 2 weeks before the mail drop. This surfaces bottlenecks.
6. The QR code must point to a URL you control permanently — never to a short URL service you don't own. Short URL services can be flagged as phishing by mobile OS security, and some services have been blocked or deprecated. Use your own domain with a redirect path (e.g., `smb-platform.bg/p/direct-mail-2026`).
7. Have a fallback: if the site goes down, the QR redirect should point to a simple static holding page ("Site under high demand, register here: [email address] or try again in 1 hour") rather than a generic error.

**Warning signs:**
- QR code points to a dynamically-rendered page backed by the main application server.
- No load test scheduled.
- Hosting plan is a fixed single-instance server.
- No queue between the registration form and the database.

**Phase to address:**
Infrastructure and registration phase, completed and load-tested before the mail drop date.

---

### Pitfall 7: UTM / Referrer Attribution — Inadvertent PII Collection and Analytics Leakage

**Severity:** SERIOUS

**What goes wrong:**
The platform collects UTM parameters and HTTP referrer to track which campaign drove registrations. A user registers from a referrer URL that contains their name or email (e.g., a pre-filled form link, a personalized email link, or a social media post with their handle in the URL). This PII ends up in the analytics database, in server logs, and potentially in third-party analytics tools (e.g., Google Analytics, Plausible). Under GDPR, storing IP address alongside attribution data without adequate anonymization is personal data processing requiring a legal basis and data minimization.

Additionally, if the platform passes UTM parameters in redirects to third-party pages, those third parties receive the full referrer — potentially including the user's context.

**Why it happens:**
UTM tracking is implemented by developers as a straightforward "copy the URL param to the DB" operation. The privacy implications are treated as marketing concern, not engineering concern.

**How to avoid:**
1. Never store raw IP addresses in analytics or attribution tables beyond the time strictly needed for geolocation (extract region, then discard the raw IP immediately in the same transaction, or hash it with a daily-rotating salt).
2. Strip UTM parameters from the URL after capture (use JavaScript History API: `history.replaceState(...)` immediately after reading UTMs) so they don't appear in server logs or get passed in referrers.
3. Do not log the full referrer URL. Log only the domain (not path, not query string) of the referrer.
4. For the QR campaign: the attribution only needs to record "scanned QR code" + "IP-derived region." That is two data points. Do not store more.
5. If using third-party analytics (Plausible, PostHog, etc.): ensure the vendor is EU-hosted, GDPR-compliant, and is listed in your Data Processing Register. Do not use Google Analytics 4 without a server-side proxy — direct GA4 use has been found non-compliant by multiple EU DPAs due to US data transfers.
6. The "Откъде научихте за нас" (how did you hear about us) form field is a text/dropdown field collected at registration — ensure it is treated as optional and its content is not merged with behavioral tracking data in analytics.

**Warning signs:**
- Attribution DB table includes a raw `ip_address` column.
- Full referrer URL stored in the database.
- UTM params remain in the URL after page load (visible in logs and to third-party scripts).
- Google Analytics configured without EU-only data processing settings or a server-side proxy.

**Phase to address:**
Registration and analytics phase. Attribution schema must be reviewed against data minimization before it is written.

---

### Pitfall 8: Mass Fake Registration by Opponents (Political Attack Vector)

**Severity:** SERIOUS

**What goes wrong:**
A coordinated opposition campaign registers thousands of fake or bulk-purchased email addresses to inflate membership numbers (making the base look fake) or to dominate voting outcomes. Alternatively, bots register to create a large spam base that then posts defamatory or inflammatory proposals. If the platform publishes member counts as evidence of political support, inflated or manipulated counts become a liability — opponents publicize the fake accounts as proof the platform is astroturfed.

**Why it happens:**
Free registration with no friction and no verification beyond email confirmation creates a target. Disposable email services (mailinator, guerrillamail, and thousands of domain-spoofed variants) are freely available. Rate limiting is typically implemented at a level that prevents automated DoS but not patient, distributed registration.

**How to avoid:**
1. Implement disposable email domain detection: maintain a blocklist of known disposable email domains and reject registrations from them. Open-source blocklists (e.g., `disposable-email-domains` on GitHub) are updated regularly. This alone eliminates the laziest attacks.
2. Restrict registration rate by IP subnet (not just individual IP): if 5+ accounts are registered from the same /24 subnet in 24 hours, require additional verification (SMS or human review).
3. Do not publish raw member counts as a headline metric. Publish "verified members" — meaning confirmed email + no deletion/suspension flag. Consider a 7-day hold before a new member's vote is counted in any displayed tally.
4. If the platform grows to the point where member count has political significance, consider periodic audits of the member list using domain diversity analysis (a healthy list has diverse email domains; a botted list has anomalous domain clustering).
5. For user-submitted proposals and problem reports: require the same 48h cooling period before a submission appears publicly. Never auto-publish user content; always route it through moderator review queue first.

**Warning signs:**
- Registration rate anomaly not correlated with any known campaign event.
- Email domain distribution heavily skewed to a handful of providers.
- Multiple registrations from the same IP within minutes.
- Proposal submissions containing content that is off-topic, inflammatory, or clearly copied from a political opponent's messaging.

**Phase to address:**
Registration phase. Moderator tooling must be built before content submission is enabled.

---

### Pitfall 9: Screenshot Smear — Proposals Taken Out of Context

**Severity:** SERIOUS

**What goes wrong:**
A member posts a proposal or problem report that is politically sensitive, ambiguous, or easily misread. An opponent screenshots it and shares it on social media with a misleading caption ("This is what Синя България's members really think"). The platform is held responsible for the content because it appeared on their platform, even if subsequently moderated. The reputational damage from the screenshot lasts longer than the content itself.

**Why it happens:**
Platforms publish user content immediately ("optimistic" moderation) to maximize engagement. The risk that user content becomes a weapon against the platform is underestimated, especially for political platforms where opponents actively seek damaging material.

**How to avoid:**
1. Never auto-publish user-submitted proposals or problem reports. All submissions go into a review queue; moderators approve before publication. This is a platform with political stakes, not a social media site competing for post velocity.
2. Establish a clear submission policy in plain Bulgarian: what topics are in scope (SMB sector issues), what will be rejected (personal attacks, off-topic political content, defamation), and that editors retain publication rights. This policy is your legal and reputational defense.
3. Add a visible "Предложено от потребител" (submitted by user) label on all user-generated content, clearly distinguishing it from editorial content. This reduces (though does not eliminate) attribution to the platform.
4. Keep moderator decision logs internal. Do not publish the reasons for rejection publicly — rejected submitters may weaponize rejection reasons.
5. Consider whether user names should be visible on proposals at all (the PROJECT.md "undecided" question). Anonymous or pseudonymous submissions for proposals significantly reduces the screenshot-smear attack surface and the doxxing risk.

**Warning signs:**
- User proposals set to auto-publish without moderation.
- No submission policy documented.
- No visual distinction between editorial content and user-submitted content.

**Phase to address:**
Content/moderation phase, before any user submission feature is enabled.

---

## Notable Pitfalls

### Pitfall 10: Bulgarian Language Encoding and Template Personalization Errors

**Severity:** NOTABLE

**What goes wrong:**
Three categories of Bulgarian-specific failure in email templates:

1. **Encoding corruption**: Email sent with subject line like `=?UTF-8?B?...?=` raw Base64 visible to recipient, or Cyrillic characters rendering as `?????` in older Outlook versions or Squirrel webmail. Cause: HTML template missing `<meta charset="utf-8">`, or transactional email library not explicitly setting `Content-Type: text/html; charset=utf-8`.

2. **Vocative case offense**: Template reads "Здравей, Елено," using the feminine vocative which is considered rude or rustic in contemporary Bulgarian. Modern Bulgarian email greetings should use the nominative form: "Здравей, Елена," or "Здравей, [Пълно Иле]." Using vocative forms for women is actively perceived as patronizing by a significant portion of the target demographic (business owners and managers).

3. **Name declension in body text**: Templates that say "Имейлът беше изпратен от [Иван]" where the context grammatically requires a prepositional or accusative form. This is less offensive but reads as machine-generated text and undermines trust.

**How to avoid:**
1. All email templates must declare `charset="utf-8"` in both the HTML `<meta>` tag and the MIME Content-Type header. Test with a Bulgarian email address on Gmail, Outlook desktop (Windows), and a common Bulgarian mobile client (most likely Gmail/Outlook mobile).
2. Use nominative form for greeting salutations. "Здравей, [Пълно Иле]!" is safe. Do not attempt vocative declension in automated templates.
3. Keep template variable substitution to contexts where the name appears in nominative position. If you need accusative/genitive in body copy, rephrase the sentence to avoid it: "Вашият акаунт" instead of "[Иван]'s account."
4. Test all transactional emails with names containing the Cyrillic characters: Ж, З, Й, Щ, Ъ, Ь, Ю, Я — these are the most commonly mangled characters in improperly configured email pipelines.

**Warning signs:**
- Email template uses `charset=iso-8859-1` or no charset declaration.
- Template greeting uses feminine vocative patterns `-е`, `-о` appended to names.
- Subject line test from dev environment shows `=?UTF-8?B?` prefix in the received email client.

**Phase to address:**
Email/notification phase. Must be tested before any bulk send.

---

### Pitfall 11: GDPR — Lawful Basis Confusion for Email and Attribution Tracking

**Severity:** NOTABLE

**What goes wrong:**
Platform uses "legitimate interest" as the legal basis for sending newsletter emails and for attribution tracking (UTM, referrer, QR scan IP). Under GDPR and ePrivacy Directive (PECR equivalent applied in Bulgaria), sending electronic direct marketing — including newsletters — to individuals requires explicit consent, not legitimate interest. The ICO (and by EDPB guidance, all EU DPAs) have confirmed this: electronic direct marketing requires consent. A platform that collects consent at registration for platform membership but not specifically for newsletter sends, and then relies on legitimate interest for the newsletter, has an incorrect legal basis.

Additionally, consent cannot be made a precondition of platform access: "agree to receive newsletter or you cannot register" violates GDPR's requirement that consent be freely given.

**How to avoid:**
1. Newsletter consent must be a separate, optional checkbox at registration. Unchecked by default. The checkbox language must specifically state the channel (email, WhatsApp) and the type of content ("политически бюлетин от Синя България").
2. Attribution tracking (QR scan logging, UTM capture) should be grounded in legitimate interest after a genuine balancing test, given that it is aggregate data used for campaign effectiveness, not behavioral profiling. Document the balancing test. Anonymize IP immediately at collection.
3. Do not combine the legal bases: consent-based newsletter, legitimate-interest-based attribution. Keep them separate in the data flow map and privacy policy.
4. If a user withdraws newsletter consent: remove them from the send list immediately. Do not reclassify as legitimate interest to continue sending. This is explicitly prohibited by EDPB guidelines and confirmed as impermissible by the ICO.
5. The privacy policy must map each processing activity to its specific legal basis. "We process your data in accordance with GDPR" with no basis specified is not compliant.

**Warning signs:**
- Privacy policy says "legitimate interest" for newsletters.
- Consent checkbox is pre-ticked.
- Single checkbox covers both platform membership and marketing communications.

**Phase to address:**
Registration phase. Legal review of consent flows before any registration form is deployed.

---

### Pitfall 12: Doxxing Risk — Public Visibility of Proposal Authors

**Severity:** NOTABLE

**What goes wrong:**
If user names are displayed publicly next to proposals or problem reports, a business owner who reports a local-level problem (e.g., a corrupt municipal official, a specific tax office) can be identified and targeted. In the Bulgarian political context — where coordinated disinformation campaigns and harassment of civic voices are documented — publishing the name of a small business owner next to a politically sensitive proposal creates a real harassment risk. This is not theoretical: the PROJECT.md explicitly lists doxxing of proposers as a known threat vector.

**How to avoid:**
1. Resolve the "names visible on proposals" decision (currently undecided in PROJECT.md) before building the proposals feature. The default-safe choice is: show only a pseudonym or anonymized identifier (e.g., "Бизнес собственик от Пловдив") on public proposal cards.
2. Give users explicit control over their display name on proposals. Allow them to set a pen name / business name rather than their legal name.
3. If full names are displayed, add a "report abuse / concern" mechanism so users can flag that their identity on a post is causing them real-world harm, and give moderators the ability to retroactively anonymize a post.
4. Store the real name internally (for GDPR accountability and moderation) while displaying only the chosen public identifier. These are separate fields.
5. Document in the privacy policy whether proposal authors are identifiable to other users, to the platform, and to third parties.

**Warning signs:**
- Proposals feature built with `user.full_name` displayed publicly without user control over this.
- No distinction between "internal identity" and "public identity" in the user schema.

**Phase to address:**
Proposals and profile phase.

---

### Pitfall 13: DSA Compliance — Content Moderation Obligations (Bulgaria, 2025)

**Severity:** NOTABLE

**What goes wrong:**
Bulgaria completed Digital Services Act implementation in November 2025, with the Communications Regulation Commission (CRC) designated as Digital Services Coordinator. The DSA requires hosting providers to implement accessible notice-and-action mechanisms (illegal content reporting), maintain moderation records, and publish annual transparency reports. A political advocacy platform hosting user-generated proposals and problem reports is a hosting provider under DSA. Failure to implement the required reporting mechanism before launch is a compliance gap.

**How to avoid:**
1. Implement a visible "Сигнализирай незаконно съдържание" (report illegal content) button on all user-generated content. The DSA requires this for hosting services.
2. Document the notice-and-action procedure: how reports are reviewed, what decisions are possible, and what the appeal process is.
3. Maintain a moderation log that can form the basis of an annual transparency report. Even if volume is low, the reporting infrastructure should be in place from launch.
4. The CRC is the supervisory authority. Understand which tier of the DSA applies: "very large online platforms" (45M+ EU users) have the most stringent obligations; SMBsite is far below that threshold but is still a hosting provider subject to baseline obligations.

**Warning signs:**
- No illegal content reporting mechanism in the moderation design.
- No moderation decision log.

**Phase to address:**
Moderation/content phase.

---

### Pitfall 14: Direct Mail QR Code — Broken, Flagged as Phishing, or No Offline Fallback

**Severity:** NOTABLE

**What goes wrong:**
Four sub-failures in direct mail QR campaigns:

1. **QR points to a short URL service**: Some mobile security suites (common on Android in Bulgaria, where Kaspersky and ESET are heavily used) flag unknown short URLs as potential phishing. The user sees a security warning before the page loads and does not proceed.

2. **QR encodes the wrong URL after print proofing**: The URL is changed after the QR is generated and approved, but the updated QR is not sent to the printer. All physical letters contain a dead link.

3. **URL encoded in QR expires or changes**: If the QR points to a redirect URL managed by a third-party QR service, and that service changes pricing, is acquired, or discontinues the product, all mailed letters become permanently broken.

4. **No offline fallback**: Older smartphone cameras, low-end phones (prevalent in the SMB target demographic), and poor lighting conditions cause QR scan failure. If there is no alternative instruction (type this URL, or call this number), those potential members are permanently lost.

**How to avoid:**
1. QR code must encode your own domain directly: `https://smb-platform.bg/qr` (or whatever the landing path is). No third-party URL shortener or QR management service in the redirect chain.
2. Final QR code generation and print-file sign-off must occur in the same session, with a documented "scan test" step as part of print approval. Test on at least three different phones (iOS, Samsung Android, low-end Android).
3. Include plain-text URL below or beside the QR code: "Или посетете: smb-platform.bg". This serves as fallback for any QR scan failure.
4. The redirect path (`/qr`) must be a permanent path, not a campaign-specific URL that might be retired. Serve the same landing content there indefinitely; just update what it shows.
5. The QR landing page must load in under 2 seconds on a mobile connection (3G/LTE). Test with Chrome DevTools throttled to "Slow 4G." Bulgaria's rural SMB owners may not have fast mobile connections.

**Warning signs:**
- QR encodes a short URL (bit.ly, tinyurl, or similar).
- No plain-text fallback URL on the printed letter.
- QR finalized before the target URL is confirmed stable.
- Landing page loads scripts from multiple CDNs that add 3+ seconds on mobile.

**Phase to address:**
Infrastructure phase (URL structure) and QR campaign preparation phase (before print approval).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Allow vote immediately after email verification (no cooling period) | Lower registration friction | Trivially scriptable brigading; political integrity risk | Never — the cooling period is the minimum viable protection |
| Single DB `DELETE` for account deletion | Simple to implement | GDPR non-compliance; data persists in logs, backups, downstream processors | Never on a GDPR-regulated platform |
| Store raw IP address in attribution table | Simple attribution query | Personal data under GDPR; requires legal basis, retention limits, deletion propagation | Only if anonymized/hashed immediately and documented |
| Pre-ticked newsletter consent | Higher newsletter sign-up rate | Invalid consent under GDPR; entire list legally unsound; CPDP enforcement risk | Never |
| Auto-publish user submissions | Faster content pipeline | Screenshot smear, defamation liability, opponent brigading via fake proposals | Never for a political platform |
| Use Google Analytics without EU proxy | Easy setup, familiar tooling | Multiple EU DPAs have found GA4 non-compliant for EU data transfers; CPDP could follow | Only with server-side proxy + EU data processing guarantee |
| WhatsApp Business API for political outreach | Familiar high-engagement channel | Account permanent ban under Meta policy; zero recovery path | Never — use Telegram or WhatsApp Channels instead |
| Single combined consent checkbox | Simpler UX | Legally invalid: consent must be granular per purpose; unlawful basis for newsletter sends | Never on a GDPR-regulated platform |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Email ESP (Mailgun / Postmark / Brevo) | Send to full list on day one of new domain | Warm up domain 4+ weeks in advance; start with transactional volume only |
| Email ESP | Use shared IP pool | Request dedicated IP or dedicated sending domain for newsletter traffic; shared pool inherits others' reputation |
| WhatsApp Business API | Assume political messaging is permitted | It is explicitly prohibited by Meta policy; use Telegram Channel or WhatsApp Channels (broadcast-only) instead |
| Analytics (GA4/Plausible) | Include full referrer URLs in events | Strip to domain only; no PII in analytics events |
| Database backups (PostgreSQL pg_dump, etc.) | Restore backup ignoring deletion register | Apply deletion register before any access to restored data; document this procedure |
| CAPTCHA (reCAPTCHA) | Use Google reCAPTCHA v3 | Google reCAPTCHA sends data to Google servers (US transfer concern); use hCaptcha or Cloudflare Turnstile for GDPR safety |
| QR code generator | Use third-party QR management service | Generate QR statically pointing to your own domain; no third-party redirect in chain |
| Error logging (Sentry / Datadog) | Log full request objects including email/IP | Sanitize personal data before logging; log user IDs only; ensure EU-hosted instance |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous registration processing | Timeouts during QR campaign surge; 503 on registration form | Queue registration confirmation jobs; return "thank you" immediately | ~500 concurrent registrations on a standard VPS |
| Live vote count query (COUNT(*) on every page load) | Slow page loads as vote table grows | Cache vote tallies with a 5-minute TTL; update cache on write | ~10,000 votes per idea |
| Full-table scan for duplicate vote check | Vote submission latency increases linearly | Compound unique index on (user_id, idea_id); enforce at DB level, not only application level | ~50,000 vote records |
| Email template rendered server-side per send | Timeout on bulk newsletter send | Pre-render templates; use ESP's own template engine; send via batch API | ~1,000 recipients in a synchronous loop |
| Landing page backed by application server | Entire site collapses when QR campaign goes viral | Static CDN-cached landing page; no DB hit on the landing URL | First large campaign scan event |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Voting enforced only at application layer, not DB | Duplicate votes possible if application has a race condition or bug; easily exploited via concurrent requests | Unique constraint at DB level: `UNIQUE(user_id, idea_id)` on the votes table |
| Proposal moderation queue accessible without role check | Opponent gaining editor credentials sees all pending proposals before publication; internal moderation decisions leaked | Role-based access control verified server-side on every moderation endpoint; no client-side-only auth checks |
| Email verification token never expires | Old verification links in forwarded emails or inbox archives can be used to activate accounts months later | Verification tokens expire after 48 hours; after expiry, user must request a new one |
| No rate limit on password reset endpoint | Password reset can be used to enumerate valid email addresses (200 = exists, 404 = not found) or to spam users with reset emails | Always return the same response regardless of whether email exists; rate limit by IP and email |
| User-submitted content rendered without sanitization | XSS in proposals, problem reports, or comments | Sanitize all user-generated HTML server-side (DOMPurify equivalent for server) before storage; escape on output |
| Member list endpoint returns all members | Enables mass scraping of member names + emails for opposition research | No public member directory endpoint; member data accessible only to authenticated user for their own data |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Email verification email lands in spam | User gives up, never activates; platform loses member | Transactional email from dedicated subdomain; subject line in Bulgarian; explicit prompt on registration page: "Проверете папка Спам" |
| QR code landing page requires JavaScript for content | Older Android WebView (common in Bulgaria's target demo) may fail to render; user sees blank page | Critical registration CTA must work without JavaScript; use progressive enhancement |
| Registration form has no progress indication | Users unsure if form submitted; double-submit; duplicate registrations | Disable submit button after first click; show spinner; explicit "Изпратено!" confirmation |
| Unsubscribe requires login | User cannot remember credentials; stays subscribed and marks as spam instead | One-click unsubscribe via signed token in email footer; no login required |
| Vocative greeting in emails | Feminine vocative (-е, -о endings) reads as rude or rustic to Bulgarian women | Use nominative for salutations; "Здравей, [Иле]!" not "Здравей, [Иле]о!" |

---

## "Looks Done But Isn't" Checklist

- [ ] **Account deletion:** Deletes from app DB only — verify deletion is also propagated to ESP contact list, WhatsApp/Telegram contact, analytics, and that a deletion record is added to the backup register.
- [ ] **Email verification:** Token stored and checked — verify token expires after 48h and that an unverified account cannot vote or submit.
- [ ] **Voting:** "One vote per user per idea" enforced in application — verify there is also a DB-level UNIQUE constraint, not just application code.
- [ ] **Consent collection:** Checkbox present on registration — verify consent is recorded in the DB with timestamp and privacy policy version; that newsletter consent is separate from platform membership consent; and that consent is not pre-ticked.
- [ ] **QR landing page:** Page loads — verify it loads under 2s on simulated 3G; that it serves correctly from CDN/cache; that the URL encoded in the QR matches the production URL exactly.
- [ ] **CAPTCHA on registration:** CAPTCHA appears — verify it cannot be bypassed by direct API POST to the registration endpoint; verify it is not reCAPTCHA without a server-side data transfer analysis.
- [ ] **Newsletter unsubscribe:** Unsubscribe link present in email — verify it works without login; verify the unsubscribe is reflected in the ESP within the same session; verify the user is not re-added to the list by any import or sync job.
- [ ] **User proposals moderation queue:** Submissions go to queue — verify submissions do not appear publicly before moderator approval; verify there is no timing race where a submission briefly appears before the queue check.
- [ ] **IP anonymization for QR attribution:** IP logged for geolocation — verify raw IP is not stored; verify only region/oblast is persisted; verify no IP appears in any persistent table after the session.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Vote brigading discovered post-launch | HIGH | Audit vote timestamps and IP patterns; identify and soft-delete suspect accounts; recalculate tallies; public transparency communication required — silence makes it worse |
| Email domain blacklisted | HIGH | Stop all sends immediately; contact ESP support; submit delisting requests to Spamhaus / Google Postmaster; warm up a new subdomain in parallel; minimum 2-4 weeks to full recovery |
| WhatsApp API account suspended | HIGH | No fast path — appeal queue is weeks; activate backup channel (Telegram, email) immediately; communicate to existing subscribers via email |
| GDPR deletion not propagated to downstream | MEDIUM-HIGH | Identify gap, issue deletion to affected processors; document remediation; if user has already complained to CPDP, proactive notification of the DPA with remediation plan reduces fine exposure |
| QR campaign site crash | HIGH (opportunity cost) | Redirect QR to static holding page; fix infrastructure; but physical letters already mailed — cannot recover that wave |
| Screenshot smear from user content | MEDIUM | Remove content immediately; post brief editorial statement; contact the media outlet if screenshot was shared with false framing; document the timeline showing the content was removed |
| Cyrillic encoding corruption in emails | LOW-MEDIUM | Fix template charset; send corrected email to affected segment with apology; monitor spam complaint rate from that segment |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Vote brigading / sockpuppets | Registration phase | Load test with simulated duplicate-registration script; verify cooling period enforced; verify CAPTCHA cannot be bypassed via API |
| GDPR Article 9 special category | Architecture / registration phase (before build) | Legal review sign-off; data flow map documents legal basis per processing type |
| Incomplete deletion | Registration + infrastructure phase | End-to-end deletion test: create account, use all features, delete, audit all systems |
| WhatsApp political content prohibition | Architecture / channel strategy (before build) | WhatsApp API integration explicitly not built; channel strategy documented |
| Email deliverability collapse | Infrastructure phase (4+ weeks before mail drop) | Google Postmaster Tools active; first warm-up send completed; complaint rate <0.1% |
| QR campaign surge / infrastructure | Infrastructure + load testing phase (before mail drop) | Load test at 2x expected peak; static landing page confirmed; waiting room configured |
| UTM / referrer PII leakage | Registration + analytics phase | IP anonymization verified in DB; UTM params stripped from URL after capture; no PII in analytics events |
| Mass fake registration attack | Registration phase | Disposable email blocklist deployed; per-subnet rate limiting active; moderator alert thresholds set |
| Screenshot smear | Moderation / proposals phase | All user submissions route through moderation queue; auto-publish disabled; submission policy published |
| Bulgarian encoding / vocative errors | Email/notification phase | Send test emails to Gmail, Outlook desktop, Outlook mobile with names containing Ж, Щ, Ъ, Ю, Я; verify no encoding artifacts |
| Lawful basis confusion | Registration phase | Legal review of consent flows; separate checkboxes per processing purpose; privacy policy maps basis per activity |
| Doxxing risk from public proposals | Proposals / profile phase | User schema has separate internal and public name fields; public display defaults to pseudonym |
| DSA compliance | Moderation / content phase | "Report illegal content" mechanism present on all user-generated content; moderation log schema in DB |
| Broken / phishing-flagged QR | QR campaign preparation (before print sign-off) | QR encodes own domain directly; scan test on 3 devices; plain-text fallback URL on letter |

---

## Sources

- Bulgarian DPA (CPDP) enforcement case — political party, unlawful processing, €12,770 fine (GDPRhub, 2023): https://gdprhub.eu/index.php?title=CPDP_(Bulgaria)_-_PPN-01-223/2021,_PPN-01-307/2021,_PPN-01-296/2021
- GDPR Article 9 — special category political opinion data: https://gdpr-info.eu/art-9-gdpr/
- ICO guidance — lawful bases for political campaigning: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-for-the-use-of-personal-data-in-political-campaigning-1/lawful-bases/
- ICO — legitimate interests basis: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/what-is-the-legitimate-interests-basis/
- EDPB Guidelines 1/2024 on legitimate interest: https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202401_legitimateinterest_en.pdf
- GDPR right to erasure — backups (ICO "beyond use" standard): https://www.itgovernance.eu/blog/en/the-gdpr-how-the-right-to-be-forgotten-affects-backups-2
- GDPR deletion in backups (VeraSafe): https://verasafe.com/blog/do-i-need-to-erase-personal-data-from-backup-systems-under-the-gdpr/
- WhatsApp Business Platform Policy — political party prohibition: https://business.whatsapp.com/policy
- WhatsApp policy enforcement documentation: https://developers.facebook.com/documentation/business-messaging/whatsapp/policy-enforcement
- Vote brigading — detection and coordination methods (Wikipedia, IFTAS): https://en.wikipedia.org/wiki/Vote_brigading
- Sockpuppet detection — literature review (George Mason University): https://journals.gmu.edu/index.php/jssr/article/view/3849
- IP address as personal data under GDPR: https://www.cookieyes.com/blog/ip-address-personal-data-gdpr/
- QR code tracking and GDPR (QR Planet): https://qrplanet.com/help/article/what-personal-data-do-you-collect-during-qr-code-tracking-and-is-this-gdpr-compliant
- UTM parameters and GDPR (Covalent Bonds): https://www.covalentbonds.com/resources/utm-tags-gdpr-data-privacy-codes-made-easy
- PII in URLs — PrivacyWise: https://www.privacy-wise.com/personal-data-in-urls/
- Email domain warm-up and spam traps (Mailgun): https://www.mailgun.com/blog/deliverability/domain-warmup-reputation-stretch-before-you-send/
- Google/Yahoo bulk sender requirements 2024 (0.3% complaint threshold): https://moosend.com/blog/email-deliverability/
- Coinbase Super Bowl QR campaign crash (20M hits/minute): https://siliconangle.com/2022/02/14/coinbase-super-bowl-qr-code-ad-crashes-website-raises-security-concerns/
- Bulgaria DSA implementation (November 2025): https://www.kinstellar.com/news-and-insights/detail/3893/bulgaria-completes-digital-services-act-implementation
- Bulgarian disinformation ecosystem — TikTok 423k fake profiles: https://brodhub.eu/en/news/bulgarian-media-tiktok-has-deleted-over-423-000-fake-profiles-linked-to-bulgaria/
- Bulgarian grammar — vocative case (Wikipedia): https://en.wikipedia.org/wiki/Bulgarian_grammar
- Rate limiting with device fingerprinting (WorkOS): https://workos.com/blog/how-workos-radar-does-rate-limiting-with-device-fingerprinting
- Bulgaria GDPR enforcement fines overview: https://cms.law/en/int/publication/gdpr-enforcement-tracker-report-2024/bulgaria
- QR codes in direct mail best practices: https://www.universalmailworks.com/blog/qr-codes-direct-mail-best-practices

---

*Pitfalls research for: civic-tech / political advocacy community platform (Bulgaria, SMB sector)*
*Researched: 2026-04-29*
