export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 animate-pulse px-4 pt-6" aria-busy="true" aria-label="Загрузка магазина">
      <div className="flex items-center gap-3.5">
        <div className="size-[72px] rounded-full bg-line" />
        <div className="h-7 w-48 rounded-lg bg-line" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-56 rounded-2xl bg-line" />
        ))}
      </div>
    </main>
  );
}
