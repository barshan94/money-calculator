import { test, expect } from "@playwright/test";

function escapeRegex(value: string) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function moneyText(amount: string) {
  return `BDT ${Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function budgetCard(
  page: any,
  categoryName: string,
  amount: string,
) {
  const categoryRegex = new RegExp(
    `^${escapeRegex(categoryName)}$`,
  );

  const amountRegex = new RegExp(
    `^${escapeRegex(moneyText(amount))}$`,
  );

  return page
    .locator("section")
    .filter({
      has: page.locator("h3").filter({
        hasText: categoryRegex,
      }),
    })
    .filter({
      has: page.locator("span").filter({
        hasText: amountRegex,
      }),
    })
    .filter({
      has: page.locator("button", {
        hasText: "Archive Budget",
      }),
    })
    .first();
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
    category.locator(
      'option[value]:not([value=""])',
    ).first(),
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
        "2090-01-01",
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

    const categoryName =
      await createBudget(
        page,
        originalAmount,
        "2091-01-01",
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
        (element: HTMLInputElement) => {
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

    const categoryName =
      await createBudget(
        page,
        amount,
        "2093-01-01",
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
        "2094-01-01",
      );

    await archiveBudget(
      page,
      categoryName,
      amount,
    );

    const categoryRegex = new RegExp(
      `^${escapeRegex(categoryName)}$`,
    );

    const amountRegex = new RegExp(
      `^${escapeRegex(moneyText(amount))}$`,
    );

    const archivedCard = page
      .locator("section")
      .filter({
        has: page.locator("h3").filter({
          hasText: categoryRegex,
        }),
      })
      .filter({
        has: page.locator("span").filter({
          hasText: amountRegex,
        }),
      })
      .filter({
        has: page.getByText("Archived", {
          exact: true,
        }),
      })
      .first();

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

    await expect(
      page
        .locator("section")
        .filter({
          has: page.locator("h3").filter({
            hasText: categoryRegex,
          }),
        })
        .filter({
          has: page.locator("span").filter({
            hasText: amountRegex,
          }),
        })
        .filter({
          has: page.getByText("Archived", {
            exact: true,
          }),
        }),
    ).toHaveCount(0, {
      timeout: 15000,
    });
  });
});


