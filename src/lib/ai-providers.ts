import Anthropic from "@anthropic-ai/sdk";
import { AI_SYSTEM_PROMPT, parseCard, type AiCard } from "@/lib/ai-card";

/**
 * Цепочка ИИ-провайдеров для карточки товара по фото. Порядок задаёт AI_PROVIDERS
 * (по умолчанию: gemini → openrouter → anthropic). Провайдер без ключа пропускается,
 * при ошибке, лимите (429) или нечитаемом ответе берётся следующий.
 *
 * Бесплатные варианты (проверено 16.11.2026):
 * - Google Gemini API: ключ из AI Studio, модели gemini-2.5-flash / gemini-3.5-flash-lite бесплатны.
 *   Внимание: на бесплатном тарифе Google может использовать запросы для улучшения своих продуктов.
 * - OpenRouter: модели с суффиксом :free (gemma-4, nemotron-3.5-super-vl и др.), лимиты дневные и по минутам.
 */

export type ImageInput = { base64: string; mime: string };
export type AiResult = { card: AiCard; provider: string };

const TIMEOUT_MS = 30_000;
const PROMPT = "Составь карточку товара по этому фото.";

type Step = { label: string; run: (img: ImageInput) => Promise<string> };

const list = (value: string | undefined, fallback: string) =>
  (value || fallback).split(",").map((s) => s.trim()).filter(Boolean);

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function geminiSteps(): Step[] {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return [];
  return list(process.env.GEMINI_MODELS, "gemini-2.5-flash,gemini-3.5-flash-lite").map((model) => ({
    label: `gemini:${model}`,
    run: async (img) => {
      const json = (await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { "x-goog-api-key": key },
        {
          systemInstruction: { parts: [{ text: AI_SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ inline_data: { mime_type: img.mime, data: img.base64 } }, { text: PROMPT }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.4, maxOutputTokens: 1024 },
        },
      )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    },
  }));
}

function openRouterSteps(): Step[] {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return [];
  const models = list(process.env.OPENROUTER_MODELS, "google/gemma-4-31b-it:free,nvidia/nemotron-3.5-super-vl:free,openrouter/free");
  return models.map((model) => ({
    label: `openrouter:${model}`,
    run: async (img) => {
      const json = (await postJson(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
          "X-Title": "DukenAI",
        },
        {
          model,
          max_tokens: 1024,
          temperature: 0.4,
          messages: [
            { role: "system", content: AI_SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: PROMPT },
                { type: "image_url", image_url: { url: `data:${img.mime};base64,${img.base64}` } },
              ],
            },
          ],
        },
      )) as { choices?: { message?: { content?: string | { text?: string }[] } }[] };
      const content = json.choices?.[0]?.message?.content;
      return Array.isArray(content) ? content.map((c) => c.text ?? "").join("") : (content ?? "");
    },
  }));
}

function anthropicSteps(): Step[] {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return [];
  return [
    {
      label: "anthropic",
      run: async (img) => {
        const client = new Anthropic({ apiKey: key, timeout: 45_000, maxRetries: 1 });
        const message = await client.messages.create({
          model: process.env.AI_MODEL ?? "claude-sonnet-5-5",
          max_tokens: 1024,
          system: AI_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: img.mime as "image/jpeg" | "image/png" | "image/webp", data: img.base64 } },
                { type: "text", text: PROMPT },
              ],
            },
          ],
        });
        return message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      },
    },
  ];
}

const BUILDERS: Record<string, () => Step[]> = { gemini: geminiSteps, openrouter: openRouterSteps, anthropic: anthropicSteps };

/** Шаги цепочки в порядке приоритета; пусто, если не задан ни один ключ. */
export function aiSteps(): Step[] {
  return list(process.env.AI_PROVIDERS, "gemini,openrouter,anthropic").flatMap((id) => BUILDERS[id]?.() ?? []);
}

export const aiConfigured = () => aiSteps().length > 0;

/** Пробует провайдеров по очереди; бросает ошибку, только если не вышло ни у одного. */
export async function generateCard(img: ImageInput): Promise<AiResult> {
  const failures: string[] = [];
  for (const step of aiSteps()) {
    try {
      const card = parseCard(await step.run(img));
      if (card && card.title) return { card, provider: step.label };
      failures.push(`${step.label}: нечитаемый ответ`);
    } catch (e) {
      failures.push(`${step.label}: ${e instanceof Error ? e.message : "ошибка"}`);
    }
  }
  throw new Error(failures.join("; ") || "no provider");
}
