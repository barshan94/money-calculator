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
  });

  test("can create an expense category", async ({ page }) => {
    const categoryName = `E2E Create ${Date.now()}`;

    await page.goto("/categories/new");

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

    await expect(page).toHaveURL(/\/categories$/);

    await page.reload();

    await expect(
      page.getByText(categoryName, {
        exact: true,
      }),
    ).toBeVisible();
  });

  test("can edit a category", async ({ page }) => {
    const categoryName = `E2E Edit ${Date.now()}`;
    const updatedName = `${categoryName} Updated`;

    await page.goto("/categories/new");

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

    await expect(page).toHaveURL(/\/categories$/);

    await page.reload();

    const category = page.getByText(categoryName, {
      exact: true,
    });

    await expect(category).toBeVisible();

    const categoryCard = category.locator(
      "xpath=ancestor::div[contains(@class,'rounded-lg')][1]",
    );

    await categoryCard.getByRole("button", {
      name: "Edit",
      exact: true,
    }).click();

    await expect(
      page.getByRole("heading", {
        name: "Edit Category",
        exact: true,
      }),
    ).toBeVisible();

    await page.getByLabel("Category name", {
      exact: true,
    }).fill(updatedName);

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

  test("can archive a category", async ({ page }) => {
    const categoryName = `E2E Archive ${Date.now()}`;

    await page.goto("/categories/new");

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

    await expect(page).toHaveURL(/\/categories$/);

    await page.reload();

    const category = page.getByText(categoryName, {
      exact: true,
    });

    await expect(category).toBeVisible();

    const categoryCard = category.locator(
      "xpath=ancestor::div[contains(@class,'rounded-lg')][1]",
    );

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      await dialog.accept();
    });

    await categoryCard.getByRole("button", {
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

  test("can delete an unused category", async ({ page }) => {
    const categoryName = `E2E Delete ${Date.now()}`;

    await page.goto("/categories/new");

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

    await expect(page).toHaveURL(/\/categories$/);

    await page.reload();

    const category = page.getByText(categoryName, {
      exact: true,
    });

    await expect(category).toBeVisible();

    const categoryCard = category.locator(
      "xpath=ancestor::div[contains(@class,'rounded-lg')][1]",
    );

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      await dialog.accept();
    });

    await categoryCard.getByRole("button", {
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

