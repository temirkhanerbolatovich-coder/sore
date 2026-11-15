import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackArrow } from "@/components/back-link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Вход — DukenAI" };

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
          duken<span className="text-accent">.ai</span>
        </Link>
        <Link href="/" className="flex min-h-11 items-center gap-1 font-semibold text-muted">
          <BackArrow /> На главную
        </Link>
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight">
          Войдите, чтобы создать магазин
        </h1>
        <p className="text-[17px] leading-relaxed text-muted">
          Пришлём ссылку для входа на почту. Пароль не нужен.
        </p>
      </div>
      <LoginForm failed={Boolean(error)} />
      <p className="mt-auto text-center text-sm leading-relaxed text-muted">
        Продолжая, вы соглашаетесь с условиями сервиса.
      </p>
    </main>
  );
}
