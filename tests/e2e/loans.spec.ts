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

  const accountSelect =
    page.getByLabel("Money From");

  await expect(accountSelect).toBeVisible();

  await expect(
    accountSelect.locator("option").nth(1),
  ).toBeAttached();

  await accountSelect.selectOption({
    index: 1,
  });

  await page.getByRole("button", {
    name: "Save Loan",
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/loans$/);

  const loanCard = page
    .locator("article.loan-card")
    .filter({
      has: page.getByRole("link", {
        name: personName,
        exact: true,
      }),
    });

  await expect(loanCard).toBeVisible();

  await expect(
    loanCard
      .locator(".loan-card-financial > div")
      .first()
      .getByText("BDT 100.00", {
        exact: true,
      }),
  ).toBeVisible();
});

test("repay a loan partially and settle it", async ({
  page,
}) => {
  const personName =
    `E2E Settlement ${Date.now()}`;

  /*
   * CREATE LOAN
   */
  await page.goto("/loans/new");

  await page.getByLabel("Person").fill(personName);
  await page.getByLabel("Amount").fill("100");
  await page.getByLabel("Currency").selectOption("BDT");

  const sourceAccount =
    page.getByLabel("Money From");

  await expect(sourceAccount).toBeVisible();

  await expect(
    sourceAccount.locator("option").nth(1),
  ).toBeAttached();

  await sourceAccount.selectOption({
    index: 1,
  });

  await page.getByRole("button", {
    name: "Save Loan",
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/loans$/);

  /*
   * OPEN LOAN DETAIL
   */
  const loanLink = page.getByRole("link", {
    name: personName,
    exact: true,
  });

  await expect(loanLink).toBeVisible();

  const loanHref =
    await loanLink.getAttribute("href");

  expect(loanHref).toMatch(
    /^\/loans\/[^/]+$/,
  );

  await page.goto(loanHref!);

  await expect(page).toHaveURL(
    /\/loans\/[^/]+$/,
  );

  /*
   * VERIFY INITIAL BALANCE
   */
  await expect(
    page.getByText("BDT 100.00", {
      exact: true,
    }).first(),
  ).toBeVisible();

  /*
   * OPEN REPAYMENT PAGE
   */
  const repaymentLink =
    page.getByRole("link", {
      name: "Record Repayment",
      exact: true,
    });

  await expect(repaymentLink).toBeVisible();

  const repaymentHref =
    await repaymentLink.getAttribute("href");

  expect(repaymentHref).toMatch(
    /^\/loans\/[^/]+\/repay$/,
  );

  await page.goto(repaymentHref!);

  await expect(page).toHaveURL(
    /\/loans\/[^/]+\/repay$/,
  );

  /*
   * FIRST REPAYMENT: 40
   */
  await expect(
    page.getByRole("heading", {
      name: /record repayment/i,
    }),
  ).toBeVisible();

  await page.getByLabel("Amount").fill("40");

  const repaymentAccount =
    page.getByLabel("Money To");

  await expect(
    repaymentAccount,
  ).toBeVisible();

  await expect(
    repaymentAccount.locator("option").nth(1),
  ).toBeAttached();

  await repaymentAccount.selectOption({
    index: 1,
  });

  await page.getByRole("button", {
    name: /record repayment/i,
  }).click();

  /*
   * VERIFY PARTIAL REPAYMENT
   */
  await expect(page).toHaveURL(
    /\/loans\/[^/]+$/,
  );

  await expect(
    page.getByText("BDT 60.00", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await expect(
    page.getByText("BDT 40.00", {
      exact: true,
    }).first(),
  ).toBeVisible();

  /*
   * SECOND REPAYMENT: 60
   */
  const secondRepaymentLink =
    page.getByRole("link", {
      name: "Record Repayment",
      exact: true,
    });

  await expect(
    secondRepaymentLink,
  ).toBeVisible();

  const secondRepaymentHref =
    await secondRepaymentLink.getAttribute(
      "href",
    );

  expect(secondRepaymentHref).toMatch(
    /^\/loans\/[^/]+\/repay$/,
  );

  await page.goto(secondRepaymentHref!);

  await expect(page).toHaveURL(
    /\/loans\/[^/]+\/repay$/,
  );

  await page.getByLabel("Amount").fill("60");

  const secondAccount =
    page.getByLabel("Money To");

  await expect(secondAccount).toBeVisible();

  await expect(
    secondAccount.locator("option").nth(1),
  ).toBeAttached();

  await secondAccount.selectOption({
    index: 1,
  });

  await page.getByRole("button", {
    name: /record repayment/i,
  }).click();

  /*
   * VERIFY SETTLEMENT
   */
  await expect(page).toHaveURL(
    /\/loans\/[^/]+$/,
  );

  await expect(
    page.getByText("BDT 0.00", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await expect(
    page.getByText("Settled", {
      exact: true,
    }).first(),
  ).toBeVisible();

  /*
   * VERIFY REPAYMENTS
   */
  await expect(
    page.getByText("BDT 40.00", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await expect(
    page.getByText("BDT 60.00", {
      exact: true,
    }).first(),
  ).toBeVisible();

  /*
   * NO MORE ACTIVE REPAYMENT ACTION
   */
  await expect(
    page.getByRole("link", {
      name: "Record Repayment",
      exact: true,
    }),
  ).not.toBeVisible();
});

