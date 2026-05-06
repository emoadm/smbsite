// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';

// Phase 5 G2 (UAT gap closure) — runtime mount test for the gate-field wiring.
//
// The source-grep contract (tests/unit/newsletter-composer-gate-wiring.test.ts)
// catches copy-paste regressions at the source level. This test catches the
// SAME bug class at runtime: with savedDocumentData populated, SendBlastButton
// must be enabled; without, disabled. Three scenarios cover the three branches
// of computeGate() in SendBlastButton.tsx:
//   - 'recent'       → enabled
//   - 'never'        → disabled (no lastTestSentAt)
//   - 'invalidated'  → disabled (lastEditedAfterTestAt = true)

// Mock @payloadcms/ui so we do not need a real DocumentInfoProvider.
// useDocumentInfo() is the only export NewsletterComposer reads.
const mockUseDocumentInfo = vi.fn();

vi.mock('@payloadcms/ui', () => ({
  useDocumentInfo: () => mockUseDocumentInfo(),
}));

// LivePreviewIframe transitively imports a 'use server' Server Action
// (src/lib/newsletter/preview.ts → renderPreview). At unit-test render
// time we have no Next.js runtime, so stub the iframe with a passthrough.
vi.mock('@/components/payload/LivePreviewIframe', () => ({
  LivePreviewIframe: () => React.createElement('iframe', { 'data-testid': 'live-preview-iframe-stub' }),
}));

// Server Actions imported from @/app/actions/* are also no-op in the unit
// test runtime; the composer only invokes them inside click handlers we
// never trigger here. Stub them defensively to keep the import graph clean.
// SendBlastButton.tsx transitively imports `@/payload.config` via
// `@/app/actions/send-blast`, which crashes at module load time in jsdom
// because @next/env is CommonJS and payload.config does named imports of it.
// Stubbing the actions short-circuits that import chain.
vi.mock('@/app/actions/send-test', () => ({
  sendTest: vi.fn(),
}));
vi.mock('@/app/actions/cancel-scheduled', () => ({
  cancelScheduled: vi.fn(),
}));
vi.mock('@/app/actions/send-blast', () => ({
  sendBlast: vi.fn(),
}));
// Defensive — if any path still resolves payload.config, give it an empty default.
vi.mock('@/payload.config', () => ({
  default: {},
}));

import { NewsletterComposer } from '@/components/payload/NewsletterComposer';

function renderComposer() {
  return render(
    React.createElement(NewsletterComposer, {
      newsletterId: 'test-id',
      subject: 'Test subject',
      previewText: 'Preview',
      topic: 'newsletter_general',
      fullName: 'Test Name',
      lexicalAst: {
        root: { type: 'root', children: [], direction: null, format: '', indent: 0, version: 1 },
      },
      scheduledAt: null,
      status: 'draft',
    }),
  );
}

function findSendBlastButton(): HTMLButtonElement | null {
  // SendBlastButton renders a <button> with the localized blast label
  // (`Изпрати бюлетина` after Plan 05-13's i18n fix, or `Планирай изпращане`
  // when scheduledAt is set). When the gate is non-recent, Radix Tooltip's
  // `asChild` trigger wraps the button — under React 19 + jsdom this can
  // surface as two `role=button` matches (one base, one tooltip-trigger
  // forwarded clone). Both render the same accessible name and the same
  // `disabled` state, so picking either is safe; we take the LAST match
  // (the one actually attached to the rendered tree at the action-bar
  // location, after the tooltip slot wrap).
  const matches = screen.queryAllByRole('button', {
    name: /Изпрати бюлетина|Планирай изпращане/,
  });
  if (matches.length === 0) return null;
  return matches[matches.length - 1] as HTMLButtonElement;
}

describe('Phase 5 G2 — NewsletterComposer mounts SendBlastButton with correct gate state', () => {
  beforeEach(() => {
    mockUseDocumentInfo.mockReset();
  });

  it('enables SendBlastButton when savedDocumentData has a recent lastTestSentAt and no edits since', () => {
    const recentISO = new Date(Date.now() - 60_000).toISOString(); // 1 min ago — clearly within 24h
    mockUseDocumentInfo.mockReturnValue({
      id: 'test-id',
      savedDocumentData: {
        id: 'test-id',
        lastTestSentAt: recentISO,
        lastEditedAfterTestAt: false,
      },
    });

    renderComposer();
    const button = findSendBlastButton();
    expect(button, 'SendBlastButton must be rendered when newsletterId is present').not.toBeNull();
    expect(button!).not.toBeDisabled();
  });

  it('disables SendBlastButton when savedDocumentData has no lastTestSentAt (gate=never)', () => {
    mockUseDocumentInfo.mockReturnValue({
      id: 'test-id',
      savedDocumentData: { id: 'test-id' },
    });

    renderComposer();
    const button = findSendBlastButton();
    expect(button).not.toBeNull();
    expect(button!).toBeDisabled();
  });

  it('disables SendBlastButton when lastEditedAfterTestAt=true (gate=invalidated)', () => {
    const recentISO = new Date(Date.now() - 60_000).toISOString();
    mockUseDocumentInfo.mockReturnValue({
      id: 'test-id',
      savedDocumentData: {
        id: 'test-id',
        lastTestSentAt: recentISO,
        lastEditedAfterTestAt: true,
      },
    });

    renderComposer();
    const button = findSendBlastButton();
    expect(button).not.toBeNull();
    expect(button!).toBeDisabled();
  });
});
