/**
 * Демо-магазины SÖRE: шесть вымышленных магазинов малого бизнеса Казахстана с карточками и иллюстрациями.
 * Данные: scripts/demo-shops/data.ts, картинки: scripts/demo-shops/art.ts (рисуются здесь же, файлы не нужны).
 *
 *   npm run seed:demo -- --preview папка      только нарисовать картинки в папку, база не нужна
 *   npm run seed:demo                         заполнить локальную базу
 *   npm run seed:demo -- --allow-remote       заполнить облачную базу (нужен DEMO_WHATSAPP)
 *   npm run seed:demo -- --remove [--allow-remote]   удалить демо-магазины, их владельцев и фото
 *
 * Окружение: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (как у приложения),
 *   DEMO_WHATSAPP  номер, куда уйдут тестовые заказы из демо-витрин (ваш собственный). Для облака обязателен,
 *                  чтобы заказы случайных посетителей не попали постороннему человеку.
 * Скрипт можно запускать повторно: товары и фото демо-магазинов пересоздаются.
 * Адреса начинаются с «demo-»: такие магазины не попадают в sitemap и закрыты от индексации (src/lib/slug.ts).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import { artSvg } from "./demo-shops/art";
import { DEMO_SHOPS, type DemoProduct, type DemoShop } from "./demo-shops/data";

loadEnvConfig(process.cwd());

const BUCKET = "product-photos";
// Те же размеры, что у фото из кабинета (src/lib/photos.ts): основное до 1200 px и миниатюра _s.jpg 480 px.
const THUMB_WIDTH = 480;
const THUMB_QUALITY = 78;

const ownerEmail = (slug: string) => `${slug}@demo.sore.invalid`;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function renderProduct(shop: DemoShop, product: DemoProduct): Promise<{ full: Buffer; thumb: Buffer }> {
  const svg = Buffer.from(artSvg(product.art, { bg: shop.bg, accent: product.accent }));
  const full = await sharp(svg).resize(1200, 1200).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  const thumb = await sharp(full).resize(THUMB_WIDTH).jpeg({ quality: THUMB_QUALITY, mozjpeg: true }).toBuffer();
  return { full, thumb };
}

async function preview(dir: string) {
  for (const shop of DEMO_SHOPS) {
    const out = path.join(dir, shop.slug);
    await mkdir(out, { recursive: true });
    for (const [i, product] of shop.products.entries()) {
      const { full } = await renderProduct(shop, product);
      await writeFile(path.join(out, `${i + 1}-${product.art}.jpg`), full);
    }
    console.log(`✔ ${shop.name}: ${shop.products.length} картинок → ${out}`);
  }
}

async function findOwner(admin: SupabaseClient, email: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((u) => u.email === email);
    if (user || data.users.length < 1000) return user ?? null;
  }
}

async function removeOwnerFiles(admin: SupabaseClient, ownerId: string) {
  const { data: files } = await admin.storage.from(BUCKET).list(ownerId, { limit: 1000 });
  if (files?.length) await admin.storage.from(BUCKET).remove(files.map((f) => `${ownerId}/${f.name}`));
}

async function seedShop(admin: SupabaseClient, shop: DemoShop, whatsapp: string) {
  const email = ownerEmail(shop.slug);
  let owner = await findOwner(admin, email);
  if (!owner) {
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { demo: true } });
    if (error || !data.user) throw error ?? new Error(`не удалось создать владельца ${email}`);
    owner = data.user;
  }

  const fields = { name: shop.name, slug: shop.slug, whatsapp, city: shop.city, about: shop.about, address: shop.address, hours: shop.hours, lead_days: shop.lead_days };
  const { data: existing } = await admin.from("shops").select("id").eq("owner_id", owner.id).maybeSingle();
  let shopId = existing?.id as string | undefined;
  if (shopId) {
    const { error } = await admin.from("products").delete().eq("shop_id", shopId);
    if (error) throw error;
    await removeOwnerFiles(admin, owner.id);
    const { error: updateError } = await admin.from("shops").update(fields).eq("id", shopId);
    if (updateError) throw updateError;
  } else {
    const { data, error } = await admin.from("shops").insert({ owner_id: owner.id, ...fields }).select("id").single();
    if (error) throw new Error(`${shop.slug}: ${error.message}`);
    shopId = data.id as string;
  }

  const bucket = admin.storage.from(BUCKET);
  const rows = [];
  for (const [sort, product] of shop.products.entries()) {
    const { full, thumb } = await renderProduct(shop, product);
    const filePath = `${owner.id}/${randomUUID()}.jpg`;
    const options = { contentType: "image/jpeg", cacheControl: "31536000" };
    const upload = await bucket.upload(filePath, full, options);
    if (upload.error) throw upload.error;
    const small = await bucket.upload(filePath.replace(/\.jpg$/, "_s.jpg"), thumb, options);
    if (small.error) throw small.error;
    rows.push({
      shop_id: shopId,
      title: product.title,
      category: product.category,
      price: product.price,
      price_mode: product.price_mode,
      description_ru: product.description_ru,
      description_kz: product.description_kz,
      photo_url: bucket.getPublicUrl(filePath).data.publicUrl,
      in_stock: true,
      sort,
    });
  }
  const { error } = await admin.from("products").insert(rows);
  if (error) throw new Error(`${shop.slug}: ${error.message}`);
  console.log(`✔ ${shop.name} (/${shop.slug}): ${rows.length} товаров`);
}

async function removeShop(admin: SupabaseClient, shop: DemoShop) {
  const owner = await findOwner(admin, ownerEmail(shop.slug));
  if (!owner) return console.log(`– ${shop.slug}: нет`);
  await removeOwnerFiles(admin, owner.id);
  // Магазин, товары и заказы удаляются каскадом вместе с владельцем.
  const { error } = await admin.auth.admin.deleteUser(owner.id);
  if (error) throw error;
  console.log(`✖ ${shop.slug}: удалён`);
}

async function main() {
  const previewDir = arg("--preview");
  if (previewDir) return preview(previewDir);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY.");
  const local = /^http:\/\/(localhost|127\.0\.0\.1):/.test(url);
  if (!local && !process.argv.includes("--allow-remote")) {
    throw new Error("База не локальная. Для облака добавьте --allow-remote осознанно.");
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  if (process.argv.includes("--remove")) {
    for (const shop of DEMO_SHOPS) await removeShop(admin, shop);
    return;
  }

  const whatsapp = (process.env.DEMO_WHATSAPP ?? "").replace(/\D/g, "");
  if (!local && !/^[0-9]{10,15}$/.test(whatsapp)) {
    throw new Error("Задайте DEMO_WHATSAPP: ваш номер для тестовых заказов из демо-витрин (например 77011234567).");
  }
  for (const shop of DEMO_SHOPS) await seedShop(admin, shop, whatsapp || "77010000000");
  console.log(`\nГотово: ${DEMO_SHOPS.length} демо-магазинов. Витрины обновятся в течение 4 минут (кэш).`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
