import { test, expect } from "@playwright/test";

const reportRoutes: Record<string, string> = {
  "Income vs Expenses": "/reports/income-expense",
  "Income & Expense Trends": "/reports/income-expense-trends",
  "Cash-Flow Forecast": "/reports/cash-flow-forecast",
  "Net-Worth Forecast": "/reports/net-worth-forecast",
  "Goal Forecast": "/reports/goal-forecast",
  "Budget Intelligence": "/reports/budget-intelligence",
  "Liquidity & Risk Warnings":
    "/reports/liquidity-risk",
  "What-if Simulation": "/reports/what-if",
  "Financial Insights": "/reports/financial-insights",
  "Spending by Category":
    "/reports/spending-by-category",
  "Account Balances": "/reports/account-balances",
  "Monthly Trends": "/reports/monthly-trends",
  Investments: "/reports/investments",
  Loans: "/reports/loans",
  Deposits: "/reports/deposits",
  Goals: "/reports/goals",
  Liquidity: "/reports/liquidity",
  "Financial Health": "/reports/financial-health",
};

function reportLink(
  page: any,
  name: string,
) {
  const href = reportRoutes[name];

  if (!href) {
    throw new Error(
      `Unknown report route: ${name}`,
    );
  }

  return page.locator(
    `a[href="${href}"]`,
  );
}

test("reports page loads", async ({ page }) => {
  await page.goto("/reports");

  await expect(
    page.getByRole("heading", {
      name: "Reports",
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", {
      name: "Detailed Reports",
      exact: true,
    }),
  ).toBeVisible();
});

test("reports page shows financial summary", async ({
  page,
}) => {
  await page.goto("/reports");

  await expect(
    page.getByText("Income", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await expect(
    page.getByText("Expenses", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await expect(
    page.getByText("Net", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await expect(
    page.getByText("Assets", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await expect(
    page.getByText("Liabilities", {
      exact: true,
    }).first(),
  ).toBeVisible();
});

test("reports page shows detailed report links", async ({
  page,
}) => {
  await page.goto("/reports");

  for (const report of Object.keys(
    reportRoutes,
  )) {
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

test("goal forecast report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "Goal Forecast",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/goal-forecast$/,
  );
});

test("budget intelligence report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "Budget Intelligence",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/budget-intelligence$/,
  );
});

test("liquidity and risk report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "Liquidity & Risk Warnings",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/liquidity-risk$/,
  );
});

test("what-if simulation report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "What-if Simulation",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/what-if$/,
  );
});

test("financial insights report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await reportLink(
    page,
    "Financial Insights",
  ).click();

  await expect(page).toHaveURL(
    /\/reports\/financial-insights$/,
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

