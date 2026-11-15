import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AI_SYSTEM_PROMPT, parseCard } from "@/lib/ai-card";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownedPhotoPath, MAX_PHOTO_BYTES, PHOTO_TYPES } from "@/lib/photos";

export const maxDuration = 60;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) return fail(503, "ИИ пока не настроен. Заполните карточку вручную.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "Войдите в аккаунт.");

  const { data: shop } = await supabase.from("shops").select("id").eq("owner_id", user.id).maybeSingle();
  if (!shop) return fail(404, "Сначала создайте магазин.");

  const body = (await request.json().catch(() => null)) as { photo_url?: string } | null;
  const photoUrl = body?.photo_url ?? "";
  const photoPath = ownedPhotoPath(photoUrl, user.id);
  if (!photoPath) return fail(400, "Сначала загрузите фото товара.");
  const { data: photo, error: photoError } = await supabase.storage.from("product-photos").download(photoPath);
  if (photoError || !photo || photo.size > MAX_PHOTO_BYTES || !PHOTO_TYPES.includes(photo.type)) {
    return fail(400, "Выберите JPEG, PNG или WebP до 5 МБ из своих загруженных фото.");
  }

  // Дневной лимит: считаем генерации за последние 24 часа.
  const configuredLimit = Number(process.env.AI_DAILY_LIMIT ?? 20);
  const limit = Number.isInteger(configuredLimit) && configuredLimit > 0 && configuredLimit <= 1000 ? configuredLimit : 20;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shop.id)
    .gte("created_at", since);
  if ((count ?? 0) >= limit) {
    return fail(429, `Лимит ИИ на сегодня исчерпан (${limit}). Заполните карточку вручную или попробуйте завтра.`);
  }

  // Бронируем попытку до вызова, чтобы параллельные запросы не обошли лимит.
  const admin = createAdminClient();
  const { data: reserved, error: reserveError } = await admin.rpc("reserve_ai", { p_shop: shop.id, p_limit: limit });
  if (reserveError) return fail(reserveError.message.includes("limit") ? 429 : 500, "Не удалось запустить ИИ: лимит исчерпан или сервис недоступен.");

  try {
    const client = new Anthropic({ apiKey, timeout: 45_000, maxRetries: 1 });
    const message = await client.messages.create({
      model: process.env.AI_MODEL ?? "claude-sonnet-5-5",
      max_tokens: 1024,
      system: AI_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: photo.type as "image/jpeg" | "image/png" | "image/webp", data: Buffer.from(await photo.arrayBuffer()).toString("base64") } },
            { type: "text", text: "Составь карточку товара по этому фото." },
          ],
        },
      ],
    });

    const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const card = parseCard(text);
    if (!card) throw new Error("bad model output");

    return NextResponse.json({ card, remaining: Math.max(0, limit - (count ?? 0) - 1) });
  } catch {
    // Неудачная попытка не должна съедать лимит продавца.
    await admin.from("ai_generations").delete().eq("id", reserved);
    return fail(502, "ИИ не смог разобрать фото. Попробуйте ещё раз или заполните вручную.");
  }
}
