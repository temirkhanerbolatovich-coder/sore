"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useCart, useHydrated, useShopLines } from "@/lib/cart";
import { T, shopHref, type Lang } from "@/lib/lang";
import { buildOrderText, formatPrice, normalizePhone, orderTotal, whatsappUrl, type CartLine } from "@/lib/order";
import { ProductPhoto } from "@/components/product-photo";

import type { Product } from "@/lib/types";
import { Field } from "@/components/field";

type ShopInfo = { id: string; slug: string; name: string; whatsapp: string };

export function CartView({ shop, lang, products }: { shop: ShopInfo; lang: Lang; products: Product[] }) {
  const t = T[lang];
  const [notice, setNotice] = useState(false);
  const hydrated = useHydrated();
  const lines = useShopLines(shop.slug);
  const setQty = useCart((s) => s.setQty);
  const clear = useCart((s) => s.clear);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [delivery, setDelivery] = useState<"delivery" | "pickup">("delivery");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentUrl, setSentUrl] = useState("");

  useEffect(() => {
    // Hydration synchronizes the persisted browser cart and contact details with server data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotice(useCart.getState().reconcile(shop.slug, products));
    try {
      const saved = JSON.parse(localStorage.getItem("duken-customer") || "{}");
      if (typeof saved.name === "string") setName(saved.name.slice(0,80));
      if (typeof saved.phone === "string") setPhone(saved.phone.slice(0,30));
    } catch { /* Optional browser storage. */ }
  }, [shop.slug, products]);

  const backHref = shopHref(`/${shop.slug}`, lang);
  const total = orderTotal(lines);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const digits = normalizePhone(phone);
    if (!/^[0-9]{10,15}$/.test(digits)) return setError(t.phoneError);
    if (delivery === "delivery" && !address.trim()) return setError(t.addressError);

    setSending(true);
    try {
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("create_order", {
      p_shop: shop.id,
      p_items: lines.map((l) => ({ id: l.id, qty: l.qty })),
      p_name: name.trim(),
      p_phone: digits,
      p_address: delivery === "delivery" ? address.trim() : "Самовывоз",
      p_comment: comment.trim(),
    });

    const row = Array.isArray(data) ? data[0] : null;
    if (rpcError || !row) {
      setSending(false);
      const message = rpcError?.message || "";
      setError(message.includes("rate limit") ? t.rateLimit : message.includes("unavailable") ? t.unavailable : message.includes("invalid phone") ? t.phoneError : message.includes("invalid items") || message.includes("quantity") ? t.invalidItems : message.includes("total too large") ? t.tooLarge : t.orderError);
      return;
    }

    // Текст строим из данных сервера: там актуальные цены и названия.
    const serverLines: CartLine[] = (row.order_items as { id: string; title: string; price: number; qty: number }[]).map(
      (i) => ({ id: i.id, title: i.title, price: i.price, qty: i.qty }),
    );
    const text = buildOrderText({
      number: row.order_number,
      lines: serverLines,
      name: name.trim(),
      delivery,
      address: address.trim(),
      comment: comment.trim() || undefined,
    });
    const url = whatsappUrl(shop.whatsapp, text);

    try { localStorage.setItem("duken-customer", JSON.stringify({ name: name.trim(), phone: digits })); } catch { /* Optional storage. */ }
    clear();
    setSentUrl(url);
    window.location.href = url;
    } catch { setError(t.orderError); } finally { setSending(false); }
  }

  if (!hydrated) return <div className="flex-1" />;

  if (sentUrl) {
    return (
      <main lang={lang === "kz" ? "kk" : "ru"} className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-extrabold">{t.accepted}</h1>
        <p className="leading-relaxed text-muted">
          {t.waHelp}
        </p>
        <a href={sentUrl} className="btn-wa h-14 w-full text-lg">
          {t.openWa}
        </a>
        <Link href={backHref} className="font-semibold underline">
          {t.back}
        </Link>
      </main>
    );
  }

  if (lines.length === 0) {
    return (
      <main lang={lang === "kz" ? "kk" : "ru"} className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-extrabold">{t.emptyCart}</h1>
        {notice && <p role="status">{t.updated}</p>}
        <p className="text-muted">{t.choose} «{shop.name}».</p>
        <Link href={backHref} className="btn-dark">
          {t.back}
        </Link>
      </main>
    );
  }

  return (
    <main lang={lang === "kz" ? "kk" : "ru"} className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-line bg-white px-3 py-4">
        <Link href={backHref} aria-label={t.back} className="flex size-11 items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <h1 className="text-xl font-extrabold">{t.yourOrder}</h1>
      </div>

      <form onSubmit={submit} className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-5 p-5">
          {notice && <p role="status">{t.updated}</p>}
          <ul className="flex flex-col gap-2.5">
            {lines.map((l, i) => (
              <li key={l.id} className="card flex items-center gap-3 p-2.5">
                <ProductPhoto url={l.photo} alt="" seed={i} className="size-14 flex-none rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold leading-tight">{l.title}</div>
                  <div className="text-sm text-muted">{formatPrice(l.price * l.qty)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label={t.decrease} onClick={() => setQty(l.id, l.qty - 1)} className="size-11 rounded-[10px] border-[1.5px] border-field text-lg font-bold">
                    −
                  </button>
                  <span className="w-6 text-center font-bold">{l.qty}</span>
                  <button type="button" aria-label={t.increase} onClick={() => setQty(l.id, l.qty + 1)} className="size-11 rounded-[10px] border-[1.5px] border-field text-lg font-bold">
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <h2 className="text-[17px] font-bold">{t.details}</h2>
            <Field label={t.name} htmlFor="name">
              <input id="name" required maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="input" />
            </Field>
            <Field label={t.phone} htmlFor="phone">
              <input id="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="+7 701 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
            </Field>

            <p className="text-sm text-muted">{t.savedHint}</p>
            <button type="button" className="min-h-11 text-sm underline" onClick={() => { try { localStorage.removeItem("duken-customer"); } catch {} setName(""); setPhone(""); }}>{t.clearDetails}</button>
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

        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-muted">{t.total}</span>
            <span className="text-2xl font-extrabold">{formatPrice(total)}</span>
          </div>
          <button type="submit" disabled={sending} className="btn-wa h-14 text-lg disabled:opacity-60">
            {sending ? t.sending : t.order}
          </button>
          <p className="text-center text-[13px] text-muted">{t.orderHint}</p>
        </div>
      </form>
    </main>
  );
}
