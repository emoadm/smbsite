import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { CommunityChannels } from '@/globals/CommunityChannels';

describe('Phase 5 D-12 — CommunityChannels Payload Global', () => {
  it('slug is "community-channels"', () => {
    expect(CommunityChannels.slug).toBe('community-channels');
  });

  it('read access is public (returns true unconditionally)', () => {
    const readFn = (CommunityChannels.access as Record<string, unknown>).read as () => boolean;
    expect(typeof readFn).toBe('function');
    expect(readFn()).toBe(true);
  });

  it('update access is editor/admin only (singular role, D-25)', () => {
    const updateFn = (CommunityChannels.access as Record<string, unknown>).update as (a: { req: { user: unknown } }) => boolean;
    expect(updateFn({ req: { user: { role: 'admin' } } })).toBe(true);
    expect(updateFn({ req: { user: { role: 'editor' } } })).toBe(true);
    expect(updateFn({ req: { user: { role: 'member' } } })).toBe(false);
    expect(updateFn({ req: { user: null } })).toBe(false);
  });

  it('all 5 required fields exist with correct types and defaults', () => {
    const byName = new Map(CommunityChannels.fields.map((f) => [(f as { name?: string }).name, f]));
    expect((byName.get('whatsappChannelUrl') as { type: string }).type).toBe('text');
    expect((byName.get('whatsappVisible') as { type: string; defaultValue?: boolean }).type).toBe('checkbox');
    expect((byName.get('whatsappVisible') as { defaultValue?: boolean }).defaultValue).toBe(false);
    expect((byName.get('telegramChannelUrl') as { type: string }).type).toBe('text');
    expect((byName.get('telegramVisible') as { type: string; defaultValue?: boolean }).type).toBe('checkbox');
    expect((byName.get('telegramVisible') as { defaultValue?: boolean }).defaultValue).toBe(false);
    expect((byName.get('bgDescription') as { type: string }).type).toBe('textarea');
  });
});

describe('Phase 5 — payload.config.ts wires Newsletters + CommunityChannels', () => {
  const SRC = readFileSync('src/payload.config.ts', 'utf8');

  it('imports Newsletters from ./collections/Newsletters', () => {
    expect(SRC).toMatch(/from\s+['"]\.\/collections\/Newsletters['"]/);
  });

  it('imports CommunityChannels from ./globals/CommunityChannels', () => {
    expect(SRC).toMatch(/from\s+['"]\.\/globals\/CommunityChannels['"]/);
  });

  it('collections array contains both Users AND Newsletters', () => {
    // Phase 4 EDIT-03/EDIT-02 extends the array with Pages + Ideas; assert
    // only that Users + Newsletters remain in the array (in that order).
    expect(SRC).toMatch(/collections:\s*\[\s*Users\s*,\s*Newsletters\b/);
  });

  it('globals array contains CommunityChannels', () => {
    expect(SRC).toMatch(/globals:\s*\[\s*CommunityChannels\s*\]/);
  });

  it('preserves the Phase 02.1 attribution view registration verbatim (Pitfall 7)', () => {
    expect(SRC).toContain('/src/app/(payload)/admin/views/attribution/AttributionView#AttributionView');
    expect(SRC).toContain("path: '/views/attribution'");
  });
});
