import { requireShop } from "@/lib/shop";
import { FormHeader, ProductForm } from "../product-form";

export const metadata = { title: "Новый товар — SÖRE" };

export default async function NewProductPage() {
  await requireShop();
  return (
    <main className="mx-auto flex w-full max-w-md md:max-w-2xl flex-1 flex-col">
      <FormHeader title="Новый товар" />
      <ProductForm />
    </main>
  );
}
