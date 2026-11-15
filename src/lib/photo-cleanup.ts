import type { SupabaseClient } from "@supabase/supabase-js";
import { ownedPhotoPath } from "@/lib/photos";

/** A file may be reused by another product/avatar. Delete only unreferenced owner files. */
export async function removeUnusedPhoto(supabase: SupabaseClient, url: string | null | undefined, owner: string) {
  const path = ownedPhotoPath(url, owner);
  if (!path || !url) return;
  const [products, shops] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("photo_url", url),
    supabase.from("shops").select("id", { count: "exact", head: true }).eq("avatar_url", url),
  ]);
  if (products.error || shops.error) throw new Error("Не удалось проверить использование фото");
  if (products.count || shops.count) return;
  const { error } = await supabase.storage.from("product-photos").remove([path]);
  if (error) throw new Error("Не удалось удалить старое фото");
}
