import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Вход — DukenAI" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-8">
      <Link href="/" className="text-2xl font-extrabold tracking-tight">
        duken<span className="text-accent">.ai</span>
      </Link>
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
