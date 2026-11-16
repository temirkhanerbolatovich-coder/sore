"use client";

import { useRef, useState } from "react";
import { plural } from "@/lib/plural";
import Link from "next/link";
import { toCsv } from "@/lib/csv-export";
import { CheckIcon, DownloadIcon, FileIcon, UploadIcon } from "@/components/icons";

type Report = { row: number; message: string };
type Result = { created: number; updated: number; skipped: number; total: number; report: Report[] };

const SHOWN_ERRORS = 8;

/** Скачивает отчёт об ошибках как CSV для Excel (BOM, «;»). Строится в браузере из ответа сервера. */
function downloadReport(report: Report[]) {
  const csv = toCsv([["Строка", "Причина"], ...report.map((r) => [r.row, r.message])]);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "sore-import-errors.csv";
  a.click();
  // Адрес освобождаем не сразу: под нагрузкой браузер может ещё читать файл (иначе скачивание обрывается).
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Прайс из Excel или CSV: выбрать файл → загрузить → итог и отчёт об ошибках. */
export function ImportForm({ slots }: { slots: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/import", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as Partial<Result> & { error?: string };
      if (!res.ok) throw new Error(json.error || "Не удалось загрузить файл. Попробуйте ещё раз.");
      setResult(json as Result);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Нет связи. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  const changed = result ? result.created + result.updated : 0;

  return (
    <form id="main-content" tabIndex={-1} onSubmit={onSubmit} className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="card icon-host flex flex-col gap-3 p-5">
          <div className="flex items-center gap-3">
            <div className="icon-badge">
              <FileIcon size={24} />
            </div>
            <p className="text-lg font-bold leading-tight">Загрузите прайс одним файлом</p>
          </div>
          <p className="text-[15px] leading-relaxed text-muted">
            Нужны колонки «Название» и «Цена». По желанию: «Артикул», «Категория», «Описание», «Количество». Если артикул уже есть в
            магазине, товар обновится, а не задвоится. Бесплатно можно держать до 15 товаров, сейчас свободно мест: {slots}.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {/* Скачивание файла: клиентская навигация Next.js здесь не подходит. */}
            <a href="/api/import/template?format=xlsx" download className="btn-outline h-11 min-h-11 px-2 text-sm">
              <DownloadIcon size={18} />
              Шаблон .xlsx
            </a>
            {/* Скачивание файла: клиентская навигация Next.js здесь не подходит. */}
            <a href="/api/import/template?format=csv" download className="btn-outline h-11 min-h-11 px-2 text-sm">
              <DownloadIcon size={18} />
              Шаблон .csv
            </a>
          </div>
        </div>

        <input
          ref={fileRef}
          id="import-file"
          type="file"
          accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError("");
            setResult(null);
          }}
        />
        <label htmlFor="import-file" className="btn-dark h-14 w-full cursor-pointer text-lg has-[:disabled]:opacity-60">
          <UploadIcon />
          {file ? "Выбрать другой файл" : "Выбрать файл"}
        </label>
        {file && (
          <p className="truncate text-center text-[15px] font-semibold" title={file.name}>
            {file.name} · {Math.max(1, Math.round(file.size / 1024))} КБ
          </p>
        )}

        {busy && (
          <p role="status" className="text-center text-sm font-semibold text-muted">
            Загружаем и проверяем строки…
          </p>
        )}

        {error && (
          <p role="alert" tabIndex={-1} ref={(node) => node?.focus()} className="card border-accent p-4 text-[15px] font-semibold text-accent-dark">
            {error}
          </p>
        )}

        {result && (
          <section role="status" aria-label="Итог загрузки" className="card rise-in flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2 text-lg font-extrabold">
              <CheckIcon size={22} className="text-wa" />
              {changed > 0 ? "Прайс загружен" : "Ничего не загружено"}
            </div>
            <ul className="flex flex-col gap-1 text-[15px]">
              <li>
                Добавлено: <b>{result.created}</b>
              </li>
              <li>
                Обновлено: <b>{result.updated}</b>
              </li>
              <li>
                Пропущено: <b>{result.skipped}</b> из {result.total} {plural(result.total, "строки", "строк", "строк")}
              </li>
            </ul>
            {result.report.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-line pt-3">
                <p className="text-sm font-bold">Что не загрузилось</p>
                <ul className="flex flex-col gap-1 text-[13px] text-muted">
                  {result.report.slice(0, SHOWN_ERRORS).map((r) => (
                    <li key={`${r.row}-${r.message}`}>
                      Строка {r.row}: {r.message}
                    </li>
                  ))}
                </ul>
                {result.report.length > SHOWN_ERRORS && <p className="text-[13px] text-muted">…и ещё {result.report.length - SHOWN_ERRORS}. Все строки в отчёте.</p>}
                <button type="button" onClick={() => downloadReport(result.report)} className="btn-outline h-11 min-h-11 text-sm">
                  <DownloadIcon size={18} />
                  Скачать отчёт об ошибках
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-line bg-surface p-5">
        {!result && (
          <button type="submit" disabled={!file || busy || slots === 0} className="btn-accent h-14 w-full text-lg disabled:opacity-60">
            {busy ? "Загружаем…" : "Загрузить прайс"}
          </button>
        )}
        {slots === 0 && !result && <p className="text-center text-[13px] text-muted">Лимит исчерпан: обновить существующие товары по артикулу можно, добавить новые нельзя.</p>}
        <Link href="/dashboard" className={`${result ? "btn-accent" : "btn-outline"} h-12 w-full`}>
          {result ? "К товарам" : "Назад"}
        </Link>
      </div>
    </form>
  );
}
