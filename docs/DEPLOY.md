# Деплой: Vercel + Supabase

> С 19.11.2026 основной хостинг сайта: Netlify, см. [NETLIFY.md](NETLIFY.md) (на Vercel Hobby коммерческое использование запрещено). Остальные разделы (база, SMTP, Google, переменные) остаются актуальными; вместо «Vercel» читайте «Netlify».

## База

1. Создайте Supabase-проект. Примените все supabase/migrations/*.sql по порядку через SQL Editor либо `npx supabase link --project-ref <ref>` и `npx supabase db push`. Перед обновлением существующей БД сделайте резервную копию. Не выполняйте db reset на production.
2. Миграции создают RLS, RPC и публичный бакет product-photos: 5 МБ, JPEG/PNG/WebP, запись в папку своего auth.uid().
3. В Auth → Users создайте подтверждённого demo@sore.kz. Не применяйте local-user.sql к облачной БД. Укажите свой WhatsApp в seed.sql и выполните seed; повторный запуск пересоздаёт демо-товары, сохраняя снимки старых заказов.
4. Auth → URL Configuration: Site URL https://<домен>; Redirect URLs https://<домен>/auth/callback. Для локального запуска http://localhost:3000/auth/callback. Добавляйте только нужные preview-адреса.
5. Настройте SMTP, проверьте реальную доставку magic link. Ссылку открывают в том же браузере, где запросили вход (PKCE).

## Vercel

Импортируйте репозиторий как Next.js, Node 24, сборка npm run build. Настройте переменные для каждого окружения:

| Переменная | Назначение |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | URL проекта |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Публичный anon-ключ с RLS |
| SUPABASE_SERVICE_ROLE_KEY | Только сервер, резервация ИИ и лимиты маршрутов мониторинга. Никогда не добавляйте NEXT_PUBLIC_ |
| GEMINI_API_KEY | Только сервер; бесплатный ключ Google AI Studio, основной ИИ |
| OPENROUTER_API_KEY | Только сервер; бесплатные модели `:free` как запасной ИИ |
| ANTHROPIC_API_KEY, AI_MODEL | Только сервер; платный вариант по желанию |
| AI_PROVIDERS, GEMINI_MODELS, OPENROUTER_MODELS | Необязательно: порядок цепочки и список моделей |
| AI_DAILY_LIMIT | 1–1000, по умолчанию 20 |
| AI_GLOBAL_DAILY_LIMIT | Общий потолок зарезервированных и успешных генераций за 24 часа, по умолчанию 300 |
| NEXT_PUBLIC_SITE_URL | Канонический HTTPS-адрес без завершающего / |
| DEMO_SLUG | По умолчанию demo |

Без ключей ИИ работает ручное заполнение карточки. Примените `0013_ai_global_limit.sql` перед выкладкой маршрута ИИ. При общем отказе из-за лимита бот отправляет уведомление в `ADMIN_TELEGRAM_CHAT_ID` не чаще раза за 24 часа. Неудачная генерация освобождает резерв.

Добавьте домен в Vercel Settings → Domains, выполните указанные DNS-записи, дождитесь TLS. Обновите Auth URLs в Supabase и повторно задеплойте: публичные переменные встраиваются при сборке.

src/proxy.ts обновляет сессию и перенаправляет гостя; server actions повторно проверяют Auth/RLS. outputFileTracingIncludes сохраняет src/assets/fonts/*.woff для serverless OG.

## Приёмка

- npm ci; npm run lint; npx next typegen; npm run typecheck; npm test; npm run build.
- Локальная отдельная БД: npx supabase start; npm run test:rls; npx playwright install chromium; npm run test:e2e.
- Deployment: /, /demo, /demo/cart, /robots.txt, /sitemap.xml, /manifest.webmanifest, /opengraph-image, /demo/opengraph-image.
- В приватном окне /dashboard должен вести на /login. Проверьте настоящее письмо, фото, генерацию с реальным ключом, заказ, WhatsApp и кабинет.
- Lighthouse запускайте по production-сборке. Корзина намеренно noindex: crawlability снижает SEO, снимать noindex ради оценки не следует.

Публичный деплой требует доступа к Vercel, облачному Supabase, домену и SMTP. Локальная сборка не доказывает работу на Vercel. Не публикуйте .env.local, сервисные ключи и traces реальных покупателей. Ограничения флуда и очистки Storage описаны в DECISIONS.md.

## Боевое развёртывание (16.11.2026)

| Что | Где |
| --- | --- |
| Сайт | https://dukenai.vercel.app (Vercel, проект `dukenai`, автодеплой с ветки `master` репозитория `temirkhanerbolatovich-coder/dukenai`) |
| База, Auth, Storage | Supabase, проект `dukenai`, ref `pcgvyxwueshxksoffodf`, регион eu-central-1 (Франкфурт), бесплатный тариф |
| Миграции | 0001–0009 применены командой `npx supabase db push --remote` |
| Адреса возврата для входа | заданы блоком `[remotes.production]` в `supabase/config.toml`, применяются `npx supabase config push --remote pcgvyxwueshxksoffodf`; остальные значения закреплены как в облаке, чтобы push не ослаблял защиту |
| Переменные Vercel (Production) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `AI_DAILY_LIMIT`, `DEMO_SLUG=povar-astana` |
| Пилот | `/povar-astana`, он же `/demo`; создан скриптом `npm run seed:pilot` с флагом `--allow-remote` |

Пароль базы лежит только в локальном `.env.local` (`SUPABASE_DB_PASSWORD`), ключи API только в Vercel и локальных файлах, в git их нет.

### Что нужно знать

- **Автор коммита должен совпадать с аккаунтом Vercel.** Иначе деплой блокируется («commit author doesn't have permission»). В репозитории настроен локальный `git config user` на GitHub-аккаунт владельца.
- **Почта входа.** Встроенная почта Supabase на бесплатном тарифе рассчитана на команду проекта и сильно ограничена по частоте; шаблоны писем на ней менять нельзя (`entitlement_required`). Для реальных пользователей подключите свой SMTP (Supabase → Authentication → SMTP; подойдёт Resend с подтверждённым доменом). После этого загрузите шаблоны из `docs/email-templates/` (в них есть и ссылка, и код) и включите вход по коду: `NEXT_PUBLIC_EMAIL_CODE=1` в Vercel.

  **Как загрузить письма SÖRE** (Supabase → Authentication → Emails → Templates; письма двуязычные, русский и казахский, с кнопкой и кодом):

  | Шаблон в Supabase | Файл | Тема письма |
  | --- | --- | --- |
  | Magic Link | `docs/email-templates/magic_link.html` | `Вход в SÖRE · SÖRE-ге кіру` |
  | Confirm signup | `docs/email-templates/confirmation.html` | `Добро пожаловать в SÖRE · SÖRE-ге қош келдіңіз` |

  Содержимое файла вставляется целиком в поле Message body. Остальные шаблоны (приглашение, смена почты, сброс пароля) приложение не использует. После загрузки запросите вход на свою почту: должны прийти кнопка и 8-значный код (длина кода задана `otp_length = 8` в облаке). Проверка шаблонов в репозитории: `npx vitest run tests/unit/email-templates.test.ts`. В `supabase/config.toml` шаблоны писем не прописаны намеренно: на встроенной почте их загрузка недоступна (`entitlement_required`), а `supabase config push` в этом проекте нужен только для адресов возврата.
- **Ссылка из письма и браузер.** Вход по ссылке (PKCE) работает только в том браузере, где его запросили. Если письмо откроется во встроенном браузере другого приложения, будет «ссылка устарела». Вход по коду решает это, но требует шаблонов выше.
- **Предпросмотры веток отключены** (`vercel.json`, `git.deploymentEnabled`): Vercel деплоит только `main`. Причины: переменные заданы лишь для боевого окружения (предпросмотр был бы неработающим), а на плане Hobby деплой блокируется для коммитов не владельца аккаунта и давал бы красную проверку «Vercel» на каждом PR.
- **Vercel Hobby** официально для некоммерческого использования; для работающего бизнеса нужен Pro.
- **Владелец пилотного магазина** сейчас аккаунт создателя проекта (один магазин на аккаунт). Когда у повара будет своя почта, поменяйте email владельца через админ-API или создайте для него магазин заново.

## Почта входа через Brevo (без своего домена)

Нужна, чтобы письма уходили всем пользователям, а не только команде проекта, и чтобы можно было загрузить шаблоны SÖRE. Бесплатный тариф Brevo: до 300 писем в сутки. Ключи вводите только сами, в панелях сервисов: в чат, в репозиторий и в Vercel их класть не нужно (SMTP-пароль хранит только Supabase).

**1. Brevo** ([brevo.com](https://www.brevo.com)):
1. Зарегистрируйтесь и пройдите проверку аккаунта (Brevo может попросить описать, чем вы занимаетесь: «магазин-ссылка для продавцов, письма входа»).
2. Senders, Domains & Dedicated IPs → Senders → Add a sender: имя `SÖRE`, адрес, с которого пойдут письма (почта, к которой есть доступ). Brevo пришлёт на неё код подтверждения, введите его.
3. SMTP & API → вкладка SMTP: запишите **Login** (вид `…@smtp-brevo.com`) и нажмите Generate a new SMTP key, скопируйте ключ (он показывается один раз).

**2. Supabase** (проект `dukenai`, Authentication → Emails → SMTP Settings → Enable custom SMTP):

| Поле | Значение |
| --- | --- |
| Sender email | **подтверждённый в Brevo адрес отправителя** (Senders), а не логин SMTP `…@smtp-brevo.com`: с логином Brevo отвергает письма («sender is not valid»), а Supabase всё равно отвечает 200 |
| Sender name | `SÖRE` |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | Login из Brevo (`…@smtp-brevo.com`) |
| Password | SMTP-ключ из Brevo |

Затем Authentication → Rate Limits: поднимите «Rate limit for sending emails» с 30 до 100 в час (суточный потолок задаёт Brevo, 300).

**3. Шаблоны.** Загрузите `magic_link.html` и `confirmation.html` с темами из раздела «Почта входа» выше (Authentication → Emails → Templates).

**4. Вход по коду.** Письма теперь содержат и ссылку, и 8-значный код. Включите поле кода на странице входа: переменная `NEXT_PUBLIC_EMAIL_CODE=1` в Vercel (Production) и пересборка. Без шаблонов из шага 3 поле кода включать не нужно: в стандартном письме кода может не быть.

**Если письма не приходят:** смотрите Brevo → Transactional → Email → Logs (статус и текст ошибки каждого письма), а не только Supabase: запрос входа (`/otp`) возвращает 200 и при отвергнутой отправке. Тема писем в шаблонах Supabase задаётся отдельно от тела: проверьте обе (Magic link и Confirm sign up).

**5. Проверка.** На https://dukenai.vercel.app/login запросите вход на свою почту. Должны прийти двуязычное письмо SÖRE с кнопкой и кодом; откройте ссылку на том же устройстве. Проверьте и папку «Спам»: без своего домена (записи SPF и DKIM) письма от бесплатного адреса отправителя могут туда попадать. Когда появится домен, подтвердите его в Brevo (Senders, Domains → Domains) и смените адрес отправителя на адрес на этом домене: доставляемость заметно вырастет.

## Новые возможности: что включить после выкладки (16.11.2026)

| Возможность | Что сделать |
| --- | --- |
| Telegram-уведомления | Создать бота и задать переменные: [docs/TELEGRAM.md](TELEGRAM.md). Пока не настроено, карточка в «Магазин» скрыта |
| Vercel Analytics и Speed Insights | Пакеты подключены. Включить в Vercel: Project → Analytics → Enable (и Speed Insights). Без этого данные не собираются |
| Вход через Google | Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web). Authorized redirect URI: `https://pcgvyxwueshxksoffodf.supabase.co/auth/v1/callback`. Client ID и Secret внести в Supabase → Authentication → Providers → Google. Затем в Vercel `NEXT_PUBLIC_GOOGLE_LOGIN=1` |
| Контактная почта в условиях | `NEXT_PUBLIC_CONTACT_EMAIL` в Vercel. Без неё в документах указан способ удаления через кабинет |
| Вход по коду из письма | Нужен свой SMTP и шаблоны из `docs/email-templates/`, затем `NEXT_PUBLIC_EMAIL_CODE=1` |

Миграция `0010` включает расширение `pg_net`: оно нужно триггеру уведомлений о заказах. Триггер ничего не делает, пока `npm run telegram:setup` не сохранит в базе адрес уведомлений.

### Очистка служебных данных

`0012_data_retention.sql` задаёт сроки хранения: окно лимитера 24 часа, события 90 дней, попытки ИИ 30 дней. Задача `dukenai-purge-old-data` запускается ежедневно в 21:00 UTC (02:00 в Астане на следующие сутки) при доступном `pg_cron` и часовом поясе планировщика UTC.

Если расширение недоступно при применении миграции, функция очистки всё равно создаётся. Включите `pg_cron` в проекте Supabase, проверьте UTC в настройках планировщика и выполните от имени владельца базы:

```sql
select cron.schedule(
  'dukenai-purge-old-data',
  '0 21 * * *',
  'select private.purge_old_data()'
);
```

Проверьте запись задачи в `cron.job` и первый запуск в `cron.job_run_details`. Отмена задачи прекращает последующие запуски. Удалённые строки восстанавливаются из резервной копии.

### Уборка осиротевших фото в Storage

Если продавец закрыл вкладку между «ИИ нашёл товары» и «Опубликовать» (или бросил черновик в боте), снимок полки и вырезки остаются в бакете `product-photos`. Раз в сутки их убирает Vercel Cron: `vercel.json` → `crons` вызывает `GET /api/cron/storage-cleanup` в 21:30 UTC (через полчаса после `purge_old_data`, к этому времени просроченные черновики бота уже удалены).

- Сирота: файл старше 24 часов, на который не ссылаются `products.photo_url`, `products.source_photo_url`, `shops.avatar_url` и живые черновики бота (`bot_drafts.payload`). Миниатюра `_s.jpg` удаляется и остаётся вместе со своим оригиналом. Свежие файлы не трогаются.
- Поиск делает функция базы `storage_orphan_photos` (миграция `0022`, только `service_role`), удаление идёт через Storage API пачками по 100, не больше ~50 секунд за запуск. Что не успело, уйдёт в следующий запуск.
- Включить: в Vercel задать `CRON_SECRET` (длинная случайная строка, Vercel сам подставит её в заголовок `Authorization`), применить миграцию `0022`, задеплоить. Без `CRON_SECRET` маршрут отвечает 403 и ничего не удаляет.
- Проверить вручную: `curl -H "Authorization: Bearer $CRON_SECRET" https://<сайт>/api/cron/storage-cleanup` вернёт `{"removed":…,"failed":…,"complete":true}`. Запуски видны в Vercel → Project → Settings → Cron Jobs и в логах функции.
- Удалённые файлы не восстанавливаются (резервные копии Supabase не включают Storage), поэтому порог в сутки не уменьшайте.

Юридические страницы (`/terms`, `/privacy`) написаны как рабочий черновик на основе фактического поведения сервиса. Перед массовым запуском их стоит показать юристу.

## Вход через Google: как настроено (16.11.2026)

- Google Cloud, проект `dukenai`, клиент OAuth «DukenAI2» (Web). Origins: `https://dukenai.vercel.app`; redirect URI: `https://pcgvyxwueshxksoffodf.supabase.co/auth/v1/callback`.
- Провайдер включён в Supabase через `config push` (`[remotes.production.auth.external.google]` в `supabase/config.toml`); Client ID и Secret подставляются из переменных `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` в момент push и в репозиторий не попадают. Кнопка включена `NEXT_PUBLIC_GOOGLE_LOGIN=1` в Vercel.
- Приложение в режиме **Testing**: войти могут только Test users (Audience), до 100 человек. Опубликовать приложение Google не даёт, пока домен `*.vercel.app` не принадлежит вам: нужен свой домен (или подтверждение через Search Console).
- Если вход ломается с `invalid_client`, секрет в Supabase не совпадает с действующим в Google. Google не показывает старые секреты: добавьте новый (Add secret → Download JSON), выполните `config push` с новыми `GOOGLE_*`, проверьте секрет запросом к `oauth2.googleapis.com/token` (ответ `invalid_grant` значит секрет верный, `invalid_client` неверный). Лимит Google: 2 секрета на клиент.


## Выкладка улучшений по аудиту: порядок (16.11.2026)

Ветка `codex/audit-improvements` добавляет миграции `0011`–`0015` и настройки окружения. Порядок выкладки:

1. **Ключи.** Перевыпустить ключи Gemini и OpenRouter (они были в `.env.example`), положить новые в Vercel (Production) и `.env.local`.
2. **Миграции в облако** (команду выполняет владелец, до выкладки кода): `npx supabase db push --remote`. Что меняется:
   - `0011`: лимит 30 заказов в час на магазин, `rate_limit_hit` для серверных маршрутов (только `service_role`);
   - `0012`: `private.purge_old_data()` и ежедневная очистка через `pg_cron` (см. раздел выше, если расширение не включилось само);
   - `0013`: общий суточный потолок ИИ в `reserve_ai`;
   - `0014`: столбцы «О магазине» (`about`, `address`, `hours`, `instagram`);
   - `0015`: `orders.public_code`, новая сигнатура `create_order` (возвращает `order_code`), `get_order_status`.
   Откатываются миграции вручную (обратных файлов нет): `0014` удалением четырёх столбцов, `0015` возвратом прежней `create_order` из `0011` и удалением столбца и функции; `0011`–`0013` возвратом прежних функций.
3. **Код.** Влить ветку в `master` (Vercel соберёт сам). Выкладывать код **после** миграций: страница заказа и корзина используют `order_code` и `get_order_status`.
4. **Миниатюры старых фото:** скрипт читает адрес и ключ службы из окружения (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`); для облака задайте их в своём терминале на время запуска (в `.env.local` указана локальная база) и выполните `npx tsx scripts/make-thumbs.ts --allow-remote`. Скрипт создаёт недостающие `_s.jpg` и не трогает существующие; без него старые товары показывают оригиналы (работает, но медленнее). Фото-аватары магазинов скрипт не обрабатывает.
5. **Проверки после выкладки:** заголовок `X-Vercel-Id` должен показать `fra1` у функции; `curl -I https://<сайт>/no-such-shop` даёт 404; `Content-Security-Policy-Report-Only` присутствует; тестовый заказ приходит в Telegram, страница `/o/<код>` открывается, статус меняется после «Выполнен» в кабинете.
6. **CSP.** Неделю смотреть отчёты в Telegram (маршрут `/api/csp-report`), при нуле нарушений поставить `CSP_ENFORCE=1`.

Новые необязательные переменные: `AI_GLOBAL_DAILY_LIMIT` (по умолчанию 300), `CSP_ENFORCE`.


## Безопасный порядок `config push`

Перед каждым `npx supabase config push --remote` выполните `npx supabase config diff --remote`: он показывает, что изменится в облаке. Ожидаемо расхождений 0. Одно исключение: `auth.external.google.client_id` в файле записан как `env(GOOGLE_CLIENT_ID)`, поэтому без этой переменной в терминале diff покажет 1 различие. Чтобы получить честные 0, задайте `GOOGLE_CLIENT_ID` (он публичный, виден в консоли Google) на время команды. Для самого push нужны `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET`. Значения пула соединений в `[remotes.production.db.pooler]` (15 и 200) совпадают с облаком; локальные 20 и 100 относятся только к локальной базе.

## Резервные копии боевой базы

На бесплатном тарифе Supabase нет восстановления на момент времени, поэтому копии делаем сами.

- **Как:** `npx supabase db dump --remote -f <папка>/schema-ДАТА.sql` и `npx supabase db dump --remote --data-only -f <папка>/data-ДАТА.sql`. Делайте перед каждой миграцией на прод и раз в неделю.
- **Где хранить:** вне репозитория (в дампах данные пользователей, в git их нельзя). Подойдёт папка на личном диске владельца или закрытое облачное хранилище. Не кладите дампы в `reports/`, скриншоты и логи.
- **Фото** лежат в бакете `product-photos` и в дамп не входят: при необходимости копируйте бакет отдельно (Storage в панели Supabase).
- **Восстановление:** создайте пустой проект (или локальную базу), примените схему `psql "$DATABASE_URL" -f schema-ДАТА.sql`, затем данные `psql "$DATABASE_URL" -f data-ДАТА.sql`. Пароль и строку подключения берите в панели Supabase (Settings → Database). Данные из дампа включают пользователей Auth, поэтому после восстановления проверьте вход.
- **Когда появятся реальные пользователи:** оцените платный тариф Supabase с ежедневными бэкапами.
