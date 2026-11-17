import { notFound } from "next/navigation";
import { requireShop } from "@/lib/shop";
import type { Product } from "@/lib/types";
import { FormHeader, ProductForm } from "../../product-form";

export const metadata = { title: "Редактирование товара — Sөre" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, shop } = await requireShop();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("shop_id", shop.id)
    .maybeSingle<Product>();
  if (!product) notFound();

  return (
    <main className="mx-auto flex w-full max-w-md md:max-w-2xl flex-1 flex-col">
      <FormHeader title="Редактирование" />
      <ProductForm product={product} />
    </main>
  );
}
