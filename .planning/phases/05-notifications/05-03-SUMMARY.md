---
phase: 05-notifications
plan: 03
subsystem: email-content-layer
tags: [phase-5, react-email, lexical, i18n, cyrillic, outlook, tdd]
dependency_graph:
  requires: []
  provides:
    - src/lib/email/templates/NewsletterEmail.tsx
    - src/lib/newsletter/lexical-to-html.ts
    - src/lib/email/i18n-direct.ts
    - messages/bg.json (5 new namespaces)
  affects:
    - 05-05 (worker — imports loadT + NewsletterEmail)
    - 05-06 (unsubscribe page — uses unsubscribe namespace)
    - 05-07 (composer — imports getAdminT, uses admin.newsletters namespace)
    - 05-08 (preferences page — uses member.preferences namespace)
    - 05-09 (community page — uses community namespace)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN/REFACTOR cycle (2 tasks)
    - dot-notation sub-key lookup in i18n walker (extends worker.tsx pattern)
    - dangerouslySetInnerHTML with div (not Section) for Lexical HTML slot
    - HTMLConvertersFunction with any-typed upload override for Payload Lexical types
key_files:
  created:
    - src/lib/email/templates/NewsletterEmail.tsx
    - src/lib/newsletter/lexical-to-html.ts
    - src/lib/email/i18n-direct.ts
    - tests/unit/newsletter-i18n.test.ts
    - tests/unit/newsletter-template.test.ts
    - tests/unit/lexical-to-html.test.ts
  modified:
    - messages/bg.json (5 new namespaces: member.preferences, community, email.newsletter, admin.newsletters, unsubscribe)
decisions:
  - "D-17 brand restraint applied: single accent #004A79 for ALL 4 topics — NOT the multi-color from RESEARCH Example A. Topic context conveyed via chip text label."
  - "i18n-direct.ts extends worker.tsx loadT pattern with dot-notation sub-key lookup (e.g., t('actions.sendBlast.now') walks nested objects) — required for admin.newsletters namespace depth."
  - "Lexical content slot uses <div dangerouslySetInnerHTML> instead of react-email Section component (Section conflicts with dangerouslySetInnerHTML in react-email 0.1.0 + React 19)."
  - "lexical-to-html.ts upload converter typed with any for node arg to avoid SerializedUploadNode import complexity (type not re-exported via @payloadcms/richtext-lexical/html)."
  - "bg.admin.newsletters.toast.error === 'Грешка' locked in messages/bg.json for Plan 05-07 NewsletterComposer.tsx onCancelScheduled fallback toast (D-22 no hardcoded Cyrillic in components)."
metrics:
  duration: "~16 minutes"
  completed: "2026-05-05"
  tasks_completed: 2
  files_changed: 7
---

# Phase 05 Plan 03: Email Content Layer — Summary

**One-liner:** React Email master template (charset + Cyrillic-safe, single-accent D-17) + Lexical→HTML converter (Outlook HTML attrs) + loadT/getAdminT i18n factories + 5 Bulgarian copy namespaces.

## What Was Built

### Task 1: messages/bg.json + i18n-direct.ts + tone-lock tests (TDD)

**messages/bg.json** extended with 5 new top-level namespaces (verbatim from UI-SPEC §7):

1. **`member.preferences`** — 4 topic toggles (newsletter_general/voting/reports/events), channel selector, language, toast, links
2. **`community`** — WhatsApp Channel + Telegram copy, placeholder, explainer (coalition placeholder body)
3. **`email.newsletter`** — nominative greetings, 4 UPPERCASE topicChip labels, RFC 8058 footer text
4. **`admin.newsletters`** — full composer labels, topics, gates, statuses, cancel dialog, postSend, testSend.toast, **toast.error = "Грешка"**
5. **`unsubscribe`** — success/expired/invalid page states

**src/lib/email/i18n-direct.ts** — exports TWO factories from one `buildT` helper:
- `loadT(namespace): EmailT` — worker / async server context (same pattern as worker.tsx lines 30-46 but with dot-notation sub-key support)
- `getAdminT(namespace): EmailT` — synchronous, client-callable; for Payload admin custom components where `NextIntlClientProvider` is NOT mounted by the Payload admin shell

**Key shape — `EmailT`:**
```typescript
type EmailT = (key: string, vars?: Record<string, string | number>) => string;
```

Both factories support:
- Dot-notation namespace walk: `loadT('email.newsletter')` → walks `bg.email.newsletter`
- Dot-notation sub-key lookup: `t('actions.sendBlast.now')` → walks `dict.actions.sendBlast.now`
- ICU placeholder replacement: `{firstName}` → value
- Unknown key passthrough: returns key string itself

**tests/unit/newsletter-i18n.test.ts** — 31 tests across:
- Topic label lock (D-08 verbatim × 3 namespaces)
- Tone lock (no Уважаеми/Уважаема/Драги in any of the 5 namespaces)
- Nominative greeting lock
- loadT ICU round-trip + unknown key passthrough
- getAdminT synchronous round-trip + toast.error === "Грешка" lock-in
- loadT/getAdminT identical output assertion
- admin.newsletters.toast.error structural presence
- All 5 namespaces exist
- No emoji in any namespace

### Task 2: NewsletterEmail.tsx + lexical-to-html.ts + render/source tests (TDD)

**src/lib/email/templates/NewsletterEmail.tsx** — Sinya-branded React Email master template:

```typescript
// Key types
export type NewsletterEmailT = (key: string, vars?: Record<string, string | number>) => string;
export type NewsletterTopic = 'newsletter_general' | 'newsletter_voting' | 'newsletter_reports' | 'newsletter_events';
export interface NewsletterEmailProps {
  t: NewsletterEmailT;
  fullName?: string;
  subject: string;
  previewText: string;
  topic: NewsletterTopic;
  bodyHtml: string;       // Output of renderLexicalToHtml — sanitized at source
  unsubUrl: string;       // Signed HMAC URL
  preferencesUrl: string;
  year: number;
}
```

Invariants enforced:
- `<Html lang="bg">` — Bulgarian locale declaration
- `<meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />` + `<meta charSet="utf-8" />` — Pitfall 5 defense-in-depth
- `maxWidth: 600` — Outlook-standard email container width
- `fontWeight: 800` h1 — Gilroy ExtraBold (UI-SPEC §3.2)
- `const ACCENT = '#004A79'` — single brand accent for ALL 4 topics (D-17/UI-SPEC §4.4)
- `<div dangerouslySetInnerHTML={{ __html: bodyHtml }} />` — Lexical HTML content slot
- RFC 8058 footer: preferencesUrl link + unsubUrl one-click link + topic line + copyright
- **Zero Cyrillic literals** — all copy via `t()` prop (Phase 02.1 lock pattern)

**src/lib/newsletter/lexical-to-html.ts** — Lexical AST → HTML converter:
```typescript
export function renderLexicalToHtml(data: Parameters<typeof convertLexicalToHTML>[0]['data']): string
```
- Wraps `@payloadcms/richtext-lexical/html` `convertLexicalToHTML`
- Custom `upload` converter emits `width="${width}" height="${height}"` HTML attributes (RESEARCH Pitfall 1 — Outlook ignores CSS sizing)
- Default converters (paragraph/heading/link/list) unchanged

**Tests:** 11 render tests + 4 source-grep tests + 4 lexical-to-html tests = 15 new tests.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (i18n) | f669154 | test(05-03): failing tests for newsletter i18n |
| GREEN (i18n) | 7a791b7 | feat(05-03): bg.json + i18n-direct.ts |
| RED (template) | 31d1b9f | test(05-03): failing tests for NewsletterEmail + lexical |
| GREEN (template) | aad573d | feat(05-03): NewsletterEmail + lexical-to-html |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Section dangerouslySetInnerHTML conflicts with React Email**
- **Found during:** Task 2 (test run — "Can only set one of children or props.dangerouslySetInnerHTML")
- **Issue:** react-email's `Section` component internally manages children, conflicting with `dangerouslySetInnerHTML` in React 19 SSR
- **Fix:** Replaced `<Section dangerouslySetInnerHTML=...>` with `<div dangerouslySetInnerHTML=...>`. The HTML output is functionally identical for email clients.
- **Files modified:** `src/lib/email/templates/NewsletterEmail.tsx`
- **Commit:** aad573d (included in GREEN implementation commit)

**2. [Rule 2 - Missing] i18n-direct.ts needed dot-notation sub-key lookup**
- **Found during:** Task 1 (manual verification — `t('actions.sendBlast.now')` returned the key itself)
- **Issue:** The worker.tsx pattern only does flat key lookup `dict[key]`. The `admin.newsletters` namespace has nested keys 3 levels deep (`actions.sendBlast.now`) that require sub-path walking.
- **Fix:** Enhanced `buildT` to walk dot-notation key paths within the namespace dict using `reduce`. Backward compatible — flat keys still work.
- **Files modified:** `src/lib/email/i18n-direct.ts`
- **Commit:** 7a791b7

**3. [Rule 1 - Bug] HTMLConvertersFunction TypeScript typing issue**
- **Found during:** Task 2 (typecheck — `HTMLConvertersFunction`, `DefaultNodeTypes` not in `@payloadcms/richtext-lexical` main export)
- **Issue:** The RESEARCH skeleton imported `HTMLConvertersFunction`, `DefaultNodeTypes` from `@payloadcms/richtext-lexical`, but `HTMLConvertersFunction` is only in `@payloadcms/richtext-lexical/html`; `DefaultNodeTypes` is not re-exported via the `/html` subpath. `SerializedUploadNode` type not resolvable without the `lexical` package as a direct dependency.
- **Fix:** Import `HTMLConvertersFunction` from `@payloadcms/richtext-lexical/html` only; use `any` type for upload converter node arg (pragmatic — Payload's upload node type not re-exported); use `Parameters<typeof convertLexicalToHTML>[0]['data']` for the data parameter type.
- **Files modified:** `src/lib/newsletter/lexical-to-html.ts`
- **Commit:** aad573d

**4. [Rule 1 - Bug] JSON syntax error from ASCII double-quotes inside typographic Bulgarian quote pairs**
- **Found during:** Task 1 (JSON.parse validation)
- **Issue:** When writing `messages/bg.json`, closing typographic quotes `"` (U+201D) intended in strings like `„{subject}"` were written as ASCII `"` (U+0022), terminating the JSON string prematurely. Affected 4 strings: cancel.dialog.body, postSend.body, attribution.subtitle, attribution.tables.bySelfReportedSource.
- **Fix:** Python script detected all instances and replaced closing ASCII `"` after `„...content` with the correct LEFT DOUBLE QUOTATION MARK `"` (U+201C). JSON validates correctly.
- **Files modified:** `messages/bg.json`
- **Commit:** 7a791b7

## Known Stubs

- `community.explainer.body` = `[ТЕКСТ ОТ КОАЛИЦИЯ — обяснение на политиката broadcast-only WhatsApp + двупосочна Telegram]` — intentional per Phase 2 D-02 coalition-content placeholder pattern. Pre-launch grep gate: `check:placeholders` script must catch this before production deploy.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced by this plan. The `renderLexicalToHtml` function is server-side-only and wraps Payload's official converter (T-05-03-01 mitigated). Charset declarations locked by tests (T-05-03-02 mitigated). Upload URL escaping via `&quot;` replacement (T-05-03-03 mitigated).

## Self-Check: PASSED

Files exist:
- src/lib/email/templates/NewsletterEmail.tsx — FOUND
- src/lib/newsletter/lexical-to-html.ts — FOUND
- src/lib/email/i18n-direct.ts — FOUND
- tests/unit/newsletter-i18n.test.ts — FOUND
- tests/unit/newsletter-template.test.ts — FOUND
- tests/unit/lexical-to-html.test.ts — FOUND
- messages/bg.json (5 new namespaces) — FOUND

Commits exist:
- f669154 test(05-03): RED for i18n — FOUND
- 7a791b7 feat(05-03): GREEN for i18n — FOUND
- 31d1b9f test(05-03): RED for template — FOUND
- aad573d feat(05-03): GREEN for template — FOUND

Test results: 161/161 passing (21 test files)
TypeScript: 0 errors
JSON: valid
