const RU: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  ә: "a", ғ: "g", қ: "k", ң: "n", ө: "o", ұ: "u", ү: "u", һ: "h", і: "i",
};

export const RESERVED_SLUGS = new Set([
  "login", "dashboard", "auth", "api", "demo", "admin", "app", "www", "static", "about", "terms",
]);

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,29}$/;

/** «Сладкий дом Алии» → «sladkiy-dom-alii» */
export function slugify(input: string): string {
  const latin = input
    .toLowerCase()
    .split("")
    .map((ch) => (ch in RU ? RU[ch] : ch))
    .join("");
  return latin
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
}

export function slugError(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return "Адрес: 3–30 символов, латиница, цифры и дефис";
  if (RESERVED_SLUGS.has(slug)) return "Этот адрес зарезервирован, выберите другой";
  return null;
}
