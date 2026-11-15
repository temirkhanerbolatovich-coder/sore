import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { aiConfigured, aiSteps, generateCard } from "@/lib/ai-providers";

const card = { title: "Торт", description_ru: "Описание", description_kz: "Сипаттама", category: "Торты", tags: ["торт"] };
const img = { base64: "AAAA", mime: "image/jpeg" };
const geminiOk = { candidates: [{ content: { parts: [{ text: JSON.stringify(card) }] } }] };
const routerOk = (text: string) => ({ choices: [{ message: { content: text } }] });
const reply = (status: number, body: unknown = {}) => Promise.resolve(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  vi.stubEnv("AI_PROVIDERS", "");
  vi.stubEnv("GEMINI_API_KEY", "g-key");
  vi.stubEnv("GEMINI_MODELS", "");
  vi.stubEnv("OPENROUTER_API_KEY", "or-key");
  vi.stubEnv("OPENROUTER_MODELS", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("без ключей ИИ не настроен", () => {
  vi.stubEnv("GEMINI_API_KEY", ""); vi.stubEnv("OPENROUTER_API_KEY", "");
  expect(aiConfigured()).toBe(false);
});

it("порядок по умолчанию: Gemini, затем OpenRouter; отдельные ключи включают только свои шаги", () => {
  expect(aiSteps().map((s) => s.label)).toEqual([
    "gemini:gemini-2.5-flash", "gemini:gemini-3.5-flash-lite",
    "openrouter:google/gemma-4-31b-it:free", "openrouter:nvidia/nemotron-3.5-super-vl:free", "openrouter:openrouter/free",
  ]);
  vi.stubEnv("GEMINI_API_KEY", "");
  expect(aiSteps().every((s) => s.label.startsWith("openrouter:"))).toBe(true);
});

it("AI_PROVIDERS меняет порядок", () => {
  vi.stubEnv("AI_PROVIDERS", "openrouter,gemini");
  expect(aiSteps()[0].label.startsWith("openrouter:")).toBe(true);
});

it("Gemini получает фото в inline_data и ключ в заголовке, а не в адресе", async () => {
  const fetchMock = vi.fn().mockImplementation(() => reply(200, geminiOk));
  vi.stubGlobal("fetch", fetchMock);
  const result = await generateCard(img);
  expect(result.provider).toBe("gemini:gemini-2.5-flash");
  expect(result.card.title).toBe("Торт");
  const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).not.toContain("g-key");
  expect(init.headers["x-goog-api-key"]).toBe("g-key");
  expect(JSON.parse(init.body).contents[0].parts[0].inline_data).toEqual({ mime_type: "image/jpeg", data: "AAAA" });
});

it("при лимите 429 у Gemini переходит к следующей модели и к OpenRouter", async () => {
  const fetchMock = vi.fn()
    .mockImplementationOnce(() => reply(429))
    .mockImplementationOnce(() => reply(503))
    .mockImplementationOnce(() => reply(200, routerOk("```json\n" + JSON.stringify(card) + "\n```")));
  vi.stubGlobal("fetch", fetchMock);
  const result = await generateCard(img);
  expect(result.provider).toBe("openrouter:google/gemma-4-31b-it:free");
  expect(fetchMock).toHaveBeenCalledTimes(3);
  const body = JSON.parse(fetchMock.mock.calls[2][1].body);
  expect(body.messages[1].content[1].image_url.url).toBe("data:image/jpeg;base64,AAAA");
});

it("нечитаемый ответ считается неудачей и цепочка идёт дальше", async () => {
  vi.stubEnv("GEMINI_API_KEY", "");
  const fetchMock = vi.fn()
    .mockImplementationOnce(() => reply(200, routerOk("Извините, не могу.")))
    .mockImplementationOnce(() => reply(200, routerOk(JSON.stringify(card))));
  vi.stubGlobal("fetch", fetchMock);
  expect((await generateCard(img)).provider).toBe("openrouter:nvidia/nemotron-3.5-super-vl:free");
});

it("если не ответил никто, бросает ошибку со списком причин", async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => reply(500)));
  await expect(generateCard(img)).rejects.toThrow(/gemini:gemini-2.5-flash: HTTP 500.*openrouter/);
});
