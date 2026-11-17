import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackArrow } from "@/components/back-link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Вход — SÖRE" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // Уже вошёл? Не показываем форму входа ещё раз.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="text-2xl font-extrabold tracking-tight">
          S<span className="text-accent">Ö</span>RE
        </Link>
        <Link href="/" className="flex min-h-11 items-center gap-1 font-semibold text-muted">
          <BackArrow /> На главную
        </Link>
      </div>
      <div id="main-content" tabIndex={-1} className="mt-8 flex flex-col gap-3">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight">
          Войдите, чтобы создать магазин
        </h1>
        <p className="text-[17px] leading-relaxed text-muted">
          Войдите по ссылке из письма или через Google, чтобы создать витрину и принимать заказы. Пароль не нужен.
        </p>
      </div>
      <LoginForm failed={Boolean(error)} />
      <p className="mt-auto text-center text-sm leading-relaxed text-muted">
        Продолжая, вы соглашаетесь с <Link href="/terms" className="underline">условиями</Link> и{" "}
        <Link href="/privacy" className="underline">политикой конфиденциальности</Link>.
      </p>
    </main>
  );
}
