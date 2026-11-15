import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Product, Shop } from "@/lib/types";

export const getShopBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: shop, error: shopError } = await supabase
    .from("shops")
    .select("*")
    .eq("slug", slug.toLowerCase())
    .maybeSingle<Shop>();
  if (shopError) throw new Error("Не удалось загрузить магазин");
  if (!shop) return null;

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("shop_id", shop.id)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error("Не удалось загрузить товары");
  return { shop, products: (data ?? []) as Product[] };
});
