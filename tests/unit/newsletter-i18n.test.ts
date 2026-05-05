import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const bg = JSON.parse(readFileSync('messages/bg.json', 'utf8')) as Record<string, any>;

const TOPICS = ['newsletter_general', 'newsletter_voting', 'newsletter_reports', 'newsletter_events'] as const;

const TOPIC_LABELS_EXPECTED: Record<typeof TOPICS[number], string> = {
  newsletter_general: 'Общи обявявания',
  newsletter_voting:  'Нови гласувания',
  newsletter_reports: 'Отчети по инициативи',
  newsletter_events:  'Покани за събития',
};

describe('Phase 5 D-08 / D-22 — Bulgarian topic labels (locked verbatim)', () => {
  for (const topic of TOPICS) {
    it(`member.preferences.topics.${topic}.label === ${JSON.stringify(TOPIC_LABELS_EXPECTED[topic])}`, () => {
      expect(bg.member?.preferences?.topics?.[topic]?.label).toBe(TOPIC_LABELS_EXPECTED[topic]);
    });
    it(`admin.newsletters.topics.${topic} === ${JSON.stringify(TOPIC_LABELS_EXPECTED[topic])}`, () => {
      expect(bg.admin?.newsletters?.topics?.[topic]).toBe(TOPIC_LABELS_EXPECTED[topic]);
    });
    it(`email.newsletter.topicChip.${topic} is non-empty UPPERCASE Bulgarian`, () => {
      const chip = bg.email?.newsletter?.topicChip?.[topic];
      expect(typeof chip).toBe('string');
      expect(chip.length).toBeGreaterThan(0);
      expect(chip).toMatch(/^[А-ЯЁѝ\s]+$/u); // Cyrillic uppercase + spaces only
    });
  }
});

describe('Phase 5 D-22 / Phase 1 D-26 — tone lock (nominative only, NO vocative)', () => {
  const NS = ['member.preferences', 'community', 'email.newsletter', 'admin.newsletters', 'unsubscribe'] as const;
  for (const ns of NS) {
    it(`${ns} contains no Уважаеми / Уважаема / Драги forms`, () => {
      const node = ns.split('.').reduce<any>((a, k) => a?.[k], bg);
      expect(node, `namespace ${ns} must exist`).toBeTruthy();
      const blob = JSON.stringify(node);
      expect(blob, `${ns} contains forbidden vocative`).not.toMatch(/Уважаеми/);
      expect(blob, `${ns} contains forbidden vocative`).not.toMatch(/Уважаема/);
      expect(blob, `${ns} contains forbidden vocative`).not.toMatch(/Драги/);
    });
  }
});

describe('Phase 5 — email greetings are nominative + comma + period', () => {
  it('email.newsletter.greetingNamed is "Здравейте, {firstName}."', () => {
    expect(bg.email?.newsletter?.greetingNamed).toBe('Здравейте, {firstName}.');
  });
  it('email.newsletter.greetingAnonymous is "Здравейте."', () => {
    expect(bg.email?.newsletter?.greetingAnonymous).toBe('Здравейте.');
  });
});

describe('Phase 5 — i18n-direct loadT round-trip + ICU placeholder replacement', () => {
  it('loadT walks namespace tree + replaces {firstName} ICU placeholder', async () => {
    const { loadT } = await import('@/lib/email/i18n-direct');
    const t = loadT('email.newsletter');
    expect(t('greetingNamed', { firstName: 'Иван' })).toBe('Здравейте, Иван.');
    expect(t('greetingAnonymous')).toBe('Здравейте.');
  });

  it('loadT returns key as fallback when missing', async () => {
    const { loadT } = await import('@/lib/email/i18n-direct');
    const t = loadT('email.newsletter');
    expect(t('definitely-not-a-real-key')).toBe('definitely-not-a-real-key');
  });
});

describe('Phase 5 — i18n-direct getAdminT (synchronous, client-callable for Payload admin shell)', () => {
  it('getAdminT walks namespace tree synchronously (no async, no provider, no React hook)', async () => {
    const { getAdminT } = await import('@/lib/email/i18n-direct');
    const t = getAdminT('admin.newsletters');
    const sendNow = t('actions.sendBlast.now');
    expect(typeof sendNow).toBe('string');
    expect(sendNow.length).toBeGreaterThan(0);
    // Sanity: admin namespace strings are Bulgarian — must contain at least one Cyrillic char
    expect(sendNow).toMatch(/[А-яЁё]/);
  });

  it('getAdminT(admin.newsletters)(toast.error) === "Грешка" (Plan 05-07 fallback toast lock-in)', async () => {
    const { getAdminT } = await import('@/lib/email/i18n-direct');
    const t = getAdminT('admin.newsletters');
    expect(t('toast.error')).toBe('Грешка');
  });

  it('getAdminT and loadT produce identical output for the same input', async () => {
    const { loadT, getAdminT } = await import('@/lib/email/i18n-direct');
    const a = loadT('email.newsletter')('greetingNamed', { firstName: 'Мария' });
    const b = getAdminT('email.newsletter')('greetingNamed', { firstName: 'Мария' });
    expect(b).toBe(a);
    expect(b).toBe('Здравейте, Мария.');
  });
});

describe('Phase 5 — admin.newsletters.toast.error is structurally present (D-22 lock)', () => {
  it('bg.admin.newsletters.toast.error === "Грешка"', () => {
    expect(bg.admin?.newsletters?.toast?.error).toBe('Грешка');
  });
});

describe('Phase 5 — all 5 namespaces present', () => {
  for (const ns of ['member.preferences', 'community', 'email.newsletter', 'admin.newsletters', 'unsubscribe']) {
    it(`bg.${ns} exists and is an object`, () => {
      const node = ns.split('.').reduce<any>((a, k) => a?.[k], bg);
      expect(typeof node).toBe('object');
      expect(node).not.toBeNull();
    });
  }
});

describe('Phase 5 — no emoji in any new namespace (UI-SPEC §7.8)', () => {
  it('newly added namespaces contain no emoji codepoints', () => {
    for (const ns of ['member.preferences', 'community', 'email.newsletter', 'admin.newsletters', 'unsubscribe']) {
      const node = ns.split('.').reduce<any>((a, k) => a?.[k], bg);
      const blob = JSON.stringify(node ?? {});
      // Emoji range matcher (covers most BMP + supplementary emoji blocks)
      expect(blob, `${ns} contains emoji`).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });
});
