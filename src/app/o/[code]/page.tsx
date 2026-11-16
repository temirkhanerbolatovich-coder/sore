import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentLanguage } from "@/components/document-language";
import { T, parseLang, shopHref } from "@/lib/lang";
import { formatNeeded, formatPrice, whatsappUrl } from "@/lib/order";
import { createPublicClient } from "@/lib/supabase/public";

// Ссылка с секретным кодом: страницу не индексируем и не кэшируем.
export const metadata: Metadata = {
  title: "Статус заказа",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const CODE_RE = /^[a-f0-9]{20}$/;

const STATUS_STYLE = {
  new: "bg-accent-soft text-accent-dark",
  done: "bg-ok-bg text-ok-ink",
  cancelled: "bg-line text-muted",
} as const;

export default async function OrderStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { code } = await params;
  const lang = parseLang((await searchParams).lang);
  const t = T[lang];
  if (!CODE_RE.test(code)) notFound();

  const { data, error } = await createPublicClient().rpc("get_order_status", { p_code: code });
  if (error) throw new Error("Не удалось загрузить статус заказа");
  const order = data?.[0];
  if (!order) notFound();

  const status = order.order_status === "done" || order.order_status === "cancelled" ? order.order_status : "new";
  const label = { new: t.statusNew, done: t.statusDone, cancelled: t.statusCancelled }[status];
  const hint = { new: t.statusHintNew, done: t.statusHintDone, cancelled: t.statusHintCancelled }[status];
  const items = order.order_items as { title: string; qty: number; price: number }[];
  const question = `Здравствуйте! Вопрос по заказу №${order.order_number}.`;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 pb-10 pt-8">
      <DocumentLanguage lang={lang} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{order.shop_name}</p>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {t.statusTitle} №{order.order_number}
          </h1>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-sm font-bold ${STATUS_STYLE[status]}`}>{label}</span>
      </div>

      <p role="status" className="text-[17px] leading-relaxed">
        {hint}
      </p>

      <section className="card flex flex-col gap-2 p-4">
        <h2 className="text-sm font-bold text-muted">{t.statusItems}</h2>
        <ul className="flex flex-col gap-1.5">
          {items.map((item, index) => (
            <li key={index} className="flex justify-between gap-3">
              <span>
                {item.title} × {item.qty}
              </span>
              <span className="flex-none font-semibold">{formatPrice(item.price * item.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-line pt-2 text-lg font-extrabold">
          <span>{t.total}</span>
          <span>{formatPrice(order.order_total)}</span>
        </div>
        {order.order_needed_date && (
          <p className="text-sm font-semibold">
            {t.date}: {formatNeeded(order.order_needed_date, order.order_needed_time, lang)}
          </p>
        )}
      </section>

      <a
        href={whatsappUrl(order.shop_whatsapp, question)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-wa h-14 w-full text-lg"
      >
        {t.writeSeller}
      </a>
      <Link href={shopHref(`/${order.shop_slug}`, lang)} className="btn-outline h-12 w-full">
        {t.back}
      </Link>
    </main>
  );
}
