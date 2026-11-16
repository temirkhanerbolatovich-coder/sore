import { formatNeeded, formatPrice, whatsappUrl } from "@/lib/order";

/** Адрес API Telegram можно подменить (тесты поднимают свой сервер). */
const apiBase = () => process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org";

export const telegramConfigured = () => Boolean(process.env.TELEGRAM_BOT_TOKEN);

export type InlineButton = { text: string; url: string };

/** Отправка сообщения ботом. Возвращает true при успехе; сбой не должен ломать основной запрос. */
export async function sendTelegram(chatId: number | string, text: string, buttons: InlineButton[] = []): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`${apiBase()}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...(buttons.length ? { reply_markup: { inline_keyboard: buttons.map((b) => [b]) } } : {}),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type OrderForMessage = {
  number: number;
  items: { title: string; qty: number; price: number }[];
  total: number;
  customer_name: string;
  customer_phone: string;
  address: string | null;
  comment: string | null;
  needed_date: string | null;
  needed_time: string | null;
};

const phone = (p: string) => p.replace(/^(\d)(\d{3})(\d{3})(\d{2})(\d{2})$/, "+$1 $2 $3 $4 $5");

/** Текст уведомления продавцу о новом заказе (HTML для Telegram) и кнопки под ним. */
export function buildOrderNotification(order: OrderForMessage, shopName: string, siteUrl: string) {
  const lines = order.items.map((i) => `• ${escapeHtml(i.title)} × ${i.qty} — ${formatPrice(i.price * i.qty)}`);
  const parts = [
    `<b>Новый заказ №${order.number}</b> · ${escapeHtml(shopName)}`,
    "",
    ...lines,
    "",
    `<b>Итого: ${formatPrice(order.total)}</b>`,
    `Клиент: ${escapeHtml(order.customer_name)}, ${phone(order.customer_phone)}`,
    order.address === "Самовывоз" ? "Самовывоз" : order.address ? `Доставка: ${escapeHtml(order.address)}` : "",
    order.needed_date ? `Когда нужно: ${formatNeeded(order.needed_date, order.needed_time)}` : "",
    order.comment ? `Комментарий: ${escapeHtml(order.comment)}` : "",
  ].filter((l, i, all) => l !== "" || (i > 0 && all[i - 1] !== ""));

  const buttons: InlineButton[] = [
    { text: "Открыть заказы", url: `${siteUrl}/dashboard/orders` },
    {
      text: "Написать клиенту в WhatsApp",
      url: whatsappUrl(order.customer_phone, `Здравствуйте, ${order.customer_name}! Ваш заказ №${order.number} на ${formatPrice(order.total)} из магазина «${shopName}»`),
    },
  ];
  return { text: parts.join("\n"), buttons };
}
