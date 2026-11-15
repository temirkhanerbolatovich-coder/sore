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
| ANTHROPIC_API_KEY | Только сервер; без ключа ручное заполнение |
| AI_MODEL | Модель, доступная аккаунту Anthropic |
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
