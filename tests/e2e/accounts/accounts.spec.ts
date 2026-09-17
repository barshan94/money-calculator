import { test, expect } from "@playwright/test";

async function createAccount(
  page: any,
  type: "asset" | "liability" = "asset",
) {
  const accountName =
    `E2E ${type === "asset" ? "Asset" : "Liability"} ${Date.now()}`;
  await page.goto("/accounts/new");
  await expect(
    page.getByRole("heading", {
      name: /new account|create account/i,
    }),
  ).toBeVisible();
  await page
    .getByLabel(/account name|name/i)
    .first()
    .fill(accountName);
  const typeSelect = page.getByLabel(/account type|type/i).first();
  await typeSelect.selectOption(type);
  const availability = page.getByLabel("Availability");
  if (
    await availability
      .isVisible({ timeout: 2000 })
      .catch(() => false)
  ) {
    await availability.selectOption("immediate");
  }
  const currency = page.getByLabel("Currency");
  if (
    await currency
      .isVisible({ timeout: 2000 })
      .catch(() => false)
  ) {
    await currency.selectOption("BDT");
  }
  await page
    .getByRole("button", {
      name: /create account|save|submit/i,
    })
    .first()
    .click();
  await expect(page).toHaveURL(/\/accounts$/);
  await expect(
    page.getByText(accountName, {
      exact: true,
    }),
  ).toBeVisible();
  return accountName;
}

test("accounts page loads", async ({ page }) => {
  await page.goto("/accounts");
  await expect(
    page.getByRole("heading", {
      name: "Accounts",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("link", {
        name: /create|new|add/i,
      })
      .or(
        page.getByRole("button", {
          name: /create|new|add/i,
        }),
      )
      .first(),
  ).toBeVisible();
});

test("new account page loads", async ({ page }) => {
  await page.goto("/accounts/new");
  await expect(
    page.getByRole("heading", {
      name: /new account|create account/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel(/account name|name/i).first(),
  ).toBeVisible();
  await expect(
    page.getByLabel(/account type|type/i).first(),
  ).toBeVisible();
  await expect(page.getByLabel("Currency")).toBeVisible();
});

test("create an asset account", async ({ page }) => {
  const accountName = await createAccount(page, "asset");
  await expect(
    page.getByText(accountName, {
      exact: true,
    }),
  ).toBeVisible();
});

test("create a liability account", async ({ page }) => {
  const accountName = await createAccount(page, "liability");
  await expect(
    page.getByText(accountName, {
      exact: true,
    }),
  ).toBeVisible();
});

test("open account detail", async ({ page }) => {
  const accountName = await createAccount(page, "asset");
  await page.getByText(accountName, { exact: true }).click();
  await expect(page).toHaveURL(/\/accounts\/[^/]+$/);
  await expect(
    page
      .getByRole("heading", {
        name: accountName,
        exact: true,
      })
      .or(page.getByText(accountName).first()),
  ).toBeVisible();
});

test("edit an account", async ({ page }) => {
  const accountName = await createAccount(page, "asset");

  await page.getByText(accountName, { exact: true }).click();
  await expect(page).toHaveURL(/\/accounts\/[^/]+$/);

  const editLink = page
    .getByRole("link", { name: /edit/i })
    .or(page.getByRole("button", { name: /edit/i }))
    .first();
  await expect(editLink).toBeVisible();
  await editLink.click();
  await expect(page).toHaveURL(/\/accounts\/[^/]+\/edit$/);

  const nameInput = page
    .locator('form input[name="name"], form input[name="accountName"], form input[type="text"]')
    .first()
    .or(page.getByLabel(/account name|name/i).first());

  await expect(nameInput).toBeVisible();

  const updatedName = `${accountName} Updated`;
  await nameInput.focus();
  await nameInput.fill("");
  await nameInput.fill(updatedName);

  const submitButton = page
    .locator('form button[type="submit"]')
    .or(page.getByRole("button", { name: /update|save|submit/i }))
    .first();

  await submitButton.click();

  await expect(page).toHaveURL(/\/accounts(\/[^/]+)?$/);

  await expect(
    page
      .getByRole("heading", { name: updatedName })
      .or(page.getByText(updatedName).first()),
  ).toBeVisible({ timeout: 15000 });
});

test("archive and unarchive an account", async ({ page }) => {
  const accountName = await createAccount(page, "asset");
  await page.getByText(accountName, { exact: true }).click();
  await expect(page).toHaveURL(/\/accounts\/[^/]+$/);

  const archiveButton = page
    .getByRole("button", {
      name: /archive/i,
    })
    .first();
  await expect(archiveButton).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await archiveButton.click();
  await expect(page).toHaveURL(/\/accounts$/);

  await page.goto("/accounts?filter=archived");
  await expect(
    page.getByText(accountName, {
      exact: true,
    }),
  ).toBeVisible();

  await page.getByText(accountName, { exact: true }).click();
  await expect(page).toHaveURL(/\/accounts\/[^/]+$/);

  const unarchiveButton = page
    .getByRole("button", {
      name: /unarchive/i,
    })
    .first();
  await expect(unarchiveButton).toBeVisible();
  await unarchiveButton.click();
  await expect(page).toHaveURL(/\/accounts\/[^/]+$/);
  await expect(
    page
      .getByRole("heading", {
        name: accountName,
        exact: true,
      })
      .or(page.getByText(accountName).first()),
  ).toBeVisible();
});

test("accounts page supports filtering and sorting controls", async ({
  page,
}) => {
  await page.goto("/accounts");
  const selects = page.locator("select");
  const selectCount = await selects.count();
  expect(selectCount).toBeGreaterThan(0);
  for (let i = 0; i < selectCount; i++) {
    const select = selects.nth(i);
    if (await select.isVisible().catch(() => false)) {
      const options = await select.locator("option").count();
      expect(options).toBeGreaterThan(0);
    }
  }
});