import { test, expect } from "@playwright/test";

test.describe("Long-Term Assets E2E", () => {
  test("long-term assets page loads", async ({ page }) => {
    await page.goto("/long-term-assets");

    await expect(
      page.getByRole("heading", {
        name: /long-term assets/i,
      }),
    ).toBeVisible();
  });

  test("new long-term asset form loads", async ({ page }) => {
    await page.goto("/long-term-assets/new");

    await expect(
      page.getByRole("heading", {
        name: /add long-term asset|new long-term asset/i,
      }),
    ).toBeVisible();
  });
});
