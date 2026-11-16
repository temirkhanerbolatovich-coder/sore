# Деплой: Vercel + Supabase

## База

1. Создайте Supabase-проект. Примените все supabase/migrations/*.sql по порядку через SQL Editor либо `npx supabase link --project-ref <ref>` и `npx supabase db push`. Перед обновлением существующей БД сделайте резервную копию. Не выполняйте db reset на production.
2. Миграции создают RLS, RPC и публичный бакет product-photos: 5 МБ, JPEG/PNG/WebP, запись в папку своего auth.uid().
3. В Auth → Users создайте подтверждённого demo@duken.ai. Не применяйте local-user.sql к облачной БД. Укажите свой WhatsApp в seed.sql и выполните seed; повторный запуск пересоздаёт демо-товары, сохраняя снимки старых заказов.
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
- **Ссылка из письма и браузер.** Вход по ссылке (PKCE) работает только в том браузере, где его запросили. Если письмо откроется во встроенном браузере другого приложения, будет «ссылка устарела». Вход по коду решает это, но требует шаблонов выше.
- **Vercel Hobby** официально для некоммерческого использования; для работающего бизнеса нужен Pro.
- **Владелец пилотного магазина** сейчас аккаунт создателя проекта (один магазин на аккаунт). Когда у повара будет своя почта, поменяйте email владельца через админ-API или создайте для него магазин заново.

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
