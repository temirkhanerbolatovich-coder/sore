export type CartLine = { id: string; title: string; price: number; qty: number };

export type OrderInput = {
  number?: number | string;
  lines: CartLine[];
  name: string;
  delivery: "delivery" | "pickup";
  address?: string;
  comment?: string;
};

const nf = new Intl.NumberFormat("ru-RU");

/** 12000 → «12 000 ₸» (пробел внутри числа — неразрывный, меняем на обычный) */
export function formatPrice(value: number): string {
  return `${nf.format(value).replace(/[  ]/g, " ")} ₸`;
}

export function orderTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.price * l.qty, 0);
}

/** Только цифры, международный формат: «+7 701 123-45-67» → «77011234567» */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) digits = "7" + digits.slice(1);
  return digits;
}

export function buildOrderText(o: OrderInput): string {
  const head = `Здравствуйте! Заказ из DukenAI${o.number ? ` (№${o.number})` : ""}`;
  const lines = o.lines.map(
    (l, i) => `${i + 1}. ${l.title} × ${l.qty} — ${formatPrice(l.price * l.qty)}`,
  );
  const parts = [
    head,
    "",
    ...lines,
    "",
    `Итого: ${formatPrice(orderTotal(o.lines))}`,
    `Имя: ${o.name}`,
    o.delivery === "pickup" ? "Самовывоз" : `Доставка: ${o.address ?? ""}`,
  ];
  if (o.comment) parts.push(`Комментарий: ${o.comment}`);
  return parts.join("\n");
}

export function whatsappUrl(phone: string, text: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`;
}
