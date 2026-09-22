import { test, expect } from "@playwright/test";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function moneyAmount(amount: string) {
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function moneyRegex(amount: string) {
  return new RegExp(
    `^BDT\\s+${escapeRegex(moneyAmount(amount))}$`,
  );
}

function budgetCard(
  page: any,
  categoryName: string,
  amount: string,
) {
  const categoryHeading = page.getByRole("heading", {
    name: categoryName,
    level: 3,
    exact: true,
  });

  return categoryHeading
    .locator("xpath=ancestor::section[1]")
    .filter({
      has: page
        .locator("span")
        .filter({
          hasText: moneyRegex(amount),
        }),
    })
    .filter({
      has: page.getByRole("button", {
        name: "Archive Budget",
        exact: true,
      }),
    });
}

function archivedBudgetCard(
  page: any,
  categoryName: string,
  amount: string,
) {
  const categoryHeading = page.getByRole("heading", {
    name: categoryName,
    level: 3,
    exact: true,
  });

  return categoryHeading
    .locator("xpath=ancestor::section[1]")
    .filter({
      hasText: moneyRegex(amount),
    })
    .filter({
      hasText: "Archived",
    });
}

async function selectE2EExpenseCategory(page: any) {
  const categorySelect = page.getByLabel("Category", {
    exact: true,
  });

  const options = await categorySelect.locator("option").all();

  for (let index = options.length - 1; index >= 0; index--) {
    const text = await options[index].textContent();

    if (text?.trim().startsWith("E2E Expense ")) {
      const value = await options[index].getAttribute("value");

      if (!value) {
        throw new Error(
          "Selected E2E Expense category has no value.",
        );
      }

      await categorySelect.selectOption(value);

      return text.trim();
    }
  }

  throw new Error(
    "No E2E Expense category was found.",
  );
}

async function createBudget(
  page: any,
  amount: string,
  startDate: string,
) {
  await page.goto("/budgets/new");

  await expect(
    page.getByRole("heading", {
      name: "New Budget",
      exact: true,
    }),
  ).toBeVisible({
    timeout: 15000,
  });

  const categoryName =
    await selectE2EExpenseCategory(page);

  await page
    .getByLabel("Budget Amount", {
      exact: true,
    })
    .fill(amount);

  await page
    .getByLabel("Currency", {
      exact: true,
    })
    .selectOption("BDT");

  await page
    .getByLabel("Period", {
      exact: true,
    })
    .selectOption("monthly");

  await page
    .locator("#start-date")
    .fill(startDate);

  await page.getByRole("button", {
    name: "Create Budget",
    exact: true,
  }).click();

  await expect(page).toHaveURL(
    /\/budgets$/,
    {
      timeout: 15000,
    },
  );

  await page.reload();

  await expect(
    page.getByRole("link", {
      name: "+ New Budget",
      exact: true,
    }),
  ).toBeVisible({
    timeout: 15000,
  });

  return categoryName;
}

async function archiveBudget(
  page: any,
  categoryName: string,
  amount: string,
) {
  const card = budgetCard(
    page,
    categoryName,
    amount,
  );

  await expect(card).toHaveCount(1, {
    timeout: 15000,
  });

  await expect(card).toBeVisible({
    timeout: 15000,
  });

  const archiveButton = card.getByRole(
    "button",
    {
      name: "Archive Budget",
      exact: true,
    },
  );

  await expect(archiveButton).toHaveCount(1);

  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");

    expect(dialog.message()).toBe(
      "Archive this budget? Its existing spending history will be preserved, but the budget will no longer be active.",
    );

    await dialog.accept();
  });

  await archiveButton.click();

  await expect(page).toHaveURL(
    /\/budgets$/,
    {
      timeout: 15000,
    },
  );

  await page.reload();

  await expect(
    page.getByRole("heading", {
      name: "Archived Budgets",
      exact: true,
    }),
  ).toBeVisible({
    timeout: 15000,
  });
}

test.describe("Budgets", () => {
  test("creates a budget", async ({ page }) => {
    const amount = "10000";

    const categoryName =
      await createBudget(
        page,
        amount,
        "2026-01-01",
      );

    const card = budgetCard(
      page,
      categoryName,
      amount,
    );

    await expect(card).toHaveCount(1, {
      timeout: 15000,
    });

    await expect(card).toBeVisible({
      timeout: 15000,
    });

    await archiveBudget(
      page,
      categoryName,
      amount,
    );
  });

  test("edits an existing budget", async ({
    page,
  }) => {
    const amount = "11000";
    const updatedAmount = "15000";

    const categoryName =
      await createBudget(
        page,
        amount,
        "2026-02-01",
      );

    const card = budgetCard(
      page,
      categoryName,
      amount,
    );

    await expect(card).toHaveCount(1, {
      timeout: 15000,
    });

    await card.getByRole("link", {
      name: "Edit",
      exact: true,
    }).click();

    await expect(page).toHaveURL(
      /\/budgets\/[^/]+\/edit$/,
      {
        timeout: 15000,
      },
    );

    await page
      .getByLabel("Budget Amount", {
        exact: true,
      })
      .fill(updatedAmount);

    await page.getByRole("button", {
      name: "Update Budget",
      exact: true,
    }).click();

    await expect(page).toHaveURL(
      /\/budgets$/,
      {
        timeout: 15000,
      },
    );

    await page.reload();

    const updatedCard = budgetCard(
      page,
      categoryName,
      updatedAmount,
    );

    await expect(updatedCard).toHaveCount(1, {
      timeout: 15000,
    });

    await expect(updatedCard).toBeVisible({
      timeout: 15000,
    });

    await archiveBudget(
      page,
      categoryName,
      updatedAmount,
    );
  });

  test("archives a budget", async ({ page }) => {
    const amount = "13000";

    const categoryName =
      await createBudget(
        page,
        amount,
        "2026-03-01",
      );

    await archiveBudget(
      page,
      categoryName,
      amount,
    );

    await expect(
      page.getByText("Archived", {
        exact: true,
      }).last(),
    ).toBeVisible({
      timeout: 15000,
    });
  });

  test("deletes an archived budget", async ({
    page,
  }) => {
    const amount = "14000";

    const categoryName =
      await createBudget(
        page,
        amount,
        "2026-04-01",
      );

    await archiveBudget(
      page,
      categoryName,
      amount,
    );

    const archivedCard =
      archivedBudgetCard(
        page,
        categoryName,
        amount,
      );

    await expect(
      archivedCard,
    ).toHaveCount(1, {
      timeout: 15000,
    });

    await expect(
      archivedCard,
    ).toBeVisible({
      timeout: 15000,
    });

    const deleteButton =
      archivedCard.getByRole(
        "button",
        {
          name: "Delete Budget",
          exact: true,
        },
      );

    await expect(deleteButton).toHaveCount(1);

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");

      expect(dialog.message()).toBe(
        "Permanently delete this budget? This cannot be undone.",
      );

      await dialog.accept();
    });

    await deleteButton.click();

    await expect(page).toHaveURL(
      /\/budgets$/,
      {
        timeout: 15000,
      },
    );

    await page.reload();

    const deletedCard =
      archivedBudgetCard(
        page,
        categoryName,
        amount,
      );

    await expect(
      deletedCard,
    ).toHaveCount(0, {
      timeout: 15000,
    });
  });
});


