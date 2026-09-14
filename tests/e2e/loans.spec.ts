import { test, expect } from "@playwright/test";

test("loans page loads", async ({ page }) => {
  await page.goto("/loans");

  await expect(
    page.getByRole("heading", {
      name: "Loans",
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", {
      name: "+ New Loan",
      exact: true,
    }),
  ).toBeVisible();
});