"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { priceLabel } from "@/lib/order";
import { variantsOf } from "@/lib/variants";
import { GripIcon, BoxIcon } from "@/components/icons";
import { ProductPhoto } from "@/components/product-photo";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionForm } from "@/components/action-form";
import { moveProduct, toggleHidden, toggleStock } from "./products/actions";

export function ProductCatalog({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [dragged, setDragged] = useState<string>();
  const [target, setTarget] = useState<string>();
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const moving = useRef(false);
  const router = useRouter();
  const visible = products.filter((product) => product.title.toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru")) &&
    (filter === "all" || (filter === "stock" && product.in_stock) || (filter === "out" && !product.in_stock) || (filter === "review" && product.price_needs_review) || (filter === "hidden" && product.is_hidden)));
  const canDrag = !query.trim() && filter === "all" && !pending;

  function reorder(id: string, destination?: string) {
    setDragged(undefined); setTarget(undefined);
    if (!destination || destination === id || moving.current) return;
    const from = products.findIndex((product) => product.id === id);
    const to = products.findIndex((product) => product.id === destination);
    if (from < 0 || to < 0) return;
    moving.current = true;
    start(async () => {
      setMessage("");
      try {
        // API перемещает на одну позицию. Выполняем шаги последовательно, без нового контракта.
        for (let index = 0; index < Math.abs(to - from); index++) {
          const data = new FormData(); data.set("id", id); data.set("direction", String(Math.sign(to - from)));
          await moveProduct(data);
        }
        setMessage("Порядок сохранён.");
      } catch { setMessage("Не удалось завершить перемещение. Проверьте текущий порядок и повторите."); }
      finally { moving.current = false; router.refresh(); }
    });
  }

  if (!products.length) return <div className="px-5 pt-3"><EmptyState icon={<BoxIcon />} title="Пока нет товаров" description="Добавьте первый товар: фото, название и цену." action={<Link href="/dashboard/products/new" className="btn-dark">Добавить товар вручную</Link>} /></div>;
  return <section className="px-5 pt-3" aria-label="Каталог товаров" aria-busy={pending}>
    <label htmlFor="catalog-search" className="text-sm font-semibold">Найти товар</label>
    <input id="catalog-search" type="search" className="input mt-2" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название товара" />
    <div className="my-3 flex flex-wrap gap-2" aria-label="Фильтры товаров">
      {[["all", "Все"], ["stock", "В наличии"], ["out", "Нет в наличии"], ["review", "Проверить цену"], ["hidden", "Скрытые"]].map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-11 rounded-xl border border-field px-3 text-sm font-semibold ${filter === value ? "bg-ink text-cream" : "bg-surface"}`}>{label}</button>)}
    </div>
    <p role="status" className="mb-3 text-sm text-muted">Найдено {visible.length} из {products.length}. {message}</p>
    {!canDrag && <p className="mb-3 text-sm text-muted">Для перетаскивания выберите «Все» и очистите поиск. Кнопки «Выше» и «Ниже» меняют общий порядок.</p>}
    {!visible.length && <EmptyState icon={<BoxIcon />} title="Товары не найдены" description="Попробуйте другое название или сбросьте фильтры." action={<button className="btn-outline" onClick={() => { setQuery(""); setFilter("all"); }}>Сбросить фильтры</button>} />}
    <ul className="grid gap-3 lg:grid-cols-2">
      {visible.map((product) => <li key={product.id} data-product-id={product.id} className={`card flex flex-col gap-2 p-3 ${target === product.id ? "ring-2 ring-[var(--focus)]" : ""}`}>
        <div className="flex items-center gap-2">
          <button type="button" disabled={!canDrag} aria-label={`Переместить: ${product.title}`} aria-describedby="catalog-drag-help" className="min-h-11 min-w-11 touch-none rounded-xl border border-field text-xl" style={{ touchAction: "none" }}
            onPointerDown={(event) => { if (event.button !== 0 || !canDrag) return; event.currentTarget.setPointerCapture(event.pointerId); setDragged(product.id); }}
            onPointerMove={(event) => { if (dragged === product.id) setTarget(document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-product-id]")?.dataset.productId); }}
            onPointerUp={(event) => { if (dragged === product.id) reorder(product.id, document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-product-id]")?.dataset.productId); }}
            onPointerCancel={() => { setDragged(undefined); setTarget(undefined); }}
            onKeyDown={(event) => { if (event.key === "Escape") { setDragged(undefined); setTarget(undefined); } }}><GripIcon /></button>
          <Link href={`/dashboard/products/${product.id}/edit`} className="flex min-w-0 flex-1 items-center gap-3">
            <ProductPhoto url={product.photo_url} alt="" initial={product.title} thumbnail className="size-16 flex-none rounded-xl" />
            <div className="min-w-0"><div className="break-words font-semibold">{product.title}</div><div className="text-sm text-muted">{priceLabel(product.price, product.price_mode, "ru", variantsOf(product).length > 0)}</div></div>
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 text-sm"><span className="rounded-full bg-accent-soft px-2 py-1 text-accent-dark">{product.in_stock ? "В наличии" : "Нет в наличии"}</span>{product.is_hidden && <span className="rounded-full border border-field px-2 py-1">Скрыт с витрины</span>}{product.price_needs_review && <span className="rounded-full border border-field px-2 py-1">Проверить цену</span>}</div>
        <ActionForm action={toggleStock}><input type="hidden" name="id" value={product.id} /><input type="hidden" name="next" value={String(!product.in_stock)} /><button disabled={pending} type="submit" role="switch" aria-checked={product.in_stock} aria-label={`В наличии: ${product.title}`} className="min-h-11 text-sm font-semibold underline">{product.in_stock ? "Отметить отсутствие" : "Вернуть в наличие"}</button></ActionForm>
        <details><summary className="min-h-11 cursor-pointer py-3 font-semibold">Действия с товаром</summary>
          <Link href={`/dashboard/products/${product.id}/edit`} className="flex min-h-11 items-center underline">Редактировать</Link>
          <ActionForm action={toggleHidden}><input type="hidden" name="id" value={product.id} /><input type="hidden" name="next" value={String(!product.is_hidden)} /><button disabled={pending} type="submit" className="min-h-11 text-left underline">{product.is_hidden ? "Показать на витрине" : "Скрыть с витрины"}</button></ActionForm>
          <div className="flex gap-3">{[-1, 1].map((direction) => <ActionForm key={direction} action={moveProduct}><input type="hidden" name="id" value={product.id} /><input type="hidden" name="direction" value={direction} /><button disabled={pending} className="min-h-11 min-w-11 px-2" aria-label={direction < 0 ? "Выше" : "Ниже"}>{direction < 0 ? "↑ Выше" : "↓ Ниже"}</button></ActionForm>)}</div>
        </details>
      </li>)}
    </ul>
    <p id="catalog-drag-help" className="mt-3 text-sm text-muted">Перетащите за ручку ↕ мышью или пальцем. С клавиатуры используйте «Действия с товаром» → «Выше» / «Ниже».</p>
  </section>;
}
