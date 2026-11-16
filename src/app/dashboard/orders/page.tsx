import Link from "next/link";
import { requireShop } from "@/lib/shop";
import { formatNeeded, formatPrice, whatsappUrl } from "@/lib/order";
import { DashboardNav } from "@/components/dashboard-nav";
import { Field } from "@/components/field";
import { applyOrderFilters, filterQuery, parseOrderFilters } from "@/lib/orders-query";
import { StatusButton } from "./status-button";

export const metadata = { title: "Заказы — Sөre" };

type OrderRow = {
  id: string;
  number: number;
  items: { title: string; qty: number; price: number }[];
  total: number;
  customer_name: string;
  customer_phone: string;
  address: string | null;
  comment: string | null;
  needed_date: string | null;
  needed_time: string | null;
  status: "new" | "done" | "cancelled";
  created_at: string;
};

const STATUS = {
  new: { label: "Новый", cls: "bg-accent-soft text-accent-dark" },
  done: { label: "Выполнен", cls: "bg-ok-bg text-ok-ink" },
  cancelled: { label: "Отменён", cls: "bg-line text-muted" },
} as const;

const fmt = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Almaty",
});

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string; q?: string; date?: string }> }) {
  const { supabase, shop } = await requireShop();
  const sp = await searchParams;
  const page = Math.min(1000, Math.max(1, Number(sp.page) || 1));
  const filters = parseOrderFilters(sp);
  const { onlyNew } = filters;
  const filtered = Boolean(filters.q || filters.date);
  let query = supabase
    .from("orders")
    .select("*")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  query = applyOrderFilters(query, filters);
  const { data, error } = await query.range(0, page * 20);
  if (error) throw new Error("Не удалось загрузить заказы");
  const hasMore = (data?.length || 0) > page * 20;
  const orders = (data ?? []).slice(0, page * 20) as OrderRow[];
  const newCount = orders.filter((o) => o.status === "new").length;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-24 lg:max-w-6xl lg:pb-10">
      <DashboardNav active="orders" desktop />
      <div id="main-content" tabIndex={-1} className="flex flex-col gap-1 px-5 pb-3 pt-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Заказы</h1>
        <p className="text-[15px] text-muted">
          Заказы сохраняются, даже если клиент не нажал «Отправить» в WhatsApp.
        </p>
      </div>

      <nav className="flex gap-3 px-5 py-3" aria-label="Фильтр заказов"><Link className={onlyNew ? "btn-dark" : "btn-outline"} href={filterQuery({ ...filters, onlyNew: true })} aria-current={onlyNew ? "page" : undefined}>Новые</Link><Link className={!onlyNew ? "btn-dark" : "btn-outline"} href={filterQuery({ ...filters, onlyNew: false })} aria-current={!onlyNew ? "page" : undefined}>Все</Link></nav>
      <form method="get" role="search" className="flex flex-col gap-3 px-5 pb-3">
        <input type="hidden" name="status" value={onlyNew ? "new" : "all"} />
        <label htmlFor="orders-q" className="sr-only">Поиск по номеру, имени или телефону</label>
        <input id="orders-q" name="q" type="search" defaultValue={filters.q} placeholder="Номер, имя или телефон" maxLength={40} enterKeyHint="search" autoComplete="off" className="input" />
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <Field label="Когда нужно" htmlFor="orders-date"><input id="orders-date" name="date" type="date" defaultValue={filters.date} className="input" /></Field>
          </div>
          <button type="submit" className="btn-dark h-11 min-h-11 px-5">Найти</button>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          {filtered ? <Link href={filterQuery({ ...filters, q: "", date: "" })} className="flex min-h-11 items-center font-semibold underline">Сбросить поиск</Link> : <span />}
          <a href={`/dashboard/orders/export${filterQuery(filters)}`} className="flex min-h-11 items-center font-semibold underline">Скачать CSV</a>
        </div>
      </form>
      <ul className="flex flex-col gap-3 px-5">
        {orders.length === 0 && (
          <li className="card p-5">
            <div className="text-lg font-bold">{filtered ? "Ничего не найдено" : "Пока нет заказов"}</div>
            <p className="mt-1 leading-relaxed text-muted">
              {filtered ? "Проверьте номер, имя или дату, либо сбросьте поиск." : "Отправьте ссылку на магазин клиентам или поставьте её в био Instagram."}
            </p>
          </li>
        )}
        {orders.map((o) => {
          const st = STATUS[o.status];
          const text = `Здравствуйте, ${o.customer_name}! Ваш заказ №${o.number} на ${formatPrice(o.total)} из магазина «${shop.name}»`;
          return (
            <li key={o.id} className="card flex flex-col gap-2.5 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[17px] font-bold">
                  №{o.number} · {o.customer_name}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
              </div>
              <ul className="text-sm leading-snug text-muted">
                {o.items.map((i, idx) => (
                  <li key={idx}>
                    {i.title} × {i.qty}
                  </li>
                ))}
              </ul>
              <div className="text-sm text-muted">
                {o.address === "Самовывоз" ? "Самовывоз" : o.address ? `Доставка: ${o.address}` : null}
              </div>
              {o.needed_date && (
                <div className="text-sm font-semibold text-ink">Когда нужно: {formatNeeded(o.needed_date, o.needed_time)}</div>
              )}
              {o.comment && <div className="text-sm text-muted">Комментарий: {o.comment}</div>}
              <div className="text-sm text-muted">
                {o.customer_phone.replace(/^(\d)(\d{3})(\d{3})(\d{2})(\d{2})$/, "+$1 $2 $3 $4 $5")} · {fmt.format(new Date(o.created_at))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xl font-extrabold">{formatPrice(o.total)}</div>
                <a href={whatsappUrl(o.customer_phone, text)} target="_blank" rel="noopener noreferrer" className="btn-wa h-11 min-h-11 rounded-[10px] px-3.5 text-sm">
                  Написать клиенту
                </a>
              </div>
              {o.status === "new" && (
                <div className="flex gap-2 border-t border-line pt-2.5">
                  <StatusButton id={o.id} status="done">
                    Выполнен
                  </StatusButton>
                  <StatusButton id={o.id} status="cancelled" muted confirmText={`Отменить заказ №${o.number}? Его можно будет вернуть в «Новые».`}>
                    Отменить
                  </StatusButton>
                </div>
              )}
              {o.status !== "new" && (
                <div className="flex gap-2 border-t border-line pt-2.5">
                  <StatusButton id={o.id} status="new" muted>
                    Вернуть в «Новые»
                  </StatusButton>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {hasMore && <Link className="btn-outline m-5" href={filterQuery(filters, { page: String(page + 1) })}>Показать ещё</Link>}
      <DashboardNav active="orders" newOrders={newCount} />
    </main>
  );
}

