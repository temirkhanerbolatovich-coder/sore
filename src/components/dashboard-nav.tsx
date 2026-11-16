import Link from "next/link";
import { BoxIcon, CartIcon, ShopIcon } from "@/components/icons";

const items = [
  { key: "products", label: "Товары", href: "/dashboard", Icon: BoxIcon },
  { key: "orders", label: "Заказы", href: "/dashboard/orders", Icon: CartIcon },
  { key: "settings", label: "Магазин", href: "/dashboard/settings", Icon: ShopIcon },
] as const;

export function DashboardNav({ active, newOrders = 0 }: { active: "products" | "orders" | "settings"; newOrders?: number }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface" aria-label="Разделы кабинета">
      <div className="mx-auto grid h-[68px] max-w-md grid-cols-3 items-center text-center text-[13px] font-semibold">
        {items.map((i) => (
          <Link
            key={i.key}
            href={i.href}
            aria-current={active === i.key ? "page" : undefined}
            className={`flex h-full items-center justify-center gap-1.5 ${active === i.key ? "text-accent" : "text-muted"}`}
          >
            <i.Icon size={18} />
            {i.label}
            {i.key === "orders" && newOrders > 0 && (
              <span className="rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-on-accent">
                {newOrders}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
