import { test, expect } from "@playwright/test";

test("dashboard shows financial position, insights, cash flow forecast, and planning overview", async ({
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

  /*
   * Scope the forecast link to the Cash Flow Forecast section.
   *
   * The dashboard now contains another "View forecast →" link
   * for Net Worth Forecast, so a page-wide locator is ambiguous.
   */
  const cashFlowForecastHeading =
    page.getByRole("heading", {
      name: "Cash Flow Forecast",
      exact: true,
    });

  await expect(
    cashFlowForecastHeading,
  ).toBeVisible();

  const cashFlowForecastSection =
    cashFlowForecastHeading.locator(
      "xpath=ancestor::*[.//a[normalize-space()='View forecast →']][1]",
    );

  await expect(
    cashFlowForecastSection,
  ).toBeVisible();

  await expect(
    cashFlowForecastSection.getByRole("link", {
      name: "View forecast →",
      exact: true,
    }),
  ).toHaveAttribute(
    "href",
    "/reports/cash-flow-forecast",
  );

  await expect(
    page.getByRole("heading", {
      name: "Goals & Budgets Overview",
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.locator(".dashboard-planning-label").filter({
      hasText: /^Goals$/,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", {
      name: "View goals →",
      exact: true,
    }),
  ).toHaveAttribute(
    "href",
    "/goals",
  );

  await expect(
    page.locator(".dashboard-planning-label").filter({
      hasText: /^Budgets$/,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", {
      name: "View budgets →",
      exact: true,
    }),
  ).toHaveAttribute(
    "href",
    "/budgets",
  );
});

