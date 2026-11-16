import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getShopBySlug } from "@/lib/shop-data";
import { T, parseLang, shopHref } from "@/lib/lang";
import { inquiryText, isInquiry, priceLabel, whatsappUrl } from "@/lib/order";
import { InquiryButton } from "@/components/inquiry-button";
import { variantsOf } from "@/lib/variants";
import { AddToCart } from "@/components/add-to-cart";
import { CartBar } from "@/components/cart-bar";
import { ProductPhoto } from "@/components/product-photo";
import { ViewTracker } from "@/components/view-tracker";
import { ShareButton } from "@/components/share-button";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string; cat?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getShopBySlug(slug);
  if (!data) return {};
  const { shop, products } = data;
  const image = products.find((p) => p.photo_url)?.photo_url ?? undefined;
  const title = `${shop.name}${shop.city ? ` — ${shop.city}` : ""}`;
  const description = `Каталог и заказ в WhatsApp: ${products.length} товаров`;
  return {
    title,
    description,
    openGraph: { title, description, images: image ? [image] : undefined, type: "website" },
  };
}

export default async function ShopPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = parseLang(sp.lang);
  const t = T[lang];

  const data = await getShopBySlug(slug);
  if (!data) notFound();
  const { shop, products } = data;

  const base = `/${shop.slug}`;
  const categories = [...new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c)))];
  const activeCat = sp.cat && categories.includes(sp.cat) ? sp.cat : undefined;
  const visible = activeCat ? products.filter((p) => p.category === activeCat) : products;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <header className="flex flex-col gap-4 border-b border-line bg-white px-5 pb-4 pt-6">
        <div className="flex items-center justify-between">
          <ShareButton title={shop.name} label={t.share} copiedLabel={t.shared} className="-ml-2" />
          <div className="flex overflow-hidden rounded-full border-[1.5px] border-field text-[13px] font-bold" role="group" aria-label="Язык">
            <Link
              href={shopHref(base, "ru", activeCat)}
              aria-current={lang === "ru" ? "true" : undefined}
              className={`flex min-h-11 min-w-11 items-center justify-center px-3 ${lang === "ru" ? "bg-ink text-cream" : "text-muted"}`}
            >
              RU
            </Link>
            <Link
              href={shopHref(base, "kz", activeCat)}
              aria-current={lang === "kz" ? "true" : undefined}
              className={`flex min-h-11 min-w-11 items-center justify-center px-3 ${lang === "kz" ? "bg-ink text-cream" : "text-muted"}`}
            >
              KZ
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <ProductPhoto
            url={shop.avatar_url}
            alt=""
            initial={shop.name}
            className="size-[72px] flex-none rounded-full"
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{shop.name}</h1>
            {shop.city && <div className="text-[15px] text-muted">{shop.city}</div>}
          </div>
        </div>

        {categories.length > 0 && (
          <nav className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Категории">
            <Chip href={shopHref(base, lang)} active={!activeCat}>
              {t.all}
            </Chip>
            {categories.map((c) => (
              <Chip key={c} href={shopHref(base, lang, c)} active={activeCat === c}>
                {c}
              </Chip>
            ))}
          </nav>
        )}
      </header>

      <section className="flex-1 px-4 pb-28 pt-4">
        {visible.length === 0 ? (
          <p className="card p-5 text-muted">{t.empty}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
            {visible.map((p, i) => (
              <li
                key={p.id}
                className="card flex flex-col overflow-hidden"
              >
                <Link href={shopHref(`${base}/p/${p.id}`, lang)} className="flex flex-col">
                  <ProductPhoto url={p.photo_url} alt={p.title} seed={i} className={`h-36 w-full ${p.in_stock ? "" : "opacity-50 grayscale"}`} />
                  <div className="flex flex-col gap-1 p-3 pb-2">
                    <div className="text-[15px] font-semibold leading-tight">{p.title}</div>
                    <div className="text-base font-extrabold">{priceLabel(p.price, p.price_mode, lang, variantsOf(p).length > 0)}</div>
                  </div>
                </Link>
                <div className="mt-auto px-3 pb-3">
                  {p.in_stock && isInquiry(p.price_mode) ? (
                    <InquiryButton
                      shopId={shop.id}
                      productId={p.id}
                      href={whatsappUrl(shop.whatsapp, inquiryText(p.title, p.price, p.price_mode, shop.name))}
                      label={t.ask}
                    />
                  ) : variantsOf(p).length > 0 && p.in_stock ? (
                    <Link
                      href={shopHref(`${base}/p/${p.id}`, lang)}
                      className="flex h-11 w-full items-center justify-center rounded-xl bg-ink text-sm font-bold text-cream"
                    >
                      {t.pick}
                    </Link>
                  ) : (
                    <AddToCart slug={shop.slug} product={p} lang={lang} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 text-center text-[13px] text-muted">
          {t.madeWith}{" "}
          <Link href="/" className="font-bold text-accent underline">
            DukenAI
          </Link>{" "}
          · {t.createOwn}
        </p>
        <p className="mt-2 flex justify-center gap-5 text-[13px] text-muted">
          <Link href="/terms" className="flex min-h-11 items-center underline">
            {t.terms}
          </Link>
          <Link href="/privacy" className="flex min-h-11 items-center underline">
            {t.privacy}
          </Link>
        </p>
      </section>

      <CartBar slug={shop.slug} lang={lang} />
      <ViewTracker shopId={shop.id} />
    </main>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`flex min-h-11 items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
        active ? "bg-ink text-cream" : "border-[1.5px] border-field text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
