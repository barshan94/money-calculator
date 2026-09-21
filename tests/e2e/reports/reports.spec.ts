import { test, expect } from "@playwright/test";

function reportLink(
  page: any,
  name: string,
) {
  return page
    .locator('a[href^="/reports/"]')
    .filter({
      hasText: new RegExp(
        `^${name.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        )}$`,
      ),
    })
    .first();
}

test("reports page loads", async ({ page }) => {
  await page.goto("/reports");

  await expect(
    page.getByRole("heading", {
      name: "Reports & Analytics",
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByText(
      "Track your financial position, income, expenses, and progress.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("reports page shows financial summary", async ({
  page,
}) => {
  await page.goto("/reports");

  for (const label of [
    "Total Income",
    "Total Expenses",
    "Net Result",
    "Total Assets",
    "Total Liabilities",
    "Net Worth",
  ]) {
    await expect(
      page.getByText(label, {
        exact: true,
      }).first(),
    ).toBeVisible();
  }
});

test("reports page shows detailed report links", async ({
  page,
}) => {
  await page.goto("/reports");

  const reports = [
    "Income vs Expenses",
    "Income & Expense Trends",
    "Cash-Flow Forecast",
    "Net-Worth Forecast",
    "Spending by Category",
    "Account Balances",
    "Monthly Trends",
    "Investments",
    "Loans",
    "Deposits",
    "Goals",
    "Liquidity",
    "Financial Health",
  ];

  for (const report of reports) {
    await expect(
      reportLink(page, report),
    ).toBeVisible();
  }
});

test("income vs expenses report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "Income vs Expenses",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/income-expense$/,
  );
});

test("income & expense trends report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "Income & Expense Trends",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/income-expense-trends$/,
  );
});

test("cash-flow forecast report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "Cash-Flow Forecast",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/cash-flow-forecast$/,
  );
});

test("net-worth forecast report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "Net-Worth Forecast",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/net-worth-forecast$/,
  );
});

test("spending by category report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "Spending by Category",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/spending-by-category$/,
  );
});

test("account balances report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "Account Balances",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/account-balances$/,
  );
});

test("monthly trends report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "Monthly Trends",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/monthly-trends$/,
  );
});

test("investment report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "Investments",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/investments$/,
  );
});

test("loan report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "Loans",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/loans$/,
  );
});

test("deposit report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "Deposits",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/deposits$/,
  );
});

test("goal report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "Goals",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/goals$/,
  );
});

test("liquidity report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "Liquidity",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/liquidity$/,
  );
});

test("financial health report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "Financial Health",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/financial-health$/,
  );
});

