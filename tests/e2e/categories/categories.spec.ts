import { test, expect } from "@playwright/test";

test.describe("Categories E2E", () => {
  test("categories page loads", async ({ page }) => {
    await page.goto("/categories");

    await expect(
      page.getByRole("heading", {
        name: "Categories",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Create Category",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Create Category",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByLabel("Filter", { exact: true }),
    ).toBeVisible();

    await expect(
      page.getByLabel("Sort", { exact: true }),
    ).toBeVisible();
  });

  test("can create an income category", async ({ page }) => {
    const categoryName = `E2E Income ${Date.now()}`;

    await page.goto("/categories");

    await page.getByLabel("Category name", {
      exact: true,
    }).fill(categoryName);

    await page.getByLabel("Category type", {
      exact: true,
    }).selectOption("income");

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
  });

  test("can create an expense category", async ({ page }) => {
    const categoryName = `E2E Expense ${Date.now()}`;

    await page.goto("/categories");

    await page.getByLabel("Category name", {
      exact: true,
    }).fill(categoryName);

    await page.getByLabel("Category type", {
      exact: true,
    }).selectOption("expense");

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
  });

  test("shows validation when category name is empty", async ({
    page,
  }) => {
    await page.goto("/categories");

    await page.getByRole("button", {
      name: "Create Category",
      exact: true,
    }).click();

    await expect(
      page.getByRole("alert").filter({
        hasText: "Category name is required.",
      }),
    ).toBeVisible();
  });

  test("can filter categories by type", async ({ page }) => {
    const incomeName = `E2E Filter Income ${Date.now()}`;
    const expenseName = `E2E Filter Expense ${Date.now()}`;

    await page.goto("/categories");

    await page.getByLabel("Category name", {
      exact: true,
    }).fill(incomeName);

    await page.getByLabel("Category type", {
      exact: true,
    }).selectOption("income");

    await page.getByRole("button", {
      name: "Create Category",
      exact: true,
    }).click();

    await expect(
      page.getByText(incomeName, {
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15000,
    });

    await page.getByLabel("Category name", {
      exact: true,
    }).fill(expenseName);

    await page.getByLabel("Category type", {
      exact: true,
    }).selectOption("expense");

    await page.getByRole("button", {
      name: "Create Category",
      exact: true,
    }).click();

    await expect(
      page.getByText(expenseName, {
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15000,
    });

    await page.getByLabel("Filter", {
      exact: true,
    }).selectOption("income");

    await page.getByRole("button", {
      name: "Apply",
      exact: true,
    }).click();

    await expect(
      page.getByText(incomeName, {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText(expenseName, {
        exact: true,
      }),
    ).not.toBeVisible();
  });

  test("can edit a category", async ({ page }) => {
    const categoryName = `E2E Edit ${Date.now()}`;
    const updatedName = `${categoryName} Updated`;

    await page.goto("/categories");

    await page.getByLabel("Category name", {
      exact: true,
    }).fill(categoryName);

    await page.getByLabel("Category type", {
      exact: true,
    }).selectOption("income");

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

    const categoryRow = page.locator("div").filter({
      has: page.getByText(categoryName, {
        exact: true,
      }),
      has: page.getByRole("button", {
        name: "Edit",
        exact: true,
      }),
    }).last();

    await categoryRow.getByRole("button", {
      name: "Edit",
      exact: true,
    }).click();

    await expect(
      page.getByRole("dialog"),
    ).toBeVisible();

    await page.getByRole("dialog").getByLabel(
      "Category name",
      { exact: true },
    ).fill(updatedName);

    await page.getByRole("dialog").getByRole("button", {
      name: "Save Changes",
      exact: true,
    }).click();

    await expect(
      page.getByText(updatedName, {
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15000,
    });

    await expect(
      page.getByText(categoryName, {
        exact: true,
      }),
    ).not.toBeVisible();
  });

  test("can cancel category edit", async ({ page }) => {
    const categoryName = `E2E Edit Cancel ${Date.now()}`;

    await page.goto("/categories");

    await page.getByLabel("Category name", {
      exact: true,
    }).fill(categoryName);

    await page.getByLabel("Category type", {
      exact: true,
    }).selectOption("income");

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

    const categoryRow = page.locator("div").filter({
      has: page.getByText(categoryName, {
        exact: true,
      }),
      has: page.getByRole("button", {
        name: "Edit",
        exact: true,
      }),
    }).last();

    await categoryRow.getByRole("button", {
      name: "Edit",
      exact: true,
    }).click();

    const dialog = page.getByRole("dialog");

    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Category name", {
      exact: true,
    }).fill("Should Not Save");

    await dialog.getByRole("button", {
      name: "Cancel",
      exact: true,
    }).click();

    await expect(dialog).not.toBeVisible();

    await expect(
      page.getByText(categoryName, {
        exact: true,
      }),
    ).toBeVisible();
  });

  test("can archive a category", async ({ page }) => {
    const categoryName = `E2E Archive ${Date.now()}`;

    await page.goto("/categories");

    await page.getByLabel("Category name", {
      exact: true,
    }).fill(categoryName);

    await page.getByLabel("Category type", {
      exact: true,
    }).selectOption("expense");

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

    const categoryRow = page.locator("div").filter({
      has: page.getByText(categoryName, {
        exact: true,
      }),
      has: page.getByRole("button", {
        name: "Archive",
        exact: true,
      }),
    }).last();

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe(
        "Archive this category? It will be preserved for existing transactions.",
      );

      await dialog.accept();
    });

    await categoryRow.getByRole("button", {
      name: "Archive",
      exact: true,
    }).click();

    await expect(
      page.getByRole("heading", {
        name: "Archived",
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15000,
    });

    await expect(
      page.getByText(categoryName, {
        exact: true,
      }),
    ).toBeVisible();
  });

  test("can delete an unused category", async ({ page }) => {
    const categoryName = `E2E Delete ${Date.now()}`;

    await page.goto("/categories");

    await page.getByLabel("Category name", {
      exact: true,
    }).fill(categoryName);

    await page.getByLabel("Category type", {
      exact: true,
    }).selectOption("income");

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

    const categoryRow = page.locator("div").filter({
      has: page.getByText(categoryName, {
        exact: true,
      }),
      has: page.getByRole("button", {
        name: "Delete",
        exact: true,
      }),
    }).last();

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain(
        "Delete this category permanently?",
      );

      await dialog.accept();
    });

    await categoryRow.getByRole("button", {
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
  });

  test("can reset category filters", async ({ page }) => {
    await page.goto("/categories");

    await page.getByLabel("Filter", {
      exact: true,
    }).selectOption("expense");

    await page.getByLabel("Sort", {
      exact: true,
    }).selectOption("az");

    await page.getByRole("button", {
      name: "Apply",
      exact: true,
    }).click();

    await page.getByRole("button", {
      name: "Reset",
      exact: true,
    }).click();

    await expect(
      page.getByLabel("Filter", {
        exact: true,
      }),
    ).toHaveValue("all");

    await expect(
      page.getByLabel("Sort", {
        exact: true,
      }),
    ).toHaveValue("newest");
  });
});

