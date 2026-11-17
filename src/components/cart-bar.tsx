"use client";

import Link from "next/link";
import { useShopLines } from "@/lib/cart";
import { T, shopHref, type Lang } from "@/lib/lang";
import { formatPrice, orderTotal } from "@/lib/order";

export function CartBar({ slug, lang }: { slug: string; lang: Lang }) {
  const lines = useShopLines(slug);
  if (lines.length === 0) return null;

  const count = lines.reduce((n, l) => n + l.qty, 0);
  return (
    <Link
      href={shopHref(`/${slug}/cart`, lang)}
      className="fixed inset-x-4 bottom-4 z-10 mx-auto flex h-[60px] max-w-md items-center justify-between rounded-2xl bg-accent px-5 text-[17px] font-bold text-on-accent shadow-lg"
    >
      <span key={count} className="bump">
        {T[lang].cart} · {count}
      </span>
      <span>{formatPrice(orderTotal(lines))}</span>
    </Link>
  );
}
