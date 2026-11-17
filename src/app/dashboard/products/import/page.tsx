import { requireShop } from "@/lib/shop";
import { FREE_PRODUCT_LIMIT } from "@/lib/types";
import { FormHeader } from "../product-form";
import { ImportForm } from "./import-form";

export const metadata = { title: "Прайс из Excel — Sөre" };

export default async function ImportPage() {
  const { supabase, shop } = await requireShop();
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", shop.id);
  const slots = Math.max(0, FREE_PRODUCT_LIMIT - (count ?? 0));

  return (
    <main className="mx-auto flex w-full max-w-md md:max-w-2xl flex-1 flex-col">
      <FormHeader title="Прайс из Excel" />
      <ImportForm slots={slots} />
    </main>
  );
}
