import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { notFound } from "next/navigation";
import { getShopBySlug } from "@/lib/shop-data";
import { T, description, parseLang, shopHref } from "@/lib/lang";
import { inquiryText, isInquiry, priceLabel, whatsappUrl } from "@/lib/order";
import { InquiryButton } from "@/components/inquiry-button";
import { ProductBuy } from "@/components/product-buy";
import { ShareButton } from "@/components/share-button";
import { variantsOf } from "@/lib/variants";
import { AddToCart } from "@/components/add-to-cart";
import { CartBar } from "@/components/cart-bar";
import { ProductPhoto } from "@/components/product-photo";
import { DocumentLanguage } from "@/components/document-language";
import { productJsonLd, publicAlternates, publicUrl, serializeJsonLd } from "@/lib/shop-seo";

type Props = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const lang = parseLang((await searchParams).lang);
  const data = await getShopBySlug(slug);
  const product = data?.products.find((p) => p.id === id);
  if (!data || !product) return {};
  const text = description(product, lang) || `${priceLabel(product.price, product.price_mode, lang)} · ${data.shop.name}`;
  return {
    title: `${product.title} — ${data.shop.name}`,
    description: text,
    alternates: publicAlternates(`/${data.shop.slug}/p/${id}`, lang),
    openGraph: {
      title: product.title,
      description: text,
      images: product.photo_url ? [product.photo_url] : undefined,
    },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug, id } = await params;
  const lang = parseLang((await searchParams).lang);
  const t = T[lang];

  const data = await getShopBySlug(slug);
  const product = data?.products.find((p) => p.id === id);
  if (!data || !product) notFound();
  const { shop } = data;
  const text = description(product, lang);
  const variants = variantsOf(product);
  const url = publicUrl(shopHref(`/${shop.slug}/p/${id}`, lang));
  const jsonLd = productJsonLd(product, url, text || `${priceLabel(product.price, product.price_mode, lang)} · ${shop.name}`);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-28">
      <DocumentLanguage lang={lang} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <div className="flex items-center justify-between gap-1 px-3 py-3">
        <BackLink fallback={shopHref(`/${shop.slug}`, lang)} className="flex min-h-11 items-center gap-1 px-2 font-semibold">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
          {shop.name}
        </BackLink>
        <ShareButton title={`${product.title} — ${shop.name}`} label={t.share} copiedLabel={t.shared} />
      </div>

      <ProductPhoto url={product.photo_url} alt={product.title} priority className="aspect-square w-full" />

      <div className="flex flex-col gap-3 px-5 pt-5">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{product.title}</h1>
        <div className="flex items-center justify-between gap-3">
          <div className="text-2xl font-extrabold">{priceLabel(product.price, product.price_mode, lang, variants.length > 0)}</div>
          <div className={`text-sm font-bold ${product.in_stock ? "text-wa" : "text-accent-dark"}`}>
            {product.in_stock ? t.inStock : t.out}
          </div>
        </div>
        {text && <p className="whitespace-pre-line text-[17px] leading-relaxed text-muted">{text}</p>}
        <div className="pt-2">
          {product.in_stock && isInquiry(product.price_mode) ? (
            <div className="flex flex-col gap-2">
              <InquiryButton
                shopId={shop.id}
                productId={product.id}
                href={whatsappUrl(shop.whatsapp, inquiryText(product.title, product.price, product.price_mode, shop.name))}
                label={t.ask}
              />
              <p className="text-center text-[13px] text-muted">{t.askHint}</p>
            </div>
          ) : variants.length > 0 && product.in_stock ? (
            <ProductBuy slug={shop.slug} product={product} variants={variants} lang={lang} />
          ) : (
            <AddToCart slug={shop.slug} product={product} lang={lang} />
          )}
        </div>
      </div>

      <CartBar slug={shop.slug} lang={lang} />
    </main>
  );
}
