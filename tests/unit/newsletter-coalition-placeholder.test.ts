import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Phase 5 NOTIF-* — coalition-placeholder grep gate (D-CoalitionChannels follow-up).
//
// Mirrors the Phase 2 plan 02-08 pattern (also enforced by
// scripts/check-coalition-placeholders.mjs). Lives inside the vitest suite so
// the regular test:unit run flags any unresolved coalition copy that has crept
// into messages/bg.json — without blocking development.
//
// Two modes:
//   - SOFT gate (DEFAULT): test passes even if `[ТЕКСТ ОТ КОАЛИЦИЯ]` is still
//     present. A console.warn() makes the count visible in test output so
//     reviewers see at a glance how much copy is still owed by the coalition.
//   - HARD gate (PRE-LAUNCH): uncomment the documented `expect(...).toBe(0)`
//     line below before the final coalition-launch quick task. Test then fails
//     the suite until coalition-delivered copy lands.
//
// Why two modes: during Phase 2 we shipped to production with placeholders in
// the explainer body (`community.explainer.body`) — coalition delivers later.
// Soft mode keeps CI green during that interim while still surfacing the debt.
//
// To flip to HARD: edit ONE LINE below (the `// expect(occurrences ...).toBe(0);`
// comment). Once flipped, `pnpm test:unit` will FAIL until every placeholder is
// resolved by coalition copy, mirroring scripts/check-coalition-placeholders.mjs.

const PLACEHOLDER = '[ТЕКСТ ОТ КОАЛИЦИЯ]';
const BG_JSON_PATH = 'messages/bg.json';

describe('Phase 5 — coalition placeholder gate (D-CoalitionChannels follow-up)', () => {
  it('reports whether [ТЕКСТ ОТ КОАЛИЦИЯ] still appears in messages/bg.json', () => {
    const bg = readFileSync(BG_JSON_PATH, 'utf8');
    // Use split + length - 1 so the count works whether or not the placeholder
    // contains regex meta-characters; avoids the `g` flag pitfall.
    const occurrences = bg.split(PLACEHOLDER).length - 1;

    if (occurrences > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `\n  [WARN] Phase 5 coalition placeholder gate: ${occurrences} occurrence(s) of "${PLACEHOLDER}" remain in ${BG_JSON_PATH}.\n` +
          `         Soft gate: this is informational only. Before final launch,\n` +
          `         uncomment the HARD-gate line in this test (one line below).\n` +
          `         See STATE.md deferred items: D-CoalitionChannels.\n`,
      );
    }

    // HARD gate — uncomment ONE LINE below before final coalition launch:
    // expect(occurrences, 'Coalition copy not yet delivered — see D-CoalitionChannels in STATE.md').toBe(0);

    // SOFT pass: an integer count, always >= 0.
    expect(occurrences).toBeGreaterThanOrEqual(0);
  });
});
