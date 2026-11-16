"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/shop";
import { normalizePhone } from "@/lib/order";
import { removeUnusedPhoto } from "@/lib/photo-cleanup";
import { ownedPhotoPath } from "@/lib/photos";

export type SettingsState = { error?: string; success?: string };
const schema = z.object({
  name: z.string().trim().min(2).max(60), city: z.string().trim().max(60),
  whatsapp: z.string().transform(normalizePhone).pipe(z.string().regex(/^\d{10,15}$/)),
  avatar_url: z.string().max(2000),
  lead_days: z.coerce.number().int().min(0).max(60),
});
export async function saveSettings(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Проверьте название (2–60 символов), город и номер WhatsApp." };
  const { supabase, user, shop } = await requireShop();
  const d = parsed.data;
  if (d.avatar_url && !ownedPhotoPath(d.avatar_url, user.id)) return { error: "Загрузите своё фото магазина." };
  const { error } = await supabase.from("shops").update({ ...d, city: d.city || null, avatar_url: d.avatar_url || null }).eq("id", shop.id);
  if (error) return { error: "Не удалось сохранить настройки." };
  const old = ownedPhotoPath(shop.avatar_url, user.id);
  let warning = "";
  if (old && shop.avatar_url !== d.avatar_url) {
    try { await removeUnusedPhoto(supabase, shop.avatar_url, user.id); }
    catch { warning = " Старое фото не удалось удалить из хранилища."; }
  }
  revalidatePath("/dashboard"); revalidatePath("/dashboard/settings"); revalidatePath(`/${shop.slug}`);
  return { success: `Настройки сохранены.${warning}` };
}
