
import { test, expect } from "@playwright/test";

async function openNewDepositPage(page: any) {
  await page.goto("/deposits");

  await expect(
    page.getByRole("heading", {
      name: "Deposits",
      exact: true,
    }),
  ).toBeVisible();

  await page.getByRole("link", {
    name: "+ New Deposit",
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/deposits\/new$/);
}

async function createDeposit(page: any) {
  const timestamp = Date.now();
  const depositName = `E2E Deposit ${timestamp}`;

  await openNewDepositPage(page);

  await page
    .getByLabel("Deposit Name", { exact: true })
    .fill(depositName);

  await page
    .getByLabel("Deposit Type", { exact: true })
    .selectOption("fixed_deposit");

  await page
    .getByLabel("Principal Amount", { exact: true })
    .fill("10000");

  await page
    .getByLabel("Currency", { exact: true })
    .selectOption("BDT");

  await page
    .getByLabel("Interest Rate %", { exact: true })
    .fill("10");

  await page
    .getByLabel("Start Date", { exact: true })
    .fill("2026-09-18");

  await page
    .getByLabel("Maturity Date", { exact: true })
    .fill("2027-09-18");

  const sourceAccount = page.getByLabel(
    "Source Account",
    { exact: true },
  );

  const option = sourceAccount.locator(
    'option[value]:not([value=""])',
  );

  await expect(option.first()).toBeAttached({
    timeout: 10000,
  });

  await sourceAccount.selectOption({
    index: 1,
  });

  await page.getByRole("button", {
    name: "Save Deposit",
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/deposits$/);

  const depositLink = page
    .getByRole("link")
    .filter({
      hasText: depositName,
    })
    .first();

  await expect(depositLink).toBeVisible({
    timeout: 15000,
  });

  return depositName;
}

async function openDepositDetail(
  page: any,
  depositName: string,
) {
  const depositLink = page
    .getByRole("link")
    .filter({
      hasText: depositName,
    })
    .first();

  await expect(depositLink).toBeVisible({
    timeout: 15000,
  });

  await depositLink.click();

  await expect(page).toHaveURL(
    /\/deposits\/[^/]+$/,
  );
}

test("deposits page loads", async ({ page }) => {
  await page.goto("/deposits");

  await expect(
    page.getByRole("heading", {
      name: "Deposits",
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", {
      name: "+ New Deposit",
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", {
      name: /Active Deposits|No active deposits/i,
    }),
  ).toBeVisible();
});

test("new deposit page loads", async ({ page }) => {
  await openNewDepositPage(page);

  await expect(
    page.getByRole("heading", {
      name: /new deposit/i,
    }),
  ).toBeVisible();
});

test("create deposit works", async ({ page }) => {
  await createDeposit(page);
});

test("created deposit opens detail page", async ({
  page,
}) => {
  const depositName = await createDeposit(page);

  await openDepositDetail(page, depositName);

  await expect(
    page.getByRole("heading", {
      name: depositName,
      exact: true,
    }),
  ).toBeVisible();
});

test("deposit detail shows financial information", async ({
  page,
}) => {
  const depositName = await createDeposit(page);

  await openDepositDetail(page, depositName);

  await expect(
    page.getByText(/principal/i).first(),
  ).toBeVisible();

  await expect(
    page.getByText(/maturity/i).first(),
  ).toBeVisible();

  await expect(
    page.getByText(/interest/i).first(),
  ).toBeVisible();
});

test("deposit edit works", async ({ page }) => {
  const depositName = await createDeposit(page);

  await openDepositDetail(page, depositName);

  await page.getByRole("link", {
    name: /edit/i,
  }).click();

  await expect(page).toHaveURL(
    /\/deposits\/[^/]+\/edit$/,
  );

  const updatedName = `${depositName} Updated`;

  await page
    .getByLabel("Deposit Name", { exact: true })
    .fill(updatedName);

  await page.getByRole("button", {
    name: "Save Changes",
    exact: true,
  }).click();

  await expect(page).toHaveURL(
    /\/deposits\/[^/]+$/,
  );

  await expect(
    page.getByRole("heading", {
      name: updatedName,
      exact: true,
    }),
  ).toBeVisible({
    timeout: 15000,
  });
});

test("deposit withdraw works", async ({ page }) => {
  const depositName = await createDeposit(page);

  await openDepositDetail(page, depositName);

  await page.getByRole("link", {
    name: /withdraw/i,
  }).click();

  await expect(page).toHaveURL(
    /\/deposits\/[^/]+\/withdraw$/,
  );

  const destinationAccount = page.getByLabel(
    "Receive Into",
    { exact: true },
  );

  const option = destinationAccount.locator(
    'option[value]:not([value=""])',
  );

  await expect(option.first()).toBeAttached({
    timeout: 10000,
  });

  await destinationAccount.selectOption({
    index: 1,
  });

  await page
    .getByLabel("Received Amount", { exact: true })
    .fill("10500");

  await page.getByRole("button", {
    name: "Withdraw Deposit",
    exact: true,
  }).click();

  await expect(page).toHaveURL(
    /\/deposits$/,
  );

  await expect(
    page.getByRole("link").filter({
      hasText: depositName,
    }),
  ).not.toBeVisible({
    timeout: 15000,
  });
});