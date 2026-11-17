import Link from "next/link";

/** Второй шаг после создания магазина; запись магазина остаётся прежней. */
export function AddProducts() {
  return <section className="card mx-5 mt-4 p-4" aria-labelledby="add-products">
    <p className="text-sm text-muted">Шаг 2 из 2</p>
    <h2 id="add-products" className="mt-1 text-xl font-bold">Как добавить товары?</h2>
    <p className="mt-2 text-sm text-muted">Выберите удобный способ. Время зависит от числа товаров и проверки цен.</p>
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      {[
        ["shelf", "Фото полки", "Один снимок для нескольких товаров. После распознавания проверьте каждую карточку."],
        ["import", "Прайс из Excel", "Загрузите готовый файл и проверьте отчёт. Подготовка таблицы может занять больше времени."],
        ["new", "По одному", "Добавьте фото, название и цену. Удобно начать с одного товара."],
      ].map(([path, title, text]) => <Link key={path} href={`/dashboard/products/${path}`} className="rounded-xl border border-field p-4 hover:bg-accent-soft">
        <span className="block font-bold">{title}</span><span className="mt-2 block text-sm text-muted">{text}</span>
      </Link>)}
    </div>
  </section>;
}
