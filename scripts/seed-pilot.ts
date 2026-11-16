/**
 * Пилотный магазин «Повар на выезд · Астана».
 *
 *   npm run seed:pilot -- --photos путь/к/папке/с/фото
 *
 * Папка: файлы 1.webp … 14.webp (номера из CODEX/чата). Скрипт обрезает скриншоты Instagram до самого фото,
 * сжимает до JPEG 1200 px, загружает в Storage, просит ИИ составить карточки и создаёт магазин.
 * Цены на выпечку неизвестны, поэтому у неё «по запросу»; у услуг цены «от» из описания повара.
 *
 * Фото и телефон повара в репозиторий НЕ попадают: фото читаются из папки, номер задаётся окружением.
 *   PILOT_WHATSAPP  номер WhatsApp магазина (по умолчанию заглушка, чтобы тестовые заказы не уходили реальному человеку)
 *   PILOT_EMAIL     email владельца (по умолчанию povar@duken.ai)
 *   PILOT_SLUG      адрес (по умолчанию povar-astana)
 * Без --allow-remote работает только с локальной базой.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type Source = { file: string; cropWidth?: number; hint: string };

// Номера файлов из присланной подборки; cropWidth отрезает интерфейс Instagram справа от фото.
const PHOTOS: Source[] = [
  { file: "1.webp", hint: "шоколадный торт" },
  { file: "12.webp", cropWidth: 855, hint: "торт с ореховой крошкой" },
  { file: "14.webp", hint: "красный бархат" },
  { file: "4.webp", cropWidth: 853, hint: "торт с клубникой и киви" },
  { file: "13.webp", cropWidth: 862, hint: "творожный пирог" },
  { file: "7.webp", cropWidth: 893, hint: "пирог с брокколи" },
  { file: "8.webp", cropWidth: 873, hint: "зелёный рулет" },
  { file: "11.webp", hint: "самса" },
  { file: "3.webp", hint: "хлеб с семечками" },
  { file: "5.webp", cropWidth: 858, hint: "кексы" },
  { file: "10.webp", cropWidth: 840, hint: "овсяное печенье" },
  { file: "6.webp", cropWidth: 853, hint: "шарики в кунжуте и какао" },
];

const SERVICES = [
  {
    title: "Повар на выезд",
    description_ru: "Готовлю у вас дома или на мероприятии: горячие блюда, закуски, выпечка. Стоимость зависит от меню и числа гостей.",
    description_kz: "Үйіңізде немесе іс-шарада дайындаймын: ыстық тағамдар, тіскебасарлар, нан-тоқаштар. Бағасы мәзірге және қонақтар санына байланысты.",
    price: 15_000,
    price_mode: "from",
  },
  {
    title: "Банкет и праздничный стол",
    description_ru: "Полное меню на праздник: закуски, горячее, десерты. Объём и состав обсуждаем заранее.",
    description_kz: "Мерекеге арналған толық мәзір: тіскебасарлар, ыстық тағам, тәттілер. Көлемі мен құрамын алдын ала келісеміз.",
    price: 50_000,
    price_mode: "from",
  },
  {
    title: "Торты на заказ",
    description_ru: "Торты от 1 кг: меренговый рулет, Сан-Себастьян, чизкейк, Наполеон, медовый, «Молочная девочка». Состав и оформление обсуждаем в WhatsApp.",
    description_kz: "Торттар 1 кг-нан: меренга рулеті, Сан-Себастьян, чизкейк, Наполеон, бал торты, «Молочная девочка». Құрамы мен безендірілуін WhatsApp-та келісеміз.",
    price: 0,
    price_mode: "request",
  },
] as const;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const dir = arg("--photos");
  if (!dir) throw new Error("Укажите папку с фото: --photos путь");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!process.argv.includes("--allow-remote") && !/^http:\/\/(localhost|127\.0\.0\.1):/.test(url)) {
    throw new Error("Скрипт пилота работает только с локальной базой; для облака добавьте --allow-remote осознанно.");
  }
  const email = process.env.PILOT_EMAIL ?? "povar@duken.ai";
  const slug = process.env.PILOT_SLUG ?? "povar-astana";
  const whatsapp = (process.env.PILOT_WHATSAPP ?? "77010000000").replace(/\D/g, "");

  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { generateCard, aiConfigured } = await import("@/lib/ai-providers");

  // 1. Владелец
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  let owner = list.users.find((u) => u.email === email);
  if (!owner) {
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error || !data.user) throw error ?? new Error("не удалось создать пользователя");
    owner = data.user;
  }

  // 2. Магазин (пересоздаём товары и файлы, чтобы скрипт можно было запускать повторно)
  const { data: existing } = await admin.from("shops").select("id").eq("owner_id", owner.id).maybeSingle();
  let shopId = existing?.id as string | undefined;
  if (shopId) {
    await admin.from("products").delete().eq("shop_id", shopId);
    const { data: files } = await admin.storage.from("product-photos").list(owner.id);
    if (files?.length) await admin.storage.from("product-photos").remove(files.map((f) => `${owner!.id}/${f.name}`));
    await admin.from("shops").update({ name: "Повар на выезд · Астана", slug, whatsapp, city: "Астана" }).eq("id", shopId);
  } else {
    const { data, error } = await admin
      .from("shops")
      .insert({ owner_id: owner.id, name: "Повар на выезд · Астана", slug, whatsapp, city: "Астана" })
      .select("id")
      .single();
    if (error) throw error;
    shopId = data.id;
  }

  // 3. Услуги (без фото) идут первыми
  let sort = 0;
  const rows: Record<string, unknown>[] = SERVICES.map((s) => ({ shop_id: shopId, ...s, category: "Услуги", in_stock: true, sort: sort++ }));
  // Категории выпечки копятся отдельно от услуг, чтобы ИИ не «подгонял» торты под «Услуги».
  const categories = new Set<string>();

  // 4. Выпечка: фото → ИИ-карточка
  for (const src of PHOTOS) {
    const input = await readFile(path.join(dir, src.file));
    let img = sharp(input).rotate();
    if (src.cropWidth) {
      const meta = await sharp(input).metadata();
      img = img.extract({ left: 0, top: 0, width: Math.min(src.cropWidth, meta.width ?? src.cropWidth), height: meta.height ?? 800 });
    }
    const jpeg = await img.resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();

    const filePath = `${owner.id}/${randomUUID()}.jpg`;
    const up = await admin.storage.from("product-photos").upload(filePath, jpeg, { contentType: "image/jpeg" });
    if (up.error) throw up.error;
    const photo_url = admin.storage.from("product-photos").getPublicUrl(filePath).data.publicUrl;

    let card = { title: src.hint[0].toUpperCase() + src.hint.slice(1), description_ru: "", description_kz: "", category: "Выпечка" };
    if (aiConfigured()) {
      try {
        const r = await generateCard({ base64: jpeg.toString("base64"), mime: "image/jpeg", categories: [...categories] });
        card = { ...card, ...r.card };
      } catch (e) {
        console.warn(`ИИ не ответил для ${src.file}: ${e instanceof Error ? e.message : e}`);
      }
    }
    categories.add(card.category);
    rows.push({
      shop_id: shopId,
      title: card.title,
      description_ru: card.description_ru || null,
      description_kz: card.description_kz || null,
      category: card.category,
      price: 0,
      price_mode: "request",
      photo_url,
      in_stock: true,
      sort: sort++,
    });
    console.log(`✔ ${src.file} → ${card.title} [${card.category}]`);
  }

  const { error } = await admin.from("products").insert(rows);
  if (error) throw error;
  console.log(`\nГотово: ${rows.length} позиций. Магазин: /${slug}. Вход владельца: ${email} (письмо в локальной почте http://127.0.0.1:54324).`);
  console.log(`WhatsApp магазина: ${whatsapp === "77010000000" ? "заглушка 77010000000 (задайте PILOT_WHATSAPP)" : "задан через PILOT_WHATSAPP"}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
