"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import type { Product } from "@/lib/types";
import { deleteProduct, saveProduct, type ProductState } from "./actions";

import { Field } from "@/components/field";
import { useUnsavedGuard } from "@/lib/use-unsaved-guard";
import { newVariantId, variantsOf } from "@/lib/variants";
import { ActionForm } from "@/components/action-form";

const initial: ProductState = {};

export function ProductForm({ product }: { product?: Product }) {
  const [state, action, pending] = useActionState(saveProduct, initial);
  const [photoUrl, setPhotoUrl] = useState(product?.photo_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(product?.title ?? "");
  const [descRu, setDescRu] = useState(product?.description_ru ?? "");
  const [descKz, setDescKz] = useState(product?.description_kz ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [touched, setTouched] = useState(false);
  const [variants, setVariants] = useState<{ id: string; title: string; price: string }[]>(() =>
    variantsOf(product ?? {}).map((v) => ({ id: v.id, title: v.title, price: String(v.price) })),
  );
  const [priceMode, setPriceMode] = useState<"fixed" | "from" | "request">(
    product?.price_mode === "from" || product?.price_mode === "request" ? product.price_mode : "fixed",
  );
  const [aiBackup, setAiBackup] = useState<{ title: string; descRu: string; descKz: string; category: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  useUnsavedGuard(touched && !pending);
  const [aiMessage, setAiMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function fillWithAi() {
    setAiBusy(true);
    setAiMessage(null);
    try {
      const res = await fetch("/api/ai/product-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_url: photoUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "error");
      const c = json.card;
      setAiBackup({ title, descRu, descKz, category });
      setTouched(true);
      setTitle(c.title);
      setDescRu(c.description_ru);
      setDescKz(c.description_kz);
      setCategory(c.category);
      const notes = [
        json.kzDropped ? "Казахское описание не получилось, заполните его вручную." : "",
        json.provider === "openrouter" ? "Текст составила резервная модель: особенно проверьте казахское описание." : "",
      ].filter(Boolean).join(" ");
      setAiMessage({
        ok: true,
        text: `ИИ заполнил поля. Проверьте текст и укажите цену — её ИИ не угадывает. ${notes} Осталось генераций: ${json.remaining}.`.replace(/\s+/g, " "),
      });
    } catch (e) {
      setAiMessage({
        ok: false,
        text: e instanceof Error && e.message !== "error" ? e.message : "Не удалось связаться с ИИ. Заполните вручную.",
      });
    } finally {
      setAiBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPhotoError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("no user");

      const blob = await compressImage(file);
      const path = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("product-photos")
        .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (error) throw error;

      const { data } = supabase.storage.from("product-photos").getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
      setTouched(true);
    } catch {
      setPhotoError("Не удалось загрузить фото. Попробуйте другое или проверьте интернет.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <form action={action} onChange={() => setTouched(true)} className="flex flex-1 flex-col">
        {product && <input type="hidden" name="id" value={product.id} />}
        <input type="hidden" name="photo_url" value={photoUrl} />
        <input type="hidden" name="variants" value={JSON.stringify(variants)} />

        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="flex items-center gap-3.5">
            <div className="flex size-28 flex-none items-center justify-center overflow-hidden rounded-2xl bg-[#f3d9c4] text-center text-[13px] text-muted">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Фото товара" className="size-full object-cover" />
              ) : (
                "Нет фото"
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <input
                ref={fileRef}
                id="photo"
                type="file"
                accept="image/*"
                onChange={onFile}
                className="sr-only"
                disabled={uploading}
              />
              <label
                htmlFor="photo"
                className="flex h-11 cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-ink bg-white text-[15px] font-semibold has-[:disabled]:opacity-60"
              >
                {uploading ? "Загружаем…" : photoUrl ? "Заменить фото" : "Сделать или выбрать фото"}
              </label>
              {photoUrl && !uploading && (
                <button type="button" onClick={() => { setPhotoUrl(""); setAiBackup(null); setTouched(true); }} className="min-h-11 text-sm font-semibold text-accent-dark underline">
                  Убрать фото
                </button>
              )}
              <button
                type="button"
                onClick={fillWithAi}
                disabled={!photoUrl || uploading || aiBusy}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-bold text-cream disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
                </svg>
                {aiBusy ? "ИИ думает…" : "Заполнить с ИИ"}
              </button>
            </div>
          </div>
          {photoError && (
            <p role="alert" tabIndex={-1} ref={(node) => node?.focus()} className="text-sm font-semibold text-accent-dark">
              {photoError}
            </p>
          )}
          {aiMessage && (
            <p
              role={aiMessage.ok ? "status" : "alert"}
              className={`rounded-xl border px-3.5 py-3 text-sm leading-snug ${
                aiMessage.ok ? "border-[#b7dcc3] bg-[#e6f3ea] text-[#1d4d31]" : "border-line bg-accent-soft font-semibold text-accent-dark"
              }`}
            >
              {aiMessage.text}
              {aiMessage.ok && aiBackup && (
                <>
                  {" "}
                  <button
                    type="button"
                    className="min-h-11 font-semibold underline"
                    onClick={() => {
                      setTitle(aiBackup.title); setDescRu(aiBackup.descRu); setDescKz(aiBackup.descKz); setCategory(aiBackup.category);
                      setAiBackup(null); setAiMessage(null);
                    }}
                  >
                    Вернуть как было
                  </button>
                </>
              )}
            </p>
          )}

          <Field label="Название" htmlFor="title">
            <input id="title" name="title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
          </Field>

          <Field label="Описание · RU" htmlFor="description_ru">
            <textarea
              id="description_ru"
              name="description_ru"
              rows={3}
              maxLength={1000}
              value={descRu}
              onChange={(e) => setDescRu(e.target.value)}
              className="input h-auto resize-none py-2.5 text-[15px] leading-snug"
            />
          </Field>

          <Field label="Описание · KZ" htmlFor="description_kz">
            <textarea
              id="description_kz"
              name="description_kz"
              rows={3}
              maxLength={1000}
              value={descKz}
              onChange={(e) => setDescKz(e.target.value)}
              className="input h-auto resize-none py-2.5 text-[15px] leading-snug"
            />
          </Field>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-semibold">Цена</legend>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["fixed", "Точная"],
                  ["from", "От"],
                  ["request", "По запросу"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl text-sm font-bold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink ${
                    priceMode === value ? "bg-ink text-cream" : "border-[1.5px] border-field"
                  }`}
                >
                  <input type="radio" name="price_mode" value={value} checked={priceMode === value} onChange={() => {
                      setPriceMode(value);
                      if (value !== "fixed") setVariants([]);
                    }} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
            {priceMode !== "fixed" && (
              <p className="text-[13px] leading-snug text-muted">
                Такую позицию покупатель не добавляет в корзину: кнопка «Узнать цену» открывает ваш WhatsApp с готовым сообщением.
              </p>
            )}
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Категория" htmlFor="category">
              <input id="category" name="category" maxLength={60} value={category} onChange={(e) => setCategory(e.target.value)} className="input" />
            </Field>
            {priceMode !== "request" && variants.length === 0 && (
              <Field label={priceMode === "from" ? "Цена от, ₸" : "Цена, ₸"} htmlFor="price">
                <input
                  id="price"
                  name="price"
                  required
                  inputMode="numeric"
                  placeholder="12000"
                  defaultValue={product && product.price > 0 ? product.price : undefined}
                  className="input"
                />
              </Field>
            )}
          </div>

          {priceMode === "fixed" && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-semibold">Варианты: вес, размер</legend>
              {variants.length === 0 ? (
                <button
                  type="button"
                  className="min-h-11 self-start text-sm font-semibold underline"
                  onClick={() => setVariants([{ id: newVariantId(), title: "", price: "" }])}
                >
                  + У товара несколько цен (например, 1 кг и 2 кг)
                </button>
              ) : (
                <>
                  {variants.map((v, i) => (
                    <div key={v.id} className="flex gap-2">
                      <input
                        aria-label={`Название варианта ${i + 1}`}
                        placeholder="1 кг"
                        maxLength={40}
                        required
                        value={v.title}
                        onChange={(e) => setVariants((list) => list.map((x) => (x.id === v.id ? { ...x, title: e.target.value } : x)))}
                        className="input"
                      />
                      <input
                        aria-label={`Цена варианта ${i + 1}, ₸`}
                        placeholder="12000"
                        inputMode="numeric"
                        required
                        value={v.price}
                        onChange={(e) => setVariants((list) => list.map((x) => (x.id === v.id ? { ...x, price: e.target.value.replace(/\D/g, "") } : x)))}
                        className="input w-28 flex-none"
                      />
                      <button
                        type="button"
                        aria-label={`Убрать вариант ${i + 1}`}
                        className="min-h-11 min-w-11 flex-none rounded-xl border-[1.5px] border-field text-lg font-bold"
                        onClick={() => setVariants((list) => list.filter((x) => x.id !== v.id))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-x-5">
                    {variants.length < 10 && (
                      <button
                        type="button"
                        className="min-h-11 text-sm font-semibold underline"
                        onClick={() => setVariants((list) => [...list, { id: newVariantId(), title: "", price: "" }])}
                      >
                        + Ещё вариант
                      </button>
                    )}
                    <button type="button" className="min-h-11 text-sm font-semibold text-muted underline" onClick={() => setVariants([])}>
                      Убрать все варианты
                    </button>
                  </div>
                  <p className="text-[13px] leading-snug text-muted">В магазине покупатель выберет вариант, а на витрине будет «от» самой низкой цены.</p>
                </>
              )}
            </fieldset>
          )}

          <label className="flex cursor-pointer items-center justify-between py-1 text-base font-semibold">
            В наличии
            <input
              type="checkbox"
              name="in_stock"
              defaultChecked={product?.in_stock ?? true}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="relative h-[30px] w-[52px] rounded-full bg-[#8a7b6e] transition-colors after:absolute after:left-[3px] after:top-[3px] after:size-6 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-wa peer-checked:after:translate-x-[22px] peer-focus-visible:ring-2 peer-focus-visible:ring-ink"
            />
          </label>

          {state.error && (
            <p role="alert" tabIndex={-1} ref={(node) => node?.focus()} className="text-sm font-semibold text-accent-dark">
              {state.error}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-line bg-white p-5">
          <button type="submit" disabled={pending || uploading || aiBusy} className="btn-accent h-14 w-full text-lg disabled:opacity-60">
            {pending ? "Сохраняем…" : "Сохранить товар"}
          </button>
          <Link href="/dashboard" className="btn-outline h-12 w-full">
            Отмена
          </Link>
        </div>
      </form>

      {product && (
        <ActionForm
          action={async (form) => { if (confirm("Удалить товар? Это нельзя отменить.")) await deleteProduct(form); }}
          className="bg-white px-5 pb-6"
        >
          <input type="hidden" name="id" value={product.id} />
          <button type="submit" className="w-full py-2 text-[15px] font-semibold text-accent-dark underline">
            Удалить товар
          </button>
        </ActionForm>
      )}
    </div>
  );
}

export function FormHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-line bg-white px-3 py-4">
      <Link href="/dashboard" aria-label="Назад" className="flex size-11 items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </Link>
      <h1 className="text-xl font-extrabold">{title}</h1>
    </div>
  );
}
