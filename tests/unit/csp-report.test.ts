import { afterEach, expect, test, vi } from "vitest";
import { POST } from "@/app/api/csp-report/route";
import { reportError } from "@/lib/monitoring";

vi.mock("@/lib/monitoring", () => ({ reportError: vi.fn(async () => true) }));
const reportErrorMock = vi.mocked(reportError);

afterEach(() => {
  reportErrorMock.mockClear();
  vi.useRealTimers();
});

function request(blocked: string, sourceFile = "") {
  return new Request("http://localhost/api/csp-report", {
    method: "POST",
    body: JSON.stringify({ "csp-report": {
      "effective-directive": "connect-src",
      "blocked-uri": blocked,
      "source-file": sourceFile,
      "document-uri": "http://localhost/o/test-code?private=test-value",
    } }),
  });
}

test("расширения браузера отбрасываются", async () => {
  for (const scheme of ["chrome-extension", "moz-extension", "safari-extension"]) {
    expect((await POST(request(`${scheme}://extension-id`))).status).toBe(204);
  }
  expect((await POST(request("inline", "chrome-extension://extension-id/script.js"))).status).toBe(204);
  expect(reportErrorMock).not.toHaveBeenCalled();
});

test("нарушение без приватных частей URL пересылается раз в минуту", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const now = Date.now();
  const blocked = "https://unknown.example/private-path?private=test-value";
  expect((await POST(request(blocked))).status).toBe(204);
  expect((await POST(request(blocked))).status).toBe(204);
  expect(reportErrorMock).toHaveBeenCalledExactlyOnceWith("client", "CSP connect-src: https://unknown.example", "http://localhost");
  vi.setSystemTime(now + 60_000);
  expect((await POST(request(blocked))).status).toBe(204);
  expect(reportErrorMock).toHaveBeenCalledTimes(2);
});

test("отчёт больше 4 КБ отклоняется даже без content-length", async () => {
  expect((await POST(request("https://large.example/" + "а".repeat(2048)))).status).toBe(413);
  expect(reportErrorMock).not.toHaveBeenCalled();
});

test("невалидный JSON отклоняется", async () => {
  const invalid = new Request("http://localhost/api/csp-report", { method: "POST", body: "{[(" });
  expect((await POST(invalid)).status).toBe(400);
  expect(reportErrorMock).not.toHaveBeenCalled();
});
