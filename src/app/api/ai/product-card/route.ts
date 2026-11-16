import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiConfigured, generateCard } from "@/lib/ai-providers";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownedPhotoPath, MAX_PHOTO_BYTES, PHOTO_TYPES } from "@/lib/photos";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendTelegram } from "@/lib/telegram";

export const maxDuration = 60;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

async function notifyGlobalLimit(limit: number) {
  const chat = process.env.ADMIN_TELEGRAM_CHAT_ID;
  if (!chat || !process.env.TELEGRAM_BOT_TOKEN) return;
  if (await checkRateLimit("ai-global-limit:alert", 86_400, 1) !== 200) return;
  const sent = await sendTelegram(chat, `DukenAI: исчерпан общий лимит ИИ за 24 часа (${limit}).`);
  if (!sent) console.error("AI quota alert delivery failed.");
}

export async function POST(request: Request) {
  if (!aiConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return fail(503, "ИИ пока не настроен. Заполните карточку вручную.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "Войдите в аккаунт.");

  const { data: shop } = await supabase.from("shops").select("id").eq("owner_id", user.id).maybeSingle();
  if (!shop) return fail(404, "Сначала создайте магазин.");

  const body = (await request.json().catch(() => null)) as { photo_url?: string; categories?: unknown } | null;
  const photoUrl = body?.photo_url ?? "";
  const photoPath = ownedPhotoPath(photoUrl, user.id);
  if (!photoPath) return fail(400, "Сначала загрузите фото товара.");
  const { data: photo, error: photoError } = await supabase.storage.from("product-photos").download(photoPath);
  if (photoError || !photo || photo.size > MAX_PHOTO_BYTES || !PHOTO_TYPES.includes(photo.type)) {
    return fail(400, "Выберите JPEG, PNG или WebP до 5 МБ из своих загруженных фото.");
  }

  // Число генераций магазина используется для подсказки об оставшейся квоте.
  const configuredLimit = Number(process.env.AI_DAILY_LIMIT ?? 20);
  const limit = Number.isInteger(configuredLimit) && configuredLimit > 0 && configuredLimit <= 1000 ? configuredLimit : 20;
  const globalSetting = process.env.AI_GLOBAL_DAILY_LIMIT?.trim() ?? "";
  const configuredGlobalLimit = Number(globalSetting);
  const globalLimit = /^[1-9]\d*$/.test(globalSetting) && Number.isSafeInteger(configuredGlobalLimit) ? configuredGlobalLimit : 300;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shop.id)
    .gte("created_at", since);
  // Под одной блокировкой БД проверяет обе квоты и резервирует попытку до обращения к провайдеру.
  const admin = createAdminClient();
  const { data: reserved, error: reserveError } = await admin.rpc("reserve_ai", { p_shop: shop.id, p_limit: limit, p_global_limit: globalLimit });
  if (reserveError?.message === "ai global limit exceeded") {
    await notifyGlobalLimit(globalLimit);
    return fail(503, "ИИ сегодня перегружен, заполните карточку вручную.");
  }
  if (reserveError?.message === "ai limit exceeded") {
    return fail(429, `Лимит ИИ на сегодня исчерпан (${limit}). Заполните карточку вручную или попробуйте завтра.`);
  }
  if (reserveError || !reserved) return fail(500, "Не удалось запустить ИИ: сервис недоступен.");

  try {
    const bytes = Buffer.from(await photo.arrayBuffer());
    // Категории, уже заведённые в магазине: ИИ выбирает из них, чтобы товары не расползались по похожим названиям.
    let categories: string[] = [];
    try {
      const { data } = await supabase.from("products").select("category").eq("shop_id", shop.id);
      categories = [...new Set((data ?? []).map((p: { category: string | null }) => p.category).filter((c): c is string => Boolean(c)))];
    } catch {
      /* категории необязательны */
    }
    // Категории, уже выбранные ИИ для соседних фото одной партии, помогают держать их единообразными.
    const extra = Array.isArray(body?.categories) ? body.categories.filter((c): c is string => typeof c === "string").map((c) => c.slice(0, 60)).slice(0, 20) : [];
    categories = [...new Set([...categories, ...extra])];
    const { card, provider, kzDropped } = await generateCard({ base64: bytes.toString("base64"), mime: photo.type, categories });
    console.info("ai-card ok", provider);

    return NextResponse.json({ card, provider: provider.split(":")[0], kzDropped, remaining: Math.max(0, limit - (count ?? 0) - 1) });
  } catch (e) {
    console.error("ai-card failed:", e instanceof Error ? e.message : e);
    // Неудачная попытка не должна съедать лимит продавца.
    await admin.from("ai_generations").delete().eq("id", reserved);
    return fail(502, "ИИ не смог разобрать фото. Попробуйте ещё раз или заполните вручную.");
  }
}
