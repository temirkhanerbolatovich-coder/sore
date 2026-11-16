import { expect, test } from "@playwright/test";

test("переход к содержимому доступен с клавиатуры", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "К содержимому" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#main-content").getByRole("link", { name: "Создать магазин", exact: true })).toBeFocused();
});

test("тема сообщает состояние и сохраняет фокус", async ({ page }) => {
  await page.goto("/");
  const theme = page.getByRole("button", { name: "Светлая или тёмная тема" });
  await theme.focus();
  const before = await theme.getAttribute("aria-pressed");
  await page.keyboard.press("Space");
  await expect(theme).toBeFocused();
  await expect(theme).toHaveAttribute("aria-pressed", before === "true" ? "false" : "true");
  const outline = await theme.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe("none");
});
