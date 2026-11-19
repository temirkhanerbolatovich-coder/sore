"use client";
import { useEffect, useRef, useState } from "react";
import { useStatefulAction } from "@/lib/use-stateful-action";
import QRCode from "qrcode";
import type { Shop } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { Field } from "@/components/field";
import Link from "next/link";
import { CopyLink } from "../copy-link";
import { saveSettings } from "./actions";
import { useUnsavedGuard } from "@/lib/use-unsaved-guard";

export function SettingsForm({ shop, url }: { shop: Shop; url: string }) {
  const [state, onSubmit, pending] = useStatefulAction(saveSettings, {});
  const [avatar, setAvatar] = useState(shop.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  // Несохранённые правки: сбрасываются сами, когда приходит новый результат сохранения (новый объект state).
  const [dirtyFor, setDirtyFor] = useState<unknown>(null);
  const dirty = dirtyFor === state;
  useUnsavedGuard(dirty && !pending);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (canvas.current) QRCode.toCanvas(canvas.current, url, { width: 240, margin: 2 }).catch(() => setError("Не удалось создать QR-код.")); }, [url]);
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true); setError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("unauthorized");
      const blob = await compressImage(file);
      const path = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from("product-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      setAvatar(supabase.storage.from("product-photos").getPublicUrl(path).data.publicUrl); setDirtyFor(state);
    } catch { setError("Не удалось загрузить фото. Выберите другое или повторите попытку."); }
    finally { setUploading(false); }
  }
  return <div className="flex flex-col gap-5">
    <form onSubmit={onSubmit} onChange={() => setDirtyFor(state)} className="flex flex-col gap-4">
      <Field label="Название магазина" htmlFor="name"><input id="name" name="name" className="input" required minLength={2} maxLength={60} defaultValue={shop.name} /></Field>
      <Field label="Город" htmlFor="city"><input id="city" name="city" className="input" maxLength={60} defaultValue={shop.city || ""} /></Field>
      <Field label="WhatsApp" htmlFor="whatsapp"><input id="whatsapp" name="whatsapp" type="tel" className="input" required defaultValue={shop.whatsapp} /></Field>
      <Field label="Telegram для покупателей (ник или ссылка, по желанию)" htmlFor="telegram"><input id="telegram" name="telegram" className="input" maxLength={120} autoCapitalize="none" autoCorrect="off" placeholder="@aliya_sweets" defaultValue={shop.telegram_username ? `@${shop.telegram_username}` : ""} /></Field>
      <Field label="Предзаказ: за сколько дней принимать заказы (0 = в любой день)" htmlFor="lead_days"><input id="lead_days" name="lead_days" type="number" inputMode="numeric" min={0} max={60} className="input" defaultValue={shop.lead_days} /></Field>
      <fieldset className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line p-4">
        <legend className="px-1 text-sm font-bold">О магазине (видно покупателям)</legend>
        <Field label="Коротко о вас (до 300 символов)" htmlFor="about"><textarea id="about" name="about" className="input min-h-24 py-3" maxLength={300} rows={3} defaultValue={shop.about || ""} /></Field>
        <Field label="Адрес или район" htmlFor="shop-address"><input id="shop-address" name="address" className="input" maxLength={120} placeholder="Астана, левый берег" defaultValue={shop.address || ""} /></Field>
        <Field label="График работы" htmlFor="hours"><input id="hours" name="hours" className="input" maxLength={120} placeholder="Ежедневно 9:00–20:00" defaultValue={shop.hours || ""} /></Field>
        <Field label="Instagram (ник или ссылка)" htmlFor="instagram"><input id="instagram" name="instagram" className="input" maxLength={120} autoCapitalize="none" autoCorrect="off" placeholder="@aliya.sweets" defaultValue={shop.instagram ? `@${shop.instagram}` : ""} /></Field>
      </fieldset>
      <fieldset className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line p-4">
        <legend className="px-1 text-sm font-bold">Оплата и доставка (видно покупателям)</legend>
        <Field label="Как оплатить (до 300 символов)" htmlFor="payment_info"><textarea id="payment_info" name="payment_info" className="input min-h-20 py-3" maxLength={300} rows={2} placeholder="Перевод на Kaspi, наличными при получении" defaultValue={shop.payment_info || ""} /></Field>
        <Field label="Доставка и самовывоз (до 300 символов)" htmlFor="delivery_info"><textarea id="delivery_info" name="delivery_info" className="input min-h-20 py-3" maxLength={300} rows={2} placeholder="По городу 1500 ₸, бесплатно от 20 000 ₸. Самовывоз: левый берег" defaultValue={shop.delivery_info || ""} /></Field>
        <p className="text-caption text-muted">Оплата в приложении не принимается: покупатель сам договаривается с вами в WhatsApp.</p>
      </fieldset>
      <Field label="Адрес ссылки (не меняется)" htmlFor="slug"><input id="slug" className="input" readOnly value={shop.slug} /></Field>
      <input type="hidden" name="avatar_url" value={avatar} />
      {avatar && <button type="button" className="min-h-11 self-start text-sm font-semibold text-accent-dark underline" onClick={() => { setAvatar(""); setDirtyFor(state); }}>Убрать фото магазина</button>}
      {avatar && <img src={avatar} alt="Фото магазина" width={96} height={96} className="size-24 rounded-full object-cover" /> /* eslint-disable-line @next/next/no-img-element */}
      <Field label="Фото магазина" htmlFor="avatar"><input id="avatar" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || pending} onChange={(e) => void upload(e.target.files?.[0])} /></Field>
      {(error || state.error) && <p role="alert" tabIndex={-1} ref={(node) => node?.focus()}>{error || state.error}</p>}
      {state.success && <p role="status">{state.success}</p>}
      <button className="btn-accent" disabled={pending || uploading}>{uploading ? "Загружаем…" : pending ? "Сохраняем…" : "Сохранить настройки"}</button>
    </form>
    <a href={url} className="break-all underline">{url}</a><CopyLink url={url} />
    <canvas ref={canvas} aria-label="QR-код магазина" className="mx-auto" />
    <Link href="/dashboard/poster" className="btn-outline">Плакат для печати</Link>
    <button className="btn-outline" onClick={() => { const a = document.createElement("a"); a.href = canvas.current!.toDataURL("image/png"); a.download = `${shop.slug}-qr.png`; a.click(); }}>Скачать QR-код PNG</button>
    <form action="/auth/signout" method="post" className="pt-2 text-center"><button type="submit" className="min-h-11 px-3 text-sm font-semibold text-muted underline">Выйти из аккаунта</button></form>
  </div>;
}
