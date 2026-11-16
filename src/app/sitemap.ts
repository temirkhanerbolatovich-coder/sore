import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getSitemapShops } from "@/lib/shop-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const shops = await getSitemapShops();
  const result: MetadataRoute.Sitemap = [{ url: site, priority: 1 }, { url: `${site}/terms` }, { url: `${site}/privacy` }];
  result.push(...shops.map((shop) => ({ url: `${site}/${shop.slug}`, lastModified: shop.created_at })));
  return result;
}
