import { test, expect } from "@playwright/test";

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
        name: /new recurring transaction/i,
      }),
    ).toBeVisible();

    await expect(
      page.getByLabel("Name", { exact: true }),
    ).toBeVisible();

    await expect(
      page.getByLabel("Type", { exact: true }),
    ).toBeVisible();

    await expect(
      page.getByLabel("Amount", { exact: true }),
    ).toBeVisible();

    await expect(
      page.getByLabel("Currency", { exact: true }),
    ).toBeVisible();

    await expect(
      page.getByLabel("Frequency", { exact: true }),
    ).toBeVisible();

    await expect(
      page.getByLabel("Next Run Date", { exact: true }),
    ).toBeVisible();

    await expect(
      page.getByLabel("Category", { exact: true }),
    ).toBeVisible();

    await expect(
      page.getByLabel("Source Account", { exact: true }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Create Recurring Transaction",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("recurring form shows validation for empty submission", async ({
    page,
  }) => {
    await page.goto("/recurring/new");

    await page.getByRole("button", {
      name: "Create Recurring Transaction",
      exact: true,
    }).click();

    await expect(
      page.getByText("Enter a name.", { exact: true }),
    ).toBeVisible();
  });

  test("can create a recurring expense", async ({ page }) => {
    const recurringName = `E2E Recurring ${Date.now()}`;

    await page.goto("/recurring/new");

    await page.getByLabel("Name", { exact: true }).fill(
      recurringName,
    );

    await page.getByLabel("Type", { exact: true }).selectOption(
      "expense",
    );

    await page.getByLabel("Amount", { exact: true }).fill("100");

    await page.getByLabel("Currency", { exact: true }).selectOption(
      "BDT",
    );

    await page.getByLabel("Frequency", { exact: true }).selectOption(
      "monthly",
    );

    await page.getByLabel("Next Run Date", {
      exact: true,
    }).fill(new Date().toISOString().slice(0, 10));

    const category = page.getByLabel("Category", {
      exact: true,
    });

    await expect(category).toBeVisible();
    await category.selectOption({ index: 1 });

    const sourceAccount = page.getByLabel("Source Account", {
      exact: true,
    });

    await expect(sourceAccount).toBeVisible();
    await sourceAccount.selectOption({ index: 1 });

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
    await page.goto("/recurring");

    const recurringCards = page.locator("section");

    await expect(recurringCards.first()).toBeVisible();

    const firstCard = recurringCards.first();

    await firstCard.getByRole("link", {
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
    }).fill(`E2E edited ${Date.now()}`);

    await page.getByRole("button", {
      name: "Save Changes",
      exact: true,
    }).click();

    await expect(page).toHaveURL(/\/recurring$/);
  });

  test("Process Due button can be triggered", async ({ page }) => {
    await page.goto("/recurring");

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe(
        "Process all recurring transactions that are currently due?",
      );
      await dialog.accept();
    });

    await page.getByRole("button", {
      name: "Process Due",
      exact: true,
    }).click();

    await expect(
      page.getByText(
        /No recurring transactions are due\.|recurring transaction\(s\) processed successfully\./i,
      ),
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
      page.getByText(
        "Recurring transaction processed successfully.",
        { exact: true },
      ),
    ).toBeVisible({
      timeout: 15000,
    });
  });

  test("Pause button can archive a recurring transaction", async ({
    page,
  }) => {
    await page.goto("/recurring");

    const recurringCards = page.locator("section");

    if ((await recurringCards.count()) === 0) {
      test.skip();
    }

    const firstCard = recurringCards.first();

    const recurringName = await firstCard
      .getByRole("heading", { level: 2 })
      .innerText();

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe(
        "Pause this recurring transaction? Existing transaction history will be preserved.",
      );
      await dialog.accept();
    });

    await firstCard.getByRole("button", {
      name: "Pause",
      exact: true,
    }).click();

    await expect(page).toHaveURL(/\/recurring$/);

    await expect(
      page.getByRole("heading", {
        name: recurringName,
        exact: true,
      }),
    ).not.toBeVisible({
      timeout: 15000,
    });
  });
});


