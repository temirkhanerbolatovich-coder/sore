/**
 * Улучшение фото товара через Gemini (редактирование изображения). Модель задаётся GEMINI_IMAGE_MODEL:
 * имена image-моделей меняются часто, поэтому без явной настройки функция выключена, а не угадывает имя.
 */

export type EnhanceInput = { base64: string; mime: string };
export type EnhanceResult = { base64: string; mime: string };

const TIMEOUT_MS = 45_000;

export const ENHANCE_PROMPT =
  "Улучши это фото товара для интернет-магазина. Сделай яркость и баланс белого естественными, " +
  "замени фон на чистый светлый нейтральный, аккуратно кадрируй так, чтобы товар был по центру и хорошо виден. " +
  "Не меняй сам товар: форму, цвет, надписи, количество и детали должны остаться как на исходном фото. " +
  "Ничего не добавляй и не дорисовывай. Верни только изображение.";

export const enhanceModel = () => process.env.GEMINI_IMAGE_MODEL?.trim() || "";

export const enhanceConfigured = () => Boolean(process.env.GEMINI_API_KEY && enhanceModel());

/** Достаёт первую картинку из ответа Gemini. */
export function extractImage(json: unknown): EnhanceResult | null {
  const parts = (json as { candidates?: { content?: { parts?: Record<string, unknown>[] } }[] })?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const data = (part.inlineData ?? part.inline_data) as { data?: string; mimeType?: string; mime_type?: string } | undefined;
    const mime = data?.mimeType ?? data?.mime_type;
    if (data?.data && mime?.startsWith("image/")) return { base64: data.data, mime };
  }
  return null;
}

export async function enhancePhoto(img: EnhanceInput): Promise<EnhanceResult> {
  const key = process.env.GEMINI_API_KEY;
  const model = enhanceModel();
  if (!key || !model) throw new Error("not configured");

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: img.mime, data: img.base64 } }, { text: ENHANCE_PROMPT }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const image = extractImage(await res.json());
  if (!image) throw new Error("в ответе нет изображения");
  return image;
}
