import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Phase 5 G3 (UAT gap closure) — Bulgarian register tone-lock for newsletter
// admin namespace.
//
// Extends the Phase 02.1 D-27 tone-lock pattern. The previous lock checked
// for vocative forms (Уважаем*); this lock adds a forbidden register stem
// `реклам` (advertisement / commercial). A political-advocacy newsletter
// sent to coalition members must read as a `бюлетин` (newsletter), never
// as a `реклама` (advertisement).
//
// The forbidden token is intentionally the bare stem so it catches all
// declensions: реклама, рекламата, рекламно, рекламни, рекламирам, etc.

const bg = JSON.parse(readFileSync('messages/bg.json', 'utf8')) as Record<string, unknown>;

function collectStringValues(node: unknown, acc: string[] = []): string[] {
  if (typeof node === 'string') {
    acc.push(node);
  } else if (Array.isArray(node)) {
    for (const child of node) collectStringValues(child, acc);
  } else if (node && typeof node === 'object') {
    for (const v of Object.values(node)) collectStringValues(v, acc);
  }
  return acc;
}

describe('Phase 5 G3 — admin.newsletters i18n register lock', () => {
  it('admin.newsletters.actions.sendBlast.now reads as a newsletter action', () => {
    // bg.admin.newsletters.actions.sendBlast.now
    const adminNs = (bg.admin as Record<string, unknown> | undefined) ?? {};
    const newsletters = (adminNs.newsletters as Record<string, unknown> | undefined) ?? {};
    const actions = (newsletters.actions as Record<string, unknown> | undefined) ?? {};
    const sendBlast = (actions.sendBlast as Record<string, unknown> | undefined) ?? {};
    expect(sendBlast.now, 'admin.newsletters.actions.sendBlast.now must read as a newsletter action, not an advertisement').toBe(
      'Изпрати бюлетина',
    );
  });

  it('admin.newsletters namespace contains no `реклам*` register slips', () => {
    const adminNs = (bg.admin as Record<string, unknown> | undefined) ?? {};
    const newsletters = (adminNs.newsletters as Record<string, unknown> | undefined) ?? {};
    const values = collectStringValues(newsletters);
    const offending = values.filter((v) => /реклам/i.test(v));
    expect(
      offending,
      `admin.newsletters values must not contain the forbidden register stem 'реклам' (advertisement). Found: ${JSON.stringify(offending)}`,
    ).toEqual([]);
  });

  it('email.newsletter namespace contains no `реклам*` register slips', () => {
    const emailNs = (bg.email as Record<string, unknown> | undefined) ?? {};
    const newsletter = (emailNs.newsletter as Record<string, unknown> | undefined) ?? {};
    const values = collectStringValues(newsletter);
    const offending = values.filter((v) => /реклам/i.test(v));
    expect(
      offending,
      `email.newsletter values must not contain the forbidden register stem 'реклам' (advertisement). Found: ${JSON.stringify(offending)}`,
    ).toEqual([]);
  });
});
