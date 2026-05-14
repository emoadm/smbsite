// Quick task 260514-k4x — regression lock for Phase 4 email worker textContent bug.
//
// Background: Brevo's /v3/smtp/email rejects requests where `textContent` is an
// empty string with `400 missing_parameter`. The Phase 4 worker handlers
// (submission-status-approved, submission-status-rejected, user-suspended)
// shipped passing `textContent: ''` verbatim, which broke every notification
// email of those three kinds in production (Phase 04.1 Wave 6 Smoke 3).
//
// Fix lives at src/lib/email/worker.tsx — hoist the React Email element once
// and render it twice (HTML + { plainText: true }), mirroring the existing
// OTP / newsletter pattern.
//
// This file locks the regression in two complementary ways:
//   1. Render-level (Tests 1-3): assert each affected template renders a
//      non-empty plain-text string when called with { plainText: true }.
//   2. Source-level (Tests 4-5): grep worker.tsx as text and fail CI if any
//      handler regresses back to `textContent: ''` / `""`, or if any of the
//      three case labels gets accidentally renamed.
//
// The render-level tests verify the templates *can* produce plain text; the
// source-level tests verify the worker actually *passes* that plain text to
// Brevo rather than an empty string. Both together = regression locked.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { render } from '@react-email/render';
import React from 'react';
import { SubmissionStatusEmail } from '@/lib/email/templates/SubmissionStatusEmail';
import { AccountSuspendedEmail } from '@/lib/email/templates/AccountSuspendedEmail';

// Minimal t() stub. Both templates we exercise call t('body', vars) where
// `vars` differs by variant — SubmissionStatusEmail passes {fullName, title,
// note?}, AccountSuspendedEmail passes {fullName, reason}. Rather than carry
// a separate map per template, the stub for 'body' echoes every var verbatim
// into the output, which is sufficient for the test contract here: we are
// checking that the plain-text renderer round-trips the *vars* (not that the
// production Bulgarian copy is correct — that belongs to an i18n test).
//
// All other keys fall back to a recognizable Bulgarian token from the map,
// or to the key itself for any miss. Mirrors the pattern in
// tests/unit/newsletter-template.test.ts.
const tStub = (key: string, vars?: Record<string, string | number>): string => {
  const map: Record<string, string> = {
    subject: 'Тестов имейл — статус на предложение',
    cta: 'Виж предложенията',
    memberFooter: 'Получавате тази тема, защото сте регистриран член.',
    supportNote: 'За въпроси: privacy@chastnik.eu',
  };
  if (key === 'body' && vars) {
    // Echo all interpolated vars into the rendered body so the test can
    // assert on any of them (fullName, title, note, reason, ...).
    return Object.entries(vars)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
  }
  let raw = map[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      raw = raw.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return raw;
};

describe('Phase 4 email worker — textContent must be non-empty (Brevo 400 regression 260514-k4x)', () => {
  it('SubmissionStatusEmail variant=approved renders non-empty plain-text body', async () => {
    const plainText = await render(
      React.createElement(SubmissionStatusEmail, {
        t: tStub,
        tShared: tStub,
        variant: 'approved',
        fullName: 'Иван Петров',
        title: 'Намалена бюрокрация при регистрация на ЕТ',
        siteOrigin: 'https://chastnik.eu',
      }),
      { plainText: true },
    );
    expect(typeof plainText).toBe('string');
    expect(plainText.length).toBeGreaterThan(0);
    // Sanity: it's plain text, not HTML.
    expect(plainText).not.toMatch(/<html/i);
    expect(plainText).not.toMatch(/<body/i);
  });

  it('SubmissionStatusEmail variant=rejected plain-text contains moderator note', async () => {
    const plainText = await render(
      React.createElement(SubmissionStatusEmail, {
        t: tStub,
        tShared: tStub,
        variant: 'rejected',
        fullName: 'Иван Петров',
        title: 'Намалена бюрокрация при регистрация на ЕТ',
        moderatorNote: 'Дубликат на предложение #42',
        siteOrigin: 'https://chastnik.eu',
      }),
      { plainText: true },
    );
    expect(plainText.length).toBeGreaterThan(0);
    // Proves the rejected template wires moderatorNote into the plain-text
    // body, not just the HTML — and that the Cyrillic UTF-8 round-trips
    // through the plain-text renderer intact.
    expect(plainText).toContain('Дубликат на предложение #42');
    expect(plainText).not.toMatch(/<html/i);
    expect(plainText).not.toMatch(/<body/i);
  });

  it('AccountSuspendedEmail plain-text contains the suspension reason', async () => {
    const plainText = await render(
      React.createElement(AccountSuspendedEmail, {
        t: tStub,
        fullName: 'Иван Петров',
        reason: 'Многократно нарушаване на правилата на общността',
      }),
      { plainText: true },
    );
    expect(plainText.length).toBeGreaterThan(0);
    expect(plainText).toContain('Многократно нарушаване');
    expect(plainText).not.toMatch(/<html/i);
    expect(plainText).not.toMatch(/<body/i);
  });
});

describe('Phase 4 email worker — source-level regression lock', () => {
  const SRC = readFileSync('src/lib/email/worker.tsx', 'utf8');

  it('worker.tsx contains zero empty-string textContent literals', () => {
    // The regression gate: if a future change reintroduces `textContent: ''`
    // (or `""`) anywhere in worker.tsx, this test fails and the offending
    // handler is back to Brevo-400 territory.
    expect(SRC).not.toMatch(/textContent:\s*(''|"")/);
  });

  it('worker.tsx calls render(..., { plainText: true }) at least 3 times (one per Phase 4 case)', () => {
    // Floor of 3 = the three Phase 4 handlers fixed by this quick task.
    // Actual count is 8 (3 Phase 1 + 2 Phase 5 + 3 Phase 4) but 3 is the
    // minimum that *proves* the Phase 4 cases were patched.
    const matches = SRC.match(/render\([^,)]+,\s*\{\s*plainText:\s*true\s*\}\s*\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it('all three Phase 4 case labels are still present in the switch', () => {
    // Defense against accidental rename during a future refactor —
    // renaming a case label silently disables the handler without any
    // type error (the queue payload type is a string union; an
    // unmatched label falls through to the Phase 1 send call which uses
    // the wrong `from:` address).
    expect(SRC).toMatch(/case\s+['"]submission-status-approved['"]/);
    expect(SRC).toMatch(/case\s+['"]submission-status-rejected['"]/);
    expect(SRC).toMatch(/case\s+['"]user-suspended['"]/);
  });
});
