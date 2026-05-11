import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const roleGateSrc = readFileSync(join(process.cwd(), 'src/lib/auth/role-gate.ts'), 'utf8');
const attributionViewSrc = readFileSync(
  join(process.cwd(), 'src/app/(payload)/admin/views/attribution/AttributionView.tsx'),
  'utf8',
);

describe('Phase 4 role-gate extensions', () => {
  it('assertEditorOrAdmin accepts admin, editor, super_editor', () => {
    expect(roleGateSrc).toMatch(/\['admin', 'editor', 'super_editor'\]\.includes\(role\)/);
  });
  it('assertSuperEditor exists and accepts admin or super_editor only', () => {
    expect(roleGateSrc).toMatch(/export async function assertSuperEditor/);
    expect(roleGateSrc).toMatch(/\['admin', 'super_editor'\]\.includes\(role\)/);
  });
  it('AttributionView role gate updated to include super_editor (EDIT-07 latent fix)', () => {
    expect(attributionViewSrc).toMatch(/\['admin', 'editor', 'super_editor'\]\.includes\(role\)/);
  });
});
