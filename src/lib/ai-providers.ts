import Anthropic from "@anthropic-ai/sdk";
import { AI_SYSTEM_PROMPT, kzUsable, parseCard, type AiCard } from "@/lib/ai-card";

/**
 * Цепочка ИИ-провайдеров для карточки товара по фото. Порядок задаёт AI_PROVIDERS
 * (по умолчанию: gemini → openrouter → anthropic). Провайдер без ключа пропускается,
 * при ошибке, лимите (429) или нечитаемом ответе берётся следующий.
 *
 * Бесплатные варианты (проверено 16.11.2026):
 * - Google Gemini API: ключ из AI Studio. Живая проверка 16.11.2026: gemini-3.1-flash-lite (~2 с), gemini-3.5-flash-lite (~8 с),
 *   gemini-3.6-flash (~10 с) отвечают; gemini-2.5-* дают 404, алиасы *-latest нестабильны (таймаут/503).
 *   Внимание: на бесплатном тарифе Google может использовать запросы для улучшения своих продуктов.
 * - OpenRouter: модели с суффиксом :free. Проверка 16.11.2026: nemotron-3.5-super-vl отвечает (~10 с, reasoning-модель,
 *   нужен max_tokens 4096), gemma-4-* временами дают 429 «rate-limited upstream», ling-3.2-flash слишком медленный (~60 с).
 */

export type ImageInput = { base64: string; mime: string };
export type AiResult = { card: AiCard; provider: string; kzDropped: boolean };

const STEP_TIMEOUT_MS = 25_000;
/** Общий бюджет цепочки: маршрут живёт не дольше 60 с, поэтому после 50 с новые модели не запускаем. */
const TOTAL_BUDGET_MS = 50_000;
const PROMPT = "Составь карточку товара по этому фото.";

type Step = { label: string; run: (img: ImageInput, timeoutMs: number) => Promise<string> };

const list = (value: string | undefined, fallback: string) =>
  (value || fallback).split(",").map((s) => s.trim()).filter(Boolean);

async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function geminiSteps(): Step[] {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return [];
  return list(process.env.GEMINI_MODELS, "gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-3.6-flash").map((model) => ({
    label: `gemini:${model}`,
    run: async (img, timeoutMs) => {
      const json = (await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { "x-goog-api-key": key },
        {
          systemInstruction: { parts: [{ text: AI_SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ inline_data: { mime_type: img.mime, data: img.base64 } }, { text: PROMPT }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.4, maxOutputTokens: 4096 },
        },
        timeoutMs,
      )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    },
  }));
}

function openRouterSteps(): Step[] {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return [];
  const models = list(process.env.OPENROUTER_MODELS, "nvidia/nemotron-3.5-super-vl:free,google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free,openrouter/free");
  return models.map((model) => ({
    label: `openrouter:${model}`,
    run: async (img, timeoutMs) => {
      const json = (await postJson(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
          "X-Title": "DukenAI",
        },
        {
          model,
          // Reasoning-модели тратят токены на «размышления»: при малом лимите content приходит пустым.
          max_tokens: 4096,
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
        timeoutMs,
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
      run: async (img, timeoutMs) => {
        const client = new Anthropic({ apiKey: key, timeout: timeoutMs, maxRetries: 0 });
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
  const started = Date.now();
  const failures: string[] = [];
  for (const step of aiSteps()) {
    const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
    if (remaining < 4_000) {
      failures.push(`${step.label}: не хватило времени`);
      break;
    }
    try {
      const card = parseCard(await step.run(img, Math.min(STEP_TIMEOUT_MS, remaining)));
      if (card && card.title) {
        // Слабая модель могла ответить «казахским» латиницей: лучше пустое поле, чем мусор.
        const kzDropped = !kzUsable(card.description_kz);
        return { card: kzDropped ? { ...card, description_kz: "" } : card, provider: step.label, kzDropped };
      }
      failures.push(`${step.label}: нечитаемый ответ`);
    } catch (e) {
      failures.push(`${step.label}: ${e instanceof Error ? e.message : "ошибка"}`);
    }
  }
  throw new Error(failures.join("; ") || "no provider");
}
