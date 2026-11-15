import Link from "next/link";
import { requireShop } from "@/lib/shop";
import { formatPrice } from "@/lib/order";
import { FREE_PRODUCT_LIMIT, type Product } from "@/lib/types";
import { ActionForm } from "@/components/action-form";
import { toggleStock, moveProduct } from "./products/actions";
import { CopyLink } from "./copy-link";
import { DashboardNav } from "@/components/dashboard-nav";
import { getStats } from "@/lib/stats";

export const metadata = { title: "Кабинет — DukenAI" };

export default async function DashboardPage() {
  const { supabase, shop } = await requireShop();

  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("shop_id", shop.id)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });
  const products = (data ?? []) as Product[];
  const stats = await getStats(supabase, shop.id);

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const fullUrl = `${site}/${shop.slug}`;
  const shown = fullUrl.replace(/^https?:\/\//, "");
  const full = products.length >= FREE_PRODUCT_LIMIT;

  return (
    <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col pb-28">
      <div className="flex flex-col gap-4 px-5 pb-3 pt-6">
        <div className="flex items-center gap-3">
          <div className="size-11 flex-none rounded-full bg-[#f3d9c4]" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xl font-extrabold">{shop.name}</div>
            {shop.city && <div className="text-sm text-muted">{shop.city}</div>}
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="min-h-11 min-w-11 px-1 text-sm font-semibold text-muted underline">
              Выйти
            </button>
          </form>
        </div>

        <div className="card flex items-center gap-2 p-1.5 pl-3.5">
          <div className="min-w-0 flex-1 truncate text-[15px] font-semibold">{shown}</div>
          <CopyLink url={fullUrl} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3.5">
            <div className="text-[13px] text-muted">Просмотры за неделю</div>
            <div className="text-[28px] font-extrabold leading-tight">{stats.views}</div>
          </div>
          <div className="card p-3.5">
            <div className="text-[13px] text-muted">Нажали «Заказать»</div>
            <div className="text-[28px] font-extrabold leading-tight">{stats.clicks}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-5 pt-2">
        <h2 className="text-lg font-bold">Товары · {products.length}</h2>
        <span className="text-sm text-muted">
          Лимит Free: {products.length} из {FREE_PRODUCT_LIMIT}
        </span>
      </div>

      <ul className="flex flex-col gap-2.5 px-5 pt-3">
        {products.length === 0 && (
          <li className="card flex flex-col gap-1 p-5">
            <div className="text-lg font-bold">Пока нет товаров</div>
            <p className="leading-relaxed text-muted">Добавьте первый товар: сфотографируйте его и укажите цену.</p>
          </li>
        )}
        {products.map((p) => (
          <li key={p.id} className="card flex items-center gap-3 p-2.5">
            <Link href={`/dashboard/products/${p.id}/edit`} className="flex min-w-0 flex-1 items-center gap-3">
              <div className="size-16 flex-none overflow-hidden rounded-xl bg-[#f3d9c4]">
                {p.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold">{p.title}</div>
                <div className="text-[15px] text-muted">{formatPrice(p.price)}</div>
                <div className={`text-[13px] font-semibold ${p.in_stock ? "text-wa" : "text-accent-dark"}`}>
                  {p.in_stock ? "В наличии" : "Нет в наличии"}
                </div>
              </div>
            </Link>
            <div className="flex flex-col gap-1"><ActionForm action={toggleStock}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="next" value={String(!p.in_stock)} />
              <button
                type="submit"
                role="switch"
                aria-checked={p.in_stock}
                aria-label={`В наличии: ${p.title}`}
                className={`flex h-11 w-12 items-center rounded-full p-[3px] ${p.in_stock ? "justify-end bg-wa" : "justify-start bg-[#8a7b6e]"}`}
              >
                <span className="size-[22px] rounded-full bg-white" />
              </button>
            </ActionForm>
            {[-1, 1].map((direction) => <ActionForm key={direction} action={moveProduct}>
              <input type="hidden" name="id" value={p.id} /><input type="hidden" name="direction" value={direction} />
              <button className="min-h-11 min-w-11 px-2 text-sm" aria-label={direction < 0 ? "Выше" : "Ниже"}>{direction < 0 ? "↑" : "↓"}</button>
            </ActionForm>)}</div>
          </li>
        ))}
      </ul>

      {!full && (
        <Link
          href="/dashboard/products/new"
          className="btn-accent fixed bottom-20 right-5 h-14 rounded-full pl-4 pr-5 shadow-lg md:right-[calc(50%-12rem)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Товар
        </Link>
      )}

      <DashboardNav active="products" newOrders={stats.newOrders} />
    </main>
  );
}
