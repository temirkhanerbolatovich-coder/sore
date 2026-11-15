import { requireShop } from "@/lib/shop";
import { DashboardNav } from "@/components/dashboard-nav";
import { SettingsForm } from "./settings-form";
export const metadata = { title: "Настройки магазина — DukenAI" };
export default async function SettingsPage() {
  const { shop } = await requireShop();
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/${shop.slug}`;
  return <main className="mx-auto w-full max-w-md p-5 pb-24"><h1 className="mb-5 text-2xl font-extrabold">Магазин</h1>
    <SettingsForm shop={shop} url={url} /><DashboardNav active="settings" /></main>;
}
