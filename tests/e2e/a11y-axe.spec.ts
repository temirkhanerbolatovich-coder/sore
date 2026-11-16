import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminClient, cleanupUser, loginAs, seedShop } from "./helpers";

const admin = adminClient();

async function scan(page: Page, label: string) {
  await page.waitForLoadState("networkidle");
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = result.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(summary, `axe: ${label}`).toEqual([]);
}

for (const theme of ["light", "dark"] as const) {
  test(`axe: публичные страницы (${theme})`, async ({ page }) => {
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const email = `axe-pub-${suffix}@example.test`;
    const slug = `axe-pub-${suffix}`;
    const { shopId } = await seedShop(admin, { email, slug, products: [{ title: "Пирог", price: 1000 }, { title: "Торт", price: 4000 }] });
    try {
      await page.addInitScript((value) => localStorage.setItem("sore-theme", value), theme);
      for (const path of ["/", "/login", "/terms", "/privacy", `/${slug}`, `/${slug}?lang=kz`]) {
        await page.goto(path);
        await scan(page, `${path} ${theme}`);
      }
      await page.goto(`/${slug}`);
      await page.getByRole("listitem").filter({ hasText: "Пирог" }).getByRole("link").first().click();
      await scan(page, `товар ${theme}`);
      await page.goto(`/${slug}`);
      await page.getByRole("listitem").filter({ hasText: "Пирог" }).getByRole("button", { name: "В корзину", exact: true }).click();
      await page.goto(`/${slug}/cart`);
      await scan(page, `корзина ${theme}`);

      const { data } = await admin.from("orders").insert({
        shop_id: shopId, number: 1, items: [{ title: "Пирог", qty: 1, price: 1000 }], total: 1000,
        customer_name: "Айгерим", customer_phone: "77015550123", address: "Самовывоз", status: "new",
      }).select("public_code").single();
      await page.goto(`/o/${data!.public_code}`);
      await scan(page, `статус заказа ${theme}`);
    } finally {
      await cleanupUser(admin, email);
    }
  });

  test(`axe: кабинет (${theme})`, async ({ page, request }) => {
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const email = `axe-dash-${suffix}@example.test`;
    await seedShop(admin, { email, slug: `axe-dash-${suffix}`, products: [{ title: "Пирог", price: 1000 }] });
    try {
      await page.addInitScript((value) => localStorage.setItem("sore-theme", value), theme);
      await loginAs(page, request, email);
      for (const path of ["/dashboard", "/dashboard/orders", "/dashboard/settings", "/dashboard/poster", "/dashboard/products/new", "/dashboard/products/shelf", "/dashboard/products/import", "/dashboard/products/batch"]) {
        await page.goto(path);
        await scan(page, `${path} ${theme}`);
      }
    } finally {
      await cleanupUser(admin, email);
    }
  });
}
