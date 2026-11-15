import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), download: vi.fn(), rpc: vi.fn(), remove: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create: mocks.create }; } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) },
  storage: { from: () => ({ download: mocks.download }) },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "shop" } }), gte: async () => ({ count: 0 }) }) }) }),
}) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc, from: () => ({ delete: () => ({ eq: mocks.remove }) }) }) }));
import { POST } from "@/app/api/ai/product-card/route";
const url = "https://test.supabase.co/storage/v1/object/public/product-photos/owner/a.jpg";
const request = (photo_url: unknown = url) => new Request("http://localhost/api/ai/product-card", { method: "POST", body: JSON.stringify({ photo_url }) });
beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  mocks.rpc.mockResolvedValue({ data: "reservation", error: null }); mocks.download.mockResolvedValue({ data: new Blob(["test"], { type: "image/jpeg" }) });
  mocks.create.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify({ title: "Товар", description_ru: "Описание", description_kz: "Сипаттама", category: "Торты" }) }] });
});
it("без ключа возвращает понятный 503", async () => { vi.stubEnv("ANTHROPIC_API_KEY", ""); expect((await POST(request())).status).toBe(503); });
it("вызывает подменённый Anthropic и возвращает карточку", async () => { const response = await POST(request()); expect(response.status).toBe(200); expect((await response.json()).card.title).toBe("Товар"); });
it.each(["https://evil.test/a.jpg", url.replace("owner", "other"), url.replace("a.jpg", "../other/a.jpg"), 123])("отклоняет чужое/некорректное фото %s", async (value) => expect((await POST(request(value))).status).toBe(400));
it("проверяет существование, тип и размер файла", async () => {
  for (const data of [null, new Blob(["x"], { type: "image/svg+xml" }), new Blob([new Uint8Array(6*1024*1024)], { type: "image/jpeg" })]) {
    mocks.download.mockResolvedValue({ data }); expect((await POST(request())).status).toBe(400);
  }
});
it("возвращает ошибку модели и освобождает попытку", async () => { mocks.create.mockRejectedValue(new Error("offline")); expect((await POST(request())).status).toBe(502); expect(mocks.remove).toHaveBeenCalledWith("id", "reservation"); });
