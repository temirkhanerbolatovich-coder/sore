"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startTelegramLink, unlinkTelegram } from "./telegram-actions";

/** Подключение Telegram: заказы приходят сообщением в чат с ботом. */
export function TelegramCard({ linked }: { linked: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Пока ждём нажатия Start в боте, раз в 3 секунды проверяем статус.
  useEffect(() => {
    if (!url || linked) return;
    const timer = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(timer);
  }, [url, linked, router]);

  async function connect() {
    setBusy(true);
    setError("");
    const r = await startTelegramLink();
    setBusy(false);
    if (r.error || !r.url) return setError(r.error ?? "Не удалось создать ссылку.");
    setUrl(r.url);
  }

  async function disconnect() {
    if (!window.confirm("Отключить уведомления в Telegram? Заказы по-прежнему будут в разделе «Заказы».")) return;
    setBusy(true);
    const r = await unlinkTelegram();
    setBusy(false);
    if (r.error) return setError(r.error);
    setUrl("");
    router.refresh();
  }

  return (
    <section className="card flex flex-col gap-3 p-4" aria-labelledby="tg-title">
      <h2 id="tg-title" className="text-lg font-bold">
        Заказы в Telegram
      </h2>
      {linked ? (
        <>
          <p role="status" className="text-body leading-relaxed text-wa">
            Telegram подключён: новые заказы приходят вам сообщением.
          </p>
          <button type="button" disabled={busy} onClick={disconnect} className="min-h-11 self-start text-sm font-semibold text-muted underline">
            Отключить
          </button>
        </>
      ) : url ? (
        <>
          <p className="text-body leading-relaxed text-muted">Откройте бота и нажмите Start. Эта страница сама обновится, когда всё подключится.</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-dark h-12">
            Открыть Telegram
          </a>
        </>
      ) : (
        <>
          <p className="text-body leading-relaxed text-muted">Получайте новый заказ сообщением в Telegram, не заходя в кабинет.</p>
          <button type="button" disabled={busy} onClick={connect} className="btn-dark h-12 disabled:opacity-60">
            {busy ? "Готовим ссылку…" : "Подключить Telegram"}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-accent-dark">
          {error}
        </p>
      )}
    </section>
  );
}
