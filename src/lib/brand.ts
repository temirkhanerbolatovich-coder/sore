// Логотип SÖRE, направление 05 «Связь»: два контура соединяют продавца и покупателя.
// Векторный источник для файлов в public/brand (npm run brand:export) и для картинки бота.

export type BrandTheme = "light" | "dark";

const COLORS = {
  light: { back: "#1F8A63", front: "#12332A", text: "#12332A", bg: "#F6F7F3" },
  dark: { back: "#7DD3B0", front: "#F4F5F2", text: "#F4F5F2", bg: "#111417" },
} as const;

/** Границы знака в его сетке (с толщиной контура). */
const VB = { x: 4, y: 6, w: 56, h: 52 };

/**
 * Знак в сетке 64×64: нижний левый контур сзади, верхний правый спереди, а во втором пересечении
 * нижний снова сверху, поэтому звенья сцеплены, а не просто наложены.
 */
function markShapes(theme: BrandTheme, id: string): string {
  const c = COLORS[theme];
  const back = `<rect x="8" y="26" width="28" height="28" rx="7" fill="none" stroke="${c.back}" stroke-width="8"/>`;
  const front = `<rect x="28" y="10" width="28" height="28" rx="7" fill="none" stroke="${c.front}" stroke-width="8"/>`;
  return [
    // Второе пересечение: правая сторона нижнего звена (x 32–40) целиком поверх верхнего звена на высоте y 30–44.
    `<defs><clipPath id="${id}"><rect x="32" y="30" width="9" height="14"/></clipPath></defs>`,
    back,
    front,
    `<g clip-path="url(#${id})">${back}</g>`,
  ].join("");
}

/** Только знак, прозрачный фон. */
export function markSvg(theme: BrandTheme = "light"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" width="${VB.w}" height="${VB.h}">${markShapes(theme, `sore-link-${theme}`)}</svg>`;
}

/** Знак и надпись SÖRE в строку. Надпись — шрифт системы (жирный гротеск), без внешних шрифтов. */
export function logoSvg(theme: BrandTheme = "light"): string {
  const c = COLORS[theme];
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 64" width="300" height="64" role="img" aria-label="SÖRE">`,
    `<g transform="translate(${-VB.x} ${(64 - VB.h) / 2 - VB.y})">${markShapes(theme, `sore-logo-${theme}`)}</g>`,
    `<text x="72" y="50" fill="${c.text}" font-family="Onest, 'Segoe UI', Inter, Helvetica, Arial, sans-serif" font-size="46" font-weight="800" letter-spacing="1">SÖRE</text>`,
    `</svg>`,
  ].join("");
}

/** Аватар бота и картинка приветствия: знак по центру квадрата с фоном темы. */
export function avatarSvg(theme: BrandTheme = "dark", size = 640): string {
  const c = COLORS[theme];
  // Знак занимает ~55% стороны: Telegram обрезает аватар кругом.
  const scale = (size * 0.55) / VB.w;
  const dx = (size - VB.w * scale) / 2 - VB.x * scale;
  const dy = (size - VB.h * scale) / 2 - VB.y * scale;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
    `<rect width="${size}" height="${size}" fill="${c.bg}"/>`,
    `<g transform="translate(${dx} ${dy}) scale(${scale})">${markShapes(theme, `sore-avatar-${theme}`)}</g>`,
    `</svg>`,
  ].join("");
}

let avatarPng: Promise<Buffer> | null = null;

/** PNG аватара для приветствия бота. Рисуется sharp из SVG один раз на процесс. */
export function botAvatarPng(): Promise<Buffer> {
  avatarPng ??= import("sharp").then(({ default: sharp }) => sharp(Buffer.from(avatarSvg("dark", 640))).png().toBuffer());
  return avatarPng;
}
