// src/lib/oblast-names.ts
//
// ISO 3166-2:BG → Bulgarian display name. 28 oblasts (incl. Sofia-grad)
// + 'unknown' fallback. Static lookup; no DB query needed.
//
// Source: https://en.wikipedia.org/wiki/ISO_3166-2:BG (verified 2026-05-03).
// Tone: formal-respectful (D-21); these are official place names so vocative
// concerns do not apply.
//
// D-24: Storage format in attribution_events.first_oblast = ISO code only;
// this constant lives in the dashboard / worker, not in the DB.

export const OBLAST_NAMES: Record<string, string> = {
  'BG-01': 'Благоевград',
  'BG-02': 'Бургас',
  'BG-03': 'Варна',
  'BG-04': 'Велико Търново',
  'BG-05': 'Видин',
  'BG-06': 'Враца',
  'BG-07': 'Габрово',
  'BG-08': 'Добрич',
  'BG-09': 'Кърджали',
  'BG-10': 'Кюстендил',
  'BG-11': 'Ловеч',
  'BG-12': 'Монтана',
  'BG-13': 'Пазарджик',
  'BG-14': 'Перник',
  'BG-15': 'Плевен',
  'BG-16': 'Пловдив',
  'BG-17': 'Разград',
  'BG-18': 'Русе',
  'BG-19': 'Силистра',
  'BG-20': 'Сливен',
  'BG-21': 'Смолян',
  'BG-22': 'София',
  'BG-23': 'София-град',
  'BG-24': 'Стара Загора',
  'BG-25': 'Търговище',
  'BG-26': 'Хасково',
  'BG-27': 'Шумен',
  'BG-28': 'Ямбол',
  unknown: 'Неизвестен',
};

export function oblastDisplayName(code: string | null | undefined): string {
  if (!code) return OBLAST_NAMES.unknown;
  return OBLAST_NAMES[code] ?? OBLAST_NAMES.unknown;
}
