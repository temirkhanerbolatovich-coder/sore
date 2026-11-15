"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireShop } from "@/lib/shop";
import { removeUnusedPhoto } from "@/lib/photo-cleanup";
import { ownedPhotoPath } from "@/lib/photos";
import { FREE_PRODUCT_LIMIT } from "@/lib/types";

export type ProductState = { error?: string };

const text = (max: number) => z.string().trim().max(max).optional();

const schema = z.object({
  title: z.string().trim().min(1, "Введите название").max(120, "Название слишком длинное"),
  description_ru: text(1000),
  description_kz: text(1000),
  category: text(60),
  price: z.string().trim().min(1, "Укажите цену"),
  photo_url: z.string().optional(),
});


export async function saveProduct(_prev: ProductState, formData: FormData): Promise<ProductState> {
  const parsed = schema.safeParse({
    title: formData.get("title") ?? "",
    description_ru: formData.get("description_ru") ?? "",
    description_kz: formData.get("description_kz") ?? "",
    category: formData.get("category") ?? "",
    price: formData.get("price") ?? "",
    photo_url: formData.get("photo_url") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const d = parsed.data;
  const price = /^\d+$/.test(d.price) ? Number(d.price) : NaN;
  if (!Number.isInteger(price) || price <= 0 || price > 100_000_000) {
    return { error: "Цена: целое число в тенге, например 12000" };
  }
  const { supabase, shop, user } = await requireShop();

  const row = {
    title: d.title,
    description_ru: d.description_ru || null,
    description_kz: d.description_kz || null,
    category: d.category || null,
    price,
    photo_url: d.photo_url || null,
    in_stock: formData.get("in_stock") === "on",
  };

  const id = String(formData.get("id") ?? "");
  if (id) {
    const { data: previous } = await supabase.from("products").select("photo_url").eq("id", id).eq("shop_id", shop.id).single();
    if (!previous) return { error: "Товар не найден." };
    if (d.photo_url && d.photo_url !== previous.photo_url && !ownedPhotoPath(d.photo_url, user.id)) return { error: "Загрузите своё фото товара." };
    const { error } = await supabase.from("products").update(row).eq("id", id).eq("shop_id", shop.id);
    if (error) return { error: "Не удалось сохранить товар. Попробуйте ещё раз." };
    if (previous.photo_url !== row.photo_url) {
      try { await removeUnusedPhoto(supabase, previous.photo_url, user.id); }
      catch { return { error: "Товар сохранён, но старое фото не удалось удалить из Storage." }; }
    }
  } else {
    if (d.photo_url && !ownedPhotoPath(d.photo_url, user.id)) return { error: "Загрузите своё фото товара." };
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id);
    if ((count ?? 0) >= FREE_PRODUCT_LIMIT) {
      return { error: `На бесплатном тарифе до ${FREE_PRODUCT_LIMIT} товаров.` };
    }
    const { error } = await supabase.from("products").insert({ ...row, shop_id: shop.id, sort: count ?? 0 });
    if (error) return { error: "Не удалось сохранить товар. Попробуйте ещё раз." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/${shop.slug}`);
  redirect("/dashboard");
}

export async function toggleStock(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = formData.get("next") === "true";
  const { supabase, shop } = await requireShop();
  const { error } = await supabase.from("products").update({ in_stock: next }).eq("id", id).eq("shop_id", shop.id);
  if (error) throw new Error("Не удалось изменить наличие");
  revalidatePath("/dashboard");
  revalidatePath(`/${shop.slug}`);
}

export async function deleteProduct(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, shop } = await requireShop();
  const { data: product } = await supabase.from("products").select("photo_url").eq("id", id).eq("shop_id", shop.id).single();
  const { error } = await supabase.from("products").delete().eq("id", id).eq("shop_id", shop.id);
  if (error) throw new Error("Не удалось удалить товар");
  await removeUnusedPhoto(supabase, product?.photo_url, shop.owner_id);
  revalidatePath("/dashboard");
  revalidatePath(`/${shop.slug}`);
  redirect("/dashboard");
}

export async function moveProduct(formData: FormData) {
  const { supabase, shop } = await requireShop();
  const { error } = await supabase.rpc("move_product", { p_shop: shop.id, p_product: String(formData.get("id")), p_direction: Number(formData.get("direction")) });
  if (error) throw new Error("Не удалось изменить порядок");
  revalidatePath("/dashboard"); revalidatePath(`/${shop.slug}`);
}
