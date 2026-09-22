import { test, expect } from "@playwright/test";
import { createAdminClient } from "@/lib/supabase/admin";

function escapeRegex(value: string) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
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
  const categoryHeading = page.getByRole(
    "heading",
    {
      name: categoryName,
      level: 3,
      exact: true,
    },
  );

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

async function selectE2EExpenseCategory(page: any) {
  const category = page.getByLabel(
    "Expense Category",
    { exact: true },
  );

  await expect(category).toBeVisible({
    timeout: 15000,
  });

  await expect(
    category
      .locator(
        'option[value]:not([value=""])',
      )
      .first(),
  ).toBeAttached({
    timeout: 15000,
  });

  const options = category.locator(
    'option[value]:not([value=""])',
  );

  const count = await options.count();

  for (let i = count - 1; i >= 0; i--) {
    const option = options.nth(i);

    const text = (
      await option.textContent()
    )?.trim();

    if (text?.startsWith("E2E Expense ")) {
      await category.selectOption({
        label: text,
      });

      await expect(category).toHaveValue(
        await option.getAttribute("value"),
      );

      return text;
    }
  }

  throw new Error(
    "E2E Expense category was not found",
  );
}

async function getBudgetIds(
  admin: ReturnType<typeof createAdminClient>,
  amount: string,
  startDate: string,
) {
  const {
    data,
    error,
  } = await admin
    .from("budgets")
    .select("id")
    .eq("amount", Number(amount))
    .eq("currency", "BDT")
    .eq("start_date", startDate);

  if (error) {
    throw new Error(
      `Unable to inspect budgets: ${error.message}`,
    );
  }

  return new Set(
    (data ?? []).map(
      (row) => row.id as string,
    ),
  );
}

async function findNewBudgetId(
  admin: ReturnType<typeof createAdminClient>,
  amount: string,
  startDate: string,
  existingIds: Set<string>,
) {
  const {
    data,
    error,
  } = await admin
    .from("budgets")
    .select(
      "id, amount, currency, start_date, end_date, is_active",
    )
    .eq("amount", Number(amount))
    .eq("currency", "BDT")
    .eq("start_date", startDate);

  if (error) {
    throw new Error(
      `Unable to find newly created budget: ${error.message}`,
    );
  }

  const newBudgets = (data ?? []).filter(
    (row) =>
      typeof row.id === "string" &&
      !existingIds.has(row.id),
  );

  if (newBudgets.length !== 1) {
    throw new Error(
      [
        "Could not identify exactly one newly created budget.",
        `Existing IDs: ${JSON.stringify([...existingIds])}`,
        `Matching rows: ${JSON.stringify(data ?? [])}`,
        `New rows: ${JSON.stringify(newBudgets)}`,
      ].join("\n"),
    );
  }

  return newBudgets[0].id as string;
}

async function createBudget(
  page: any,
  amount: string,
  startDate: string,
) {
  const admin = createAdminClient();

  const existingIds = await getBudgetIds(
    admin,
    amount,
    startDate,
  );

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

  const budgetId = await findNewBudgetId(
    admin,
    amount,
    startDate,
    existingIds,
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

  return {
    categoryName,
    budgetId,
  };
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

    const {
      categoryName,
    } = await createBudget(
      page,
      amount,
      "2026-01-01",
    );

    await expect(
      budgetCard(
        page,
        categoryName,
        amount,
      ),
    ).toBeVisible({
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
    const originalAmount = "11000";
    const updatedAmount = "15000";

    const {
      categoryName,
    } = await createBudget(
      page,
      originalAmount,
      "2026-02-01",
    );

    const card = budgetCard(
      page,
      categoryName,
      originalAmount,
    );

    await expect(card).toBeVisible({
      timeout: 15000,
    });

    await card
      .getByRole("link", {
        name: "Edit",
        exact: true,
      })
      .click();

    await expect(
      page.getByRole("heading", {
        name: "Edit Budget",
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15000,
    });

    await page
      .getByLabel("Budget Amount", {
        exact: true,
      })
      .fill(updatedAmount);

    await page.getByRole("button", {
      name: "Save Changes",
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

    await expect(updatedCard).toBeVisible({
      timeout: 15000,
    });

    await archiveBudget(
      page,
      categoryName,
      updatedAmount,
    );
  });

  test("rejects an invalid date range", async ({
    page,
  }) => {
    await page.goto("/budgets/new");

    await expect(
      page.getByRole("heading", {
        name: "New Budget",
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15000,
    });

    await selectE2EExpenseCategory(page);

    await page
      .getByLabel("Budget Amount", {
        exact: true,
      })
      .fill("12000");

    await page
      .locator("#start-date")
      .fill("2092-06-20");

    await page
      .locator("#end-date")
      .evaluate(
        (
          element: HTMLInputElement,
        ) => {
          element.removeAttribute("min");
        },
      );

    await page
      .locator("#end-date")
      .fill("2092-06-19");

    await page.getByRole("button", {
      name: "Create Budget",
      exact: true,
    }).click();

    await expect(
      page.getByText(
        "End date cannot be before the start date.",
        {
          exact: true,
        },
      ),
    ).toBeVisible({
      timeout: 15000,
    });
  });

  test("archives a budget", async ({
    page,
  }) => {
    const amount = "13000";

    const {
      categoryName,
    } = await createBudget(
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

    const {
      categoryName,
      budgetId,
    } = await createBudget(
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
      page
        .getByRole("heading", {
          name: categoryName,
          level: 3,
          exact: true,
        })
        .locator("xpath=ancestor::section[1]")
        .filter({
          has: page
            .locator("span")
            .filter({
              hasText: moneyRegex(amount),
            }),
        })
        .filter({
          has: page.getByText("Archived", {
            exact: true,
          }),
        });

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

    /*
     * Temporary diagnostic:
     *
     * Verify the exact budget created by this test.
     * This avoids matching old E2E budgets left in the
     * shared Supabase test database.
     */
    const admin = createAdminClient();

    const {
      data: remainingBudget,
      error: remainingBudgetError,
    } = await admin
      .from("budgets")
      .select(
        "id, amount, currency, start_date, end_date, is_active",
      )
      .eq("id", budgetId)
      .maybeSingle();

    if (remainingBudgetError) {
      throw new Error(
        `Admin budget verification failed: ${remainingBudgetError.message}`,
      );
    }

    if (remainingBudget) {
      const bodyText =
        await page.locator("body").innerText();

      throw new Error(
        [
          "The exact budget created by this test still exists after delete_budget.",
          `Budget row: ${JSON.stringify(remainingBudget)}`,
          `Budget ID: ${budgetId}`,
          "Page text after delete:",
          bodyText,
        ].join("\n"),
      );
    }

    await page.reload();

    const deletedCard =
      page
        .getByRole("heading", {
          name: categoryName,
          level: 3,
          exact: true,
        })
        .locator("xpath=ancestor::section[1]")
        .filter({
          has: page
            .locator("span")
            .filter({
              hasText: moneyRegex(amount),
            }),
        })
        .filter({
          has: page.getByText("Archived", {
            exact: true,
          }),
        });

    await expect(
      deletedCard,
    ).toHaveCount(0, {
      timeout: 15000,
    });
  });
});

