import { test, expect } from "@playwright/test";

test.describe("Individual Reports E2E", () => {
  test("income vs expenses report loads", async ({ page }) => {
    await page.goto("/reports/income-expense");

    await expect(
      page.getByRole("heading", {
        name: "Income vs Expenses",
        exact: true,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15000 });

    await expect(
      page.getByText("Overall Summary", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Total Income", {
        exact: true,
      }).first(),
    ).toBeVisible();

    await expect(
      page.getByText("Total Expenses", {
        exact: true,
      }).first(),
    ).toBeVisible();
  });

  test("spending by category report loads", async ({ page }) => {
    await page.goto("/reports/spending-by-category");

    await expect(
      page.getByRole("heading", {
        name: "Spending by Category",
        exact: true,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15000 });

    await expect(
      page.getByText("Total Expenses", {
        exact: true,
      }).first(),
    ).toBeVisible();

    await expect(
      page.getByText("Spending Distribution", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Category Breakdown", {
        exact: true,
      }),
    ).toBeVisible();
  });

  test("account balances report loads", async ({ page }) => {
    await page.goto("/reports/account-balances");

    await expect(
      page.getByRole("heading", {
        name: "Account Balances",
        exact: true,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15000 });

    await expect(
      page.getByText("Balance Overview", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Accounts", {
        exact: true,
      }).first(),
    ).toBeVisible();
  });

  test("monthly trends report loads", async ({ page }) => {
    await page.goto("/reports/monthly-trends");

    await expect(
      page.getByRole("heading", {
        name: "Monthly Trends",
        exact: true,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("investment report loads", async ({ page }) => {
    await page.goto("/reports/investments");

    await expect(
      page.getByRole("heading", {
        name: "Investments",
        exact: true,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("loan report loads", async ({ page }) => {
    await page.goto("/reports/loans");

    await expect(
      page.getByRole("heading", {
        name: "Loans Report",
        exact: true,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("deposit report loads", async ({ page }) => {
    await page.goto("/reports/deposits");

    await expect(
      page.getByRole("heading", {
        name: /Deposits Report/,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("goal report loads", async ({ page }) => {
    await page.goto("/reports/goals");

    await expect(
      page.getByRole("heading", {
        name: "Goals Report",
        exact: true,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("liquidity report loads", async ({ page }) => {
    await page.goto("/reports/liquidity");

    await expect(
      page.getByRole("heading", {
        name: "Liquidity",
        exact: true,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15000 });

    await expect(
      page.getByText(
        /Liquidity Interpretation|No liquidity data yet|Unable to load liquidity/,
      ).first(),
    ).toBeVisible();
  });

  test("all reports provide a back navigation", async ({ page }) => {
    const reportUrls = [
      "/reports/income-expense",
      "/reports/spending-by-category",
      "/reports/account-balances",
      "/reports/monthly-trends",
      "/reports/investments",
      "/reports/loans",
      "/reports/deposits",
      "/reports/goals",
      "/reports/liquidity",
    ];

    for (const url of reportUrls) {
      await page.goto(url);

      await expect(
        page.getByRole("link", {
          name: /Reports/,
        }).first(),
      ).toBeVisible();
    }
  });
});


