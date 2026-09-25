import { test, expect } from "@playwright/test";
async function createRecurringExpenseCategory(page: any) {
  const categoryName = `E2E Recurring Expense ${Date.now()}`;

  await page.goto("/categories");
  await expect(page.getByLabel("Category name")).toBeVisible({ timeout: 15000 });
  await page.getByLabel("Category name").fill(categoryName);
  await page.getByLabel("Type", { exact: true }).selectOption("expense");
  await page.getByRole("button", { name: "Create Category", exact: true }).click();
  await expect(page.getByText(categoryName, { exact: true })).toBeVisible({ timeout: 15000 });

  return categoryName;
}


test.describe("Recurring Transactions E2E", () => {
  test("recurring transactions page loads", async ({ page }) => {
    await page.goto("/recurring");

    await expect(
      page.getByRole("heading", {
        name: "Recurring Transactions",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("link", {
        name: "+ New Recurring Transaction",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Process Due",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("new recurring transaction form loads", async ({ page }) => {
    await page.goto("/recurring/new");

    await expect(
      page.getByRole("heading", {
        name: "New Recurring Transaction",
        exact: true,
      }),
    ).toBeVisible();

    for (const label of [
      "Name",
      "Amount",
      "Currency",
      "Frequency",
      "Next Run Date",
      "Category",
      "Source Account",
    ]) {
      await expect(
        page.getByLabel(label, { exact: true }),
      ).toBeVisible();
    }

    await expect(
      page.locator(".recurring-label").filter({
        hasText: /^Transaction Type$/,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Create Recurring Transaction",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("name is required by the recurring form", async ({ page }) => {
    await page.goto("/recurring/new");

    const nameInput = page.getByLabel("Name", {
      exact: true,
    });

    await expect(nameInput).toHaveJSProperty(
      "required",
      true,
    );

    await expect(nameInput).toHaveJSProperty(
      "value",
      "",
    );

    await expect(nameInput).toHaveJSProperty(
      "validity.valid",
      false,
    );
  });

  test("can create a recurring expense", async ({ page }) => {
    const recurringName =
      `E2E Recurring ${Date.now()}`;
    const categoryName = await createRecurringExpenseCategory(page);

    await page.goto("/recurring/new");

    await page.getByLabel("Name", { exact: true }).fill(
      recurringName,
    );

    await page.getByLabel("Type", { exact: true }).selectOption("expense");

    await page.getByLabel("Amount", { exact: true }).fill(
      "100",
    );

    await page.getByLabel("Currency", { exact: true }).selectOption(
      "BDT",
    );

    await page.getByLabel("Frequency", { exact: true }).selectOption(
      "monthly",
    );

    await page.getByLabel("Next Run Date", {
      exact: true,
    }).fill(
      new Date().toISOString().slice(0, 10),
    );

    await page.getByLabel("Category", {
      exact: true,
    }).selectOption({ label: categoryName });

    await page.getByLabel("Source Account", {
      exact: true,
    }).selectOption({ index: 1 });

    await page.getByLabel("Description", {
      exact: true,
    }).fill("E2E recurring expense");

    await page.getByRole("button", {
      name: "Create Recurring Transaction",
      exact: true,
    }).click();

    await expect(page).toHaveURL(/\/recurring$/);

    await expect(
      page.getByRole("heading", {
        name: recurringName,
        exact: true,
      }),
    ).toBeVisible();
  });


  test("can edit a recurring transaction", async ({ page }) => {
    const recurringName =
      `E2E Edit ${Date.now()}`;
    const categoryName = await createRecurringExpenseCategory(page);


    await page.goto("/recurring/new");

    await page.getByLabel("Name", { exact: true }).fill(
      recurringName,
    );

    await page.getByLabel("Type", { exact: true }).selectOption("expense");

    await page.getByLabel("Amount", { exact: true }).fill(
      "102",
    );

    await page.getByLabel("Currency", { exact: true }).selectOption(
      "BDT",
    );

    await page.getByLabel("Frequency", { exact: true }).selectOption(
      "monthly",
    );

    await page.getByLabel("Next Run Date", {
      exact: true,
    }).fill(
      new Date().toISOString().slice(0, 10),
    );

    await page.getByLabel("Category", {
      exact: true,
    }).selectOption({ label: categoryName });

    await page.getByLabel("Source Account", {
      exact: true,
    }).selectOption({ index: 1 });

    await page.getByLabel("Description", {
      exact: true,
    }).fill("E2E edit test");

    await page.getByRole("button", {
      name: "Create Recurring Transaction",
      exact: true,
    }).click();

    await expect(page).toHaveURL(/\/recurring$/);

    const card = page.locator("section").filter({
      has: page.getByRole("heading", {
        name: recurringName,
        exact: true,
      }),
    });

    await expect(card).toHaveCount(1);
    await expect(card).toBeVisible();

    await card.getByRole("link", {
      name: "Edit",
      exact: true,
    }).click();

    await expect(page).toHaveURL(
      /\/recurring\/[^/]+\/edit$/,
    );

    await expect(
      page.getByRole("heading", {
        name: "Edit Recurring Transaction",
        exact: true,
      }),
    ).toBeVisible();

    await page.getByLabel("Description", {
      exact: true,
    }).fill(
      `E2E edited ${Date.now()}`,
    );

    await page.getByRole("button", {
      name: "Save Changes",
      exact: true,
    }).click();

    await expect(page).toHaveURL(/\/recurring$/, {
      timeout: 15000,
    });

    await expect(
      page.getByRole("heading", {
        name: recurringName,
        exact: true,
      }),
    ).toBeVisible();
  });

  test("Process Due button can be triggered", async ({ page }) => {
    await page.goto("/recurring");

    const processDueButton = page.getByRole("button", {
      name: "Process Due",
      exact: true,
    });

    await expect(processDueButton).toBeVisible();

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe(
        "Process all recurring transactions that are currently due?",
      );

      await dialog.accept();
    });

    await processDueButton.click();

    await expect(
      page.getByRole("button", {
        name: /Process Due|Processing\.\.\./,
      }),
    ).toBeVisible({
      timeout: 15000,
    });
  });

  test("Run Now button can be triggered", async ({ page }) => {
    await page.goto("/recurring");

    const recurringCards = page.locator("section");

    if ((await recurringCards.count()) === 0) {
      test.skip();
    }

    const firstCard = recurringCards.first();

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe(
        "Run this recurring transaction now?",
      );

      await dialog.accept();
    });

    await firstCard.getByRole("button", {
      name: "Run Now",
      exact: true,
    }).click();

    await expect(
      firstCard.getByRole("button", {
        name: /Run Now|Running\.\.\./,
      }),
    ).toBeVisible({
      timeout: 5000,
    });
  });

  test("Pause button can archive a recurring transaction", async ({
    page,
  }) => {
    const recurringName =
    `E2E Pause ${Date.now()}`;
      const categoryName = await createRecurringExpenseCategory(page);


    await page.goto("/recurring/new");

    await page.getByLabel("Name", { exact: true }).fill(
      recurringName,
    );

    await page.getByLabel("Type", { exact: true }).selectOption("expense");

    await page.getByLabel("Amount", { exact: true }).fill(
      "101",
    );

    await page.getByLabel("Currency", { exact: true }).selectOption(
      "BDT",
    );

    await page.getByLabel("Frequency", { exact: true }).selectOption(
      "monthly",
    );

    await page.getByLabel("Next Run Date", {
      exact: true,
    }).fill(
      new Date().toISOString().slice(0, 10),
    );

    await page.getByLabel("Category", {
      exact: true,
    }).selectOption({ label: categoryName });

    await page.getByLabel("Source Account", {
      exact: true,
    }).selectOption({ index: 1 });

    await page.getByRole("button", {
      name: "Create Recurring Transaction",
      exact: true,
    }).click();

    await expect(page).toHaveURL(/\/recurring$/);

    const card = page.locator("section").filter({
      has: page.getByRole("heading", {
        name: recurringName,
        exact: true,
      }),
    });

    await expect(card).toHaveCount(1);
    await expect(card).toBeVisible();

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe(
        "Pause this recurring transaction? Existing transaction history will be preserved.",
      );

      await dialog.accept();
    });

    await card.getByRole("button", {
      name: "Pause",
      exact: true,
    }).click();

    await expect(page).toHaveURL(/\/recurring$/, {
      timeout: 15000,
    });

    await expect(
      page.locator("section").filter({
        has: page.getByRole("heading", {
          name: recurringName,
          exact: true,
        }),
      }),
    ).toHaveCount(0, {
      timeout: 15000,
    });
  });
});


