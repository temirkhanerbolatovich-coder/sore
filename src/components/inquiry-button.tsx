"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * «Узнать цену» для позиций «от» и «по запросу»: обычная ссылка на WhatsApp с готовым текстом
 * (работает и без JS), а по клику дополнительно считается обращение для статистики продавца.
 */
export function InquiryButton({
  shopId,
  productId,
  href,
  label,
}: {
  shopId: string;
  productId: string;
  href: string;
  label: string;
}) {
  function record() {
    let client = crypto.randomUUID();
    try {
      client = localStorage.getItem("duken-client") || client;
      localStorage.setItem("duken-client", client);
    } catch {
      /* Хранилище может быть отключено: сервер всё равно ограничивает частоту. */
    }
    // Запрос Supabase выполняется только при .then(): простое `void` его не отправляло бы.
    createClient()
      .rpc("record_inquiry", { p_shop: shopId, p_product: productId, p_client: client })
      .then(() => undefined, () => undefined);
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={record}
      className="flex h-11 w-full items-center justify-center rounded-xl bg-wa px-3 text-sm font-bold text-white"
    >
      {label}
    </a>
  );
}
