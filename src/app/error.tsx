"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto flex max-w-md flex-col gap-4 p-5"><h1 className="text-xl font-bold">Сервис временно недоступен</h1><p role="alert">Не удалось загрузить данные. Проверьте соединение и попробуйте снова.</p><button onClick={reset} className="btn-accent">Повторить</button></main>;
}
