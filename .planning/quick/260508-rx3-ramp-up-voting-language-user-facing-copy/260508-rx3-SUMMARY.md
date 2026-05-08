---
quick_id: 260508-rx3
slug: ramp-up-voting-language-user-facing-copy
status: complete
date: 2026-05-08
files_changed:
  - src/components/forms/RegistrationForm.tsx
  - src/app/actions/register.ts
  - messages/bg.json
  - tests/unit/register-newsletter-rows.test.ts
---

# Quick Task 260508-rx3 — Summary

## What changed

**Goal:** Allow real-user ramp-up on Phases 1 / 2 / 2.1 / 02.2 / 5 (registration, agenda, attribution, newsletter) without misrepresenting Phase 3 voting features that remain blocked by the GDPR Art. 9 legal opinion (`.planning/legal/art9-brief-to-counsel.md`).

**Form:**
- `src/components/forms/RegistrationForm.tsx` — dropped the `consent_political` ConsentCheckbox. Form now renders 3 consent checkboxes (privacyTerms, cookies, newsletter) instead of 4. Inline comment points back to this quick task and the legal brief for re-introduction.
- `src/app/actions/register.ts` — dropped `consent_political` from the Zod schema and the `political_opinion` row from the `consents` INSERT. The `political_opinion` kind remains in `src/db/schema/consents.ts` enum so re-activation is additive when Phase 3 ships.

**Copy (`messages/bg.json`):**
- `auth.register.consents.politicalOpinion` — key removed (no longer rendered in form).
- `landing.vision.cards[0].title` — "Гласуване по идеи" → "Гласуване по идеи (предстои)".
- `landing.vision.cards[0].body` — present tense → future tense ("Когато активираме гласуването, …").
- `landing.vision.cards[1].body` — "Членовете внасят политически инициативи…" → "Коалицията публикува конкретни предложения по програмата за реакция и обратна връзка от членовете."
- `landing.notifyCard.title` — "Първи граждански инициативи за гласуване" → "Първи новини от програмата на коалицията".
- `landing.notifyCard.body` — voting promise → "Когато публикуваме конкретни предложения по програмата, ще ви известим по имейл."
- `faq.q.proposals.answer` — "Да, можете да внасяте предложения" → editorial-team-only with explicit Art. 9 framing.
- `email.welcome.body` — "Скоро ще можеш да гласуваш…" → "Засега ще получаваш програмата и бюлетина… ще те известим, когато отворим гласуванията".

**Test:**
- `tests/unit/register-newsletter-rows.test.ts` — flipped the assertion for `political_opinion`. Was: source must contain that row. Now: source must NOT contain that row, with explanatory comment pointing back to this quick task.

## What was NOT changed

- `src/db/schema/consents.ts` — `political_opinion` kind remains in the enum.
- `.planning/legal/*` — briefs to external counsel describe full design intent, not the ramp-up state.
- Newsletter topic enums (`newsletter_voting`) — valid future newsletter category.
- `destructive.deleteAccountConfirm` — describes hypothetical deletion, harmless.
- Privacy notice page body — currently empty (substantive privacy notice is its own work).

## Verification

- `pnpm tsc --noEmit` — clean.
- `pnpm test:unit` — 346/346 pass (1 test updated to match new shape).
- `pnpm lint` — only pre-existing warnings, no new issues.

## Re-activation when Art. 9 opinion arrives

When the legal opinion comes back and Phase 3 ships:
1. Add the consent_political checkbox back in `RegistrationForm.tsx`.
2. Add the Zod field + `political_opinion` consent INSERT back in `register.ts`.
3. Restore the `politicalOpinion` i18n key in `messages/bg.json` with whatever wording counsel approves.
4. Flip the test assertion in `register-newsletter-rows.test.ts` back.
5. Reword the landing card 0 + notify card + FAQ + welcome email to active-tense.

## Commit

`fix(legal): hide voting copy + political consent — ramp-up without Phase 3 (Art. 9 still gated)`
