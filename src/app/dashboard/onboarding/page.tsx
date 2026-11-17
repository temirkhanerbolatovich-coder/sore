import Link from "next/link";
import { redirect } from "next/navigation";
import { BackArrow } from "@/components/back-link";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Создание магазина — SÖRE" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: shop } = await supabase.from("shops").select("id").eq("owner_id", user.id).maybeSingle();
  if (shop) redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-md md:max-w-2xl flex-1 flex-col gap-6 px-5 py-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex min-h-11 items-center gap-1 font-semibold text-muted">
          <BackArrow /> На главную
        </Link>
        <form action="/auth/signout" method="post">
          <button type="submit" className="min-h-11 px-1 text-sm font-semibold text-muted underline">
            Выйти
          </button>
        </form>
      </div>
      <div id="main-content" tabIndex={-1} className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Создайте свой магазин</h1>
        <p className="text-lead leading-relaxed text-muted">Шаг 1 из 2. Укажите название и WhatsApp. Затем выберите, как добавить товары.</p>
      </div>
      <OnboardingForm />
    </main>
  );
}
