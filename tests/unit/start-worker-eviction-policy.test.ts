import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluateEvictionPolicy } from '../../scripts/start-worker';

// Phase 5 G4 (UAT gap closure) — startup-time eviction-policy assertion in
// scripts/start-worker.ts.
//
// BullMQ requires `maxmemory-policy=noeviction` on its Redis backend. BullMQ
// itself only WARNS — it does not refuse to start. This test enforces the
// strict no-silent-degradation contract:
//   - verified noeviction → kind: 'ok'
//   - verified non-noeviction → kind: 'wrong' (orchestrator must exit(1))
//   - CONFIG-GET errored:
//       - WORKER_SKIP_EVICTION_ASSERT unset → kind: 'unverifiable', skipped: false (orchestrator must exit(1))
//       - WORKER_SKIP_EVICTION_ASSERT=1   → kind: 'unverifiable', skipped: true  (orchestrator emits skip-warn + continues)
//
// Companion runtime verification: `.planning/phases/05-notifications/05-OPS-REDIS-EVICTION.md`
// records per-environment manual operator sign-off + skip-flag audit trail.

describe('Phase 5 G4 — start-worker.ts source-grep contracts', () => {
  const src = readFileSync('scripts/start-worker.ts', 'utf8');
  const codeOnly = src
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');

  it('references the Redis maxmemory-policy and the required noeviction value', () => {
    expect(
      codeOnly,
      'start-worker.ts must reference the maxmemory-policy key in non-comment code',
    ).toMatch(/maxmemory-policy/);
    expect(
      codeOnly,
      'start-worker.ts must reference the required noeviction value in non-comment code',
    ).toMatch(/noeviction/);
  });

  it('issues a CONFIG GET via the ioredis client', () => {
    expect(
      codeOnly,
      "start-worker.ts must invoke a CONFIG command (e.g. client.config('GET', 'maxmemory-policy'))",
    ).toMatch(/\.config\s*\(\s*['"]GET['"]|\.call\s*\(\s*['"]CONFIG['"]/);
  });

  it('terminates the process on policy mismatch AND on CONFIG-error-without-skip-flag', () => {
    // Two distinct failure modes → expect at least 2 process.exit(1) call sites
    // co-located with the assertion logic.
    const exitCount = (codeOnly.match(/process\.exit\s*\(\s*1\s*\)/g) ?? []).length;
    expect(
      exitCount,
      'start-worker.ts must have at least 2 process.exit(1) sites: one for verified-wrong-policy, one for unverifiable-without-skip-flag',
    ).toBeGreaterThanOrEqual(2);
  });

  it('references the explicit WORKER_SKIP_EVICTION_ASSERT env flag for the audit-trailed escape hatch', () => {
    expect(
      codeOnly,
      'start-worker.ts must reference the WORKER_SKIP_EVICTION_ASSERT env flag (the explicit escape hatch — silent catches are forbidden)',
    ).toMatch(/WORKER_SKIP_EVICTION_ASSERT/);
  });

  it('emits a structured, machine-greppable skip-warn line when the escape hatch is taken', () => {
    expect(
      codeOnly,
      'start-worker.ts must emit a structured `eviction-assert-skipped` warn line so downstream log-monitoring can alert on skip usage',
    ).toMatch(/eviction-assert-skipped/);
  });
});

describe('Phase 5 G4 — evaluateEvictionPolicy pure-function behavior', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns kind=ok when CONFIG GET resolves with noeviction', () => {
    const out = evaluateEvictionPolicy(
      { ok: true, value: ['maxmemory-policy', 'noeviction'] },
      { WORKER_SKIP_EVICTION_ASSERT: undefined },
    );
    expect(out).toEqual({ kind: 'ok' });
  });

  it('returns kind=wrong when CONFIG GET resolves with a non-noeviction policy', () => {
    const out = evaluateEvictionPolicy(
      { ok: true, value: ['maxmemory-policy', 'optimistic-volatile'] },
      { WORKER_SKIP_EVICTION_ASSERT: '1' }, // even with skip flag — wrong is wrong
    );
    expect(out).toEqual({ kind: 'wrong', policy: 'optimistic-volatile' });
  });

  it('returns kind=unverifiable, skipped=false when CONFIG-GET errors AND skip flag UNSET', () => {
    const out = evaluateEvictionPolicy(
      { ok: false, error: 'ERR unknown command CONFIG' },
      { WORKER_SKIP_EVICTION_ASSERT: undefined },
    );
    expect(out.kind).toBe('unverifiable');
    if (out.kind === 'unverifiable') {
      expect(out.skipped).toBe(false);
      expect(out.reason).toContain('ERR unknown command');
    }
  });

  it('returns kind=unverifiable, skipped=true when CONFIG-GET errors AND skip flag SET to "1"', () => {
    const out = evaluateEvictionPolicy(
      { ok: false, error: 'ERR unknown command CONFIG' },
      { WORKER_SKIP_EVICTION_ASSERT: '1' },
    );
    expect(out.kind).toBe('unverifiable');
    if (out.kind === 'unverifiable') {
      expect(out.skipped).toBe(true);
      expect(out.reason).toContain('ERR unknown command');
    }
  });

  it('treats unexpected CONFIG-GET shape (non-array) as unverifiable (defence in depth)', () => {
    const out = evaluateEvictionPolicy(
      { ok: true, value: 'unexpected-string-shape' as unknown as string[] },
      { WORKER_SKIP_EVICTION_ASSERT: '1' },
    );
    expect(out.kind).toBe('unverifiable');
  });
});
