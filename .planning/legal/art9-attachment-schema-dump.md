# Приложение №1 — Database Schema (релевантни таблици)

**Версия:** 2026-05-07
**Адресат:** Външен правен консултант
**Контекст:** Приложение към `art9-brief-to-counsel.md` (Phase 3 GDPR Art. 9 правно становище)

Тази справка описва **само** таблиците, които съхраняват или препращат към данни, разкриващи политически възгледи (чл. 9 GDPR), и техните преки роднини. Описанието е представено в SQL DDL форма (PostgreSQL), извлечено от текущия Drizzle ORM код в `src/db/schema/`. Колоните, релевантни за оценката по чл. 9, са анотирани на български.

---

## 1. `users` — потребителски акаунти (вече в production, Phase 1)

```sql
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT,                                 -- Auth.js base column (legacy)
  email                 TEXT NOT NULL UNIQUE,                 -- идентифицираща ПИЛИ
  email_verified        TIMESTAMPTZ,                          -- Auth.js base column
  image                 TEXT,
  full_name             TEXT NOT NULL,                        -- ЛИЧНИ ДАННИ — име, фамилия
  sector                TEXT NOT NULL,                        -- сектор на МСП (самодекларация)
  role                  TEXT NOT NULL,                        -- роля в МСП (собственик / мениджър)
  self_reported_source  TEXT,                                 -- Phase 2.1 атрибуция
  self_reported_other   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_verified_at     TIMESTAMPTZ,                          -- Phase 3 IDEA-07 cooling join
  preferred_channel     TEXT                                  -- whatsapp | telegram | none | NULL
);
CREATE INDEX users_email_idx ON users (email);
```

**Брой записи към момента (приблизително):** [TODO — операторът да попълни]
**Каскадно изтриване от `users`:** засяга `votes`, `vote_events_log`, `attribution_events`, `sessions`, `accounts`. Не засяга `consents` (`ON DELETE RESTRICT` — чрез отделна Phase 6 deletion процедура).

---

## 2. `consents` — записи за съгласие (вече в production, Phase 1)

```sql
CREATE TABLE consents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  kind         TEXT NOT NULL,                                  -- enum-shaped, виж по-долу
  granted      BOOLEAN NOT NULL,                               -- TRUE = grant; FALSE = withdraw
  version      TEXT NOT NULL,                                  -- версия на политиката, напр. '2026-04-29'
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  region       TEXT                                            -- oblast/country (Phase 2 forward-prep)
);
CREATE INDEX consents_user_kind_idx ON consents (user_id, kind);
```

**Стойности на `kind`:**

| Стойност | Описание (български) | Чл. 9 релевантност |
|----------|----------------------|-------------------|
| `privacy_terms` | Политика за поверителност + Условия за ползване | не |
| `cookies` | Cookie consent (анализи, маркетинг) | не |
| `newsletter` | Legacy — общо съгласие за newsletter (Phase 1 D-09 backward compat) | не |
| `newsletter_general` | Общи обявявания (Phase 5 D-08) | не |
| `newsletter_voting` | Нови гласувания (Phase 5 D-08) | не |
| `newsletter_reports` | Отчети по инициативи (Phase 5 D-08) | не |
| `newsletter_events` | Покани за събития (Phase 5 D-08) | не |
| **`political_opinion`** | **Съгласие за обработка на политически възгледи (чл. 9 GDPR) — текущ текст в Section 2А на брифа** | **ДА — основна точка на оценката** |

**Семантика:** append-only. Оттегляне на съгласие = INSERT на нов ред с `granted=false`. Никога не се UPDATE-ва или DELETE-ва от приложението. Този pattern се повтаря за `vote_events_log` и `moderation_log`.

---

## 3. `votes` — текущо състояние на гласовете (Phase 3, **планира се**)

```sql
CREATE TABLE votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,    -- D-16 cascade
  idea_id     UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  choice      TEXT NOT NULL CHECK (choice IN ('approve', 'reject')),   -- ★ ПОЛИТИЧЕСКИ ВЪЗГЛЕД (чл. 9)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, idea_id)                                            -- IDEA-04: 1 глас на акаунт на идея
);
CREATE INDEX votes_idea_choice_idx ON votes (idea_id, choice);
CREATE INDEX votes_user_idx       ON votes (user_id);
```

**Чл. 9 релевантност:** ★ КРИТИЧНА. Колоната `choice` свързана с `user_id` директно разкрива политически възглед на конкретно лице.

**Поведение при оттегляне на глас (D-14):** редът се DELETE-ва от `votes`. Историята остава в `vote_events_log` (виж #4).

**Поведение при изтриване на акаунт (D-16):** `ON DELETE CASCADE` — всички гласове изчезват. **Точка за решение от адвоката (т. 3, ред 6 в брифа):** да остане `CASCADE` или да се промени на `SET NULL` за запазване на агрегатна цялост.

---

## 4. `vote_events_log` — append-only audit на действията по гласуване (Phase 3, **планира се**)

```sql
CREATE TABLE vote_events_log (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID REFERENCES users(id) ON DELETE CASCADE, -- nullable forward-prep за SET NULL
  idea_id                  UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  choice                   TEXT CHECK (choice IS NULL OR choice IN ('approve', 'reject')),  -- ★ чл. 9
  action                   TEXT NOT NULL CHECK (action IN ('cast', 'change', 'retract')),
  occurred_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash                  TEXT NOT NULL,         -- HMAC-SHA256 на пълния IPv4/IPv6 адрес
  ua_hash                  TEXT NOT NULL,         -- HMAC-SHA256 на User-Agent string
  subnet_hash              TEXT NOT NULL,         -- HMAC-SHA256 на /24 (IPv4) или /64 (IPv6)
  fresh_account_at_event   BOOLEAN NOT NULL       -- TRUE ако (NOW() - email_verified_at) < cooling interval
);
CREATE INDEX vote_log_idea_time_idx   ON vote_events_log (idea_id, occurred_at DESC);
CREATE INDEX vote_log_subnet_time_idx ON vote_events_log (subnet_hash, occurred_at);
CREATE INDEX vote_log_user_time_idx   ON vote_events_log (user_id, occurred_at DESC);
```

**Чл. 9 релевантност:** ★ КРИТИЧНА. Същата като `votes`, но допълнително съхранява пълна история (включително оттеглени гласове).

**Сигурност на хешовете:**
- HMAC ключ: единичен server-side secret `VOTE_AUDIT_HMAC_SECRET` (Fly.io secret + GitHub Actions secret).
- Cadence на ротация: ежегодно (документирано в OPS-RUNBOOK).
- **Нито един raw IP, нито един raw UA не се записва в Postgres.** Това е архитектурно правило, аналогично на Phase 2.1 D-19 / GDPR-09. Тестово асерция: `tests/unit/voting-no-pgenum.test.ts` + `tests/unit/voting-schema.test.ts` grep-проверяват, че таблицата няма `inet` колона и няма колона `raw_ip` / `ip_address`.

**Append-only:** Никога UPDATE / DELETE от приложението. Аналогично на `consents` pattern.

**Поведение при изтриване на акаунт:** `ON DELETE CASCADE`. Виж точка за решение в т. 3, ред 6 на брифа.

---

## 5. `moderation_log` — append-only audit на редакторските действия (Phase 3, **планира се**)

```sql
CREATE TABLE moderation_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action          TEXT NOT NULL,                                    -- enum-shaped, виж по-долу
  actor_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,  -- редактор/админ
  target_kind     TEXT NOT NULL CHECK (target_kind IN ('idea', 'user', 'votes', 'submission')),
  target_id       UUID,
  target_ids      UUID[],                                           -- за bulk vote-exclude
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX moderation_log_action_time_idx ON moderation_log (action, created_at DESC);
CREATE INDEX moderation_log_target_idx      ON moderation_log (target_kind, target_id);
```

**Стойности на `action` (Phase 3):**
- `vote_exclude` — редактор изключва един или повече гласове (target_kind='votes', target_ids=[...]).
- `idea_display_freeze` — редактор замразява публичното показване на идея.
- `idea_display_unfreeze` — обратно действие.

(Phase 4 EDIT-06 ДОБАВЯ стойности `user_suspend` / `user_unsuspend` / `submission_reject` без промяна на schema.)

**Чл. 9 релевантност:** косвена. `moderation_log` записва кога и от кого са изключени гласове. Самите изключени гласове остават в `vote_events_log` (audit trail запазва кой как е гласувал). Ако адвокатът прецени, че редакторски преглед на индивидуални политически възгледи е допълнителна обработка по чл. 9 → нужно е изрично да се впише в ROPA (Приложение №2, обработка #5).

---

## 6. `ideas` — каталог от политически идеи (Phase 3, **планира се** — Payload CMS collection)

Управлява се от Payload CMS. Манифестът на колекцията се съхранява в `src/collections/Ideas.ts`. DDL се прилага ръчно срещу Neon (paddle migrate е блокиран от tsx/Node ESM несъвместимост — виж memory `project_payload_schema_constraint`).

```sql
CREATE TABLE ideas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE,                              -- авто-генериран от title
  title             TEXT NOT NULL,                                     -- BG политически текст (от редакторите)
  topic             TEXT NOT NULL,                                     -- enum-shaped: taxes|labor|regulation|financing|digitalization|other
  status            TEXT NOT NULL CHECK (status IN ('draft','published','archived')),
  content_lexical   JSONB NOT NULL,                                    -- Lexical RTE дърво
  hero_id           UUID REFERENCES media(id),                         -- optional hero image
  is_featured       BOOLEAN NOT NULL DEFAULT FALSE,                    -- editor's-pick
  featured_order    INTEGER,
  display_frozen    BOOLEAN NOT NULL DEFAULT FALSE,                    -- D-12 silent display freeze
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- стандартни Payload CMS системни колони пропуснати за краткост
);
CREATE INDEX ideas_status_topic_idx ON ideas (status, topic);
CREATE INDEX ideas_featured_idx     ON ideas (is_featured, featured_order, created_at DESC);
```

**Чл. 9 релевантност:** Идеите са политическо съдържание, авторирано от редакторите на коалицията — **не лични данни**. Релевантни само като обект на гласуване.

---

## 7. `attribution_events` — атрибуция на регистрации (вече в production, Phase 2.1)

Виж пълната дефиниция в `src/db/schema/attribution.ts`. Релевантни моменти за това становище:

- Свързва се с `users.id` чрез `attribution_events.user_id` (cascade delete).
- Съхранява **само** UTM параметри, referer, oblast (ISO 3166-2 код от MaxMind GeoLite2), country (ISO alpha-2), QR флаг, landing path. **Никога не съхранява raw IP** — raw IP съществува само вътре в BullMQ job payload (Redis-resident, ephemeral) и се изхвърля от worker-а след in-memory MaxMind lookup.
- Балансиращ тест по легитимен интерес: `.planning/legal/attribution-balancing-test.md` (вече одобрен).
- Не е свързан с гласуване — приложен тук само за пълнота на data flow картата.

---

## 8. Какво НЕ съществува в схемата (по дизайн)

Тестово асерции в `tests/unit/voting-no-pgenum.test.ts` и `tests/unit/voting-schema.test.ts` гарантират, че следните колони **никога не се създават**:

- `vote_events_log.ip` тип `inet` или `text` — забранено.
- `vote_events_log.raw_ip` под каквото и да е име — забранено.
- `vote_events_log.user_agent_raw` или подобни — забранено.
- pgEnum типове за `choice`, `action`, `target_kind`, `kind`, `topic` и т.н. — забранено (project convention; стойностите се съхраняват като `text` и се валидират в кода).

---

## 9. Сводка: данни, разкриващи политически възгледи

| Таблица | Колона(и) | Лична връзка | Запазване |
|---------|-----------|--------------|-----------|
| `votes` | `choice` | директна (`user_id` FK) | каскадно изтриване при изтриване на акаунт |
| `vote_events_log` | `choice`, `action` | директна (`user_id` FK; nullable) | каскадно изтриване при изтриване на акаунт |
| `consents` (kind=`political_opinion`) | `granted` | директна (`user_id` FK) | RESTRICT — обработва се отделно през Phase 6 GDPR-05 |
| `moderation_log` (косвено) | `target_ids[]` (FK към `vote_events_log`) | косвена | restrict; запазва audit trail дори когато гласът е изключен |

Никаква друга таблица не съхранява данни, разкриващи политически възгледи.

---

**Край на Приложение №1.**
