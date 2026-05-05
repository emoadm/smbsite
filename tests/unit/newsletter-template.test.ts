import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { render } from '@react-email/render';
import React from 'react';
import { NewsletterEmail } from '@/lib/email/templates/NewsletterEmail';

const tStub = (key: string, vars?: Record<string, string | number>) => {
  const map: Record<string, string> = {
    greetingNamed: 'Здравейте, {firstName}.',
    greetingAnonymous: 'Здравейте.',
    'topicChip.newsletter_general': 'ОБЩИ ОБЯВЯВАНИЯ',
    'topicChip.newsletter_voting': 'НОВИ ГЛАСУВАНИЯ',
    'topicChip.newsletter_reports': 'ОТЧЕТИ ПО ИНИЦИАТИВИ',
    'topicChip.newsletter_events': 'ПОКАНИ ЗА СЪБИТИЯ',
    'footer.preferencesIntro': 'Получавате тази тема защото сте се абонирали за нашия бюлетин.',
    'footer.preferencesLink': 'Управление на абонаментите',
    'footer.unsubIntro': 'Не желаете повече известия?',
    'footer.unsubLink': 'Отпиши се с един клик',
    'footer.topicLine': 'Тема: {topicLabel}',
    'footer.organization': 'Коалиция Синя България',
    'footer.contactLine': 'Контакт: privacy@chastnik.eu',
    'footer.copyright': '© {year} Всички права запазени',
  };
  let raw = map[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      raw = raw.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return raw;
};

describe('Phase 5 D-17 / D-18 — NewsletterEmail render contract', () => {
  it('declares charset utf-8 explicitly in head (Pitfall 5)', async () => {
    const html = await render(
      React.createElement(NewsletterEmail, {
        t: tStub,
        subject: 'Тестов бюлетин',
        previewText: 'Кратък преглед',
        topic: 'newsletter_general',
        bodyHtml: '<p>Тяло</p>',
        unsubUrl: '#unsub',
        preferencesUrl: '#prefs',
        year: 2026,
      }),
    );
    expect(html).toMatch(/charset=["']?utf-8/i);
  });

  it('preserves Cyrillic glyphs Ж Щ Ъ Ю Я ѝ in render output (NOTIF-06 SC#3)', async () => {
    const html = await render(
      React.createElement(NewsletterEmail, {
        t: tStub,
        subject: 'Ж Щ Ъ Ю Я ѝ',
        previewText: 'Преглед',
        topic: 'newsletter_voting',
        bodyHtml: '<p>Здравей, Ж Щ Ъ Ю Я ѝ</p>',
        unsubUrl: '#unsub',
        preferencesUrl: '#prefs',
        year: 2026,
      }),
    );
    expect(html).toMatch(/Ж/);
    expect(html).toMatch(/Щ/);
    expect(html).toMatch(/Ъ/);
    expect(html).toMatch(/Ю/);
    expect(html).toMatch(/Я/);
    expect(html).toMatch(/ѝ/);
    // No MIME-encoded escape sequences (= confirms charset is honored, not "fixed up")
    expect(html).not.toMatch(/=\?UTF-8\?B\?/);
  });

  it('declares lang="bg" on <html>', async () => {
    const html = await render(
      React.createElement(NewsletterEmail, {
        t: tStub,
        subject: 'X', previewText: 'X',
        topic: 'newsletter_general', bodyHtml: '',
        unsubUrl: '#', preferencesUrl: '#', year: 2026,
      }),
    );
    expect(html).toMatch(/<html[^>]*lang="bg"/i);
  });

  it('renders the topic chip text from t() for all 4 topics', async () => {
    for (const topic of ['newsletter_general', 'newsletter_voting', 'newsletter_reports', 'newsletter_events'] as const) {
      const html = await render(
        React.createElement(NewsletterEmail, {
          t: tStub,
          subject: 'X', previewText: 'X', topic,
          bodyHtml: '', unsubUrl: '#', preferencesUrl: '#', year: 2026,
        }),
      );
      const expectedChip = tStub(`topicChip.${topic}`);
      expect(html).toContain(expectedChip);
    }
  });

  it('embeds the bodyHtml content slot verbatim', async () => {
    const html = await render(
      React.createElement(NewsletterEmail, {
        t: tStub, subject: 'X', previewText: 'X',
        topic: 'newsletter_general',
        bodyHtml: '<p data-test="content-slot-marker">Тяло на писмо</p>',
        unsubUrl: '#', preferencesUrl: '#', year: 2026,
      }),
    );
    expect(html).toContain('data-test="content-slot-marker"');
    expect(html).toContain('Тяло на писмо');
  });

  it('embeds unsubUrl and preferencesUrl as href values', async () => {
    const html = await render(
      React.createElement(NewsletterEmail, {
        t: tStub, subject: 'X', previewText: 'X',
        topic: 'newsletter_general', bodyHtml: '',
        unsubUrl: 'https://chastnik.eu/api/unsubscribe?token=abc.def',
        preferencesUrl: 'https://chastnik.eu/member/preferences',
        year: 2026,
      }),
    );
    expect(html).toContain('https://chastnik.eu/api/unsubscribe?token=abc.def');
    expect(html).toContain('https://chastnik.eu/member/preferences');
  });
});

describe('Phase 5 — NewsletterEmail source invariants (lock-in greps)', () => {
  const SRC = readFileSync('src/lib/email/templates/NewsletterEmail.tsx', 'utf8');

  it('no Cyrillic literals in source — all copy via t() (Phase 02.1 lock pattern)', () => {
    expect(SRC).not.toMatch(/[Ѐ-ӿ]/);
  });

  it('declares both Content-Type and charSet meta (defense in depth)', () => {
    expect(SRC).toMatch(/httpEquiv=["']Content-Type["']/);
    expect(SRC).toMatch(/charSet=["']utf-8["']/);
  });

  it('Container maxWidth is 600 (email standard, NOT 480 of OtpEmail)', () => {
    expect(SRC).toMatch(/maxWidth:\s*600/);
  });

  it('h1 fontWeight is 800 (Gilroy ExtraBold; UI-SPEC §3.2)', () => {
    // Strip comments before grepping
    const code = SRC.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    expect(code).toMatch(/fontWeight:\s*800/);
  });

  it('topic chip uses single accent #004A79 — D-17 / UI-SPEC §4.4 brand restraint', () => {
    expect(SRC).toContain('#004A79');
    // No alternate per-topic colors
    expect(SRC).not.toMatch(/#C8102E/); // newsletter_voting alt color rejected
    expect(SRC).not.toMatch(/#0F4C81/); // newsletter_reports alt color rejected
    expect(SRC).not.toMatch(/#1B5E20/); // newsletter_events alt color rejected
  });
});
