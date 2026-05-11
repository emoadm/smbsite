# Phase 4: User Submissions + Editorial Moderation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 4-user-submissions-editorial-moderation
**Areas discussed:** Admin panel + moderation_log ownership, PROP-04 fallback, Member byline, Problem reports surface

**Framing context (set before discussion):** Phase 3 (voting catalog) is paused under the `D-LawyerTrack` decision committed earlier this session (`5d0453f`). The user's chosen direction was "re-scope Phase 4 to see if any part is unblockable without voting." Initial mapping: 13 of 14 numbered Phase 4 reqs are voting-independent (PROP-01..03, all PROB-*, all EDIT-03..07). PROP-04 is the only voting-dependent req. Three Phase-3-owned items (EDIT-01 admin login, EDIT-02 ideas CRUD, moderation_log schema) became homeless and required a re-home decision.

---

## Admin panel + moderation_log ownership

### Question 1 — где живеят EDIT-01, EDIT-02, и moderation_log?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 4 ги поема изцяло (Recommended) | Phase 4 plan владее admin login + Payload Ideas collection (без voting fields) + moderation_log schema. Phase 3 по-късно овладява само voting fields + vote-related колонки. | ✓ |
| Нов Phase 03a (admin foundation only) | Минимална нова фаза между 03 и 04: admin login + role gating + moderation_log schema + ideas Lite CRUD. По-ясна разделителна линия но повече roadmap surface. | |

**User's choice:** Phase 4 ги поема изцяло
**Notes:** Avoids inflating ROADMAP for a coalition-scale platform; keeps Phase 4 as a single coherent vertical.

### Question 2 — колко editorial роли?

| Option | Description | Selected |
|--------|-------------|----------|
| Една роля 'editor' (Recommended) | Всички с admin достъп имат същите права; първият editor се bootstrap-ва през DB seed; suspension reversal = операторски (или Phase 6 self-service). | |
| Editor + super-editor (две роли) | Super-editor дава/отнема editor права, размразява suspended акаунти, връща moderation решения. Editor прави всичко останало. Adds checks-and-balances; more code (grants, "last super-editor" guard). | ✓ |

**User's choice:** Editor + super-editor (две роли)
**Notes:** User overrode Claude's recommendation in favor of the checks-and-balances posture. Reasonable for a political-platform context where one-bad-editor risk is non-trivial.

---

## PROP-04 fallback

### Question 1 — къде отиват approved proposals без votable catalog?

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only public page "Предложения от общността" (Recommended) | Нова страница (или секция в /agenda): одобрени member proposals като read-only карти. Visible но не votable; явен надпис "Гласуването скоро". | ✓ |
| Merge в /agenda (коалиция + одобрени community proposals) | Approved member proposals се inject-ват в съществуващата /agenda страница (явна секция "Идеи от общността" под коалиционните глави). Risk: размива brand коалицията; обърква отговорност. | |
| Editorial-only (drop PROP-04 от публичния scope) | Одобрените proposals отиват във вътрешен 'archive' при редакторския екип. Член вижда 'approved' статус но няма public page. Най-консервативен вариант; запазва бранда на коалицията. | |
| Hold in admin queue без 'approved' статус | Редакторите не вземат решение 'approve/reject' докато voting не се върне — proposals си стоят в 'pending review' безсрочно. Не се препоръчва (UX = black hole). | |

**User's choice:** Read-only public page "Предложения от общността"
**Notes:** Member sees their submission lives publicly; coalition gets organic content; Phase 3 voting can layer on later with no UI rebuild.

---

## Member byline

### Question 1 — как се показва author на publicly-visible членско съдържание?

| Option | Description | Selected |
|--------|-------------|----------|
| Анонимно всичко (Recommended под defer-lawyer) | Public — "Член на коалицията" / "Анонимен сигнал". Internal admin — пълно идентичност. Никакъв нов Art.9 тригер от публичната повърхност; никаква необходимост от нов consent flow. | ✓ |
| Опционален display_name в профила | Член може да въведе display_name (nickname / съкратено име / пълно име — тяхна опция). Ако празен → "Член на коалицията". Risk: opt-in fact e Art.9(2)(а) consent тригер — изисква explicit consent text при попълване (lawyer review нужен). | |
| Име + сектор ("Иван Иванов, собственик, ИТ сектор") | Пълно идентичност + sector. Силна civic legitimacy презентация. Пълен Art.9 тригер; не може да ship-не без лавърско становище (върви срещу defer-lawyer). | |
| Инициали + сектор ("И.И., ИТ") | Pseudo-anonymous. Risk за re-identification в малки сектори × oblast. Сив гранов; лавърът би искал да потвърди. | |

**User's choice:** Анонимно всичко
**Notes:** Cleanest defer-lawyer alignment. Re-activation path noted in CONTEXT.md D-C1 — `display_name` column can be added later without schema rebase.

---

## Problem reports surface

### Question 1 — каква е публичната повърхност на problem reports?

| Option | Description | Selected |
|--------|-------------|----------|
| Aggregated heat map по oblast (Recommended) | Публична страница с карта на България + per-oblast брояч + topic breakdown. Без individual records публично. Политическа стойност: колективен сигнал; нисък spam риск; нисък moderation overhead. | ✓ |
| Public list (всички одобрени сигнали) | Публичен /сигнали лист с филтри по oblast / тема. Повече individual visibility, повече spam риск + moderation. UX problem: long-scroll лист става неинтересен при растеж. | |
| Per-signal detail pages | Всеки одобрен сигнал получава собствена страница (като proposal, без voting). Висок moderation overhead; препокриване с PROP-04 повърхността. Не се препоръчва. | |
| Editorial-only (без публична повърхност) | Проблемите са вътрешен вход за редакторския екип. Член вижда submitted/approved/rejected но няма публична видимост. Губи политическата стойност. | |

**User's choice:** Aggregated heat map по oblast

### Question 2 — small-N suppression?

| Option | Description | Selected |
|--------|-------------|----------|
| Скривай пълно при N<5 (Recommended) | Bucket с < 5 сигнала не се показва изобщо (нито брояч, нито идентификатор). Phase 3 D-03 използва N=20 за votes; N=5 тук защото няма vote-counting concern. Най-консервативен; lawyer-безопасен. | ✓ |
| Показвай '<5' при малко N | Брояч винаги, но за buckets с N<5 показвай '<5' вместо точното число. Информативно по-богато но също защитено. | |
| Показвай винаги точния брояч | Никакъв праг. '1 сигнал от Видин за регулации' се показва. Risk: при малка oblast + ниша тема, '1' може да се обвърже с конкретен МСП собственик от outsider. | |

**User's choice:** Скривай пълно при N<5
**Notes:** Aligns with defer-lawyer principle of not introducing re-identification surface area.

---

## Claude's Discretion

The following were explicitly left to the planner (or to the executor with planner guidance):
- Bootstrap mechanism for first super-editor
- Payload roles vs application-roles storage details
- Audit-log format for super-editor override actions
- moderation_log additional fields beyond Phase 3's D-08 sketch
- PROP-04 page placement in nav
- PROB heat-map update cadence (real-time vs daily aggregate cache)
- PROB topic taxonomy (free-text vs admin-curated vs hybrid)
- Section heading copy on public pages (final BG strings during planning per D-25)
- Internal admin "open submitter identity" privacy gradient
- DSA Art.16 reporting mechanism scope (numbered req silent; planner judges)
- Notification cadence on submission status change
- Suspended-account submission handling (default = preserve + show as "[suspended]")

## Deferred Ideas

- **Voting on member-submitted proposals** — Phase 3 re-activation, gated on `D-LawyerTrack` clearing.
- **Optional `display_name` byline** — Phase 4 follow-up after Art.9(2)(a) consent text is lawyer-confirmed.
- **DSA Art.16 reporting mechanism (advanced scope)** — escalate to follow-up if planner finds minimum compliance requires more than footer link + email.
- **Proposal reactions (interesting / save) without voting** — separate phase if community-signal value emerges before Phase 3 reactivates.
- **Per-signal detail pages for problem reports** — explicitly rejected this round; would require fresh discuss-phase if PROB-* evolves into per-issue advocacy.
- **Editor "compare with prior policy" view** for proposal moderation — planner discretion.
- **Notification preferences edit from member dashboard** — already in roadmap as Phase 6 GDPR self-service.
