import { test, expect, type Page } from "@playwright/test";
import { adminClient, cleanupUser, loginAs, seedShop, storedFiles } from "./helpers";

const admin = adminClient();
const stamp = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const addToCart = (page: Page, title: string, label = "В корзину") =>
  page.getByRole("listitem").filter({ hasText: title }).getByRole("button", { name: label, exact: true }).click();

test.describe("покупатель", () => {
  test("перед открытием корзины цены и остатки сверяются с магазином", async ({ browser }) => {
    const s = stamp();
    const email = `price-${s}@example.test`;
    const slug = `price-${s}`;
    const { shopId, products } = await seedShop(admin, {
      email,
      slug,
      products: [{ title: "Торт А", price: 5000 }, { title: "Торт Б", price: 3000 }],
    });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const buyer = await ctx.newPage();
    try {
      await buyer.goto(`${test.info().project.use.baseURL}/${slug}`);
      await addToCart(buyer, "Торт А");
      await addToCart(buyer, "Торт Б");

      // Продавец поменял цену А и снял Б с наличия, пока покупатель думал.
      await admin.from("products").update({ price: 6000 }).eq("id", products[0].id).eq("shop_id", shopId);
      await admin.from("products").update({ in_stock: false }).eq("id", products[1].id).eq("shop_id", shopId);

      await buyer.goto(`${test.info().project.use.baseURL}/${slug}/cart`);
      await expect(buyer.getByRole("status")).toContainText("Корзина обновлена");
      await expect(buyer.getByText(/6\s000\s₸/).first()).toBeVisible();
      await expect(buyer.getByText("Торт Б")).toHaveCount(0);
    } finally {
      await ctx.close();
      await cleanupUser(admin, email);
    }
  });

  test("заказ на казахском, имя и телефон запоминаются и стираются", async ({ browser }) => {
    const s = stamp();
    const email = `kz-${s}@example.test`;
    const slug = `kz-${s}`;
    await seedShop(admin, { email, slug, products: [{ title: "Торт KZ", price: 4000 }] });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const buyer = await ctx.newPage();
    const base = test.info().project.use.baseURL;
    try {
      await buyer.goto(`${base}/${slug}?lang=kz`);
      await addToCart(buyer, "Торт KZ", "Себетке");
      await buyer.getByRole("link", { name: /Себет/ }).click();
      await buyer.getByLabel("Аты", { exact: true }).fill("Айгерим");
      await buyer.getByLabel("Телефон", { exact: true }).fill("87015550011");
      await buyer.getByLabel("Мекенжай", { exact: true }).fill("Абай 10");
      // 204 оставляет страницу на месте (abort показал бы страницу ошибки браузера), так видно экран «Тапсырыс қабылданды».
      let whatsapp = "";
      await buyer.route("https://wa.me/**", (route) => { whatsapp = route.request().url(); return route.fulfill({ status: 204 }); });
      await buyer.getByRole("button", { name: "WhatsApp арқылы тапсырыс беру" }).click();
      await expect(buyer.getByRole("heading", { name: "Тапсырыс қабылданды" })).toBeVisible();
      await expect(buyer.getByRole("link", { name: "WhatsApp ашу" })).toBeVisible();
      // Сообщение продавцу всегда на русском, даже если витрина на казахском.
      expect(new URL(whatsapp).searchParams.get("text")).toContain("Здравствуйте! Заказ из DukenAI (№1)");

      expect(JSON.parse((await buyer.evaluate(() => localStorage.getItem("duken-customer"))) || "{}")).toMatchObject({ name: "Айгерим", phone: "77015550011" });

      // Новая покупка: контакты подставляются сами, кнопка «Өшіру» их стирает.
      await buyer.goto(`${base}/${slug}?lang=kz`);
      await addToCart(buyer, "Торт KZ", "Себетке");
      await buyer.getByRole("link", { name: /Себет/ }).click();
      await expect(buyer.getByLabel("Аты", { exact: true })).toHaveValue("Айгерим");
      await buyer.getByRole("button", { name: "Сақталған ат пен телефонды өшіру" }).click();
      await expect(buyer.getByLabel("Аты", { exact: true })).toHaveValue("");
      expect(await buyer.evaluate(() => localStorage.getItem("duken-customer"))).toBeNull();
    } finally {
      await ctx.close();
      await cleanupUser(admin, email);
    }
  });
});

test.describe("продавец", () => {
  test("порядок товаров меняется кнопками и виден на витрине", async ({ page, request }) => {
    const s = stamp();
    const email = `sort-${s}@example.test`;
    const slug = `sort-${s}`;
    await seedShop(admin, { email, slug, products: [{ title: "Первый", price: 1000 }, { title: "Второй", price: 2000 }] });
    try {
      await loginAs(page, request, email);
      await page.goto("/dashboard");
      await page.getByRole("button", { name: "Ниже" }).first().click();
      await expect
        .poll(async () => {
          await page.reload();
          const text = await page.locator("main ul").first().innerText();
          return text.indexOf("Второй") !== -1 && text.indexOf("Второй") < text.indexOf("Первый");
        })
        .toBe(true);
      await page.goto(`/${slug}`);
      const names = await page.locator("main ul li a").allInnerTexts();
      expect(names.findIndex((n) => n.includes("Второй"))).toBeLessThan(names.findIndex((n) => n.includes("Первый")));
    } finally {
      await cleanupUser(admin, email);
    }
  });

  test("Storage очищается при замене фото и удалении товара", async ({ page, request }) => {
    const s = stamp();
    const email = `photo-${s}@example.test`;
    const { ownerId } = await seedShop(admin, { email, slug: `photo-${s}` });
    try {
      await loginAs(page, request, email);
      await page.goto("/dashboard/products/new");
      await page.getByLabel("Название", { exact: true }).fill("Фото-товар");
      await page.getByLabel("Цена, ₸").fill("2500");
      await page.locator('input[type="file"]').setInputFiles("public/icon-192.png");
      await expect(page.getByAltText("Фото товара")).toBeVisible();
      await page.getByRole("button", { name: "Сохранить товар" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      expect(await storedFiles(admin, ownerId)).toHaveLength(1);
      const [first] = await storedFiles(admin, ownerId);

      await page.getByRole("link", { name: /Фото-товар/ }).click();
      await page.locator('input[type="file"]').setInputFiles("public/icon-512.png");
      await expect(page.getByAltText("Фото товара")).toBeVisible();
      await page.getByRole("button", { name: "Сохранить товар" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect.poll(() => storedFiles(admin, ownerId)).toHaveLength(1);
      expect(await storedFiles(admin, ownerId)).not.toContain(first);

      await page.getByRole("link", { name: /Фото-товар/ }).click();
      page.once("dialog", (d) => void d.accept());
      await page.getByRole("button", { name: "Удалить товар" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect.poll(() => storedFiles(admin, ownerId)).toHaveLength(0);
    } finally {
      await cleanupUser(admin, email);
    }
  });

  test("загрузка аватара магазина сохраняется", async ({ page, request }) => {
    const s = stamp();
    const email = `avatar-${s}@example.test`;
    const { ownerId } = await seedShop(admin, { email, slug: `avatar-${s}` });
    try {
      await loginAs(page, request, email);
      await page.goto("/dashboard/settings");
      // Обработчик выбора файла появляется после гидратации: её признак — отрисованный QR-код (канвас перестаёт быть 300×150).
      await page.waitForFunction(() => (document.querySelector("canvas") as HTMLCanvasElement | null)?.width !== 300);
      await page.locator("#avatar").setInputFiles("public/icon-192.png");
      await expect(page.getByAltText("Фото магазина")).toBeVisible();
      await page.getByRole("button", { name: "Сохранить настройки" }).click();
      await expect(page.getByRole("status")).toContainText("Настройки сохранены");
      await page.reload();
      await expect(page.getByAltText("Фото магазина")).toBeVisible();
      expect(await storedFiles(admin, ownerId)).toHaveLength(1);
    } finally {
      await cleanupUser(admin, email);
    }
  });

  test("заказы показываются по 20 и «Показать ещё» открывает остальные", async ({ page, request }) => {
    const s = stamp();
    const email = `orders-${s}@example.test`;
    const { shopId } = await seedShop(admin, { email, slug: `orders-${s}` });
    try {
      const rows = Array.from({ length: 22 }, (_, i) => ({
        shop_id: shopId,
        number: i + 1,
        items: [{ id: "x", title: "Товар", qty: 1, price: 1000 }],
        total: 1000,
        customer_name: `Покупатель ${i + 1}`,
        customer_phone: "77015550011",
        address: "Самовывоз",
        created_at: new Date(Date.now() - (30 - i) * 60_000).toISOString(),
      }));
      const { error } = await admin.from("orders").insert(rows);
      expect(error).toBeNull();
      await admin.from("shops").update({ next_order_number: 23 }).eq("id", shopId);

      await loginAs(page, request, email);
      await page.goto("/dashboard/orders?status=all");
      await expect(page.locator("li.card")).toHaveCount(20);
      await expect(page.getByText("№1 · Покупатель 1", { exact: true })).toHaveCount(0);
      await page.getByRole("link", { name: "Показать ещё" }).click();
      await expect(page.getByText("№1 · Покупатель 1", { exact: true })).toBeVisible();
    } finally {
      await cleanupUser(admin, email);
    }
  });
});
