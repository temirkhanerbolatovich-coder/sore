# Передача: задание №3

Ветка `codex/sore-stage-3` (PR в `develop`, черновик). Задание: `docs/CODEX_TASK_3.md`. Отчёт Codex по его части: `docs/CODEX_REPORT_3.md`.

## Что сделано

- **Codex, стадия A (частично):** тексты Sөre, иконки и анимации, исправления тёмной темы, e2e `dark-theme.spec.ts` (`3cd5552`, `d3081ca`, `f5a6684`, `e43c2e1`). Ревью Claude: замечаний, блокирующих слияние, нет.
- **Claude, схема (`bdee811`):** миграции `0016_shelf_mode` (bbox, source_photo_url, sku, price_needs_review), `0017_shop_telegram_username`, `0018_import_products` (импорт одной транзакцией, upsert по артикулу, лимит тарифа и битые строки — в отчёт). RLS-тестов 95 (было 75), все проходят.
- **Claude, стадия B — фото полки (`998ba16`):** `src/lib/ai-shelf.ts`, общая цепочка `runChain` в `ai-providers.ts`, `src/lib/ai-request.ts` (проверка фото и квоты для обоих ИИ-маршрутов), `/api/ai/shelf`, вырезки `src/lib/shelf-crops.ts` (sharp перенесён в `dependencies`), экран `/dashboard/products/shelf`, блок «Так товар выглядит на полке» в карточке товара, уборка общего снимка при удалении товара. Юнит-тестов 98 (было 76), e2e `tests/e2e/shelf.spec.ts`.

## Проверки на момент остановки (16.11.2026, 17:30)

`tsc`, `eslint`, `npm test` (98), `npm run test:rls` (95), `npm run build` — зелёные. e2e фото полки: 3 из 4 прошли, четвёртый падал на ожидании `networkidle` после клиентского перехода; тест исправлен (`page.goto` вместо клика), повторный прогон шёл в момент остановки. Полный `npm run test:e2e` после стадии B не запускался.

## Что осталось

1. **C — импорт Excel/CSV.** Схема и RPC `import_products` готовы. Нужно: `src/lib/catalog-file.ts` (заголовки RU/KZ, числа «1 500,50 ₸», CSV `;`/`,`/таб, UTF-8 и Windows-1251, проверка реального размера распаковки xlsx через `zlib.inflateRawSync` с `maxOutputLength` до передачи в `exceljs`), маршрут `POST /api/import` (Server Actions ограничены 1 МБ), серверное действие для `updateTag` после импорта (в Route Handler `updateTag` нельзя), шаблон CSV, экран `/dashboard/products/import` (ссылка в кабинете уже есть), CSV-отчёт об ошибках, тесты.
2. **D — каналы.** Колонка `shops.telegram_username` готова. Нужно: поле в настройках (принимать `@ник` и `t.me/ник`), кнопка «Написать в Telegram» на экране после заказа и на `/o/<код>` с копированием текста заказа, e2e.
3. **E — `docs/BOT_CONTRACT.md`** для участника, который делает бота.
4. Полный e2e, скриншоты обеих тем, обновление отчёта, `docs/DECISIONS.md` (решения: sku публичен вместе с товаром; категории импорта хранятся как в файле; JPEG вместо WebP для вырезок ради единой схемы миниатюр; `maxDuration` 90 с у `/api/ai/shelf`).

Облако и чужие контейнеры не трогать. Локальный Supabase — стек `sore`, e2e на порту 3100 (порт 3000 занят Grafana).
