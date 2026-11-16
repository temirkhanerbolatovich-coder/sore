import ExcelJS from "exceljs";
import { TEMPLATE_EXAMPLES, TEMPLATE_HEADER, toCsv } from "@/lib/catalog-file";

/** Шаблон прайса: ?format=xlsx (по умолчанию) или ?format=csv. Статичен, входа не требует. */
export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const headers = { "Cache-Control": "public, max-age=86400" };

  if (format === "csv") {
    return new Response(toCsv([TEMPLATE_HEADER, ...TEMPLATE_EXAMPLES]), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=\"sore-price-template.csv\"" },
    });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Прайс");
  sheet.addRow(TEMPLATE_HEADER).font = { bold: true };
  TEMPLATE_EXAMPLES.forEach((row) => sheet.addRow(row));
  [28, 10, 14, 16, 34, 34, 12].forEach((width, i) => (sheet.getColumn(i + 1).width = width));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const body = Buffer.from(await workbook.xlsx.writeBuffer());
  return new Response(new Uint8Array(body), {
    headers: {
      ...headers,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=\"sore-price-template.xlsx\"",
    },
  });
}
