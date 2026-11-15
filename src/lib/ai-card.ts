import { z } from "zod";

export const AI_SYSTEM_PROMPT = `Ты помогаешь продавцу из Казахстана оформить карточку товара по фото.
Верни ТОЛЬКО JSON без пояснений и без markdown, ровно с такими полями:
{"title": string, "description_ru": string, "description_kz": string, "category": string, "tags": string[]}
Правила:
- title: короткое название на русском, до 60 символов.
- description_ru и description_kz: 2–3 предложения на русском и на казахском. Описывай только то, что видно на фото.
- Не выдумывай факты о составе, весе, размере, сроках и цене.
- category: одно слово или короткая фраза на русском (например, «Торты»).
- tags: 3–5 коротких тегов на русском.
Если на фото нет товара, всё равно верни JSON, а в title напиши «Товар».`;

const cut = (n: number) => z.string().transform((s) => s.trim().slice(0, n));

export const cardSchema = z.object({
  title: cut(120),
  description_ru: cut(1000),
  description_kz: cut(1000),
  category: cut(60),
  tags: z
    .array(z.string())
    .default([])
    .transform((a) => a.map((t) => t.trim()).filter(Boolean).slice(0, 5)),
});

export type AiCard = z.infer<typeof cardSchema>;

/** Достаёт JSON из ответа модели, даже если он обёрнут в ```json ... ```. */
export function parseCard(text: string): AiCard | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = cardSchema.safeParse(JSON.parse(text.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
