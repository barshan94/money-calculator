import { test, expect } from "@playwright/test";

async function createExpense(
  page: any,
  amount: string,
) {
  const description =
    `E2E Expense ${Date.now()}`;

  await page.goto("/transactions/new");

  await expect(
    page.getByRole("heading", {
      name: /add transaction/i,
    }),
  ).toBeVisible();

  await page.getByLabel("Expense").click();

  await page
    .getByLabel("Amount")
    .fill(amount);

  await page
    .getByLabel("Date")
    .fill(
      new Date()
        .toISOString()
        .slice(0, 10),
    );

  const categorySelect =
    page.getByLabel("Category");

  await expect(
    categorySelect,
  ).toBeVisible();

  const categoryOptions =
    await categorySelect
      .locator("option")
      .all();

  expect(
    categoryOptions.length,
  ).toBeGreaterThan(1);

  await categorySelect.selectOption({
    index: 1,
  });

  const accountSelect =
    page.getByLabel("Money From");

  await expect(
    accountSelect,
  ).toBeVisible();

  const accountOptions =
    await accountSelect
      .locator("option")
      .all();

  expect(
    accountOptions.length,
  ).toBeGreaterThan(1);

  await accountSelect.selectOption({
    index: 1,
  });

  const descriptionInput =
    page.getByLabel("Description");

  await descriptionInput.fill(
    description,
  );

  await page.getByRole("button", {
    name: /save|create|add transaction/i,
  }).click();

  await expect(page).toHaveURL(
    /\/transactions\/[^/]+$/,
  );

  await expect(
    page.getByText(description, {
      exact: true,
    }),
  ).toBeVisible();

  return {
    description,
  };
}

test("transactions page loads", async ({
  page,
}) => {
  await page.goto("/transactions");

  await expect(
    page.getByRole("heading", {
      name: "Transactions",
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", {
      name: "+ Add Transaction",
      exact: true,
    }),
  ).toBeVisible();
});

test("new transaction page loads", async ({
  page,
}) => {
  await page.goto("/transactions/new");

  await expect(
    page.getByRole("heading", {
      name: /transaction/i,
    }),
  ).toBeVisible();

  await expect(
    page.getByLabel("Amount"),
  ).toBeVisible();

  await expect(
    page.getByLabel("Date"),
  ).toBeVisible();
});

test("create an expense transaction", async ({
  page,
}) => {
  const { description } =
    await createExpense(
      page,
      "100",
    );

  await expect(
    page.getByText(description, {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByText(
      "BDT 100.00",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
});

test("edit a transaction", async ({
  page,
}) => {
  const { description } =
    await createExpense(
      page,
      "100",
    );

  await expect(
    page.getByText(description, {
      exact: true,
    }),
  ).toBeVisible();

  const editLink =
    page.getByRole("link", {
      name: "Edit",
      exact: true,
    });

  await expect(
    editLink,
  ).toBeVisible();

  await editLink.click();

  await expect(page).toHaveURL(
    /\/transactions\/[^/]+\/edit$/,
  );

  await expect(
    page.getByRole("heading", {
      name: /edit transaction/i,
    }),
  ).toBeVisible();

  await page
    .getByLabel("Amount")
    .fill("60");

  await page.getByRole("button", {
    name: /update|save/i,
  }).click();

  await expect(page).toHaveURL(
    /\/transactions\/[^/]+$/,
  );

  await expect(
    page.getByText(
      "BDT 60.00",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
});

test("cancel a transaction and keep audit history", async ({
  page,
}) => {
  const { description } =
    await createExpense(
      page,
      "150",
    );

  await expect(
    page.getByText(
      "BDT 150.00",
      {
        exact: true,
      },
    ),
  ).toBeVisible();

  const cancelButton =
    page.getByRole("button", {
      name: "Cancel Transaction",
      exact: true,
    });

  await expect(
    cancelButton,
  ).toBeVisible();

  page.once(
    "dialog",
    (dialog) =>
      dialog.accept(),
  );

  await cancelButton.click();

  await expect(page).toHaveURL(
    /\/transactions$/,
  );

  await expect(
    page.getByText(description, {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByText(
      "Cancelled",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
});

