import { z } from "zod";
import { reportError } from "@/lib/monitoring";
import { readReportBody } from "@/lib/report-body";

const reportSchema = z.object({
  "csp-report": z.object({
    "blocked-uri": z.string(),
    "document-uri": z.string().optional(),
    "source-file": z.string().optional(),
    "effective-directive": z.string().optional(),
    "violated-directive": z.string().optional(),
  }),
});

const extensionUrl = /^(?:chrome-extension|moz-extension|safari-extension|safari-web-extension):\/\//i;
const recent = new Map<string, number>();
const DEDUP_WINDOW_MS = 60_000;
const MAX_RECENT = 200;

function sourceLabel(value = "") {
  if (URL.canParse(value)) {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : url.protocol;
  }
  return /^(?:inline|eval|wasm-eval|self)$/.test(value) ? value : "unknown";
}

export async function POST(request: Request) {
  const body = await readReportBody(request);
  if (body.status !== 200) return new Response(null, { status: body.status });

  const parsed = reportSchema.safeParse(body.data);
  if (!parsed.success) return new Response(null, { status: 400 });

  const report = parsed.data["csp-report"];
  if ([report["blocked-uri"], report["source-file"], report["document-uri"]].some((uri) => extensionUrl.test(uri ?? ""))) {
    return new Response(null, { status: 204 });
  }

  const directive = (report["effective-directive"] ?? report["violated-directive"] ?? "").split(" ", 1)[0];
  if (!/^[a-z0-9-]{1,40}$/.test(directive)) return new Response(null, { status: 400 });

  // Full URLs and CSP samples may carry private data. Only forward the directive and origins.
  const message = `CSP ${directive}: ${sourceLabel(report["blocked-uri"])}`;
  const context = sourceLabel(report["document-uri"]);
  const key = `${context}|${message}`;
  const now = Date.now();
  for (const [entry, expires] of recent) {
    if (expires > now) break;
    recent.delete(entry);
  }
  if (!recent.has(key) && recent.size < MAX_RECENT) {
    recent.set(key, now + DEDUP_WINDOW_MS);
    await reportError("client", message, context);
  }
  return new Response(null, { status: 204 });
}
