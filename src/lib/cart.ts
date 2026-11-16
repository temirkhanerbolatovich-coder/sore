"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "@/lib/order";
import type { Product } from "@/lib/types";

export type StoredLine = CartLine & { photo: string | null };

type CartState = {
  shopSlug: string | null;
  lines: StoredLine[];
  add: (shopSlug: string, line: Omit<StoredLine, "qty">) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  reconcile: (slug: string, products: Product[]) => boolean;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      shopSlug: null,
      lines: [],
      add: (shopSlug, line) =>
        set((s) => {
          // Корзина привязана к одному магазину: при смене магазина начинаем заново.
          const base = s.shopSlug === shopSlug ? s.lines : [];
          const exists = base.find((l) => l.id === line.id);
          const lines = exists
            ? base.map((l) => (l.id === line.id ? { ...l, qty: Math.min(l.qty + 1, 99) } : l))
            : [...base, { ...line, qty: 1 }];
          return { shopSlug, lines };
        }),
      setQty: (id, qty) =>
        set((s) => ({
          lines: !Number.isFinite(qty) ? s.lines : qty <= 0 ? s.lines.filter((l) => l.id !== id) : s.lines.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(Math.floor(qty), 99)) } : l)),
        })),
      clear: () => set({ shopSlug: null, lines: [] }),
      reconcile: (slug, products) => {
        let changed = false;
        set((s) => {
          if (s.shopSlug !== slug) return s;
          const lines = s.lines.flatMap((line) => {
            const product = products.find((p) => p.id === line.id && p.in_stock && p.price_mode === "fixed");
            if (!product) { changed = true; return []; }
            if (product.price !== line.price || product.title !== line.title) changed = true;
            return [{ ...line, price: product.price, title: product.title, photo: product.photo_url }];
          });
          return { lines };
        });
        return changed;
      },
    }),
    { name: "duken-cart" },
  ),
);

/** true только после гидратации — чтобы разметка с сервера и клиента совпала. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Строки корзины для конкретного магазина (пусто до гидратации). */
export function useShopLines(slug: string): StoredLine[] {
  const hydrated = useHydrated();
  const shopSlug = useCart((s) => s.shopSlug);
  const lines = useCart((s) => s.lines);
  return hydrated && shopSlug === slug ? lines : [];
}
