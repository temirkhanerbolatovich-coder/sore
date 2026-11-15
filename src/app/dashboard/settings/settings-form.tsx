"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { Shop } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { Field } from "@/components/field";
import { CopyLink } from "../copy-link";
import { saveSettings } from "./actions";

export function SettingsForm({ shop, url }: { shop: Shop; url: string }) {
  const [state, action, pending] = useActionState(saveSettings, {});
  const [avatar, setAvatar] = useState(shop.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
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
      setAvatar(supabase.storage.from("product-photos").getPublicUrl(path).data.publicUrl);
    } catch { setError("Не удалось загрузить фото. Выберите другое или повторите попытку."); }
    finally { setUploading(false); }
  }
  return <div className="flex flex-col gap-5">
    <form action={action} className="flex flex-col gap-4">
      <Field label="Название магазина" htmlFor="name"><input id="name" name="name" className="input" required minLength={2} maxLength={60} defaultValue={shop.name} /></Field>
      <Field label="Город" htmlFor="city"><input id="city" name="city" className="input" maxLength={60} defaultValue={shop.city || ""} /></Field>
      <Field label="WhatsApp" htmlFor="whatsapp"><input id="whatsapp" name="whatsapp" type="tel" className="input" required defaultValue={shop.whatsapp} /></Field>
      <Field label="Адрес (не меняется)" htmlFor="slug"><input id="slug" className="input" readOnly value={shop.slug} /></Field>
      <input type="hidden" name="avatar_url" value={avatar} />
      {avatar && <img src={avatar} alt="Фото магазина" width={96} height={96} className="size-24 rounded-full object-cover" /> /* eslint-disable-line @next/next/no-img-element */}
      <Field label="Фото магазина" htmlFor="avatar"><input id="avatar" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || pending} onChange={(e) => void upload(e.target.files?.[0])} /></Field>
      {(error || state.error) && <p role="alert" tabIndex={-1} ref={(node) => node?.focus()}>{error || state.error}</p>}
      {state.success && <p role="status">{state.success}</p>}
      <button className="btn-accent" disabled={pending || uploading}>{uploading ? "Загружаем…" : pending ? "Сохраняем…" : "Сохранить настройки"}</button>
    </form>
    <a href={url} className="break-all underline">{url}</a><CopyLink url={url} />
    <canvas ref={canvas} aria-label="QR-код магазина" className="mx-auto" />
    <button className="btn-outline" onClick={() => { const a = document.createElement("a"); a.href = canvas.current!.toDataURL("image/png"); a.download = `${shop.slug}-qr.png`; a.click(); }}>Скачать QR-код PNG</button>
  </div>;
}
