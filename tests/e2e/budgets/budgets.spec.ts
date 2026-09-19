import { test, expect } from "@playwright/test";

async function selectE2EExpenseCategory(page: any) {
  const category = page.getByLabel(
    "Expense Category",
    { exact: true },
  );

  await expect(category).toBeVisible();

  const options = category.locator(
    'option[value]:not([value=""])',
  );

  await expect(options.first()).toBeAttached({
    timeout: 10000,
  });

  const count = await options.count();

  for (let i = count - 1; i >= 0; i--) {
    const text = await options.nth(i).textContent();

    if (text?.startsWith("E2E Expense ")) {
      await category.selectOption({
        index: i + 1,
      });

      return text.trim();
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
  ).toBeVisible();

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

function newestBudgetCard(page: any) {
  const editLink = page
    .getByRole("link", {
      name: "Edit",
      exact: true,
    })
    .last();

  return editLink.locator(
    "xpath=ancestor::section[1]",
  );
}

async function archiveBudget(page: any) {
  const card = newestBudgetCard(page);

  await expect(card).toBeVisible({
    timeout: 10000,
  });

  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    expect(dialog.message()).toBe(
      "Archive this budget? Its existing spending history will be preserved, but the budget will no longer be active.",
    );
    await dialog.accept();
  });

  await card
    .getByRole("button", {
      name: "Archive Budget",
      exact: true,
    })
    .click();

  await page.waitForTimeout(1000);
  await page.reload();

  await expect(
    page.getByRole("heading", {
      name: "Archived Budgets",
      exact: true,
    }),
  ).toBeVisible({
    timeout: 15000,
  });

  await expect(
    page.getByText("Archived", {
      exact: true,
    }).last(),
  ).toBeVisible({
    timeout: 15000,
  });
}

test.describe("Budgets", () => {
  test("creates a budget", async ({ page }) => {
    await createBudget(
      page,
      "10000",
      "2090-01-01",
    );

    await expect(
      newestBudgetCard(page),
    ).toBeVisible();

    await archiveBudget(page);
  });

  test("edits an existing budget", async ({
    page,
  }) => {
    await createBudget(
      page,
      "11000",
      "2091-01-01",
    );

    const card = newestBudgetCard(page);

    await expect(card).toBeVisible();

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
    ).toBeVisible();

    await page
      .getByLabel("Budget Amount", {
        exact: true,
      })
      .fill("15000");

    await page.getByRole("button", {
      name: "Save Changes",
      exact: true,
    }).click();

    await page.waitForTimeout(1000);

    // Do not depend on router.push() from the edit page.
    await page.goto("/budgets");
    await page.reload();

    await expect(
      page.getByRole("link", {
        name: "Edit",
        exact: true,
      }).last(),
    ).toBeVisible({
      timeout: 15000,
    });

    await expect(
      page.getByText("15000", {
        exact: false,
      }).last(),
    ).toBeVisible({
      timeout: 15000,
    });

    await archiveBudget(page);
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
    ).toBeVisible();

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
    ).toBeVisible();
  });

  test("archives a budget", async ({
    page,
  }) => {
    await createBudget(
      page,
      "13000",
      "2093-01-01",
    );

    await archiveBudget(page);

    const archivedCard = page
      .getByText("Archived", {
        exact: true,
      })
      .last()
      .locator("xpath=ancestor::section[1]");

    await expect(
      archivedCard,
    ).toBeVisible({
      timeout: 15000,
    });
  });

  test("deletes an archived budget", async ({
    page,
  }) => {
    await createBudget(
      page,
      "14000",
      "2094-01-01",
    );

    await archiveBudget(page);

    const archivedCards = page
      .getByText("Archived", {
        exact: true,
      })
      .locator("xpath=ancestor::section[1]");

    const countBefore =
      await archivedCards.count();

    expect(countBefore).toBeGreaterThan(0);

    const archivedCard =
      archivedCards.last();

    await expect(
      archivedCard,
    ).toBeVisible();

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      expect(dialog.message()).toBe(
        "Permanently delete this budget? This cannot be undone.",
      );
      await dialog.accept();
    });

    await archivedCard
      .getByRole("button", {
        name: "Delete Budget",
        exact: true,
      })
      .click();

    await page.waitForTimeout(1000);
    await page.reload();

    await expect
      .poll(
        async () =>
          await page
            .getByText("Archived", {
              exact: true,
            })
            .count(),
        {
          timeout: 15000,
        },
      )
      .toBe(countBefore - 1);
  });
});

