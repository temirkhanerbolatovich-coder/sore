import { requireShop } from "@/lib/shop";
import { enhanceConfigured } from "@/lib/ai-enhance";
import { FREE_PRODUCT_LIMIT } from "@/lib/types";
import { FormHeader, ProductForm } from "../product-form";

export const metadata = { title: "Новый товар — SÖRE" };

export default async function NewProductPage() {
  const { supabase, shop } = await requireShop();
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", shop.id);
  return (
    <main className="mx-auto flex w-full max-w-md md:max-w-2xl flex-1 flex-col">
      <FormHeader title="Новый товар" />
      <ProductForm enhanceAvailable={enhanceConfigured()} atLimit={(count ?? 0) >= FREE_PRODUCT_LIMIT} />
    </main>
  );
}
