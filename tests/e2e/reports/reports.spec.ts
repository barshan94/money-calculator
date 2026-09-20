import { test, expect } from "@playwright/test";

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

  await expect(
    page.getByText("Net Result", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await expect(
    page.getByText("Total Assets", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await expect(
    page.getByText("Total Liabilities", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await expect(
    page.getByText("Net Worth", {
      exact: true,
    }).first(),
  ).toBeVisible();
});

test("reports page shows detailed report links", async ({
  page,
}) => {
  await page.goto("/reports");

  const reports = [
    "Income vs Expenses",
    "Spending by Category",
    "Account Balances",
    "Monthly Trends",
    "Investments",
    "Loans",
    "Deposits",
    "Goals",
    "Liquidity",
  ];

  for (const report of reports) {
    await expect(
      page.getByRole("link", {
        name: new RegExp(`^${report}`),
      }),
    ).toBeVisible();
  }
});

test("income vs expenses report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await page.getByRole("link", {
    name: /^Income vs Expenses/,
  }).click();

  await expect(page).toHaveURL(
    /\/reports\/income-expense$/,
  );
});

test("spending by category report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await page.getByRole("link", {
    name: /^Spending by Category/,
  }).click();

  await expect(page).toHaveURL(
    /\/reports\/spending-by-category$/,
  );
});

test("account balances report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await page.getByRole("link", {
    name: /^Account Balances/,
  }).click();

  await expect(page).toHaveURL(
    /\/reports\/account-balances$/,
  );
});

test("monthly trends report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await page.getByRole("link", {
    name: /^Monthly Trends/,
  }).click();

  await expect(page).toHaveURL(
    /\/reports\/monthly-trends$/,
  );
});

test("investment report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await page.getByRole("link", {
    name: /^Investments/,
  }).click();

  await expect(page).toHaveURL(
    /\/reports\/investments$/,
  );
});

test("loan report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await page.getByRole("link", {
    name: /^Loans/,
  }).click();

  await expect(page).toHaveURL(
    /\/reports\/loans$/,
  );
});

test("deposit report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await page.getByRole("link", {
    name: /^Deposits/,
  }).click();

  await expect(page).toHaveURL(
    /\/reports\/deposits$/,
  );
});

test("goal report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await page.getByRole("link", {
    name: /^Goals/,
  }).click();

  await expect(page).toHaveURL(
    /\/reports\/goals$/,
  );
});

test("liquidity report navigation works", async ({
  page,
}) => {
  await page.goto("/reports");

  await page.getByRole("link", {
    name: /^Liquidity/,
  }).click();

  await expect(page).toHaveURL(
    /\/reports\/liquidity$/,
  );
});

