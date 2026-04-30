# Requirements: SMBsite

**Defined:** 2026-04-29
**Core Value:** Когато един собственик на МСП види сайта, разбира идеята достатъчно, за да даде името и имейла си — и след това продължава да се връща, защото гласът му се вижда и брои.

## v1 Requirements

### Public Surface (PUB) — Агитационни страници

- [ ] **PUB-01**: Посетител без регистрация вижда landing страница с текст, видео и изображения, представящи идеята на коалицията
- [ ] **PUB-02**: Landing страницата е изцяло статична / CDN-кеширана (издържа на пик на трафика от QR кампания)
- [ ] **PUB-03**: Посетител може да навигира между няколко агитационни страници (агитация на различни аспекти/проблеми)
- [ ] **PUB-04**: Видимо присъства call-to-action "присъедини се към общността" на всяка страница
- [ ] **PUB-05**: Сайтът е напълно на български език (UI, грешки, имейл шаблони, документация за потребителя)
- [x] **PUB-06**: Сайтът е responsive (работи на мобилно, таблет, десктоп)

### Authentication (AUTH) — Регистрация и достъп

- [x] **AUTH-01**: Посетител може да се регистрира с име и имейл
- [x] **AUTH-02**: Регистрацията изисква cookie consent + съгласие за политика за поверителност
- [ ] **AUTH-03**: След регистрация потребителят получава имейл за потвърждение
- [ ] **AUTH-04**: Достъп до членските функции се отключва САМО след потвърждение на имейла
- [x] **AUTH-05**: Член може да влиза през magic link / OTP по имейл (без парола за v1)
- [x] **AUTH-06**: Член може да излезе от всяка страница
- [x] **AUTH-07**: Сесията се запазва между обновявания на браузъра
- [x] **AUTH-08**: Регистрационната форма е защитена с CAPTCHA (Cloudflare Turnstile или Friendly Captcha)
- [ ] **AUTH-09**: Регистрацията е rate-limited (защита срещу масова злоупотреба)
- [ ] **AUTH-10**: Имейли от еднократни/disposable домейни се блокират при регистрация

### Attribution (ATTR) — Откъде идват потребителите

- [ ] **ATTR-01**: Един общ QR код в писмата от кампанията води до сайта; сканиранията се логват
- [ ] **ATTR-02**: При сканиране/посещение IP-то се конвертира в (област, държава) с MaxMind GeoLite2; raw IP не се пази
- [ ] **ATTR-03**: UTM параметри (source, medium, campaign, term, content) се захващат и пазят
- [ ] **ATTR-04**: HTTP Referer се захваща и пази (когато е наличен)
- [ ] **ATTR-05**: Атрибуционните събития се пазят с anonymous session cookie преди регистрация; закачат се за user_id след потвърждение
- [ ] **ATTR-06**: Регистрационната форма съдържа въпрос "откъде научихте за сайта" (избор от опции + свободен текст)
- [ ] **ATTR-07**: Атрибуционните данни са четими в админ панел с филтри по област/държава/канал

### Member Area (MEMB) — Общностна зона

- [ ] **MEMB-01**: След влизане членът вижда личен dashboard с активност (мои предложения, мои гласове, мои сигнали)
- [ ] **MEMB-02**: Член може да преглежда профила си (име, имейл, дата на регистрация, канали за нотификация)
- [ ] **MEMB-03**: Член може да обновява канали за нотификация (имейл / WhatsApp / Telegram линкове, които използва)

### Ideas & Voting (IDEA) — Каталог на идеи

- [ ] **IDEA-01**: Член вижда каталог от политически идеи / решения, публикувани от редакторите
- [ ] **IDEA-02**: Каталогът поддържа филтриране/сортиране (по тема, по дата, по резултат от гласуването)
- [ ] **IDEA-03**: Член може да гласува "одобрявам / не одобрявам" по всяка идея (един глас на акаунт на идея)
- [ ] **IDEA-04**: DB-ниво UNIQUE constraint предотвратява двойни гласове
- [ ] **IDEA-05**: Член може да оттегли гласа си или да го промени
- [ ] **IDEA-06**: Гласуването е защитено с CAPTCHA при подозрителна активност
- [ ] **IDEA-07**: 48-часов "cooling period" между потвърждение на имейла и първи отчетен глас (срещу масова сокпапет регистрация)
- [ ] **IDEA-08**: Резултатът от гласуването се показва (формата на показване — TBD; виж Open Decisions)

### User Proposals (PROP) — Предложения от членове

- [ ] **PROP-01**: Член може да подаде ново предложение за политическо решение (заглавие, описание, тема)
- [ ] **PROP-02**: Подадените предложения отиват в moderation queue — НЕ се публикуват автоматично
- [ ] **PROP-03**: Член вижда статуса на своите предложения (изчаква преглед / одобрено / отхвърлено + бележка)
- [ ] **PROP-04**: Одобрените предложения се появяват в общия каталог (IDEA-01) и се гласуват като всяка друга идея

### Problem Reports (PROB) — Сигнали за проблеми

- [ ] **PROB-01**: Член може да сигнализира конкретен проблем, изискващ политическо решение
- [ ] **PROB-02**: Сигналът има задължителен таг "местно ниво" (конкретна община/област) или "централно ниво" (държавно)
- [ ] **PROB-03**: При местен проблем член избира община или област
- [ ] **PROB-04**: Сигналите минават през moderation queue
- [ ] **PROB-05**: Член вижда статуса на своите сигнали

### Editorial Admin (EDIT) — Редакторски панел

- [ ] **EDIT-01**: Редактор може да влезе в админ панел (Payload CMS) с по-високи права
- [ ] **EDIT-02**: Редактор може да създава, редактира и публикува идеи в каталога
- [ ] **EDIT-03**: Редактор може да създава, редактира и публикува агитационни страници (PUB)
- [ ] **EDIT-04**: Редактор вижда moderation queue с потребителски предложения и сигнали
- [ ] **EDIT-05**: Редактор може да одобри / отхвърли (с бележка) предложение или сигнал
- [ ] **EDIT-06**: Редактор може да спре акаунт при нарушение (документирано в moderation_log)
- [ ] **EDIT-07**: Редактор може да преглежда атрибуционни статистики

### Notifications (NOTIF) — Доставяне на актуална информация

- [ ] **NOTIF-01**: Член може да се абонира за newsletter при регистрация (по подразбиране — opt-in или confirm според GDPR consent flow)
- [ ] **NOTIF-02**: Newsletter имейлите включват List-Unsubscribe header (one-click отписване, изискване на Gmail/Yahoo от 2024)
- [ ] **NOTIF-03**: Член може да се отпише от newsletter с един клик от всяко съобщение
- [ ] **NOTIF-04**: Сайтът показва линк към WhatsApp Channel на коалицията (broadcast-only)
- [ ] **NOTIF-05**: Сайтът показва линк към Telegram канал на коалицията
- [ ] **NOTIF-06**: Имейл шаблоните използват само nominative форми за обръщение (без vocative)
- [ ] **NOTIF-07**: Изпращащият имейл домейн е настроен с SPF, DKIM, DMARC; warm-up започва 4+ седмици преди QR кампанията
- [ ] **NOTIF-08**: Имейли се изпращат през BullMQ async worker (не блокира уеб заявките)
- [ ] **NOTIF-09**: Редактор може да изпрати ad-hoc newsletter blast от админ панел

### GDPR Compliance (GDPR) — Регулаторна съвместимост

- [ ] **GDPR-01**: Cookie consent banner при първо посещение, гранулиран (необходими / анализи / маркетинг)
- [ ] **GDPR-02**: Страница "Политика за поверителност" на български
- [ ] **GDPR-03**: Страница "Условия за ползване" на български
- [ ] **GDPR-04**: Член може да изтегли експорт на всички свои данни (JSON или CSV) — право на преносимост
- [ ] **GDPR-05**: Член може да изтрие акаунта си от настройките; всички въведени от него данни се изтриват според 30-дневен soft-delete + hard-wipe procedure
- [ ] **GDPR-06**: Изтриването каскадно почиства данните от ESP списъци (Brevo), backup-и и логове (документиран Data Processing Register)
- [ ] **GDPR-07**: Audit таблиците (deletion_log, moderation_log) са INSERT-only на DB permission ниво
- [ ] **GDPR-08**: deletion_log пази само hashed user_id (без PII) за audit
- [ ] **GDPR-09**: Атрибуционните данни не съдържат raw IP — само (област, държава) от GeoLite2

### Branding & Accessibility (BRAND) — Визуална идентичност

- [ ] **BRAND-01**: Цветова палитра от sinyabulgaria.bg (синьо/бяло/червено акценти)
- [ ] **BRAND-02**: Логото на коалиция Синя България присъства в header
- [ ] **BRAND-03**: Дизайнът е свеж и съвременен — не имитира директно sinyabulgaria.bg
- [ ] **BRAND-04**: Сайтът отговаря на WCAG 2.1 ниво AA (контраст, keyboard nav, alt текст, captions на видео)
- [ ] **BRAND-05**: Видеата имат български субтитри
- [ ] **BRAND-06**: Шрифтове и типография поддържат пълно Cyrillic (тестване с диакритични знаци)

### Operations (OPS) — Готовност за продукция

- [ ] **OPS-01**: Cloudflare WAF + DDoS защита пред origin
- [ ] **OPS-02**: Sentry (EU region) за грешки
- [ ] **OPS-03**: Структурирани JSON логове, EU-hosted aggregator
- [ ] **OPS-04**: Vote velocity мониторинг и alert при аномалии (>X гласа от един /24 subnet)
- [ ] **OPS-05**: Load test на 2x очаквания пик от QR кампанията преди старт
- [ ] **OPS-06**: Database backup-и (PostgreSQL → Neon point-in-time + външен)
- [ ] **OPS-07**: CI/CD pipeline с автоматични migrations и rollback опция

## v2 Requirements

Отложени за по-късно. Документирани за yet-traceability.

### Phone / SMS Verification (V2-VERIFY)

- **V2-VERIFY-01**: Допълнителна верификация на собственик/мениджър на МСП чрез BULSTAT (без автоматична проверка — само поле)
- **V2-VERIFY-02**: SMS OTP за по-висока сигурност при критични действия (Twilio Verify EU или Telnyx)

### Advanced Voting (V2-VOTE)

- **V2-VOTE-01**: Тематично групиране на гласовете по област (геопредставяне)
- **V2-VOTE-02**: Проследяване на резултата ("тази идея е внесена в парламента / общинския съвет")
- **V2-VOTE-03**: Експертни значки за модератори / автори с проверена биография

### Two-way Messaging (V2-COMM)

- **V2-COMM-01**: WhatsApp Business API двупосочно общуване (само ако Meta промени политиката за политически организации)
- **V2-COMM-02**: Telegram bot с команди (/гласувай, /предложи, /сигнализирай)

### Engagement (V2-ENGAGE)

- **V2-ENGAGE-01**: Scoped коментари по идея (с модерация)
- **V2-ENGAGE-02**: Email digest с активност в общността (седмичен)
- **V2-ENGAGE-03**: Push нотификации (PWA)

### Compliance (V2-COMPL)

- **V2-COMPL-01**: Transparency report (DSA — макар да не е задължителен под 50M MAU, репутационна стойност)
- **V2-COMPL-02**: eIDAS / EUDI Wallet интеграция (когато България имплементира — не преди края на 2026)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Многоезичен интерфейс (EN/RU и др.) | Целевата аудитория = български МСП собственици; разход без видима печалба |
| Мобилно нативно приложение | Responsive web е достатъчен и далеч по-евтин за поддръжка |
| Платена функционалност / абонаменти | Целта е политическо влияние, не приходи |
| Дарения чрез сайта | Регулаторни усложнения за политически дарения; извън v1 |
| Свободен форум / нишков чат | Модерационен товар експлодира; враждебни актьори заливат със шум. Алтернатива: scoped коментари (v2) |
| Анонимни предложения | Подкопава политическия кредит на dataset-а. Pseudonymous = ОК, ако решим, но идентичността е известна на редакторите |
| Социален вход (Facebook/Google) | GDPR data-sharing усложнения; политически чувствителна аудитория |
| Точна имитация на sinyabulgaria.bg | Само цветове + лого; нов модерен дизайн |
| Индивидуални QR кодове по получател | Общ QR код; персонализирано проследяване носи по-висок GDPR риск |
| Индивидуална гласуваща власт (weighted voting) | Усложнява без ясна полза за v1 |
| WhatsApp Business API двупосочно | Забранено от Meta за политически партии |

## Open Decisions (Required-Now)

Решения, които трябва да се вземат преди или по време на съответната фаза:

| # | Decision | Blocks Phase | Owner |
|---|----------|--------------|-------|
| 1 | Видимост на имената при гласуване и предложения | Voting (Phase 3) | Коалицията |
| 2 | Верификация на МСП статус (само декларация vs БУЛСТАТ vs нищо) | Registration (Phase 1) | Коалицията |
| 3 | GDPR Чл. 9 правно становище за гласуване по политически идеи | Voting (Phase 3) | Външен правен консултант |
| 4 | Дата на писмената кампания | Phase 1 timing | Коалицията |
| 5 | Имейл sender домейн (kogato започва warm-up) | Phase 1 | Коалицията |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete (Plan 01-09) |
| AUTH-02 | Phase 1 | Complete (Plan 01-09) |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Complete (Plan 01-09) |
| AUTH-06 | Phase 1 | Complete (Plan 01-09) |
| AUTH-07 | Phase 1 | Complete (Plan 01-09) |
| AUTH-08 | Phase 1 | Complete (Plan 01-09) |
| AUTH-09 | Phase 1 | Pending |
| AUTH-10 | Phase 1 | Pending |
| PUB-05 | Phase 1 | Pending |
| PUB-06 | Phase 1 | Complete (Plan 01-09) |
| NOTIF-07 | Phase 1 | Pending |
| NOTIF-08 | Phase 1 | Pending |
| OPS-01 | Phase 1 | Pending |
| OPS-02 | Phase 1 | Pending |
| OPS-03 | Phase 1 | Pending |
| OPS-06 | Phase 1 | Pending |
| OPS-07 | Phase 1 | Pending |
| BRAND-01 | Phase 1 | Pending |
| BRAND-02 | Phase 1 | Pending |
| BRAND-03 | Phase 1 | Pending |
| BRAND-06 | Phase 1 | Pending |
| PUB-01 | Phase 2 | Pending |
| PUB-02 | Phase 2 | Pending |
| PUB-03 | Phase 2 | Pending |
| PUB-04 | Phase 2 | Pending |
| ATTR-01 | Phase 2 | Pending |
| ATTR-02 | Phase 2 | Pending |
| ATTR-03 | Phase 2 | Pending |
| ATTR-04 | Phase 2 | Pending |
| ATTR-05 | Phase 2 | Pending |
| ATTR-06 | Phase 2 | Pending |
| ATTR-07 | Phase 2 | Pending |
| GDPR-01 | Phase 2 | Pending |
| GDPR-02 | Phase 2 | Pending |
| GDPR-03 | Phase 2 | Pending |
| OPS-05 | Phase 2 | Pending |
| IDEA-01 | Phase 3 | Pending |
| IDEA-02 | Phase 3 | Pending |
| IDEA-03 | Phase 3 | Pending |
| IDEA-04 | Phase 3 | Pending |
| IDEA-05 | Phase 3 | Pending |
| IDEA-06 | Phase 3 | Pending |
| IDEA-07 | Phase 3 | Pending |
| IDEA-08 | Phase 3 | Pending |
| MEMB-01 | Phase 3 | Pending |
| MEMB-02 | Phase 3 | Pending |
| MEMB-03 | Phase 3 | Pending |
| EDIT-01 | Phase 3 | Pending |
| EDIT-02 | Phase 3 | Pending |
| OPS-04 | Phase 3 | Pending |
| PROP-01 | Phase 4 | Pending |
| PROP-02 | Phase 4 | Pending |
| PROP-03 | Phase 4 | Pending |
| PROP-04 | Phase 4 | Pending |
| PROB-01 | Phase 4 | Pending |
| PROB-02 | Phase 4 | Pending |
| PROB-03 | Phase 4 | Pending |
| PROB-04 | Phase 4 | Pending |
| PROB-05 | Phase 4 | Pending |
| EDIT-03 | Phase 4 | Pending |
| EDIT-04 | Phase 4 | Pending |
| EDIT-05 | Phase 4 | Pending |
| EDIT-06 | Phase 4 | Pending |
| EDIT-07 | Phase 4 | Pending |
| NOTIF-01 | Phase 5 | Pending |
| NOTIF-02 | Phase 5 | Pending |
| NOTIF-03 | Phase 5 | Pending |
| NOTIF-04 | Phase 5 | Pending |
| NOTIF-05 | Phase 5 | Pending |
| NOTIF-06 | Phase 5 | Pending |
| NOTIF-09 | Phase 5 | Pending |
| GDPR-04 | Phase 6 | Pending |
| GDPR-05 | Phase 6 | Pending |
| GDPR-06 | Phase 6 | Pending |
| GDPR-07 | Phase 6 | Pending |
| GDPR-08 | Phase 6 | Pending |
| GDPR-09 | Phase 6 | Pending |
| BRAND-04 | Phase 6 | Pending |
| BRAND-05 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 81 total (metadata initially stated 87; actual enumeration = 81)
- Mapped to phases: 81
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-29*
*Last updated: 2026-04-29 — traceability populated after ROADMAP.md created*
