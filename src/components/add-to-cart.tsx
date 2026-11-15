"use client";

import { useCart, useShopLines } from "@/lib/cart";
import { T, type Lang } from "@/lib/lang";
import type { Product } from "@/lib/types";

export function AddToCart({ slug, product, lang }: { slug: string; product: Product; lang: Lang }) {
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const lines = useShopLines(slug);
  const qty = lines.find((l) => l.id === product.id)?.qty ?? 0;
  const t = T[lang];

  if (!product.in_stock) {
    return (
      <div className="flex h-11 items-center justify-center rounded-xl bg-line text-sm font-bold text-muted">
        {t.out}
      </div>
    );
  }

  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={() =>
          add(slug, { id: product.id, title: product.title, price: product.price, photo: product.photo_url })
        }
        className="flex h-11 w-full items-center justify-center rounded-xl bg-ink text-sm font-bold text-cream"
      >
        {t.add}
      </button>
    );
  }

  return (
    <div className="flex h-11 items-center justify-between rounded-xl border-[1.5px] border-ink bg-white px-1">
      <button
        type="button"
        aria-label="Уменьшить количество"
        onClick={() => setQty(product.id, qty - 1)}
        className="size-11 rounded-lg text-xl font-bold"
      >
        −
      </button>
      <span className="font-bold" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        aria-label="Увеличить количество"
        onClick={() => setQty(product.id, qty + 1)}
        className="size-11 rounded-lg text-xl font-bold"
      >
        +
      </button>
    </div>
  );
}
