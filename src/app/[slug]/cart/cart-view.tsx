"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { publicRpc } from "@/lib/public-rpc";
import { lineKey, useCart, useHydrated, useShopLines, type StoredLine } from "@/lib/cart";
import { T, shopHref, type Lang } from "@/lib/lang";
import { buildOrderText, formatPrice, normalizePhone, orderTotal, whatsappUrl, type CartLine } from "@/lib/order";
import { ProductPhoto } from "@/components/product-photo";

import type { Product } from "@/lib/types";
import { Field } from "@/components/field";
import { BackLink } from "@/components/back-link";
import { BackIcon, WhatsAppIcon } from "@/components/icons";
import { TelegramContact } from "@/components/telegram-contact";

const MIN_ORDER_FORM_AGE_MS = 2000;

type ShopInfo = { id: string; slug: string; name: string; whatsapp: string; telegram: string | null; leadDays: number };

export function CartView({ shop, lang, products }: { shop: ShopInfo; lang: Lang; products: Product[] }) {
  const t = T[lang];
  const [notice, setNotice] = useState(false);
  const hydrated = useHydrated();
  const lines = useShopLines(shop.slug);
  const setQty = useCart((s) => s.setQty);
  const clear = useCart((s) => s.clear);
  const add = useCart((s) => s.add);

  // Возврат удалённого: убранные позиции держим 8 секунд и даём кнопку «Вернуть».
  const [removed, setRemoved] = useState<StoredLine[]>([]);
  useEffect(() => {
    if (removed.length === 0) return;
    const timer = setTimeout(() => setRemoved([]), 8000);
    return () => clearTimeout(timer);
  }, [removed]);
  function restore() {
    for (const line of removed) {
      add(shop.slug, { id: line.id, title: line.title, price: line.price, photo: line.photo, variantId: line.variantId ?? null, variantTitle: line.variantTitle ?? null });
      if (line.qty > 1) setQty(lineKey(line), line.qty);
    }
    setRemoved([]);
  }
  const undoToast = removed.length > 0 && (
    <div role="status" className="flex items-center justify-between gap-3 rounded-xl bg-ink px-4 py-2 text-sm text-cream">
      <span>{t.removed}</span>
      <button type="button" onClick={restore} className="min-h-11 px-2 font-bold underline">
        {t.undo}
      </button>
    </div>
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [delivery, setDelivery] = useState<"delivery" | "pickup">("delivery");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [neededDate, setNeededDate] = useState("");
  const [neededTime, setNeededTime] = useState("");
  // Самая ранняя дата заказа по времени Астаны: сегодня + срок предзаказа магазина.
  const [minDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty" }).format(Date.now() + shop.leadDays * 86_400_000),
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentUrl, setSentUrl] = useState("");
  const [sentText, setSentText] = useState("");
  const [sentNumber, setSentNumber] = useState<number | null>(null);
  const [statusHref, setStatusHref] = useState("");
  const openedAt = useRef<number | null>(null);

  useEffect(() => {
    if (hydrated) openedAt.current = performance.now();
  }, [hydrated, shop.slug]);

  useEffect(() => {
    // Hydration synchronizes the persisted browser cart and contact details with server data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotice(useCart.getState().reconcile(shop.slug, products));
    try {
      const saved = JSON.parse(localStorage.getItem("sore-customer") || "{}");
      if (typeof saved.name === "string") setName(saved.name.slice(0,80));
      if (typeof saved.phone === "string") setPhone(saved.phone.slice(0,30));
    } catch { /* Optional browser storage. */ }
  }, [shop.slug, products]);

  const backHref = shopHref(`/${shop.slug}`, lang);
  const total = orderTotal(lines);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const digits = normalizePhone(phone);
    if (!/^[0-9]{10,15}$/.test(digits)) return setError(t.phoneError);
    if (delivery === "delivery" && !address.trim()) return setError(t.addressError);
    if (shop.leadDays > 0 && !neededDate) return setError(t.dateRequired);
    if (neededDate && neededDate < minDate) return setError(t.dateTooEarly);

    if (new FormData(e.currentTarget).get("website")) return setError(t.orderError);
    if (openedAt.current === null || performance.now() - openedAt.current < MIN_ORDER_FORM_AGE_MS) {
      return setError(t.orderTooSoon);
    }

    setSending(true);
    try {
    const { data, error: rpcError } = await publicRpc("create_order", {
      p_shop: shop.id,
      p_items: lines.map((l) => ({ id: l.id, qty: l.qty, variant: l.variantId ?? null })),
      p_name: name.trim(),
      p_phone: digits,
      p_address: delivery === "delivery" ? address.trim() : "Самовывоз",
      p_comment: comment.trim(),
      p_needed_date: neededDate || undefined,
      p_needed_time: neededTime || undefined,
    });

    const row = Array.isArray(data) ? data[0] : null;
    if (rpcError || !row) {
      setSending(false);
      const message = rpcError?.message || "";
      setError(message.includes("rate limit") ? t.rateLimit : message.includes("unavailable") ? t.unavailable : message.includes("invalid phone") ? t.phoneError : message.includes("invalid items") || message.includes("quantity") ? t.invalidItems : message.includes("date too early") ? t.dateTooEarly : message.includes("date required") ? t.dateRequired : message.includes("total too large") ? t.tooLarge : t.orderError);
      return;
    }

    // Текст строим из данных сервера: там актуальные цены и названия.
    const serverLines: CartLine[] = (row.order_items as { id: string; title: string; price: number; qty: number }[]).map(
      (i) => ({ id: i.id, title: i.title, price: i.price, qty: i.qty }),
    );
    const statusPath = `/o/${row.order_code}${lang === "kz" ? "?lang=kz" : ""}`;
    const text = buildOrderText({
      number: row.order_number,
      statusUrl: `${window.location.origin}${statusPath}`,
      lines: serverLines,
      name: name.trim(),
      delivery,
      address: address.trim(),
      comment: comment.trim() || undefined,
      neededDate: neededDate || null,
      neededTime: neededTime || null,
    });
    const url = whatsappUrl(shop.whatsapp, text);

    try { localStorage.setItem("sore-customer", JSON.stringify({ name: name.trim(), phone: digits })); } catch { /* Optional storage. */ }
    clear();
    setSentNumber(Number(row.order_number));
    setStatusHref(statusPath);
    setSentText(text);
    setSentUrl(url);
    window.location.href = url;
    } catch { setError(t.orderError); } finally { setSending(false); }
  }

  if (!hydrated) return <div className="flex-1" />;

  if (sentUrl) {
    return (
      <main id="main-content" tabIndex={-1} lang={lang === "kz" ? "kk" : "ru"} className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-extrabold">
          {t.accepted}
          {sentNumber ? ` · №${sentNumber}` : ""}
        </h1>
        <p className="text-[17px] font-semibold">{t.nextStep}</p>
        <p className="leading-relaxed text-muted">
          {t.waHelp}
        </p>
        <a href={sentUrl} className="btn-wa h-14 w-full text-lg">
          <WhatsAppIcon />
          {t.openWa}
        </a>
        {shop.telegram && <TelegramContact username={shop.telegram} text={sentText} label={t.writeTelegram} copiedLabel={t.tgCopied} />}
        {statusHref && (
          <Link href={statusHref} className="btn-outline h-12 w-full">
            {t.trackOrder}
          </Link>
        )}
        <Link href={backHref} className="btn-outline h-12 w-full">
          {t.newOrder}
        </Link>
      </main>
    );
  }

  if (lines.length === 0) {
    return (
      <main id="main-content" tabIndex={-1} lang={lang === "kz" ? "kk" : "ru"} className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-extrabold">{t.emptyCart}</h1>
        {notice && <p role="status">{t.updated}</p>}
        {undoToast}
        <p className="text-muted">{t.choose} «{shop.name}».</p>
        <Link href={backHref} className="btn-dark">
          {t.back}
        </Link>
      </main>
    );
  }

  return (
    <main lang={lang === "kz" ? "kk" : "ru"} className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-4">
        <BackLink fallback={backHref} ariaLabel={t.back} className="flex size-11 items-center justify-center">
          <BackIcon size={24} />
        </BackLink>
        <h1 className="text-xl font-extrabold">{t.yourOrder}</h1>
      </div>

      <form id="main-content" tabIndex={-1} onSubmit={submit} className="flex flex-1 flex-col md:grid md:grid-cols-[minmax(0,1fr)_20rem] md:items-start md:gap-6">
        <div className="flex flex-1 flex-col gap-5 p-5">
          {notice && <p role="status">{t.updated}</p>}
          {undoToast}
          <ul className="flex flex-col gap-2.5">
            {lines.map((l, i) => (
              <li key={lineKey(l)} className="card flex items-center gap-3 p-2.5">
                <ProductPhoto url={l.photo} alt="" seed={i} className="size-14 flex-none rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold leading-tight">
                    {l.title}
                    {l.variantTitle ? ` · ${l.variantTitle}` : ""}
                  </div>
                  <div className="text-sm text-muted">{formatPrice(l.price * l.qty)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label={t.decrease} onClick={() => { if (l.qty <= 1) setRemoved([l]); setQty(lineKey(l), l.qty - 1); }} className="size-11 rounded-[10px] border-[1.5px] border-field text-lg font-bold">
                    −
                  </button>
                  <span className="w-6 text-center font-bold">{l.qty}</span>
                  <button type="button" aria-label={t.increase} onClick={() => setQty(lineKey(l), l.qty + 1)} className="size-11 rounded-[10px] border-[1.5px] border-field text-lg font-bold">
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => { if (window.confirm(t.clearConfirm)) { setRemoved(lines); clear(); } }}
            className="min-h-11 self-start text-sm font-semibold text-muted underline"
          >
            {t.clearCart}
          </button>

          <div className="flex flex-col gap-3">
            <h2 className="text-[17px] font-bold">{t.details}</h2>
            <Field label={t.name} htmlFor="name">
              <input id="name" required maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="input" />
            </Field>
            <Field label={t.phone} htmlFor="phone">
              <input id="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="+7 701 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
            </Field>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" hidden />

            <p className="text-sm text-muted">{t.savedHint}</p>
            <button type="button" className="min-h-11 text-sm underline" onClick={() => { try { localStorage.removeItem("sore-customer"); } catch {} setName(""); setPhone(""); }}>{t.clearDetails}</button>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label={t.method}>
              {(["delivery", "pickup"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={delivery === v}
                  onClick={() => setDelivery(v)}
                  className={`h-12 rounded-xl text-[15px] font-bold ${delivery === v ? "bg-ink text-cream" : "border-[1.5px] border-field"}`}
                >
                  {v === "delivery" ? t.delivery : t.pickup}
                </button>
              ))}
            </div>

            {delivery === "delivery" && (
              <Field label={t.address} htmlFor="address">
                <input id="address" required autoComplete="street-address" maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} className="input" />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.date} htmlFor="needed-date">
                <input id="needed-date" type="date" required={shop.leadDays > 0} min={minDate} value={neededDate} onChange={(e) => setNeededDate(e.target.value)} className="input" />
              </Field>
              <Field label={t.time} htmlFor="needed-time">
                <input id="needed-time" type="time" value={neededTime} onChange={(e) => setNeededTime(e.target.value)} className="input" />
              </Field>
            </div>
            {shop.leadDays > 0 && (
              <p className="text-[13px] text-muted">
                {t.leadPre} {shop.leadDays} {t.leadPost}
              </p>
            )}
            <Field label={t.comment} htmlFor="comment">
              <input id="comment" maxLength={300} placeholder={t.commentHint} value={comment} onChange={(e) => setComment(e.target.value)} className="input" />
            </Field>
          </div>

          {error && (
            <p role="alert" tabIndex={-1} ref={(node) => node?.focus()} className="text-sm font-semibold text-accent-dark">
              {error}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-line bg-surface p-5 md:top-4 md:bottom-auto md:mt-5 md:mr-5 md:rounded-2xl md:border">
          <div className="flex items-center justify-between">
            <span className="text-muted">{t.total}</span>
            <span className="text-2xl font-extrabold">{formatPrice(total)}</span>
          </div>
          <button type="submit" disabled={sending} className="btn-wa h-14 text-lg disabled:opacity-60">
            <WhatsAppIcon />
            {sending ? t.sending : t.order}
          </button>
          <p className="text-center text-[13px] text-muted">{t.orderHint}</p>
          <p className="text-center text-[12px] text-muted">
            {t.consent}{" "}
            <Link href="/privacy" className="underline">
              {t.consentLink}
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}
