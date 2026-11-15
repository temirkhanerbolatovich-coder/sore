import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DukenAI",
    short_name: "DukenAI",
    description: "Магазин-ссылка за 2 минуты: фото, ИИ-карточка, заказ в WhatsApp.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fff8f0",
    theme_color: "#fff8f0",
    lang: "ru",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png" }],
  };
}
