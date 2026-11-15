# DukenAI

Мобильный магазин-ссылка для микропродавцов Казахстана: фото → ИИ-карточка RU/KZ → корзина → сохранённый заказ → WhatsApp. Продавец входит по email magic link; покупатель без регистрации. Без оплаты и ботов.

Next.js 16 App Router, TypeScript, Tailwind v4, Supabase Auth/Postgres/Storage, Zustand, Zod, Anthropic. RLS отделяет кабинеты; create_order считает цены на сервере.

## Локальный запуск

Нужны Node 24 и Docker Desktop (Linux containers).

```sh
npm ci
npx supabase start -x studio,edge-runtime,logflare,vector,realtime,imgproxy,supavisor
```

CLI применяет миграции и локальный seed с demo@duken.ai. Скопируйте .env.example в .env.local, перенесите API URL, anon и service_role ключи из `npx supabase status -o env`. Не публикуйте вывод. ИИ-ключи необязательны: без них работает ручное заполнение. Бесплатно: `GEMINI_API_KEY` (aistudio.google.com/apikey) и/или `OPENROUTER_API_KEY` (openrouter.ai/keys, модели `:free`). Проверка ключей на настоящем фото: `npm run ai:check -- фото.jpg`.

```sh
npm run dev
```

Сайт http://localhost:3000, демо http://localhost:3000/demo, локальная почта http://127.0.0.1:54324, Studio можно включить полным запуском без -x (http://127.0.0.1:54323). `npx supabase db reset` пересоздаёт только локальную БД и удаляет её данные.

## Проверки

```sh
npm run lint
npx next typegen
npm run typecheck
npm test
npm run test:rls
npm run build
npx playwright install chromium
npm run test:e2e
```

E2E запускает production-сервер, использует настоящие локальные Auth/Storage/Postgres и почту, подменяет только ИИ и внешний переход WhatsApp. Тестовый аккаунт удаляется после сценария. CI выполняет проверки на push/PR. E2E слушает порт 3100 (`E2E_PORT` меняет его; адрес `/auth/callback` этого порта должен быть в `additional_redirect_urls` в `supabase/config.toml`, после правки перезапустите локальный Supabase). Занятый порт даёт ошибку, а не подключение к чужому серверу.

Типы обновляются: `npx supabase gen types typescript --local > src/lib/database.types.ts`.

## Документация

- [Решения и ограничения](docs/DECISIONS.md)
- [Деплой](docs/DEPLOY.md)
- [Результаты проверок](docs/VALIDATION.md)
- [Питч](docs/PITCH.md)

MVP для пилота. Нет биллинга, онлайн-оплаты, вариантов товаров и SMS OTP. Базовые лимиты не защищают от распределённого флуда. Неиспользованные фото незавершённых форм требуют уборки. Публичный deployment, настоящие Anthropic и WhatsApp требуют внешних ключей и отдельной проверки.
