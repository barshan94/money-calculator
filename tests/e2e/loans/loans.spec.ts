test("borrow money page can be opened", async ({
  page,
}) => {
  await page.goto("/loans/new");

  await page.getByLabel("Type").selectOption("borrowed");

  await expect(
    page.getByRole("heading", {
      name: /borrow money/i,
    }),
  ).toBeVisible();

  await expect(
    page.getByLabel("Person"),
  ).toBeVisible();

  await expect(
    page.getByLabel("Amount"),
  ).toBeVisible();
});

test("borrowed loan can be created", async ({
  page,
}) => {
  const personName = `E2E Borrow ${Date.now()}`;

  await page.goto("/loans/new");

  await page.getByLabel("Type").selectOption("borrowed");

  await expect(
    page.getByRole("heading", {
      name: /borrow money/i,
    }),
  ).toBeVisible();

  await page.getByLabel("Person").fill(personName);
  await page.getByLabel("Amount").fill("250");
  await page.getByLabel("Currency").selectOption("BDT");

  const accountSelect = page.getByLabel(
    /account|money into|wallet/i,
  );

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

  const loanCard = loanLink.locator(
    "xpath=ancestor::article",
  );

  await expect(loanCard).toBeVisible();

  await expect(
    loanCard.getByText("BDT 250.00", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await expect(
    loanCard.getByText("You borrowed", {
      exact: true,
    }),
  ).toBeVisible();
});

