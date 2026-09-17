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

  const accountSelect = page.getByLabel(/account|money from|wallet/i);
  
  await expect(accountSelect).toBeVisible({ timeout: 10000 });
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
  const { personName, loanLink } =
    await createLentLoan(page, "100");

  const loanCard = loanLink.locator(
    "xpath=ancestor::article",
  );

  await expect(loanCard).toBeVisible();

  await expect(
    loanCard.getByText("BDT 100.00", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await expect(loanLink).toBeVisible();
});

test("open loan detail and verify active loan", async ({
  page,
}) => {
  const { personName, loanLink } =
    await createLentLoan(page, "200");

  await loanLink.click();

  await expect(page).toHaveURL(
    /\/loans\/[^/]+$/,
  );

  await expect(
    page.getByRole("heading", {
      name: personName,
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.locator("span.loan-detail-status").filter({
      hasText: "active",
    }),
  ).toBeVisible();

  await expect(
    page.getByText("BDT 200.00", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await expect(
    page.getByRole("link", {
      name: "Record Repayment",
      exact: true,
    }),
  ).toBeVisible();
});

async function selectRepaymentAccount(page: any) {
  const repaymentAccount = page.getByLabel(/money to|account/i).first();

  await expect(repaymentAccount).toBeVisible();

  const option = repaymentAccount.locator(
    'option[value]:not([value=""])',
  );

  await expect(option.first()).toBeAttached({
    timeout: 10000,
  });

  await repaymentAccount.selectOption({
    index: 1,
  });
}

test("record partial repayment and verify remaining balance", async ({
  page,
}) => {
  const { personName, loanLink } =
    await createLentLoan(page, "500");

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

  await expect(page).toHaveURL(
    /\/loans\/[^/]+\/repay$/,
  );

  await expect(
    page.getByRole("heading", {
      name: /record repayment/i,
    }),
  ).toBeVisible();

  await page.getByLabel("Amount").fill("200");

  await selectRepaymentAccount(page);

  await page.getByRole("button", {
    name: "Record Repayment",
    exact: true,
  }).click();

  await expect(page).toHaveURL(
    /\/loans\/[^/]+$/,
  );

  await expect(
    page.getByText("BDT 200.00", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await expect(
    page.getByText("BDT 300.00", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await expect(
    page.locator("span.loan-detail-status").filter({
      hasText: "active",
    }),
  ).toBeVisible();
});

test("fully repay a loan and verify settled status", async ({
  page,
}) => {
  const { personName, loanLink } =
    await createLentLoan(page, "300");

  await loanLink.click();

  await page.getByRole("link", {
    name: "Record Repayment",
    exact: true,
  }).click();

  await expect(page).toHaveURL(
    /\/loans\/[^/]+\/repay$/,
  );

  await page.getByLabel("Amount").fill("300");

  await selectRepaymentAccount(page);

  await page.getByRole("button", {
    name: "Record Repayment",
    exact: true,
  }).click();

  await expect(page).toHaveURL(
    /\/loans\/[^/]+$/,
  );

  await expect(
    page.getByRole("heading", {
      name: personName,
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.locator("span.loan-detail-status").filter({
      hasText: "settled",
    }),
  ).toBeVisible();

  await expect(
    page.getByText("BDT 0.00", {
      exact: true,
    }).first(),
  ).toBeVisible();
});

test("cancel a repayment and restore the loan balance", async ({
  page,
}) => {
  const { personName, loanLink } =
    await createLentLoan(page, "400");

  await loanLink.click();

  await page.getByRole("link", {
    name: "Record Repayment",
    exact: true,
  }).click();

  await expect(page).toHaveURL(
    /\/loans\/[^/]+\/repay$/,
  );

  await page.getByLabel("Amount").fill("150");

  await selectRepaymentAccount(page);

  await page.getByRole("button", {
    name: "Record Repayment",
    exact: true,
  }).click();

  await expect(page).toHaveURL(
    /\/loans\/[^/]+$/,
  );

  await expect(
    page.getByText("BDT 250.00", {
      exact: true,
    }).first(),
  ).toBeVisible();

  const cancelButton = page.getByRole(
    "button",
    {
      name: "Cancel",
      exact: true,
    },
  );

  await expect(cancelButton).toBeVisible();

  page.once("dialog", (dialog) =>
    dialog.accept(),
  );

  await cancelButton.click();

  await expect(
    page.getByText("BDT 400.00", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await expect(
    page.locator("span.loan-detail-status").filter({
      hasText: "active",
    }),
  ).toBeVisible();

  await expect(
    page.getByText(/cancelled/i).first(),
  ).toBeVisible();
});

test("edit a repayment and recalculate the loan balance", async ({
  page,
}) => {
  const { personName, loanLink } =
    await createLentLoan(page, "500");

  await loanLink.click();

  await page.getByRole("link", {
    name: "Record Repayment",
    exact: true,
  }).click();

  await expect(page).toHaveURL(
    /\/loans\/[^/]+\/repay$/,
  );

  await page.getByLabel("Amount").fill("100");

  await selectRepaymentAccount(page);

  await page.getByRole("button", {
    name: "Record Repayment",
    exact: true,
  }).click();

  await expect(page).toHaveURL(
    /\/loans\/[^/]+$/,
  );

  await expect(
    page.getByText("BDT 400.00", {
      exact: true,
    }).first(),
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

  const editAmountInput = page.locator('input[name="amount"], input[type="number"]').first();
  await expect(editAmountInput).toBeVisible();
  await editAmountInput.fill("250");

  // Re-verify repayment account selection if missing on edit page
  try {
    await selectRepaymentAccount(page);
  } catch (e) {
    // Account field might be pre-filled or non-editable on edit page
  }

  // Explicitly trigger submit on form or submit button
  const submitBtn = page.locator('form button[type="submit"], button:has-text("Update"), button:has-text("Save")').first();
  await submitBtn.click();

  await expect(page).toHaveURL(
    /\/loans\/[^/]+$/,
  );

  await expect(
    page.getByText("BDT 250.00", {
      exact: true,
    }).first(),
  ).toBeVisible();
});

test("borrow money page can be opened", async ({
  page,
}) => {
  await page.goto("/loans/new");

  await expect(
    page.getByRole("heading", {
      name: /lend money/i,
    }),
  ).toBeVisible();

  const typeControl = page.getByLabel("Type");

  await expect(typeControl).toBeVisible();

  await typeControl.selectOption("borrowed");

  await expect(
    page.getByRole("heading", {
      name: /borrow money/i,
    }),
  ).toBeVisible();
});