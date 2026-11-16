"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireShop } from "@/lib/shop";
import { ownedPhotoPath } from "@/lib/photos";
import { removeUnusedPhoto } from "@/lib/photo-cleanup";
import { invalidateShop } from "@/lib/shop-data";
import { MAX_SHELF_ITEMS } from "@/lib/ai-shelf";
import { FREE_PRODUCT_LIMIT } from "@/lib/types";

export type ShelfState = { error?: string };

const unit = z.number().min(0).max(1);
const bbox = z
  .object({ x1: unit, y1: unit, x2: unit, y2: unit })
  .strict()
  .refine((b) => b.x1 < b.x2 && b.y1 < b.y2, "Неверная рамка товара");

const item = z.object({
  photo_url: z.string().min(1).nullable(),
  title: z.string().trim().min(1, "У каждого выбранного товара нужно название").max(120),
  description_ru: z.string().trim().max(1000).default(""),
  description_kz: z.string().trim().max(1000).default(""),
  category: z.string().trim().max(60).default(""),
  price_mode: z.enum(["fixed", "request"]),
  price: z.coerce.number().int().min(0).max(100_000_000),
  bbox,
  price_needs_review: z.boolean().default(false),
});

const payload = z.object({
  source_photo_url: z.string().min(1),
  items: z.array(item).min(1, "Выберите хотя бы один товар").max(MAX_SHELF_ITEMS),
  discard: z.array(z.string()).max(MAX_SHELF_ITEMS).default([]),
});

/** Удаляет вырезки и снимок полки, которые не стали товарами. Ошибки уборки не мешают продавцу. */
async function discardFiles(urls: string[]) {
  const { supabase, user } = await requireShop();
  for (const url of new Set(urls)) {
    if (!ownedPhotoPath(url, user.id)) continue;
    await removeUnusedPhoto(supabase, url, user.id).catch(() => undefined);
  }
}

/** Публикует выбранные черновики с фото полки одной вставкой. Лимит тарифа дополнительно держит триггер в БД. */
export async function saveShelf(_prev: ShelfState, formData: FormData): Promise<ShelfState> {
  let data: z.infer<typeof payload>;
  try {
    data = payload.parse(JSON.parse(String(formData.get("payload") ?? "{}")));
  } catch (e) {
    const message = e instanceof z.ZodError ? e.issues[0]?.message : undefined;
    return { error: message ?? "Не удалось прочитать список товаров. Обновите страницу и повторите." };
  }
  if (data.items.some((i) => i.price_mode === "fixed" && i.price <= 0)) {
    return { error: "У товаров с точной ценой укажите цену в тенге или выберите «По запросу»." };
  }

  const { supabase, shop, user } = await requireShop();
  const source = data.source_photo_url;
  if (!ownedPhotoPath(source, user.id) || data.items.some((i) => i.photo_url !== null && !ownedPhotoPath(i.photo_url, user.id))) {
    return { error: "Фото не найдено в вашем хранилище. Загрузите фото полки заново." };
  }

  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", shop.id);
  const have = count ?? 0;
  const room = Math.max(0, FREE_PRODUCT_LIMIT - have);
  if (data.items.length > room) {
    return { error: `На бесплатном тарифе до ${FREE_PRODUCT_LIMIT} товаров. Сейчас ${have}, можно добавить ещё ${room}: снимите лишние галочки.` };
  }

  const rows = data.items.map((i, idx) => ({
    shop_id: shop.id,
    title: i.title,
    description_ru: i.description_ru || null,
    description_kz: i.description_kz || null,
    category: i.category || null,
    price: i.price_mode === "request" ? 0 : i.price,
    price_mode: i.price_mode,
    // Нет своей вырезки — товар покажет весь снимок полки.
    photo_url: i.photo_url ?? source,
    source_photo_url: source,
    bbox: i.bbox,
    price_needs_review: i.price_mode === "fixed" && i.price_needs_review,
    in_stock: true,
    sort: have + idx,
  }));
  const { error } = await supabase.from("products").insert(rows);
  if (error) {
    return {
      error: error.message.includes("free product limit")
        ? `На бесплатном тарифе до ${FREE_PRODUCT_LIMIT} товаров. Обновите страницу: кто-то уже добавил товары.`
        : "Не удалось сохранить товары. Попробуйте ещё раз.",
    };
  }

  invalidateShop(shop.slug);
  revalidatePath("/dashboard");
  await discardFiles(data.discard);
  redirect(`/dashboard?saved=batch&n=${rows.length}`);
}

/** «Отмена» на экране полки: снимок и вырезки ещё не стали товарами — убираем их из хранилища. */
export async function discardShelf(urls: string[]): Promise<void> {
  if (!Array.isArray(urls)) return;
  await discardFiles(urls.filter((u): u is string => typeof u === "string").slice(0, MAX_SHELF_ITEMS + 1));
}
