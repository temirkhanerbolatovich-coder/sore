import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getShopBySlug } from "@/lib/shop-data";
import { parseLang } from "@/lib/lang";
import { DocumentLanguage } from "@/components/document-language";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Ваш заказ", robots: { index: false } };

export default async function CartPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const lang = parseLang((await searchParams).lang);
  const data = await getShopBySlug(slug);
  if (!data) notFound();
  const { shop } = data;

  return (
    <>
      <DocumentLanguage lang={lang} />
      <CartView
        shop={{ id: shop.id, slug: shop.slug, name: shop.name, whatsapp: shop.whatsapp, telegram: shop.telegram_username, leadDays: shop.lead_days }}
        lang={lang}
        products={data.products}
      />
    </>
  );
}
