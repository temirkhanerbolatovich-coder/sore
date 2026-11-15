"use client";
export default function DashboardError({ reset }: { reset: () => void }) {
  return <main className="mx-auto flex max-w-md flex-col gap-4 p-5"><h1 className="text-xl font-bold">Не удалось загрузить кабинет</h1>
    <p role="alert">Проверьте соединение и повторите попытку. Если ошибка сохраняется, обратитесь к администратору.</p>
    <button className="btn-accent" onClick={reset}>Повторить</button></main>;
}
