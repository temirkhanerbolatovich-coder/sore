import { describe, expect, it } from "vitest";
import { extractImage } from "@/lib/ai-enhance";

describe("extractImage", () => {
  it("достаёт картинку из ответа Gemini (camelCase и snake_case)", () => {
    const camel = { candidates: [{ content: { parts: [{ text: "ok" }, { inlineData: { mimeType: "image/png", data: "AAA" } }] } }] };
    const snake = { candidates: [{ content: { parts: [{ inline_data: { mime_type: "image/jpeg", data: "BBB" } }] } }] };
    expect(extractImage(camel)).toEqual({ base64: "AAA", mime: "image/png" });
    expect(extractImage(snake)).toEqual({ base64: "BBB", mime: "image/jpeg" });
  });

  it("возвращает null, если картинки нет", () => {
    expect(extractImage({ candidates: [{ content: { parts: [{ text: "отказ" }] } }] })).toBeNull();
    expect(extractImage(null)).toBeNull();
  });
});
