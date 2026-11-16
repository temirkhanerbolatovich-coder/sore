import { requireShop } from "@/lib/shop";
import { telegramConfigured } from "@/lib/telegram";
import { DashboardNav } from "@/components/dashboard-nav";
import { SettingsForm } from "./settings-form";
import { TelegramCard } from "./telegram-card";
import { DangerZone } from "./danger-zone";

export const metadata = { title: "Настройки магазина — Sөre" };

export default async function SettingsPage() {
  const { supabase, shop } = await requireShop();
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/${shop.slug}`;
  const { data: tg } = telegramConfigured()
    ? await supabase.from("shop_telegram").select("linked_at").eq("shop_id", shop.id).maybeSingle()
    : { data: null };

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-md flex-col gap-5 p-5 pb-24">
      <h1 className="text-2xl font-extrabold">Магазин</h1>
      {telegramConfigured() && <TelegramCard linked={Boolean(tg?.linked_at)} />}
      <SettingsForm shop={shop} url={url} />
      <DangerZone slug={shop.slug} />
      <DashboardNav active="settings" />
    </main>
  );
}
