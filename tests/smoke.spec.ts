import { test, expect } from "@playwright/test";

test("Money Calculator homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Money Calculator/i);
});
