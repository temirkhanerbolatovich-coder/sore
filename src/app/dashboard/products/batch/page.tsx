import { requireShop } from "@/lib/shop";
import { FREE_PRODUCT_LIMIT } from "@/lib/types";
import { FormHeader } from "../product-form";
import { BatchForm } from "./batch-form";

export const metadata = { title: "Несколько фото — Sөre" };

export default async function BatchPage() {
  const { supabase, shop } = await requireShop();
  const { data } = await supabase.from("products").select("category").eq("shop_id", shop.id);
  const categories = [...new Set((data ?? []).map((p) => p.category).filter((c): c is string => Boolean(c)))];
  const slots = Math.max(0, FREE_PRODUCT_LIMIT - (data?.length ?? 0));

  return (
    <main className="mx-auto flex w-full max-w-md md:max-w-2xl flex-1 flex-col">
      <FormHeader title="Несколько фото сразу" />
      <BatchForm slots={slots} categories={categories} />
    </main>
  );
}
