import { test, expect } from "@playwright/test";

test.describe("Investments", () => {
  async function createInvestment(
    page: any,
    amount = "10000",
    quantity = "100",
    purchasePrice = "100",
  ) {
    const investmentName = `E2E Investment ${Date.now()}`;

    await page.goto("/investments/new");

    await expect(
      page.getByRole("heading", {
        name: "New Investment",
        exact: true,
      }),
    ).toBeVisible();

    await page
      .getByLabel("Investment Name", { exact: true })
      .fill(investmentName);

    await page
      .getByLabel("Investment Type", { exact: true })
      .selectOption("stock");

    await page
      .getByLabel("Invested Amount", { exact: true })
      .fill(amount);

    await page
      .getByLabel("Currency", { exact: true })
      .selectOption("BDT");

    await page
      .getByLabel("Quantity (optional)", { exact: true })
      .fill(quantity);

    await page
      .getByLabel("Purchase Price (optional)", {
        exact: true,
      })
      .fill(purchasePrice);

    const paidFrom = page.getByLabel("Paid From", {
      exact: true,
    });

    await expect(paidFrom).toBeVisible();

    const accountOption = paidFrom.locator(
      'option[value]:not([value=""])',
    );

    await expect(accountOption.first()).toBeAttached({
      timeout: 10000,
    });

    await paidFrom.selectOption({ index: 1 });

    await page.getByRole("button", {
      name: "Save Investment",
      exact: true,
    }).click();

    await expect(page).toHaveURL(/\/investments$/);

    const investmentLink = page.getByRole("link", {
      name: investmentName,
      exact: true,
    });

    await expect(investmentLink).toBeVisible();

    await investmentLink.click();

    await expect(page).toHaveURL(
      /\/investments\/[^/]+$/,
    );

    return investmentName;
  }

  test("investments page loads", async ({ page }) => {
    await page.goto("/investments");

    await expect(
      page.getByRole("heading", {
        name: "Investments",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("link", {
        name: "+ New Investment",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("new investment page loads", async ({ page }) => {
    await page.goto("/investments/new");

    await expect(
      page.getByRole("heading", {
        name: "New Investment",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByLabel("Investment Name", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Save Investment",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("create investment works", async ({ page }) => {
    const investmentName =
      await createInvestment(page);

    await expect(
      page.getByRole("heading", {
        name: investmentName,
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Current Value", {
        exact: true,
      }).first(),
    ).toBeVisible();

    await expect(
      page.getByText("Remaining Cost", {
        exact: true,
      }).first(),
    ).toBeVisible();
  });

  test("edit investment and update current value works", async ({
    page,
  }) => {
    const investmentName =
      await createInvestment(
        page,
        "10000",
        "100",
        "100",
      );

    await page.getByRole("link", {
      name: "Edit",
      exact: true,
    }).click();

    await expect(page).toHaveURL(
      /\/investments\/[^/]+\/edit$/,
    );

    await expect(
      page.getByRole("heading", {
        name: "Edit Investment",
        exact: true,
      }),
    ).toBeVisible();

    const nameInput = page.getByLabel(
      "Investment Name",
      { exact: true },
    );

    await nameInput.fill(
      `${investmentName} Updated`,
    );

    await page
      .getByLabel("Current Value", {
        exact: true,
      })
      .fill("12000");

    await page
      .getByLabel("Description", {
        exact: true,
      })
      .fill("E2E updated investment");

    await page.getByRole("button", {
      name: "Save Changes",
      exact: true,
    }).click();

    await expect(page).toHaveURL(
      /\/investments\/[^/]+$/,
    );

    await expect(
      page.getByRole("heading", {
        name: `${investmentName} Updated`,
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("BDT 12,000.00", {
        exact: true,
      }).first(),
    ).toBeVisible();

    await expect(
      page.getByText("E2E updated investment", {
        exact: true,
      }),
    ).toBeVisible();
  });

  test("buy more investment works", async ({ page }) => {
    await createInvestment(
      page,
      "10000",
      "100",
      "100",
    );

    await page.getByRole("link", {
      name: "+ Buy More",
      exact: true,
    }).click();

    await expect(page).toHaveURL(
      /\/investments\/[^/]+\/buy$/,
    );

    await expect(
      page.getByRole("heading", {
        name: "Buy More",
        exact: true,
      }),
    ).toBeVisible();

    await page
      .getByLabel("Quantity", {
        exact: true,
      })
      .fill("20");

    await page
      .getByLabel("Purchase Price per Unit", {
        exact: true,
      })
      .fill("110");

    await expect(
      page.getByLabel("Total Investment Amount", {
        exact: true,
      }),
    ).toHaveValue("2200.00");

    const paidFrom = page.getByLabel("Paid From", {
      exact: true,
    });

    const accountOption = paidFrom.locator(
      'option[value]:not([value=""])',
    );

    await expect(accountOption.first()).toBeAttached({
      timeout: 10000,
    });

    await paidFrom.selectOption({ index: 1 });

    await page.getByRole("button", {
      name: "Buy More",
      exact: true,
    }).click();

    await expect(page).toHaveURL(
      /\/investments\/[^/]+$/,
    );

    await expect(
      page.getByText("BUY", {
        exact: true,
      }).first(),
    ).toBeVisible();

    await expect(
      page.getByText("Purchased 20 units", {
        exact: true,
      }),
    ).toBeVisible();
  });

  test("sell investment works", async ({ page }) => {
    await createInvestment(
      page,
      "10000",
      "100",
      "100",
    );

    await page.getByRole("link", {
      name: "Sell",
      exact: true,
    }).click();

    await expect(page).toHaveURL(
      /\/investments\/[^/]+\/sell$/,
    );

    await expect(
      page.getByRole("heading", {
        name: "Sell Investment",
        exact: true,
      }),
    ).toBeVisible();

    await page
      .getByLabel("Quantity to Sell", {
        exact: true,
      })
      .fill("50");

    await page
      .getByLabel("Sale Price Per Unit", {
        exact: true,
      })
      .fill("120");

    await expect(
      page.getByText("BDT 6,000.00", {
        exact: true,
      }),
    ).toBeVisible();

    const receiveAccount = page.getByLabel(
      "Receive Money Into",
      { exact: true },
    );

    const accountOption = receiveAccount.locator(
      'option[value]:not([value=""])',
    );

    await expect(accountOption.first()).toBeAttached({
      timeout: 10000,
    });

    await receiveAccount.selectOption({
      index: 1,
    });

    await page.getByRole("button", {
      name: "Confirm Sale",
      exact: true,
    }).click();

    await expect(page).toHaveURL(
      /\/investments\/[^/]+$/,
    );

    await expect(
      page.getByText("SELL", {
        exact: true,
      }).first(),
    ).toBeVisible();

    await expect(
      page.getByText("Sold 50 units", {
        exact: true,
      }),
    ).toBeVisible();
  });

  test("partial sale updates remaining holding", async ({
    page,
  }) => {
    await createInvestment(
      page,
      "10000",
      "100",
      "100",
    );

    await page.getByRole("link", {
      name: "Sell",
      exact: true,
    }).click();

    await page
      .getByLabel("Quantity to Sell", {
        exact: true,
      })
      .fill("40");

    await page
      .getByLabel("Sale Price Per Unit", {
        exact: true,
      })
      .fill("125");

    const receiveAccount = page.getByLabel(
      "Receive Money Into",
      { exact: true },
    );

    const accountOption = receiveAccount.locator(
      'option[value]:not([value=""])',
    );

    await expect(accountOption.first()).toBeAttached({
      timeout: 10000,
    });

    await receiveAccount.selectOption({
      index: 1,
    });

    await page.getByRole("button", {
      name: "Confirm Sale",
      exact: true,
    }).click();

    await expect(page).toHaveURL(
      /\/investments\/[^/]+$/,
    );

    await expect(
      page.getByText("60.00", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("link", {
        name: "Sell",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("investment activity history records buy and sell", async ({
    page,
  }) => {
    await createInvestment(
      page,
      "10000",
      "100",
      "100",
    );

    await page.getByRole("link", {
      name: "+ Buy More",
      exact: true,
    }).click();

    await page
      .getByLabel("Quantity", {
        exact: true,
      })
      .fill("10");

    await page
      .getByLabel("Purchase Price per Unit", {
        exact: true,
      })
      .fill("105");

    const paidFrom = page.getByLabel("Paid From", {
      exact: true,
    });

    const paidOption = paidFrom.locator(
      'option[value]:not([value=""])',
    );

    await expect(paidOption.first()).toBeAttached({
      timeout: 10000,
    });

    await paidFrom.selectOption({ index: 1 });

    await page.getByRole("button", {
      name: "Buy More",
      exact: true,
    }).click();

    await expect(page).toHaveURL(
      /\/investments\/[^/]+$/,
    );

    await page.getByRole("link", {
      name: "Sell",
      exact: true,
    }).click();

    await page
      .getByLabel("Quantity to Sell", {
        exact: true,
      })
      .fill("10");

    await page
      .getByLabel("Sale Price Per Unit", {
        exact: true,
      })
      .fill("115");

    const receiveAccount = page.getByLabel(
      "Receive Money Into",
      { exact: true },
    );

    const receiveOption = receiveAccount.locator(
      'option[value]:not([value=""])',
    );

    await expect(receiveOption.first()).toBeAttached({
      timeout: 10000,
    });

    await receiveAccount.selectOption({
      index: 1,
    });

    await page.getByRole("button", {
      name: "Confirm Sale",
      exact: true,
    }).click();

    await expect(page).toHaveURL(
      /\/investments\/[^/]+$/,
    );

    await expect(
      page.getByText("Investment Activity", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("BUY", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("SELL", {
        exact: true,
      }),
    ).toBeVisible();
  });
});

