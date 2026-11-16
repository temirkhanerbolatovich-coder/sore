import type { Metadata, Viewport } from "next";
import "@fontsource/onest/400.css";
import "@fontsource/onest/600.css";
import "@fontsource/onest/700.css";
import "@fontsource/onest/800.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import "./motion.css";


export const metadata: Metadata = {
  icons: { apple: "/apple-touch-icon.png" },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Sөre — магазин-ссылка за 2 минуты",
  description:
    "Сфотографируйте товар, ИИ напишет карточку, а заказы придут в WhatsApp уже собранными.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff8f0" },
    { media: "(prefers-color-scheme: dark)", color: "#17110c" },
  ],
  width: "device-width",
  initialScale: 1,
};

/**
 * Тема выставляется до первой отрисовки, чтобы не было вспышки светлой темы у тех, кто выбрал тёмную.
 * Выбор пользователя (кнопка-переключатель) хранится в localStorage, без него действует тема системы.
 */
const THEME_BOOT_SCRIPT = `(function(){try{var s=localStorage.getItem("sore-theme");var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: атрибут data-theme ставит скрипт до React, это ожидаемое расхождение.
    <html lang="ru" className="h-full antialiased" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
