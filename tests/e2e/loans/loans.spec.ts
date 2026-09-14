import { test, expect } from "@playwright/test";

test("loans page loads", async ({ page }) => {
  await page.goto("/loans");

  await expect(
    page.getByRole("heading", {
      name: "Loans",
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", {
      name: "+ New Loan",
      exact: true,
    }),
  ).toBeVisible();
});

test("new loan page loads", async ({ page }) => {
  await page.goto("/loans/new");

  await expect(
    page.getByRole("heading", {
      name: /lend money/i,
    }),
  ).toBeVisible();

  await expect(
    page.getByLabel("Person"),
  ).toBeVisible();

  await expect(
    page.getByLabel("Amount"),
  ).toBeVisible();

  await expect(
    page.getByRole("button", {
      name: "Save Loan",
      exact: true,
    }),
  ).toBeVisible();
});

test("create a lent loan", async ({ page }) => {
  const personName = `E2E Loan ${Date.now()}`;

  await page.goto("/loans/new");

  await expect(
    page.getByRole("heading", {
      name: /lend money/i,
    }),
  ).toBeVisible();

  await page.getByLabel("Person").fill(personName);

  await page.getByLabel("Amount").fill("100");

  await page.getByLabel("Currency").selectOption("BDT");

  const accountSelect = page.getByLabel("Money From");

  await expect(accountSelect).toBeVisible();

  const accountOptions =
    await accountSelect.locator("option").all();

  expect(accountOptions.length).toBeGreaterThan(1);

  await accountSelect.selectOption({
    index: 1,
  });

  await page.getByRole("button", {
    name: "Save Loan",
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/loans$/);

  await expect(
    page.getByRole("link", {
      name: personName,
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByText("BDT 100.00", {
      exact: true,
    }),
  ).toBeVisible();
});

