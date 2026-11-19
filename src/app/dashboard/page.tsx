import { HomeScreenHint } from "./home-screen-hint";
import { ProductCatalog } from "./product-catalog";
import Link from "next/link";
import QRCode from "qrcode";
import { requireShop } from "@/lib/shop";
import { FREE_PRODUCT_LIMIT, type Product } from "@/lib/types";
import { CopyBio, CopyLink } from "./copy-link";
import { SavedToast } from "./saved-toast";
import { DashboardNav } from "@/components/dashboard-nav";
import { AddProducts } from "./add-products";
import { FirstSteps } from "./first-steps";
import { telegramConfigured } from "@/lib/telegram";
import { getStats } from "@/lib/stats";
import { CameraIcon, PlusIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProductPhoto } from "@/components/product-photo";

export const metadata = { title: "Кабинет — SÖRE" };

const SAVED: Record<string, string> = {
  added: "Товар добавлен. Он уже на витрине.",
  updated: "Изменения сохранены.",
  deleted: "Товар удалён.",
  batch: "Товары добавлены.",
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ saved?: string; n?: string }> }) {
  const { saved, n } = await searchParams;
  const { supabase, shop } = await requireShop();

  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("shop_id", shop.id)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });
  const products = (data ?? []) as Product[];
  const stats = await getStats(supabase, shop.id);
  const tgConfigured = telegramConfigured();
  const { data: tg } = tgConfigured ? await supabase.from("shop_telegram").select("linked_at").eq("shop_id", shop.id).maybeSingle() : { data: null };
  const telegram: "off" | "pending" | "done" = !tgConfigured ? "off" : tg?.linked_at ? "done" : "pending";

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const fullUrl = `${site}/${shop.slug}`;
  const shown = fullUrl.replace(/^https?:\/\//, "");
  const full = products.length >= FREE_PRODUCT_LIMIT;
  const qr = await QRCode.toString(fullUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M" });

  return (
    <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col pb-28 lg:max-w-6xl lg:pb-10">
      <DashboardNav active="products" newOrders={stats.newOrders} desktop />
      <div className="px-5 pb-3 pt-6">
          <div className="flex items-center gap-3">
            <ProductPhoto url={shop.avatar_url} alt="" initial={shop.name} thumbnail className="size-11 flex-none rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xl font-extrabold">{shop.name}</div>
              {shop.city && <div className="text-sm text-muted">{shop.city}</div>}
            </div>
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button type="submit" className="min-h-11 min-w-11 px-1 text-sm font-semibold text-muted underline">
                Выйти
              </button>
            </form>
          </div>

      </div>
      <div className="px-5 lg:hidden">
        <ShopSummary fullUrl={fullUrl} shown={shown} qr={qr} stats={stats} />
      </div>
      <div className="lg:flex lg:items-start lg:gap-4">
        <div id="main-content" tabIndex={-1} className="min-w-0 flex-1">
        {saved && SAVED[saved] && <SavedToast message={saved === "batch" ? `Добавлено товаров: ${Number(n) || ""}` : SAVED[saved]} />}
        {products.length === 0 && <AddProducts />}
        <HomeScreenHint />
        <FirstSteps hasProducts={products.length > 0} shared={stats.views > 0} telegram={telegram} profileDone={Boolean(shop.avatar_url || shop.about)} />

        <div className="flex items-center justify-between px-5 pt-2">
          <h2 className="text-lg font-bold">Товары · {products.length}</h2>
          <span className="text-sm text-muted">
            Лимит Free: {products.length} из {FREE_PRODUCT_LIMIT}
          </span>
        </div>

        {full && (
          <section className="card mx-5 mt-2 flex flex-col gap-1 p-4" aria-label="Лимит товаров">
            <h3 className="font-bold">Достигнут лимит бесплатного тарифа: {FREE_PRODUCT_LIMIT} товаров</h3>
            <p className="text-sm text-muted">Чтобы добавить новый товар, скройте или удалите ненужный. Скрытые товары не видны покупателям, но остаются в кабинете. Расширенный тариф появится позже: ваши товары сохранятся.</p>
          </section>
        )}

        {!full && (
          <div className="flex flex-col gap-2 px-5 pt-2">
            <Link href="/dashboard/products/shelf" className="btn-dark h-12 min-h-12 w-full text-body">
              <CameraIcon />
              Добавить по фото полки
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/dashboard/products/batch" className="btn-outline h-11 min-h-11 px-2 text-sm">
                Несколько фото
              </Link>
              <Link href="/dashboard/products/import" className="btn-outline h-11 min-h-11 px-2 text-sm">
                Прайс из Excel
              </Link>
            </div>
          </div>
        )}

        <ProductCatalog products={products} />

        {!full && products.length > 0 && (
          <div className="pointer-events-none sticky bottom-24 z-10 flex justify-end px-5 pb-2 pt-4 lg:bottom-6">
            <Link href="/dashboard/products/new" className="btn-accent pointer-events-auto h-14 rounded-full pl-4 pr-5 shadow-lg">
              <PlusIcon size={22} />
              Товар
            </Link>
          </div>
        )}

        </div>
        <aside className="hidden w-80 flex-none px-5 lg:block" aria-label="Ссылка и статистика магазина">
          <ShopSummary fullUrl={fullUrl} shown={shown} qr={qr} stats={stats} desktop />
        </aside>
      </div>
      <DashboardNav active="products" newOrders={stats.newOrders} />
    </main>
  );
}

function ShopSummary({ fullUrl, shown, qr, stats, desktop = false }: {
  fullUrl: string;
  shown: string;
  qr: string;
  stats: Awaited<ReturnType<typeof getStats>>;
  desktop?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="card flex items-center gap-2 p-1.5 pl-3.5">
        <div className="min-w-0 flex-1 truncate text-body font-semibold">{shown}</div>
        <CopyLink url={fullUrl} />
      </div>
      <CopyBio url={fullUrl} />
      {desktop && <div className="rounded-2xl border border-line bg-surface p-4 text-center">
        <div role="img" aria-label={`QR-код витрины: ${fullUrl}`} className="mx-auto w-40 overflow-hidden rounded-xl [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
        <Link href="/dashboard/poster" className="mt-2 inline-flex min-h-11 items-center font-semibold underline">Плакат с QR-кодом</Link>
      </div>}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3.5">
          <div className="text-caption text-muted">Просмотры за неделю</div>
          <div className="text-stat font-extrabold leading-tight">{stats.views}</div>
        </div>
        <div className="card p-3.5">
          <div className="text-caption text-muted">Нажали «Заказать»</div>
          <div className="text-stat font-extrabold leading-tight">{stats.clicks}</div>
        </div>
      </div>
    </div>
  );
}
