"use client";
import { ReportClientError } from "@/components/report-client-error";
import { ErrorState } from "@/components/ui/error-state";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex max-w-md flex-col gap-4 p-5">
      <ReportClientError error={error} />
      <ErrorState
        title="Не удалось загрузить кабинет"
        description="Проверьте соединение и повторите попытку. Если ошибка сохраняется, выйдите и войдите снова."
        retry={reset}
      >
        {/* Полная перезагрузка после сбоя надёжнее клиентского перехода. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/dashboard" className="btn-outline">В кабинет</a>
        <form action="/auth/signout" method="post">
          <button type="submit" className="min-h-11 px-3 text-sm font-semibold text-muted underline">Выйти из аккаунта</button>
        </form>
      </ErrorState>
    </main>
  );
}
