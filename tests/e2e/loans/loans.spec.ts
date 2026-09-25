import { test, expect } from "@playwright/test";

async function createLentLoan(
  page: any,
  amount: string,
) {
  const personName = `E2E Loan ${Date.now()}`;

  await page.goto("/loans/new");

  await expect(
    page.getByRole("heading", {
      name: /lend money/i,
    }),
  ).toBeVisible();

  await page.getByLabel("Person").fill(personName);
  await page.getByLabel("Amount").fill(amount);
  await page.getByLabel("Currency").selectOption("BDT");
  const accountSelect = page.locator("#loan-account");


  await expect(accountSelect).toBeVisible({
    timeout: 10000,
  });

  await accountSelect.selectOption({
    index: 1,
  });

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

  return {
    personName,
    loanLink,
  };
}

test("loans page loads", async ({
  page,
}) => {
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

test("new loan page loads", async ({
  page,
}) => {
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

test("create a lent loan", async ({
  page,
}) => {
  const {
    personName,
    loanLink,
  } = await createLentLoan(
    page,
    "100",
  );

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
  const {
    personName,
    loanLink,
  } = await createLentLoan(
    page,
    "200",
  );

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
    page.locator(
      "span.loan-detail-status",
    ).filter({
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

async function selectRepaymentAccount(
  page: any,
) {
  // Scope this to an actual select element so the UserMenu
  // "Loading user account" label can never be matched.
  const repaymentAccount = page.locator("#repayment-account");


  await expect(
    repaymentAccount,
  ).toBeVisible();

  const option =
    repaymentAccount.locator(
      'option[value]:not([value=""])',
    );

  await expect(
    option.first(),
  ).toBeAttached({
    timeout: 10000,
  });

  await repaymentAccount.selectOption({
    index: 1,
  });
}

async function expectNoRepaymentError(
  page: any,
) {
  const repaymentError =
    page.locator("main p[role='alert']");

  await expect(
    repaymentError,
  ).toHaveCount(0);
}

test("record partial repayment and verify remaining balance", async ({
  page,
}) => {
  const {
    personName,
    loanLink,
  } = await createLentLoan(
    page,
    "500",
  );

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

  await expectNoRepaymentError(page);

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
});

test("fully repay a loan and verify settled status", async ({
  page,
}) => {
  const {
    personName,
    loanLink,
  } = await createLentLoan(
    page,
    "300",
  );

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

  await expectNoRepaymentError(page);

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
    page.locator(
      "span.loan-detail-status",
    ).filter({
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
  const {
    personName,
    loanLink,
  } = await createLentLoan(
    page,
    "400",
  );

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

  await expectNoRepaymentError(page);

  await expect(page).toHaveURL(
    /\/loans\/[^/]+$/,
  );

  await expect(
    page.getByText("BDT 250.00", {
      exact: true,
    }).first(),
  ).toBeVisible();

  const cancelButton =
    page.getByRole("button", {
      name: "Cancel",
      exact: true,
    });

  await expect(
    cancelButton,
  ).toBeVisible();

  page.once(
    "dialog",
    (dialog) => dialog.accept(),
  );

  await cancelButton.click();

  await expect(
    page.getByText("BDT 400.00", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await expect(
    page.locator(
      "span.loan-detail-status",
    ).filter({
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
  const {
    personName,
    loanLink,
  } = await createLentLoan(
    page,
    "500",
  );

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

  await expectNoRepaymentError(page);

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

  const editAmountInput =
    page.locator(
      'input[name="amount"], input[type="number"]',
    ).first();

  await expect(
    editAmountInput,
  ).toBeVisible();

  await editAmountInput.fill("250");

  try {
    await selectRepaymentAccount(page);
  } catch {
    // Account may already be selected
    // or unavailable on the edit page.
  }

  const submitBtn =
    page.locator(
      'form button[type="submit"], button:has-text("Update"), button:has-text("Save")',
    ).first();

  await submitBtn.click();

  await expectNoRepaymentError(page);

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

  await page.getByLabel("Type").selectOption(
    "borrowed",
  );

  await expect(
    page.getByRole("heading", {
      name: /borrow money/i,
    }),
  ).toBeVisible();
});

test("borrowed loan can be created", async ({
  page,
}) => {
  const personName = `E2E Borrowed ${Date.now()}`;

  await page.goto("/loans/new");

  await page.getByLabel("Type").selectOption(
    "borrowed",
  );

  await expect(
    page.getByRole("heading", {
      name: /borrow money/i,
    }),
  ).toBeVisible();

  await page.getByLabel("Person").fill(
    personName,
  );

  await page.getByLabel("Amount").fill(
    "250",
  );

  await page.getByLabel("Currency").selectOption(
    "BDT",
  );

  // Target the actual borrowed-loan destination account field.
  const accountSelect = page.locator("#loan-account");


  await accountSelect.selectOption({
    index: 1,
  });

  await page.getByRole("button", {
    name: "Save Loan",
    exact: true,
  }).click();

  await expect(page).toHaveURL(
    /\/loans$/,
  );

  const loanLink = page.getByRole("link", {
    name: personName,
    exact: true,
  });

  await expect(
    loanLink,
  ).toBeVisible();

  const loanCard = loanLink.locator(
    "xpath=ancestor::article",
  );

  await expect(
    loanCard,
  ).toBeVisible();

  await expect(
    loanCard.getByText("You borrowed", {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    loanCard.getByText("BDT 250.00", {
      exact: true,
    }).first(),
  ).toBeVisible();
});

test("loan reliability page loads", async ({
  page,
}) => {
  await page.goto("/loans/reliability");

  await expect(
    page.getByRole("heading", {
      name: /loan reliability/i,
    }),
  ).toBeVisible();
});


