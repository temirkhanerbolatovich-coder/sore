import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-6xl font-extrabold text-accent">404</div>
      <h1 className="text-2xl font-extrabold">Такой страницы нет</h1>
      <p className="leading-relaxed text-muted">
        Возможно, магазин переехал или в ссылке опечатка. Хотите создать свой магазин за 2 минуты?
      </p>
      <Link href="/" className="btn-accent">
        На главную
      </Link>
    </main>
  );
}
