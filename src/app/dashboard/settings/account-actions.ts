"use server";

import { redirect } from "next/navigation";
import { requireShop } from "@/lib/shop";
import { invalidateShop, invalidateSitemapShops } from "@/lib/shop-data";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteState = { error?: string };

/** Полностью удаляет магазин, фото, заказы и аккаунт продавца. Подтверждается вводом адреса магазина. */
export async function deleteAccount(_prev: DeleteState, form: FormData): Promise<DeleteState> {
  const { supabase, shop, user } = await requireShop();
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== shop.slug) {
    return { error: `Для подтверждения введите адрес магазина: ${shop.slug}` };
  }

  const admin = createAdminClient();
  // Фото лежат в папке пользователя; магазин, товары и заказы уходят каскадом вместе с аккаунтом.
  const { data: files } = await admin.storage.from("product-photos").list(user.id, { limit: 1000 });
  if (files?.length) await admin.storage.from("product-photos").remove(files.map((f) => `${user.id}/${f.name}`));
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "Не удалось удалить аккаунт. Попробуйте ещё раз или напишите нам." };

  invalidateShop(shop.slug);
  invalidateSitemapShops();
  await supabase.auth.signOut().catch(() => undefined);
  redirect("/?deleted=1");
}
