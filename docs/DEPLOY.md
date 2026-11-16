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
| SUPABASE_SERVICE_ROLE_KEY | Только сервер, резервация ИИ; никогда NEXT_PUBLIC_ |
| GEMINI_API_KEY | Только сервер; бесплатный ключ Google AI Studio, основной ИИ |
| OPENROUTER_API_KEY | Только сервер; бесплатные модели `:free` как запасной ИИ |
| ANTHROPIC_API_KEY, AI_MODEL | Только сервер; платный вариант по желанию |
| AI_PROVIDERS, GEMINI_MODELS, OPENROUTER_MODELS | Необязательно: порядок цепочки и список моделей |

Без ключей ИИ работает ручное заполнение карточки.
| AI_DAILY_LIMIT | 1–1000, по умолчанию 20 |
| NEXT_PUBLIC_SITE_URL | Канонический HTTPS-адрес без завершающего / |
| DEMO_SLUG | По умолчанию demo |

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

Юридические страницы (`/terms`, `/privacy`) написаны как рабочий черновик на основе фактического поведения сервиса. Перед массовым запуском их стоит показать юристу.
