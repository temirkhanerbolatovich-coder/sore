"use client";

import { useRef, useState } from "react";
import { useStatefulAction } from "@/lib/use-stateful-action";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { uploadProductPhoto } from "@/lib/image";
import { ownedPhotoPath, thumbPath } from "@/lib/photos";
import { useUnsavedGuard } from "@/lib/use-unsaved-guard";
import { saveBatch, type BatchState } from "./actions";

type Item = {
  id: string;
  photoUrl: string;
  title: string;
  descRu: string;
  descKz: string;
  category: string;
  mode: "fixed" | "request";
  price: string;
  status: "working" | "ready";
  note: string;
};

const initial: BatchState = {};
const MAX_AT_ONCE = 12;

/** Выбор нескольких фото → загрузка и ИИ-карточки по каждому → проверка списка → сохранить всё сразу. */
export function BatchForm({ slots, categories }: { slots: number; categories: string[] }) {
  const [state, onSubmit, saving] = useStatefulAction(saveBatch, initial);
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const limit = Math.min(slots, MAX_AT_ONCE);
  const working = items.some((i) => i.status === "working");
  useUnsavedGuard(items.length > 0 && !saving);

  const patch = (id: string, change: Partial<Item>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...change } : i)));

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = [...(e.target.files ?? [])];
    if (fileRef.current) fileRef.current.value = "";
    if (picked.length === 0) return;
    const room = limit - items.length;
    if (room <= 0) {
      setMessage(`Больше добавить нельзя: на бесплатном тарифе осталось мест — ${slots}, за раз до ${MAX_AT_ONCE}.`);
      return;
    }
    const files = picked.slice(0, room);
    setMessage(picked.length > room ? `Взяли первые ${room} из ${picked.length}: больше мест нет.` : "");

    const created: Item[] = files.map(() => ({
      id: crypto.randomUUID(), photoUrl: "", title: "", descRu: "", descKz: "", category: "", mode: "request", price: "", status: "working", note: "",
    }));
    setItems((list) => [...list, ...created]);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const seen = new Set(categories);
    for (const i of items) if (i.category) seen.add(i.category);

    let next = 0;
    async function worker() {
      while (next < files.length) {
        const index = next++;
        const target = created[index];
        try {
          if (!user) throw new Error("no user");
          const photoUrl = await uploadProductPhoto(supabase, user.id, files[index]);
          patch(target.id, { photoUrl });

          try {
            const res = await fetch("/api/ai/product-card", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ photo_url: photoUrl, categories: [...seen].slice(0, 20) }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "ai");
            const c = json.card;
            if (c.category) seen.add(c.category);
            patch(target.id, {
              title: c.title === "Товар" ? "" : c.title,
              descRu: c.description_ru,
              descKz: c.description_kz,
              category: c.category,
              status: "ready",
              note: json.kzDropped ? "Казахское описание не получилось." : "",
            });
          } catch (e) {
            patch(target.id, { status: "ready", note: `ИИ не помог${e instanceof Error && e.message !== "ai" ? `: ${e.message}` : ""}. Впишите название сами.` });
          }
        } catch {
          patch(target.id, { status: "ready", photoUrl: "", note: "Фото не загрузилось. Удалите карточку и добавьте фото ещё раз." });
        }
      }
    }
    // Два потока: быстрее, но не упираемся в лимиты бесплатных ИИ-моделей.
    await Promise.all([worker(), worker()]);
  }

  async function remove(item: Item) {
    setItems((list) => list.filter((i) => i.id !== item.id));
    if (!item.photoUrl) return;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const path = user && ownedPhotoPath(item.photoUrl, user.id);
      if (!path) throw new Error("photo ownership unavailable");
      const { error } = await supabase.storage.from("product-photos").remove([...new Set([path, thumbPath(path)])]);
      if (error) throw error;
    } catch {
      setMessage("Карточка убрана, но фото не удалось удалить.");
    }
  }

  const invalid = items.some((i) => !i.photoUrl || !i.title.trim() || (i.mode === "fixed" && !(Number(i.price) > 0)));
  const payload = JSON.stringify(
    items.map((i) => ({
      photo_url: i.photoUrl,
      title: i.title,
      description_ru: i.descRu,
      description_kz: i.descKz,
      category: i.category,
      price_mode: i.mode,
      price: i.mode === "fixed" ? i.price : 0,
    })),
  );

  return (
    <form id="main-content" tabIndex={-1} onSubmit={onSubmit} className="flex flex-1 flex-col">
      <input type="hidden" name="payload" value={payload} />
      <div className="flex flex-1 flex-col gap-4 p-5">
        {slots === 0 ? (
          <p className="card p-4 text-body leading-relaxed text-muted">
            Бесплатный лимит товаров исчерпан. Удалите ненужные позиции или дождитесь тарифа Pro.
          </p>
        ) : (
          <>
            <p className="text-body leading-relaxed text-muted">
              Выберите до {limit} фото: ИИ составит название и описание на русском и казахском по каждому. Цены вы укажете сами.
            </p>
            <input ref={fileRef} id="batch-files" type="file" accept="image/*" multiple className="sr-only" onChange={onFiles} disabled={working || items.length >= limit} />
            <label
              htmlFor="batch-files"
              className="flex h-14 cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-ink bg-surface text-base font-bold has-[:disabled]:opacity-50"
            >
              {working ? "Обрабатываем фото…" : items.length > 0 ? "Добавить ещё фото" : "Выбрать фото"}
            </label>
          </>
        )}
        {message && (
          <p role="status" className="text-sm font-semibold text-accent-dark">
            {message}
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {items.map((item, index) => (
            <li key={item.id} className="card flex flex-col gap-3 p-3">
              <div className="flex gap-3">
                <div className="size-20 flex-none overflow-hidden rounded-xl bg-thumb">
                  {item.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photoUrl} alt={`Фото ${index + 1}`} className="size-full object-cover" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {item.status === "working" ? (
                    <p role="status" className="py-2 text-sm font-semibold text-muted">
                      {item.photoUrl ? "ИИ пишет карточку…" : "Загружаем фото…"}
                    </p>
                  ) : (
                    <>
                      <input
                        aria-label={`Название ${index + 1}`}
                        placeholder="Название"
                        maxLength={120}
                        value={item.title}
                        onChange={(e) => patch(item.id, { title: e.target.value })}
                        className="input h-11"
                      />
                      <input
                        aria-label={`Категория ${index + 1}`}
                        placeholder="Категория"
                        maxLength={60}
                        value={item.category}
                        onChange={(e) => patch(item.id, { category: e.target.value })}
                        className="input h-11 text-sm"
                      />
                    </>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Убрать карточку ${index + 1}`}
                  onClick={() => void remove(item)}
                  disabled={item.status === "working" && !item.photoUrl}
                  className="min-h-11 min-w-11 flex-none self-start rounded-xl text-xl font-bold text-muted disabled:opacity-50"
                >
                  ×
                </button>
              </div>
              {item.status === "ready" && (
                <>
                  {item.note && <p className="text-caption font-semibold text-accent-dark">{item.note}</p>}
                  <div className="flex items-center gap-2">
                    <div className="grid flex-1 grid-cols-2 gap-2" role="group" aria-label={`Цена ${index + 1}`}>
                      {(
                        [
                          ["request", "По запросу"],
                          ["fixed", "Точная"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={item.mode === value}
                          onClick={() => patch(item.id, { mode: value })}
                          className={`min-h-11 rounded-xl text-sm font-bold ${item.mode === value ? "bg-ink text-cream" : "border-[1.5px] border-field"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {item.mode === "fixed" && (
                      <input
                        aria-label={`Цена ${index + 1}, ₸`}
                        placeholder="₸"
                        inputMode="numeric"
                        value={item.price}
                        onChange={(e) => patch(item.id, { price: e.target.value.replace(/\D/g, "") })}
                        className="input h-11 w-28 flex-none"
                      />
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>

        {state.error && (
          <p role="alert" tabIndex={-1} ref={(node) => node?.focus()} className="text-sm font-semibold text-accent-dark">
            {state.error}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-line bg-surface p-5">
        <button type="submit" disabled={saving || working || items.length === 0 || invalid} className="btn-accent h-14 w-full text-lg disabled:opacity-60">
          {saving ? "Сохраняем…" : items.length > 0 ? `Сохранить ${items.length} ${items.length === 1 ? "товар" : "товаров"}` : "Сохранить"}
        </button>
        {items.length > 0 && invalid && !working && (
          <p className="text-center text-caption text-muted">Укажите название у каждого товара и цену там, где выбрана «Точная».</p>
        )}
        <Link href="/dashboard" className="btn-outline h-12 w-full">
          Отмена
        </Link>
      </div>
    </form>
  );
}
