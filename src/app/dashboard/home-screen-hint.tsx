"use client";

import { useEffect, useState } from "react";

const KEY = "sore-home-hint-seen";
let shownThisSession = false;

export function HomeScreenHint() {
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">();
  useEffect(() => {
    if (shownThisSession || window.matchMedia("(display-mode: standalone)").matches) return;
    try { if (localStorage.getItem(KEY)) return; } catch { /* В приватном режиме действует память вкладки. */ }
    const agent = navigator.userAgent;
    const value = /iPhone|iPad|iPod/.test(agent) ? "ios" : /Android/.test(agent) ? "android" : "desktop";
    const timer = window.setTimeout(() => {
      shownThisSession = true;
      try { localStorage.setItem(KEY, "1"); } catch { /* Подсказка не должна блокировать кабинет. */ }
      setPlatform(value);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!platform) return null;
  return <aside className="card mx-5 mt-3 p-4" aria-label="Быстрый доступ к магазину">
    <h2 className="font-bold">Добавьте кабинет на главный экран</h2>
    <p className="mt-2 text-sm text-muted">{platform === "ios" ? "В Safari откройте «Поделиться» → «На экран Домой»." : platform === "android" ? "Откройте меню браузера → «Добавить на главный экран», если этот пункт доступен." : "Сохраните страницу в закладки браузера, чтобы быстро возвращаться к заказам."} Для работы нужен интернет.</p>
    <button type="button" className="mt-2 min-h-11 font-semibold underline" onClick={() => setPlatform(undefined)}>Понятно</button>
  </aside>;
}
