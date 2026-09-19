import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("dashboard loads the financial overview", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", {
        name: "Dashboard",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Monthly Overview",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Income", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Expenses", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Net Income", {
        exact: true,
      }),
    ).toBeVisible();
  });

  test("dashboard shows financial position", async ({
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
      page.getByText("Deposits", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Investments", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Active Goals", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Budgets", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Recurring", {
        exact: true,
      }),
    ).toBeVisible();
  });

  test("dashboard navigation links work", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("link", {
        name: "+ Add Transaction",
        exact: true,
      }),
    ).toHaveAttribute(
      "href",
      "/transactions/new",
    );

    await expect(
      page.getByRole("link", {
        name: "View reports →",
        exact: true,
      }),
    ).toHaveAttribute(
      "href",
      "/reports",
    );

    await expect(
      page.getByRole("link", {
        name: "View accounts →",
        exact: true,
      }),
    ).toHaveAttribute(
      "href",
      "/accounts",
    );
  });

  test("dashboard shows net worth and accounts", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", {
        name: "Net Worth",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Accounts",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("link", {
        name: "View all →",
        exact: true,
      }),
    ).toHaveAttribute(
      "href",
      "/accounts",
    );
  });
});

