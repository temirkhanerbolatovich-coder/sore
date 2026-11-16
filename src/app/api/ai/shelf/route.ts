import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiConfigured } from "@/lib/ai-providers";
import { loadOwnedPhoto, reserveAi, shopCategories } from "@/lib/ai-request";
import { generateShelf, ShelfEmptyError } from "@/lib/ai-shelf";
import { thumbPath } from "@/lib/photos";
import { cropShelfPhoto } from "@/lib/shelf-crops";

/**
 * Фото полки → черновики товаров. Ничего не пишет в таблицу products: продавец проверяет черновики и
 * публикует выбранные (dashboard/products/shelf/actions.ts). Вырезки сразу кладутся в папку продавца в Storage,
 * невыбранные удаляются при публикации.
 * ИИ отвечает до ~50 с, затем вырезки и загрузка: даём функции запас.
 */
export const maxDuration = 90;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  if (!aiConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return fail(503, "ИИ пока не настроен. Добавьте товары по одному или загрузите прайс.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "Войдите в аккаунт.");

  const { data: shop } = await supabase.from("shops").select("id").eq("owner_id", user.id).maybeSingle();
  if (!shop) return fail(404, "Сначала создайте магазин.");

  const body = (await request.json().catch(() => null)) as { photo_url?: unknown } | null;
  const loaded = await loadOwnedPhoto(supabase, user.id, body?.photo_url ?? "", "Сначала загрузите фото полки.");
  if (!loaded.ok) return fail(loaded.status, loaded.error);

  const quota = await reserveAi(supabase, shop.id, "добавьте товары вручную");
  if (!quota.ok) return fail(quota.status, quota.error);

  const bytes = Buffer.from(await loaded.photo.arrayBuffer());
  let found: Awaited<ReturnType<typeof generateShelf>>;
  try {
    found = await generateShelf({ base64: bytes.toString("base64"), mime: loaded.photo.type, categories: await shopCategories(supabase, shop.id) });
    console.info("ai-shelf ok", found.provider, found.items.length);
  } catch (e) {
    await quota.release();
    if (e instanceof ShelfEmptyError) {
      return fail(422, "На фото не нашли товаров. Снимите полку ближе и при хорошем свете или добавьте товары вручную.");
    }
    console.error("ai-shelf failed:", e instanceof Error ? e.message : e);
    return fail(502, "ИИ не смог разобрать фото. Попробуйте ещё раз или добавьте товары вручную.");
  }

  // Вырезки: каждая с миниатюрой, как обычное фото товара. Не загрузилась — товар покажет фото полки.
  const bucket = supabase.storage.from("product-photos");
  const options = { contentType: "image/jpeg", cacheControl: "31536000" };
  const crops = await cropShelfPhoto(bytes, found.items.map((i) => i.bbox)).catch(() => found.items.map(() => null));
  const photoUrls = await Promise.all(
    crops.map(async (crop) => {
      if (!crop) return null;
      const path = `${user.id}/${randomUUID()}.jpg`;
      const small = thumbPath(path);
      const full = await bucket.upload(path, crop.full, options);
      if (full.error) return null;
      const thumb = await bucket.upload(small, crop.thumb, options);
      if (thumb.error) {
        await bucket.remove([path, small]).catch(() => undefined);
        return null;
      }
      return bucket.getPublicUrl(path).data.publicUrl;
    }),
  );

  return NextResponse.json({
    provider: found.provider.split(":")[0],
    remaining: quota.remaining,
    items: found.items.map((item, i) => ({ ...item, photo_url: photoUrls[i] })),
  });
}
