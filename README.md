# SÖRE

**Магазин-ссылка для микропродавцов Казахстана.** Сфотографируйте полку или загрузите прайс, ИИ напишет карточки на русском и казахском, покупатель соберёт корзину по ссылке и напишет вам в WhatsApp или Telegram. Без приложения, без сайта на конструкторе, без бота для покупателя.

«Сөре» по-казахски «полка».

[![CI](https://github.com/temirkhanerbolatovich-coder/sore/actions/workflows/ci.yml/badge.svg)](https://github.com/temirkhanerbolatovich-coder/sore/actions/workflows/ci.yml)

**Статус:** MVP на боевой среде, идёт пилот. Сайт: https://dukenai.vercel.app (адрес сменится вместе с доменом). Репозиторий приватный, лицензия не определена.

## Что умеет

| Для продавца | Для покупателя |
|---|---|
| **Фото полки:** одно фото, ИИ находит до 12 товаров, вырезает фото каждого, пишет карточки RU/KZ. Продавец правит и публикует выбранные | Витрина по ссылке и QR: поиск, категории, русский и казахский, светлая и тёмная тема |
| **Прайс из Excel/CSV:** шаблон, заголовки на русском и казахском, обновление по артикулу, отчёт об ошибках | Корзина и заказ в два поля, цены считает сервер |
| **Карточки по фото:** одно или несколько фото, ИИ-описание | Заказ уходит в WhatsApp, а при желании и в Telegram продавца |
| **Заказы:** поиск, статусы, выгрузка CSV, уведомления в Telegram | Страница статуса заказа по секретной ссылке |
| **Печатный QR-плакат** для магазина | На карточке товара видно, где он стоит на полке |

## Скриншоты

| Фото полки: ИИ нашёл товары | Витрина (тёмная тема) | Импорт прайса | После заказа: WhatsApp и Telegram |
|---|---|---|---|
| <img src="reports/stage-3/04-shelf-frames-light.jpg" width="190" alt="Фото полки с рамками найденных товаров"> | <img src="reports/stage-3/09-storefront-dark.jpg" width="190" alt="Витрина магазина в тёмной теме"> | <img src="reports/stage-3/08-import-result-light.jpg" width="190" alt="Итог импорта прайса с отчётом об ошибках"> | <img src="reports/stage-3/11-order-done-dark.jpg" width="190" alt="Экран после заказа с двумя каналами связи"> |

Все снимки обеих тем: [`reports/stage-3`](reports/stage-3).

## Как устроено

- **Сайт и API:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4. Хостинг: Vercel.
- **База, вход, файлы:** Supabase (Postgres с RLS, Auth, Storage). Цены, лимиты и квоты считает база, а не клиент.
- **ИИ:** цепочка провайдеров Gemini, OpenRouter и Anthropic с резервированием квоты на каждый запрос.
- **Каналы:** WhatsApp (ссылка `wa.me`), Telegram (уведомления продавцу через бота, ссылка на личный чат для покупателя).
- **Тесты:** Vitest (юнит), pgTAP (политики RLS), Playwright (e2e на настоящем локальном Supabase).

Подробно: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Быстрый старт

Нужны **Node 24**, **Docker Desktop** (Linux-контейнеры) и **Git**.

```sh
git clone https://github.com/temirkhanerbolatovich-coder/sore.git
cd sore
npm ci
npx supabase start -x studio,edge-runtime,logflare,vector,realtime,imgproxy,supavisor
```

Миграции и демо-данные (`demo@sore.kz`, магазин `/demo`) применятся сами. Затем создайте `.env.local` из `.env.example` и впишите три значения из `npx supabase status -o env`: `API_URL` (в `NEXT_PUBLIC_SUPABASE_URL`), `ANON_KEY` и `SERVICE_ROLE_KEY`. Ключи ИИ необязательны: без них карточки заполняются вручную.

```sh
npm run dev      # http://localhost:3000
```

Локальная почта (письма входа): http://127.0.0.1:54324. Полная инструкция для Windows и частые проблемы: [docs/ONBOARDING.md](docs/ONBOARDING.md).

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` / `build` / `start` | разработка, сборка, запуск сборки |
| `npm run lint` / `typecheck` | ESLint и TypeScript |
| `npm test` | юнит-тесты (Vitest) |
| `npm run test:rls` | SQL-тесты политик доступа (нужен запущенный Supabase) |
| `npm run test:e2e` | e2e (Playwright): сначала `npm run build`, затем сам запускает production-сервер на порту 3100 |
| `npm run ai:check -- фото.jpg` | проверка ключей ИИ на настоящем фото |
| `npm run telegram:setup` | регистрация вебхука бота и адреса уведомлений |

Перед каждым PR: `npm run lint`, `npx next typegen && npm run typecheck`, `npm test`, а при правках SQL ещё `npm run test:rls`. CI повторяет всё это на GitHub, включая сборку и e2e.

## Структура репозитория

```
src/app/            страницы и API (App Router): витрина, кабинет, заказы, импорт, ИИ, Telegram
src/components/     общие компоненты: иконки, тема, корзина, рамки на фото
src/lib/            логика без привязки к страницам: ИИ, импорт, заказы, фото, Telegram
supabase/           миграции, сид, SQL-тесты (pgTAP), config.toml
tests/              unit/ (Vitest) и e2e/ (Playwright)
docs/               документация (индекс: docs/README.md)
scripts/            служебные скрипты: проверка ИИ, пилот, вебхук Telegram
reports/            скриншоты и отчёты проверок
```

## Как работать с репозиторием

- Основная ветка разработки **`develop`**, боевая **`main`** (с неё Vercel сам выкладывает сайт). Работаем в ветках от `develop`, в `main` попадает релиз через PR из `develop`.
- Коммиты и PR на русском, формат `тип(область): суть` (`feat(shelf): …`, `fix(import): …`, `docs: …`).
- Задачи ведём в [Issues](https://github.com/temirkhanerbolatovich-coder/sore/issues) с метками и вехами (**Запуск (MVP)**, **Telegram-бот**).

Правила и чек-лист: [CONTRIBUTING.md](CONTRIBUTING.md).

## Документация

Индекс всех документов: [docs/README.md](docs/README.md). Главное:

- [Архитектура](docs/ARCHITECTURE.md) и [решения](docs/DECISIONS.md)
- [Быстрый старт разработчика](docs/ONBOARDING.md)
- [Деплой и эксплуатация](docs/DEPLOY.md)
- [Контракт для Telegram-бота](docs/BOT_CONTRACT.md)
- [Результаты проверок](docs/VALIDATION.md)

## Команда

Владелец репозитория: [@temirkhanerbolatovich-coder](https://github.com/temirkhanerbolatovich-coder). Участники: [@Aikyn800](https://github.com/Aikyn800), [@megaknight707](https://github.com/megaknight707).
