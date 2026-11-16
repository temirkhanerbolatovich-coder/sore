import { reportError } from "@/lib/monitoring";

/** Все необработанные ошибки сервера (страницы, действия, маршруты) попадают сюда и уходят владельцу в Telegram. */
export async function onRequestError(error: unknown, request: { path: string; method: string }) {
  await reportError("server", error, `${request.method} ${request.path}`);
}
