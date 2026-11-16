import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CatalogFileError, detectKind, MAX_FILE_BYTES, parseCatalog } from "@/lib/catalog-file";
import { checkRateLimit } from "@/lib/rate-limit";
import { invalidateShopFromRoute } from "@/lib/shop-data";
import { FREE_PRODUCT_LIMIT } from "@/lib/types";

/**
 * Импорт прайса: файл → проверка строк → одна транзакция в БД (функция import_products от имени продавца,
 * RLS и лимит тарифа действуют как обычно). Server Actions ограничены 1 МБ, поэтому Route Handler.
 * Строки с ошибками не останавливают импорт: они возвращаются в отчёте.
 */
export const maxDuration = 60;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

const SKIP_REASON: Record<string, string> = {
  limit: `лимит бесплатного тарифа: ${FREE_PRODUCT_LIMIT} товаров`,
  invalid: "база не приняла значения строки",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "Войдите в аккаунт.");
  const { data: shop } = await supabase.from("shops").select("id,slug").eq("owner_id", user.id).maybeSingle();
  if (!shop) return fail(404, "Сначала создайте магазин.");

  // Заранее отсекаем заведомо большой запрос, не читая тело.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_FILE_BYTES + 256 * 1024) return fail(413, "Файл больше 4 МБ. Разбейте прайс на части.");

  if ((await checkRateLimit(`import:${shop.id}`, 3600, 20)) !== 200) {
    return fail(429, "Слишком много загрузок за час. Попробуйте позже.");
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return fail(400, "Выберите файл .xlsx или .csv.");
  if (file.size > MAX_FILE_BYTES) return fail(413, "Файл больше 4 МБ. Разбейте прайс на части.");
  const kind = detectKind(file.name);
  if (kind === "xls") return fail(400, "Формат .xls не поддерживается. Сохраните файл в Excel как .xlsx.");
  if (!kind) return fail(400, "Нужен файл .xlsx или .csv.");

  let parsed: Awaited<ReturnType<typeof parseCatalog>>;
  try {
    parsed = await parseCatalog(Buffer.from(await file.arrayBuffer()), kind);
  } catch (error) {
    if (error instanceof CatalogFileError) return fail(400, error.userMessage);
    console.error("import parse failed:", error instanceof Error ? error.message : error);
    return fail(400, "Не удалось прочитать файл. Пересохраните его в Excel и загрузите ещё раз.");
  }

  let created = 0;
  let updated = 0;
  let skipped: { row: number; reason: string }[] = [];
  if (parsed.rows.length > 0) {
    const { data, error } = await supabase.rpc("import_products", { p_shop: shop.id, p_rows: parsed.rows });
    if (error) {
      if (error.message.includes("import in progress")) return fail(409, "Предыдущий файл ещё загружается. Подождите минуту и повторите.");
      if (error.message.includes("not owner")) return fail(403, "Нет доступа к магазину.");
      console.error("import_products failed:", error.message);
      return fail(500, "Не удалось сохранить товары. Попробуйте ещё раз.");
    }
    const result = data as { created: number; updated: number; skipped: { row: number; reason: string }[] };
    created = result.created;
    updated = result.updated;
    skipped = result.skipped;
    invalidateShopFromRoute(shop.slug);
  }

  const report = [...parsed.errors, ...skipped.map((s) => ({ row: s.row, message: SKIP_REASON[s.reason] ?? SKIP_REASON.invalid }))].sort((a, b) => a.row - b.row);
  return NextResponse.json({ created, updated, skipped: report.length, total: parsed.total, report });
}
