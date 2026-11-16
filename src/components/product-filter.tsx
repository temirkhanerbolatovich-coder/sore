"use client";

import { useState, type ReactNode } from "react";

type Item = { id: string; /** Уже в нижнем регистре: название, категория, описания. */ text: string; node: ReactNode };

/**
 * Список товаров витрины с поиском. Карточки отрисованы на сервере и приходят готовыми,
 * поэтому кэш страницы и размер клиентского кода не растут: фильтруется только набор показанных элементов.
 */
export function ProductFilter({
  items,
  minItems,
  labels,
}: {
  items: Item[];
  /** Поле поиска показывается, когда в списке не меньше стольких товаров. */
  minItems: number;
  labels: { placeholder: string; empty: string; reset: string };
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase("ru");
  const shown = needle ? items.filter((item) => item.text.includes(needle)) : items;

  return (
    <>
      {items.length >= minItems && (
        <div className="pb-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.placeholder}
            aria-label={labels.placeholder}
            enterKeyHint="search"
            autoComplete="off"
            maxLength={60}
            className="input w-full"
          />
        </div>
      )}
      {shown.length === 0 ? (
        <div role="status" className="card flex flex-col gap-3 p-5 text-muted">
          <p>{labels.empty}</p>
          <button type="button" className="btn-outline h-11" onClick={() => setQuery("")}>
            {labels.reset}
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-4">{shown.map((item) => item.node)}</ul>
      )}
    </>
  );
}
