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
    <button type="button" onClick={copy} className="h-11 flex-none rounded-[10px] bg-ink px-3.5 text-sm font-semibold text-cream">
      {copied ? "Скопировано" : "Копировать"}
    </button>
  );
}
