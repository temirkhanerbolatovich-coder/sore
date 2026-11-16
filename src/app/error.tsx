"use client";
import { ReportClientError } from "@/components/report-client-error";
import { ErrorState } from "@/components/ui/error-state";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex max-w-md flex-col gap-4 p-5">
      <ReportClientError error={error} />
      <ErrorState title="Сервис временно недоступен" description="Не удалось загрузить данные. Проверьте соединение и попробуйте снова." retry={reset}>
        {/* Обычная ссылка (полная перезагрузка): надёжнее после сбоя, чем клиентский переход. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="btn-outline">На главную</a>
      </ErrorState>
    </main>
  );
}
