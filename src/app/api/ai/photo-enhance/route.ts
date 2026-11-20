import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enhanceConfigured, enhancePhoto } from "@/lib/ai-enhance";
import { loadOwnedPhoto, reserveAi } from "@/lib/ai-request";

export const maxDuration = 60;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Улучшение фото товара («сделать продающим»). Возвращает новый снимок как data URL, ничего не сохраняя:
 * продавец сравнивает «до/после», и только при согласии клиент загружает результат отдельным файлом.
 * Оригинал остаётся нетронутым, поэтому откат бесплатный. Расходует ту же суточную квоту ИИ, что и карточка.
 */
export async function POST(request: Request) {
  if (!enhanceConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return fail(503, "Улучшение фото пока не настроено.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "Войдите в аккаунт.");

  const { data: shop } = await supabase.from("shops").select("id").eq("owner_id", user.id).maybeSingle();
  if (!shop) return fail(404, "Сначала создайте магазин.");

  const body = (await request.json().catch(() => null)) as { photo_url?: string } | null;
  const loaded = await loadOwnedPhoto(supabase, user.id, body?.photo_url ?? "", "Сначала загрузите фото товара.");
  if (!loaded.ok) return fail(loaded.status, loaded.error);
  const { photo } = loaded;

  const quota = await reserveAi(supabase, shop.id, "оставьте фото как есть");
  if (!quota.ok) return fail(quota.status, quota.error);

  try {
    const bytes = Buffer.from(await photo.arrayBuffer());
    const result = await enhancePhoto({ base64: bytes.toString("base64"), mime: photo.type });
    return NextResponse.json({ image: `data:${result.mime};base64,${result.base64}`, remaining: quota.remaining });
  } catch (e) {
    console.error("ai-enhance failed:", e instanceof Error ? e.message : e);
    await quota.release();
    return fail(502, "Не удалось улучшить фото. Попробуйте ещё раз или оставьте как есть.");
  }
}
