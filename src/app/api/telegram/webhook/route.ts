import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, sendTelegram } from "@/lib/telegram";

type Update = { message?: { text?: string; chat?: { id: number; type?: string } } };

/** Webhook бота: `/start КОД` привязывает чат к магазину, `/stop` отвязывает. */
export async function POST(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const given = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!expected || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const update = (await request.json().catch(() => null)) as Update | null;
  const chatId = update?.message?.chat?.id;
  const text = update?.message?.text?.trim() ?? "";
  // Для чужих и непонятных сообщений отвечаем 200, чтобы Telegram не пересылал их повторно.
  if (!chatId || update?.message?.chat?.type !== "private") return NextResponse.json({ ok: true });

  const admin = createAdminClient();

  const start = text.match(/^\/start(?:@\w+)?\s+([A-Za-z0-9_-]{8,64})$/);
  if (start) {
    const { data: row } = await admin.from("shop_telegram").select("shop_id").eq("link_code", start[1]).maybeSingle();
    if (!row) {
      await sendTelegram(chatId, "Код не подошёл или устарел. Откройте в кабинете Sөre «Магазин» и нажмите «Подключить Telegram» ещё раз.");
      return NextResponse.json({ ok: true });
    }
    await admin.from("shop_telegram").update({ chat_id: chatId, linked_at: new Date().toISOString(), link_code: null }).eq("shop_id", row.shop_id);
    const { data: shop } = await admin.from("shops").select("name").eq("id", row.shop_id).maybeSingle();
    await sendTelegram(chatId, `Готово! Магазин «${escapeHtml(shop?.name ?? "")}» подключён: новые заказы будут приходить сюда. Отключить можно командой /stop.`);
    return NextResponse.json({ ok: true });
  }

  if (/^\/stop(?:@\w+)?$/.test(text)) {
    await admin.from("shop_telegram").update({ chat_id: null, linked_at: null }).eq("chat_id", chatId);
    await sendTelegram(chatId, "Уведомления отключены. Подключить снова можно в кабинете Sөre.");
    return NextResponse.json({ ok: true });
  }

  await sendTelegram(chatId, "Это бот уведомлений Sөre. Чтобы получать заказы, откройте в кабинете «Магазин» и нажмите «Подключить Telegram».");
  return NextResponse.json({ ok: true });
}
