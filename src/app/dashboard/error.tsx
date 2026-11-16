"use client";
import { ReportClientError } from "@/components/report-client-error";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-5">
      <ReportClientError error={error} />
      <h1 className="text-xl font-bold">Не удалось загрузить кабинет</h1>
      <p role="alert">Проверьте соединение и повторите попытку. Если ошибка сохраняется, выйдите и войдите снова.</p>
      <button className="btn-accent" onClick={reset}>Повторить</button>
      {/* Полная перезагрузка после сбоя надёжнее клиентского перехода. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/dashboard" className="btn-outline">В кабинет</a>
      <form action="/auth/signout" method="post" className="text-center">
        <button type="submit" className="min-h-11 px-3 text-sm font-semibold text-muted underline">Выйти из аккаунта</button>
      </form>
    </main>
  );
}
