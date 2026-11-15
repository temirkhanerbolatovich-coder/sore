import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const supabase = await createClient();
  const result: MetadataRoute.Sitemap = [{ url: site, priority: 1 }];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("shops").select("slug,created_at").order("id").range(offset, offset + 999);
    if (error) throw new Error("Не удалось построить sitemap");
    result.push(...(data || []).map((shop) => ({ url: `${site}/${shop.slug}`, lastModified: shop.created_at })));
    if (!data || data.length < 1000) break;
  }
  return result;
}
