import { NextResponse } from "next/server";
import { reportError } from "@/lib/monitoring";

/** Сюда страницы ошибок присылают сбои, случившиеся в браузере пользователя. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { message?: unknown; digest?: unknown; path?: unknown } | null;
  if (!body || typeof body.message !== "string") return NextResponse.json({ ok: false }, { status: 400 });
  const context = [typeof body.path === "string" ? body.path.slice(0, 120) : "", typeof body.digest === "string" ? `digest ${body.digest.slice(0, 40)}` : ""]
    .filter(Boolean)
    .join(" · ");
  await reportError("client", body.message.slice(0, 300), context);
  return NextResponse.json({ ok: true });
}
