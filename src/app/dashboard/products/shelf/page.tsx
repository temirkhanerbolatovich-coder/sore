import { requireShop } from "@/lib/shop";
import { FREE_PRODUCT_LIMIT } from "@/lib/types";
import { FormHeader } from "../product-form";
import { ShelfForm } from "./shelf-form";

export const metadata = { title: "Фото полки — Sөre" };

export default async function ShelfPage() {
  const { supabase, shop } = await requireShop();
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", shop.id);
  const slots = Math.max(0, FREE_PRODUCT_LIMIT - (count ?? 0));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <FormHeader title="Фото полки" />
      <ShelfForm slots={slots} />
    </main>
  );
}
