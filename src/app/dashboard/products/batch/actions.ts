"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireShop } from "@/lib/shop";
import { ownedPhotoPath } from "@/lib/photos";
import { FREE_PRODUCT_LIMIT } from "@/lib/types";

export type BatchState = { error?: string };

const item = z.object({
  photo_url: z.string().min(1),
  title: z.string().trim().min(1, "У каждого товара нужно название").max(120),
  description_ru: z.string().trim().max(1000).default(""),
  description_kz: z.string().trim().max(1000).default(""),
  category: z.string().trim().max(60).default(""),
  price_mode: z.enum(["fixed", "request"]),
  price: z.coerce.number().int().min(0).max(100_000_000),
});

/** Сохраняет сразу несколько товаров, собранных на экране «Несколько фото». */
export async function saveBatch(_prev: BatchState, formData: FormData): Promise<BatchState> {
  let items: z.infer<typeof item>[];
  try {
    items = z.array(item).min(1, "Нет товаров для сохранения").max(FREE_PRODUCT_LIMIT).parse(JSON.parse(String(formData.get("payload") ?? "[]")));
  } catch (e) {
    const message = e instanceof z.ZodError ? e.issues[0]?.message : undefined;
    return { error: message ?? "Не удалось прочитать список товаров. Обновите страницу и повторите." };
  }
  if (items.some((i) => i.price_mode === "fixed" && i.price <= 0)) {
    return { error: "У товаров с точной ценой укажите цену в тенге или выберите «По запросу»." };
  }

  const { supabase, shop, user } = await requireShop();
  if (items.some((i) => !ownedPhotoPath(i.photo_url, user.id))) return { error: "Одно из фото не загрузилось. Удалите товар из списка и добавьте фото заново." };

  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", shop.id);
  const have = count ?? 0;
  if (have + items.length > FREE_PRODUCT_LIMIT) {
    return { error: `На бесплатном тарифе до ${FREE_PRODUCT_LIMIT} товаров. Сейчас ${have}, можно добавить ещё ${Math.max(0, FREE_PRODUCT_LIMIT - have)}.` };
  }

  const rows = items.map((i, idx) => ({
    shop_id: shop.id,
    title: i.title,
    description_ru: i.description_ru || null,
    description_kz: i.description_kz || null,
    category: i.category || null,
    price: i.price_mode === "request" ? 0 : i.price,
    price_mode: i.price_mode,
    photo_url: i.photo_url,
    in_stock: true,
    sort: have + idx,
  }));
  const { error } = await supabase.from("products").insert(rows);
  if (error) return { error: "Не удалось сохранить товары. Попробуйте ещё раз." };

  revalidatePath("/dashboard");
  revalidatePath(`/${shop.slug}`);
  redirect(`/dashboard?saved=batch&n=${items.length}`);
}
