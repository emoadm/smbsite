# Research Summary — SMBsite

**Synthesized from:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
**Date:** 2026-04-29
**Confidence:** MEDIUM-HIGH

## Executive Summary

SMBsite попада в категорията на **structured-deliberation платформите** (като Decidim, Consul Democracy, CitizenOS) — не е петиция-сайт. Управлява се от политическа коалиция (Синя България), насочена към собственици и мениджъри на МСП в България. Препоръчителният стек е **Next.js 15 + Payload CMS 3 + PostgreSQL (Neon Франкфурт) + Brevo (имейл, ЕС) + Cloudflare + Fly.io Франкфурт** — целият в ЕС, build-то е GDPR-съвместимо. Публичната landing зона трябва да е изцяло статична и кеширана на CDN, защото QR-кампанията по поща ще създаде еднократен пик на трафика, който не може да се повтори. Три блокиращи решения трябва да се вземат, преди да се започне писането на код:

1. **WhatsApp Business API е забранен от Meta за политически партии** — единствените жизнеспособни алтернативи са WhatsApp Channels (broadcast-only) или Telegram канал. (Решено: и двете, линкове от сайта.)
2. **Записването на гласове по политически идеи с име = GDPR Чл. 9 special-category data** (политически възгледи) — изисква правно становище преди дефиниране на схемата.
3. **Имейл доменът трябва да започне warm-up 4+ седмици преди писмата** — иначе всичко отива в спам. Това превръща инфраструктурата в блокираща дата на кампанията.

## Stack — Препоръка

| Слой | Първи избор | Алтернатива | EU/GDPR |
|------|-------------|-------------|---------|
| Framework | Next.js 15 (App Router) | — | n/a |
| CMS | Payload CMS 3.84+ (вграден в Next.js) | Sanity / Strapi | Self-hosted в ЕС |
| База данни | PostgreSQL — Neon (Франкфурт) | Supabase EU | ✓ EU region потвърден |
| ORM | Drizzle 0.45+ | Prisma 7 | n/a |
| Auth | Auth.js v5 (магически линк / OTP) | Lucia | Self-hosted |
| Имейл | Brevo (ESP) | Postmark (US, SCC) | ✓ Brevo = френска компания |
| WhatsApp | Channels (broadcast-only, безплатен) | Telegram канал | ✓ Не съхранява потр. данни |
| Telegram | Telegram Bot API за broadcast | — | n/a |
| Анализи | Plausible (EU-incorporated, без бисквитки) | Matomo self-hosted | ✓ Без consent banner |
| Anti-bot | Cloudflare Turnstile / Friendly Captcha | — | ✓ GDPR-safe, без Google |
| CDN / WAF | Cloudflare | Bunny.net | EU edge |
| Хостинг | Fly.io Франкфурт | Hetzner | ⚠️ US-incorporated, но с DPA |
| Видео/изображения | Bunny.net (Словенска фирма) | Cloudflare R2 | ✓ EU CDN |
| Грешки | Sentry EU region | — | ✓ EU instance |
| Async jobs | BullMQ + Redis (Upstash EU) | — | ✓ EU |

## Features — Слоеве

**Table stakes (без тях платформата изглежда непълна или няма правна защита):**
- Регистрация с потвърждение на имейл, вход, изход, възстановяване на достъп
- Бинарно гласуване (одобрявам/не одобрявам)
- Подаване на предложения с модерация
- Newsletter с имейл и one-click отписване (List-Unsubscribe header — задължително за Gmail/Yahoo от 2024)
- GDPR self-service: изтриване, експорт на данни, оттегляне на съгласие
- Cookie consent banner
- Mobile-responsive UI
- WCAG 2.1 ниво AA (от юни 2025 EU Accessibility Act разширява обхвата извън публичния сектор)

**SMBsite-специфично (не-стандартно за civic-tech, но критично за нас):**
- Атрибуция при регистрация (UTM + referrer + IP-to-област + "откъде научи") — данните не са възстановими след регистрацията
- Структурирани сигнали за проблеми с tag за местно/централно ниво
- Линкове към WhatsApp Channel + Telegram канал

**Differentiators (по-късно или v2):**
- Геопредставяне на гласовете по област
- Експертни значки за модератори/автори
- Тематично гласуване по проследяване на резултата (връзка с парламент/общински решения)
- BULSTAT като меко доказателство за принадлежност към МСП

**Anti-features (целенасочено НЕ строим):**
- Свободен форум — модерационен товар експлодира; враждебни актьори заливат с шум. Алтернатива: scoped коментари по идеи.
- Анонимни предложения — подкопава политическия кредит на datasetа. Pseudonymous е ОК, но идентичността е известна на редакторите.
- Социален вход (Facebook/Google) — GDPR data-sharing усложнения, политически чувствителна аудитория предпочита да не се закача с big tech.
- Точна имитация на sinyabulgaria.bg — само цветове + лого.

## Architecture — Ключови решения

- **Модулен монолит** в Next.js + един BullMQ worker процес. Без микросервиси.
- **Cloudflare = задължителен слой** (не опционален) пред origin за DDoS защита и edge caching на public страници.
- **Кеширане**: публични страници с ISR + 5-min CDN TTL; authenticated маршрути с `Cache-Control: private, no-store` и Cloudflare bypass.
- **Атрибуцията се захваща с anonymous session cookie** преди регистрация; user_id се закача след потвърждение. Така частично завършилите пътеки също се измерват.
- **IP-та никога не се пазят**: на момента се конвертират в (област, държава) с локален MaxMind GeoLite2 и raw IP-то се изхвърля. Премахва GDPR "online identifier" товара.
- **GDPR изтриване = 30-дневен soft delete + hard wipe**. NULL-ва foreign keys в votes/proposals; deletion_log пази hashed user_id за audit без PII.
- **Audit таблиците са INSERT-only на DB permission ниво** — app потребителят няма UPDATE/DELETE grant.
- **Анти-злоупотреба = шест слоя**: Cloudflare WAF → edge rate limits → Redis sliding-window → CAPTCHA → email потвърждение → DB UNIQUE constraint на votes.
- **Build order (твърди зависимости):**
  1. Foundation: auth, DB схема, Cloudflare, Sentry, имейл domain warm-up започва ТУК
  2. Public surface + attribution (преди писмата)
  3. Voting engine + idea catalog (зависи от GDPR правно становище)
  4. User submission + moderation
  5. Notifications (newsletter + WhatsApp/Telegram линкове)
  6. GDPR self-service (изтриване, експорт)
  7. Hardening + load test (преди голяма кампания)

## Pitfalls — Топ рискове за тази платформа

| # | Риск | Тежест | Предотвратяване | Фаза |
|---|------|--------|----------------|------|
| 1 | WhatsApp Business API забранен за партии | Critical | Channels + Telegram (решено) | 0 (преди старт) |
| 2 | Гласове = Чл. 9 special-category data | Critical | Правно становище за legal basis | 0 (преди voting) |
| 3 | Имейл домейн без warm-up = масов спам filter | Critical | Започвай warm-up 4+ седмици предварително | 1 |
| 4 | QR пик от писмата срива сайта (Coinbase scenario) | Critical | Изцяло static landing + queue зад регистрация + load test 2x | 1-2 |
| 5 | Враждебна масова регистрация (sockpuppets) | Serious | Email потвърждение + 48ч cooling преди първи глас + disposable-domain blocklist | 1 |
| 6 | Непълно GDPR изтриване (логове, backup-и, ESP лист) | Serious | Data Processing Register + multi-step deletion job документиран преди първа регистрация | 1 |
| 7 | Vocative-форма в имейли = възприето като грубо | Notable | Само nominative форми в шаблоните | 5 |
| 8 | Brigading на гласовете | Serious | Rate limit + анализ на vote velocity + alert на /24 subnet spike-ове | 3 |
| 9 | Screenshot-и на предложения извадени от контекст | Notable | Modеration queue преди публично; permalink-ове с пълен контекст | 4 |
| 10 | DSA задължения (>50M MAU не се отнася, но трябва transparency report) | Notable | Privacy policy + transparency раздел | 6 |

## Required-Now Decisions (преди дефиниране на изисквания)

| # | Решение | Статус |
|---|---------|--------|
| 1 | WhatsApp алтернатива | ✓ Решено: WhatsApp Channels + Telegram, линкове от сайта |
| 2 | Видимост на имената при гласуване / предложения | ⏳ Отложено до фазата на гласуване (Phase 3) |
| 3 | Верификация дали потребителят е МСП собственик | ⏳ Отложено до фазата на регистрация (Phase 1) |
| 4 | GDPR Чл. 9 правно становище за гласуване | ⏳ Външна задача, паралелно с разработката |
| 5 | Дата на писмената кампания | ⏳ Възложена на коалицията; Phase 1 трябва да е готова 4+ седмици преди това |

---
*Synthesized: 2026-04-29*
