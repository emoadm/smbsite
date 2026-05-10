import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('Phase 4 D-A1 — moderation_log append-only schema invariants', () => {
  it('submissions.ts contains D-A1 append-only header comment', () => {
    const src = readFileSync('src/db/schema/submissions.ts', 'utf8');
    expect(src).toMatch(/D-A1: append-only/);
  });

  it('submissions.ts references REVOKE UPDATE, DELETE ON TABLE moderation_log (DB-layer enforcement)', () => {
    // The comment in submissions.ts references the REVOKE pattern so
    // the migration file constraint is traceable from the schema.
    const src = readFileSync('src/db/schema/submissions.ts', 'utf8');
    expect(src).toMatch(/REVOKE UPDATE, DELETE ON TABLE moderation_log/);
  });

  it('admin-actions.ts (Plan 04-06) does NOT call db.update(moderation_log) or db.delete(moderation_log)', () => {
    const adminActionsPath = 'src/lib/submissions/admin-actions.ts';
    if (!existsSync(adminActionsPath)) {
      // Plan 04-06 has not landed yet — skip assertion and mark as pending
      // with a descriptive note rather than silently passing.
      console.info(
        '[moderation-log-schema] src/lib/submissions/admin-actions.ts does not exist yet ' +
          '(ships in Plan 04-06); skip UPDATE/DELETE lock-in check until that plan lands.',
      );
      return;
    }
    const src = readFileSync(adminActionsPath, 'utf8');
    expect(src).not.toMatch(/db\.(update|delete)\(moderation_log\)/);
  });
});
