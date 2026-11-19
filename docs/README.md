# Документация SÖRE

Индекс всех документов. Если не знаете, с чего начать: [быстрый старт](ONBOARDING.md), затем [архитектура](ARCHITECTURE.md).

## Начать работу

| Документ | О чём |
|---|---|
| [ONBOARDING.md](ONBOARDING.md) | запуск проекта локально, проверки, частые проблемы Windows |
| [ARCHITECTURE.md](ARCHITECTURE.md) | из чего состоит система, главные сценарии, карта кода |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | ветки, коммиты, PR, правила кода, метки Issues |
| [../SECURITY.md](../SECURITY.md) | как сообщить об уязвимости, что делать при утечке ключа |

## Продукт и решения

| Документ | О чём |
|---|---|
| [DECISIONS.md](DECISIONS.md) | принятые решения и причины: безопасность, кэш, ИИ, импорт, Telegram |
| [VALIDATION.md](VALIDATION.md) | результаты проверок: тесты, замеры, Lighthouse |
| [PILOT.md](PILOT.md) | первый живой клиент и что для него доработали |
| [NETLIFY.md](NETLIFY.md) | хостинг на Netlify: переменные, порядок переключения, откат |
| [UX_AUDIT.md](UX_AUDIT.md) | UX-аудит: пробелы по путям покупателя и продавца, приоритеты, план проверки |
| [STRATEGY.md](STRATEGY.md) | аналоги, что у нас уже есть, план доработок и риски |
| [LAUNCH.md](LAUNCH.md) | план запуска: фазы, метрики, роли, скрипт интервью |
| [OUTREACH.md](OUTREACH.md) | кандидаты на приглашение и тексты писем |
| [PITCH.md](PITCH.md) | сценарий демо и питча |

## Эксплуатация

| Документ | О чём |
|---|---|
| [DEPLOY.md](DEPLOY.md) | боевая среда: Vercel, Supabase, переменные, письма входа, SMTP, Google-вход |
| [TELEGRAM.md](TELEGRAM.md) | уведомления о заказах: настройка бота, как работает привязка |
| [email-templates/](email-templates) | двуязычные письма входа для Supabase (загружаются после подключения SMTP) |

## Telegram-бот (в работе)

| Документ | О чём |
|---|---|
| [BOT_CONTRACT.md](BOT_CONTRACT.md) | контракт для разработчика бота: что уже есть, что добавить, безопасность |

Задачи по боту: [Issues с меткой `area:bot`](https://github.com/temirkhanerbolatovich-coder/sore/labels/area%3Abot).

## Архив

[archive/](archive) хранит историю: задания для Codex и отчёты по ним (`CODEX_TASK*.md`, `CODEX_REPORT*.md`), аудит (`AUDIT.md`), старый список улучшений (`BACKLOG.md`) и передачу после задания №3 (`HANDOFF_stage3.md`). Это не инструкции к действию: актуальные задачи ведутся в [Issues](https://github.com/temirkhanerbolatovich-coder/sore/issues).
