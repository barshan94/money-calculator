import { test, expect } from "@playwright/test";

test("dashboard shows financial position and insights", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", {
      name: "Financial Position",
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByText("Money Lent", {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByText("Money Borrowed", {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page
      .locator("a.dashboard-metric-card")
      .filter({ hasText: /^Deposits/ }),
  ).toBeVisible();

  await expect(
    page
      .locator("a.dashboard-metric-card")
      .filter({ hasText: /^Investments/ }),
  ).toBeVisible();

  await expect(
    page
      .locator("a.dashboard-metric-card")
      .filter({ hasText: /^Active Goals/ }),
  ).toBeVisible();

  await expect(
    page
      .locator("a.dashboard-metric-card")
      .filter({ hasText: /^Budgets/ }),
  ).toBeVisible();

  await expect(
    page
      .locator("a.dashboard-metric-card")
      .filter({ hasText: /^Recurring/ }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", {
      name: "Financial Insights",
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", {
      name: "View insights →",
      exact: true,
    }),
  ).toHaveAttribute(
    "href",
    "/reports/financial-insights",
  );
});
