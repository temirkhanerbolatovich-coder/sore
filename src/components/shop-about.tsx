import { T, type Lang } from "@/lib/lang";
import { hasShopInfo, instagramUrl } from "@/lib/shop-info";
import type { Shop } from "@/lib/types";

const LONG_ABOUT = 140;

/** Блок «О магазине» под шапкой витрины: описание, график, адрес и Instagram. */
export function ShopAbout({ shop, lang }: { shop: Pick<Shop, "about" | "address" | "hours" | "instagram">; lang: Lang }) {
  if (!hasShopInfo(shop)) return null;
  const t = T[lang];
  const about = shop.about ? <p className="whitespace-pre-line leading-snug">{shop.about}</p> : null;
  const longAbout = (shop.about?.length ?? 0) > LONG_ABOUT;

  return (
    <section className="mx-4 mt-3 flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 text-[15px]">
      {about && longAbout ? (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none flex-col justify-center group-open:hidden">
            <span className="line-clamp-2 leading-snug">{shop.about}</span>
            <span className="text-sm font-semibold text-accent underline">{t.more}</span>
          </summary>
          <p className="whitespace-pre-line leading-snug">{shop.about}</p>
        </details>
      ) : (
        about
      )}
      {(shop.hours || shop.address || shop.instagram) && (
        <dl className="flex flex-col gap-1 text-muted">
          {shop.hours && (
            <div className="flex gap-2">
              <dt className="flex-none font-semibold text-ink">{t.hours}:</dt>
              <dd>{shop.hours}</dd>
            </div>
          )}
          {shop.address && (
            <div className="flex gap-2">
              <dt className="flex-none font-semibold text-ink">{t.address}:</dt>
              <dd>{shop.address}</dd>
            </div>
          )}
          {shop.instagram && (
            <div className="flex gap-2">
              <dt className="flex-none font-semibold text-ink">Instagram:</dt>
              <dd>
                <a
                  href={instagramUrl(shop.instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center font-semibold text-accent underline"
                >
                  @{shop.instagram}
                </a>
              </dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
