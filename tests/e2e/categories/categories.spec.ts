import { test, expect } from "@playwright/test";

async function openNewCategory(page: any) {
  await page.goto("/categories/new");

  await expect(
    page.getByRole("heading", {
      name: "New Category",
      exact: true,
    }),
  ).toBeVisible({
    timeout: 15000,
  });

  await expect(
    page.getByLabel("Category name", {
      exact: true,
    }),
  ).toBeVisible({
    timeout: 15000,
  });
}

async function createExpenseCategory(
  page: any,
  categoryName: string,
) {
  await openNewCategory(page);

  await page
    .getByLabel("Category name", {
      exact: true,
    })
    .fill(categoryName);

  await page
    .getByLabel("Category type", {
      exact: true,
    })
    .selectOption("expense");

  await page.getByRole("button", {
    name: "Create Category",
    exact: true,
  }).click();

  await expect(page).toHaveURL(
    /\/categories$/,
    {
      timeout: 15000,
    },
  );

  await page.reload();

  await expect(
    page.getByText(categoryName, {
      exact: true,
    }),
  ).toBeVisible({
    timeout: 15000,
  });
}

function categoryCard(
  page: any,
  categoryName: string,
) {
  const category = page.getByText(
    categoryName,
    {
      exact: true,
    },
  );

  return category.locator(
    "xpath=ancestor::div[contains(@class,'rounded-lg')][1]",
  );
}

test.describe("Categories E2E", () => {
  test("categories page loads", async ({ page }) => {
    await page.goto("/categories");

    await expect(
      page.getByRole("heading", {
        name: "Categories",
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15000,
    });
  });

  test("can create an expense category", async ({
    page,
  }) => {
    const categoryName =
      `E2E Create ${Date.now()}`;

    await createExpenseCategory(
      page,
      categoryName,
    );
  });

  test("can edit a category", async ({ page }) => {
    const categoryName =
      `E2E Edit ${Date.now()}`;

    const updatedName =
      `${categoryName} Updated`;

    await createExpenseCategory(
      page,
      categoryName,
    );

    const card = categoryCard(
      page,
      categoryName,
    );

    await expect(card).toBeVisible({
      timeout: 15000,
    });

    await card.getByRole("button", {
      name: "Edit",
      exact: true,
    }).click();

    await expect(
      page.getByRole("heading", {
        name: "Edit Category",
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15000,
    });

    await page
      .getByLabel("Category name", {
        exact: true,
      })
      .fill(updatedName);

    await page.getByRole("button", {
      name: "Save Changes",
      exact: true,
    }).click();

    await page.waitForTimeout(1000);
    await page.reload();

    await expect(
      page.getByText(updatedName, {
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15000,
    });
  });

  test("can archive a category", async ({
    page,
  }) => {
    const categoryName =
      `E2E Archive ${Date.now()}`;

    await createExpenseCategory(
      page,
      categoryName,
    );

    const card = categoryCard(
      page,
      categoryName,
    );

    await expect(card).toBeVisible({
      timeout: 15000,
    });

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      await dialog.accept();
    });

    await card.getByRole("button", {
      name: "Archive",
      exact: true,
    }).click();

    await page.waitForTimeout(1000);
    await page.reload();

    await expect(
      page.getByText(categoryName, {
        exact: true,
      }),
    ).not.toBeVisible({
      timeout: 15000,
    });
  });

  test("can delete an unused category", async ({
    page,
  }) => {
    const categoryName =
      `E2E Delete ${Date.now()}`;

    await createExpenseCategory(
      page,
      categoryName,
    );

    const card = categoryCard(
      page,
      categoryName,
    );

    await expect(card).toBeVisible({
      timeout: 15000,
    });

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      await dialog.accept();
    });

    await card.getByRole("button", {
      name: "Delete",
      exact: true,
    }).click();

    await page.waitForTimeout(1000);
    await page.reload();

    await expect(
      page.getByText(categoryName, {
        exact: true,
      }),
    ).not.toBeVisible({
      timeout: 15000,
    });
  });
});


