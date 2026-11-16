"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Считает один просмотр магазина за сессию браузера. */
export function ViewTracker({ shopId }: { shopId: string }) {
  useEffect(() => {
    const key = `duken-view-${shopId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage недоступен (приватный режим) — считаем просмотр один раз за загрузку.
    }
    let client = crypto.randomUUID();
    try {
      client = localStorage.getItem("duken-client") || client;
      localStorage.setItem("duken-client", client);
    } catch { /* Storage may be disabled; the server still enforces the per-client quota. */ }
    // Запрос Supabase выполняется только при .then(): простое `void` его не отправляло бы (просмотры всегда были 0).
    createClient()
      .rpc("record_view", { p_shop: shopId, p_client: client })
      .then(() => undefined, () => undefined);
  }, [shopId]);

  return null;
}
