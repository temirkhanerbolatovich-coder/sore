# Быстрый старт разработчика

От нуля до запущенного сайта с тестовыми данными за 10–15 минут. Написано по реальным подводным камням Windows, где работает большая часть команды.

## 1. Что нужно установить

| Что | Версия | Зачем |
|---|---|---|
| Node.js | 24 | сайт и тесты |
| Docker Desktop | с Linux-контейнерами | локальный Supabase (база, вход, файлы, почта) |
| Git | любая свежая | репозиторий |
| Chrome или Chromium | ставит Playwright | e2e-тесты |

Приглашение в репозиторий принимается на GitHub (письмо или раздел Notifications), без него клон приватного репозитория не сработает.

## 2. Клонирование и настройка Git

```sh
git clone https://github.com/temirkhanerbolatovich-coder/sore.git
cd sore
git config core.longpaths true     # Windows: иначе «Filename too long» на длинных путях
git config user.name  "Ваше имя"
git config user.email "почта, привязанная к вашему GitHub"
```

Автор коммита должен быть вашим аккаунтом GitHub, иначе Netlify и Vercel на бесплатном плане блокируют сборку (подробности в [DEPLOY.md](DEPLOY.md)). Не клонируйте в папку с очень длинным путём: `C:\dev\sore` подойдёт.

## 3. Запуск

```sh
npm ci
npx supabase start -x studio,edge-runtime,logflare,vector,realtime,imgproxy,supavisor
npx supabase status -o env       # здесь API_URL, ANON_KEY, SERVICE_ROLE_KEY
```

Создайте `.env.local` из `.env.example` и впишите:

```
NEXT_PUBLIC_SUPABASE_URL=<API_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
```

Ключи ИИ необязательны (без них «Заполнить с ИИ» отвечает, что ИИ не настроен). Для проверки с настоящими моделями добавьте `GEMINI_API_KEY` или `OPENROUTER_API_KEY`.

```sh
npm run dev
```

Откройте http://localhost:3000. Демо-магазин: `/demo`. Вход в кабинет: `/login`, e-mail `demo@sore.kz`, письмо со ссылкой придёт в локальную почту http://127.0.0.1:54324. Ссылку нужно открывать в том же браузере, где запрошен вход.

Сбросить базу к чистому состоянию (миграции и сид заново): `npx supabase db reset`. Остановить: `npx supabase stop`.

## 4. Проверки перед PR

```sh
npm run lint
npx next typegen && npm run typecheck
npm test
npm run test:rls                  # если правили SQL
npm run build && npm run test:e2e # e2e запускает production-сервер, сначала сборка
```

Перед повторным прогоном e2e в тот же час сделайте `npx supabase db reset`: у `create_order` есть лимит заказов в час на номер телефона, и счётчик хранится в базе. Тесты берут уникальные номера, но старые данные всё равно полезно сбрасывать.

## 5. Частые проблемы

| Симптом | Причина и решение |
|---|---|
| `Filename too long` при `git fetch`, `gc` или коммите | `git config core.longpaths true`, короткий путь к папке |
| Сайт на `localhost:3000` показывает чужую страницу | порт 3000 занят другой программой (например Grafana). Запускайте `npm run dev -- -p 3100`; e2e по умолчанию идёт на 3100 (`E2E_PORT`) |
| `supabase start`: `port is already allocated` | запущен другой локальный Supabase. Остановите его (`npx supabase stop` в его проекте) или закройте контейнеры, которые держат порты 54321–54324 |
| `Cannot find name 'LayoutProps'` в `tsc` | выполните `npx next typegen` перед `npm run typecheck` |
| e2e падает на старте | сначала `npm run build`; Playwright ставит браузеры командой `npx playwright install chromium` |
| `Заказ принят` не появляется в e2e при повторных прогонах | сработал лимит заказов на номер: `npx supabase db reset` |
| Предупреждения про `LF` и `CRLF` | в репозитории всегда LF (`.gitattributes`); предупреждение безопасно |

## 6. Куда дальше

- Архитектура и карта кода: [ARCHITECTURE.md](ARCHITECTURE.md).
- Правила работы с ветками, коммитами и PR: [CONTRIBUTING.md](../CONTRIBUTING.md).
- Работа над Telegram-ботом: [BOT_CONTRACT.md](BOT_CONTRACT.md) и задачи с меткой `area:bot` в Issues.
