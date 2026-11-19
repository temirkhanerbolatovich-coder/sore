"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Скопируйте ссылку:", url);
    }
  }

  return (
    <button type="button" onClick={copy} className="h-11 w-full rounded-xl bg-ink px-3 text-sm font-semibold text-cream">
      {copied ? "Скопировано" : "Копировать"}
    </button>
  );
}

/** Готовый текст для био Instagram или закрепа в Telegram: ссылка с призывом, чтобы покупатель понимал, что делать. */
export function CopyBio({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const text = `Каталог и заказ: ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Скопируйте текст:", text);
    }
  }

  return (
    <button type="button" onClick={copy} className="min-h-11 self-start text-sm font-semibold underline">
      {copied ? "Скопировано" : "Скопировать текст для Instagram"}
    </button>
  );
}
