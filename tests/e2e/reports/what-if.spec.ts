import { expect, test } from "@playwright/test";

async function createWhatIfHistory(page: any) {
  const suffix = Date.now();
  const incomeCategory = `E2E What If Income ${suffix}`;
  const expenseCategory = `E2E What If Expense ${suffix}`;

  await page.goto("/categories");

  await expect(page.getByLabel("Category name")).toBeVisible({
    timeout: 15000,
  });

  await page.getByLabel("Category name").fill(incomeCategory);
  await page.getByLabel("Type").selectOption("income");

  await page
    .getByRole("button", {
      name: "Create Category",
      exact: true,
    })
    .click();

  await expect(
    page.getByText(incomeCategory, {
      exact: true,
    }),
  ).toBeVisible({ timeout: 15000 });

  await page.getByLabel("Category name").fill(expenseCategory);
  await page.getByLabel("Type").selectOption("expense");

  await page
    .getByRole("button", {
      name: "Create Category",
      exact: true,
    })
    .click();

  await expect(
    page.getByText(expenseCategory, {
      exact: true,
    }),
  ).toBeVisible({ timeout: 15000 });

  await page.goto("/transactions/new");

  await expect(
    page.getByRole("heading", {
      name: /transaction/i,
    }),
  ).toBeVisible({ timeout: 15000 });

  const incomeToggle = page.locator(
    'label:has-text("Income"), input[value="income"], button:has-text("Income")',
  ).first();

  if (
    await incomeToggle
      .isVisible({ timeout: 2000 })
      .catch(() => false)
  ) {
    await incomeToggle.click();
  }

  await page.getByLabel("Amount").fill("10000");
  await page
    .getByLabel("Date")
    .fill(new Date().toISOString().slice(0, 10));

  const incomeCategorySelect =
    page.locator("#income-category");

  await expect(incomeCategorySelect).toBeVisible();

  await expect(
    incomeCategorySelect.locator("option", {
      hasText: incomeCategory,
    }),
  ).toHaveCount(1);

  await incomeCategorySelect.selectOption({
    label: incomeCategory,
  });

  const incomeAccountSelect =
    page.locator("#income-account");

  await expect(incomeAccountSelect).toBeVisible();
  await incomeAccountSelect.selectOption({
    index: 1,
  });

  await page
    .getByLabel("Description")
    .fill(`E2E What If Income ${suffix}`);

  await page
    .getByRole("button", {
      name: /save|create|add|submit/i,
    })
    .click();

  await expect(page).toHaveURL(
    /\/transactions\/[^/]+$/,
    {
      timeout: 15000,
    },
  );

  await page.goto("/transactions/new");

  await expect(
    page.getByRole("heading", {
      name: /transaction/i,
    }),
  ).toBeVisible({ timeout: 15000 });

  const expenseToggle = page.locator(
    'label:has-text("Expense"), input[value="expense"], button:has-text("Expense")',
  ).first();

  if (
    await expenseToggle
      .isVisible({ timeout: 2000 })
      .catch(() => false)
  ) {
    await expenseToggle.click();
  }

  await page.getByLabel("Amount").fill("4000");
  await page
    .getByLabel("Date")
    .fill(new Date().toISOString().slice(0, 10));

  const expenseCategorySelect =
    page.locator("#expense-category");

  await expect(expenseCategorySelect).toBeVisible();

  await expect(
    expenseCategorySelect.locator("option", {
      hasText: expenseCategory,
    }),
  ).toHaveCount(1);

  await expenseCategorySelect.selectOption({
    label: expenseCategory,
  });

  const expenseAccountSelect =
    page.locator("#expense-account");

  await expect(expenseAccountSelect).toBeVisible();
  await expenseAccountSelect.selectOption({
    index: 1,
  });

  await page
    .getByLabel("Description")
    .fill(`E2E What If Expense ${suffix}`);

  await page
    .getByRole("button", {
      name: /save|create|add|submit/i,
    })
    .click();

  await expect(page).toHaveURL(
    /\/transactions\/[^/]+$/,
    {
      timeout: 15000,
    },
  );
}

test.describe("What-if Simulation report", () => {
  test("what-if simulation report loads", async ({
    page,
  }) => {
    await page.goto("/reports/what-if");

    await expect(
      page.getByRole("heading", {
        name: "What-if Simulation",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Scenario Settings",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Run Simulation",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Methodology",
      }),
    ).toBeVisible();
  });

  test("what-if simulation can run a scenario", async ({
    page,
  }) => {
    await createWhatIfHistory(page);
    await page.goto("/reports/what-if");

    await page
      .getByLabel("Monthly income change")
      .fill("5000");

    await page
      .getByLabel("Monthly expense change")
      .fill("-1000");

    await page
      .getByLabel("Forecast horizon")
      .selectOption("6");

    await page
      .getByLabel("Historical lookback")
      .selectOption("6");

    await page
      .getByRole("button", {
        name: "Run Simulation",
      })
      .click();

    await expect(
      page
        .locator(".card")
        .filter({
          hasText: "Baseline vs Scenario",
        })
        .first()
        .getByRole("heading", {
          name: "Baseline vs Scenario",
        }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Scenario by Month",
      }),
    ).toBeVisible();
  });

  test("reports navigation includes What-if Simulation", async ({
    page,
  }) => {
    await page.goto("/reports");

    const whatIfLink = page.getByRole("link", {
      name: "What-if Simulation",
    });

    await expect(whatIfLink).toBeVisible();

    await whatIfLink.click();

    await expect(page).toHaveURL(
      /\/reports\/what-if$/,
    );

    await expect(
      page.getByRole("heading", {
        name: "What-if Simulation",
      }),
    ).toBeVisible();
  });
});
