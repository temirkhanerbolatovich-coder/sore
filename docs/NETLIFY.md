# Хостинг на Netlify

С 19 ноября 2026 сайт переезжает с Vercel на Netlify: тариф Vercel Hobby разрешён только для личного и некоммерческого использования ([условия](https://vercel.com/docs/plans/hobby)). Пока не хватает денег на Vercel Pro (20 $/мес), работаем на бесплатном Netlify, а когда появится выручка, вернёмся на Vercel Pro или выберем платный план Netlify. Коммерческое использование бесплатного Netlify по данным обзоров разрешено, но в самих условиях Netlify это не проверено: сверьте перед ростом нагрузки.

Код остаётся одним: Next.js собирается и на Vercel, и на Netlify. Отличия: расписание уборки фото (`netlify/functions/storage-cleanup.mts` вместо `vercel.json → crons`) и счётчики Vercel Analytics, которые включаются только когда `VERCEL=1`.

## Где что

| Что | Значение |
|---|---|
| Сайт | https://sore-kz.netlify.app (проект Netlify `sore-kz`, репозиторий `temirkhanerbolatovich-coder/sore`, ветка `main`) |
| Сборка | `npm run build`, Node 24 (`netlify.toml`), адаптер Next.js ставит Netlify сам |
| Деплой | автоматически при каждом пуше в `main` |
| Cron | `netlify/functions/storage-cleanup.mts` вызывает `/api/cron/storage-cleanup` в 21:30 UTC; работает только на опубликованном деплое, нужен `CRON_SECRET` |
| Регион функций | по умолчанию `us-east-2` (США), а база во Франкфурте: каждый запрос к базе идёт через океан. Сменить на `eu-central-1` можно в Netlify → Site configuration → Functions → Region (через API это не удалось, на бесплатном плане может быть недоступно); без этого страницы медленнее |

## Переменные окружения (Site configuration → Environment variables)

| Переменная | Откуда |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | то же, как секретная переменная; только сервер |
| `NEXT_PUBLIC_SITE_URL` | `https://sore-kz.netlify.app` (встраивается при сборке: после смены нужен новый деплой) |
| `DEMO_SLUG` | `demo-oyu` |
| `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `AI_DAILY_LIMIT` | из Google AI Studio и OpenRouter; в Vercel эти ключи секретные и не читаются, берём из своих кабинетов |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` | @BotFather |
| `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_NOTIFY_SECRET`, `BOT_LOGIN_SECRET`, `CRON_SECRET` | новые случайные строки (`openssl rand -hex 32`); после смены `TELEGRAM_*` запустить `npm run telegram:setup` |
| `ADMIN_TELEGRAM_CHAT_ID`, `NEXT_PUBLIC_GOOGLE_LOGIN` | как были в Vercel |

Секреты вводит сам владелец, в панели Netlify или командой `netlify env:set ИМЯ значение --secret --context production`. В чат и в репозиторий их не кладём.

## Порядок переключения

1. Задать переменные на Netlify (таблица выше) и сделать деплой ветки `main`.
2. В Supabase поменять Site URL и Redirect URLs на адрес Netlify: правка блока `[remotes.production.auth]` в `supabase/config.toml` и `npx supabase config push --project-ref pcgvyxwueshxksoffodf` (см. `docs/DEPLOY.md`, раздел про Google; секреты Google берутся из переменных окружения в момент push).
3. Google Cloud Console → Credentials → клиент OAuth: добавить Authorized JavaScript origin с адресом Netlify (redirect URI Supabase не меняется).
4. `npm run telegram:setup` с новым `NEXT_PUBLIC_SITE_URL`: переносит webhook бота и адрес уведомлений в базе на Netlify.
5. Проверить: вход по письму, вход из бота, ИИ-карточка, заказ и уведомление в Telegram, `/api/cron/storage-cleanup` с `CRON_SECRET`, витрины, фото.
6. Старый адрес `dukenai.vercel.app` оставить только как перенаправление на новый (ссылки продавцов в био не должны сломаться). Vercel Hobby для коммерции не использовать.

## Откат

Вернуть `NEXT_PUBLIC_SITE_URL` и Auth URLs на `https://dukenai.vercel.app`, выполнить `npm run telegram:setup` и убрать перенаправление в Vercel. Данные в Supabase не трогаются, их менять не нужно.

## Ограничения бесплатного Netlify

Лимиты и «кредиты» бесплатного плана меняются (в обзорах: 100 ГБ трафика и 300 минут сборки в месяц), при нуле кредитов сайты приостанавливаются. Следите за расходом в Netlify → Usage. Узкое место при росте: серверные страницы витрин и обработка картинок.
