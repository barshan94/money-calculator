import { test, expect } from "@playwright/test";

async function createLentLoan(page: any, amount: string) {
  const personName = `E2E Loan ${Date.now()}`;

  await page.goto("/loans/new");

  await expect(
    page.getByRole("heading", { name: /lend money/i }),
  ).toBeVisible();

  await page.getByLabel("Person").fill(personName);
  await page.getByLabel("Amount").fill(amount);
  await page.getByLabel("Currency").selectOption("BDT");

  const accountSelect = page.getByLabel("Money From");

  await expect(accountSelect).toBeVisible();

  const accountOptions = await accountSelect.locator("option").all();

  expect(accountOptions.length).toBeGreaterThan(1);

  await accountSelect.selectOption({ index: 1 });

  await page.getByRole("button", {
    name: "Save Loan",
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/loans$/);

  const loanLink = page.getByRole("link", {
    name: personName,
    exact: true,
  });

  await expect(loanLink).toBeVisible();

  return { personName, loanLink };
}

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

  await expect(page.getByLabel("Person")).toBeVisible();
  await expect(page.getByLabel("Amount")).toBeVisible();

  await expect(
    page.getByRole("button", {
      name: "Save Loan",
      exact: true,
    }),
  ).toBeVisible();
});

test("create a lent loan", async ({ page }) => {
  const { personName } = await createLentLoan(page, "100");

  await expect(
    page.getByText("BDT 100.00", {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", {
      name: personName,
      exact: true,
    }),
  ).toBeVisible();
});

test("open loan detail and verify active loan", async ({ page }) => {
  const { personName, loanLink } = await createLentLoan(page, "200");

  await loanLink.click();

  await expect(page).toHaveURL(/\/loans\/[^/]+$/);

  await expect(
    page.getByRole("heading", {
      name: personName,
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByText("Active", {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByText("BDT 200.00", {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", {
      name: "Record Repayment",
      exact: true,
    }),
  ).toBeVisible();
});

test("record partial repayment and verify remaining balance", async ({
  page,
}) => {
  const { personName, loanLink } = await createLentLoan(page, "500");

  await loanLink.click();

  await expect(
    page.getByRole("heading", {
      name: personName,
      exact: true,
    }),
  ).toBeVisible();

  await page.getByRole("link", {
    name: "Record Repayment",
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/loans\/[^/]+\/repay$/);

  await expect(
    page.getByRole("heading", {
      name: /record repayment/i,
    }),
  ).toBeVisible();

  await page.getByLabel("Repayment Amount").fill("200");

  await page.getByRole("button", {
    name: "Record Repayment",
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/loans\/[^/]+$/);

  await expect(
    page.getByText("BDT 200.00", {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByText("BDT 300.00", {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByText("Active", {
      exact: true,
    }),
  ).toBeVisible();
});

test("fully repay a loan and verify settled status", async ({ page }) => {
  const { personName, loanLink } = await createLentLoan(page, "300");

  await loanLink.click();

  await page.getByRole("link", {
    name: "Record Repayment",
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/loans\/[^/]+\/repay$/);

  await page.getByLabel("Repayment Amount").fill("300");

  await page.getByRole("button", {
    name: "Record Repayment",
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/loans\/[^/]+$/);

  await expect(
    page.getByRole("heading", {
      name: personName,
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByText("Settled", {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByText("BDT 0.00", {
      exact: true,
    }),
  ).toBeVisible();
});

test("cancel a repayment and restore the loan balance", async ({ page }) => {
  const { personName, loanLink } = await createLentLoan(page, "400");

  await loanLink.click();

  await page.getByRole("link", {
    name: "Record Repayment",
    exact: true,
  }).click();

  await page.getByLabel("Repayment Amount").fill("150");

  await page.getByRole("button", {
    name: "Record Repayment",
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/loans\/[^/]+$/);

  await expect(
    page.getByText("BDT 250.00", {
      exact: true,
    }),
  ).toBeVisible();

  const cancelButton = page.getByRole("button", {
    name: "Cancel",
    exact: true,
  });

  await expect(cancelButton).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());

  await cancelButton.click();

  await expect(
    page.getByText("BDT 400.00", {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByText("Active", {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByText("Cancelled", {
      exact: true,
    }),
  ).toBeVisible();
});

test("edit a repayment and recalculate the loan balance", async ({
  page,
}) => {
  const { personName, loanLink } = await createLentLoan(page, "500");

  await loanLink.click();

  await page.getByRole("link", {
    name: "Record Repayment",
    exact: true,
  }).click();

  await page.getByLabel("Repayment Amount").fill("100");

  await page.getByRole("button", {
    name: "Record Repayment",
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/loans\/[^/]+$/);

  await expect(
    page.getByText("BDT 400.00", {
      exact: true,
    }),
  ).toBeVisible();

  await page.getByRole("link", {
    name: "Edit",
    exact: true,
  }).click();

  await expect(page).toHaveURL(
    /\/loans\/[^/]+\/repayments\/[^/]+\/edit$/,
  );

  await expect(
    page.getByRole("heading", {
      name: /edit repayment/i,
    }),
  ).toBeVisible();

  await page.getByLabel("Repayment Amount").fill("250");

  await page.getByRole("button", {
    name: "Update Repayment",
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/loans\/[^/]+$/);

  await expect(
    page.getByText("BDT 250.00", {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByText("BDT 250.00", {
      exact: true,
    }),
  ).toBeVisible();
});

test("borrow money page can be opened", async ({ page }) => {
  await page.goto("/loans/new");

  await expect(
    page.getByRole("heading", {
      name: /lend money/i,
    }),
  ).toBeVisible();

  const typeControl = page.getByLabel("Type");

  await expect(typeControl).toBeVisible();

  await typeControl.selectOption("borrow");

  await expect(
    page.getByRole("heading", {
      name: /borrow money/i,
    }),
  ).toBeVisible();
});

