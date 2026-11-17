import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildOrderNotification, sendTelegram, type OrderForMessage } from "@/lib/telegram";

/** Вызывается триггером базы после создания заказа (pg_net). В теле только id заказа. */
export async function POST(request: Request) {
  const expected = process.env.TELEGRAM_NOTIFY_SECRET;
  const given = request.headers.get("x-notify-secret") ?? "";
  if (!expected || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { order_id?: string } | null;
  const orderId = body?.order_id;
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return NextResponse.json({ ok: true, skipped: "order not found" });

  const [{ data: shop }, { data: link }] = await Promise.all([
    admin.from("shops").select("name").eq("id", order.shop_id).maybeSingle(),
    admin.from("shop_telegram").select("chat_id").eq("shop_id", order.shop_id).maybeSingle(),
  ]);
  if (!shop || !link?.chat_id) return NextResponse.json({ ok: true, skipped: "no telegram link" });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dukenai.vercel.app";
  const { text, buttons, actions } = buildOrderNotification(order as unknown as OrderForMessage, shop.name, site);
  const sent = await sendTelegram(link.chat_id, text, buttons, actions);
  return NextResponse.json({ ok: sent });
}
