import { test, expect } from "@playwright/test";

async function createExpenseCategory(
  page: any,
  categoryName: string,
) {
  await page.goto("/categories");

  await expect(
    page.getByRole("heading", {
      name: "Categories",
      exact: true,
    }),
  ).toBeVisible({
    timeout: 15000,
  });

  const nameInput = page.getByLabel(
    "Category name",
    { exact: true },
  );

  await expect(nameInput).toBeVisible({
    timeout: 15000,
  });

  await nameInput.fill(categoryName);

  await page
    .getByLabel("Type", {
      exact: true,
    })
    .selectOption("expense");

  await page.getByRole("button", {
    name: "Create Category",
    exact: true,
  }).click();

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

  /*
   * Do not depend on presentation classes such as "rounded-lg".
   *
   * The category container is the nearest ancestor that owns the
   * category action buttons. This remains stable if the visual
   * styling changes.
   */
  return category.locator(
    "xpath=ancestor::*[.//button[@aria-label='Edit' or normalize-space()='Edit'] and .//button[@aria-label='Archive' or normalize-space()='Archive'] and .//button[@aria-label='Delete' or normalize-space()='Delete']][1]",
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

    await expect(card).toHaveCount(1, {
      timeout: 15000,
    });

    await expect(card).toBeVisible({
      timeout: 15000,
    });

    await card.getByRole("button", {
      name: "Edit",
      exact: true,
    }).click();

    await expect(
      page.getByRole("dialog"),
    ).toBeVisible({
      timeout: 15000,
    });

    await page
      .getByRole("dialog")
      .getByLabel("Category name", {
        exact: true,
      })
      .fill(updatedName);

    await page
      .getByRole("dialog")
      .getByRole("button", {
        name: "Save Changes",
        exact: true,
      })
      .click();

    await expect(
      page.getByText(updatedName, {
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15000,
    });

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

    await expect(card).toHaveCount(1, {
      timeout: 15000,
    });

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

    await expect(
      page.getByText(categoryName, {
        exact: true,
      }),
    ).not.toBeVisible({
      timeout: 15000,
    });

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

    await expect(card).toHaveCount(1, {
      timeout: 15000,
    });

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

    await expect(
      page.getByText(categoryName, {
        exact: true,
      }),
    ).not.toBeVisible({
      timeout: 15000,
    });

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


