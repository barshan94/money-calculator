import {
  chromium,
  expect,
  test as setup,
} from "@playwright/test";

setup("authenticate", async ({ baseURL }) => {
  setup.setTimeout(180000);

  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are required",
    );
  }

  const browser = await chromium.launch({
    headless: true,
    timeout: 30000,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);

  const origin =
    baseURL?.replace(/\/$/, "") ?? "http://127.0.0.1:3000";

  try {
    console.log("E2E BASE URL:", origin);

    await page.goto(`${origin}/auth/login`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await expect(
      page.getByPlaceholder("Email"),
    ).toBeVisible();

    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill(password);

    await page.getByRole("button", {
      name: "Login",
      exact: true,
    }).click();

    await page.waitForURL(
      (url) => !url.pathname.startsWith("/auth/login"),
      {
        timeout: 30000,
      },
    );

    console.log("URL AFTER LOGIN:", page.url());

    console.log(
      "COOKIES:",
      (await context.cookies()).map(
        (cookie) => cookie.name,
      ),
    );

    const accountName = `E2E Cash ${Date.now()}`;

    await page.goto(`${origin}/accounts/new`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await expect(
      page.getByLabel("Account name"),
    ).toBeVisible();

    await page
      .getByLabel("Account name")
      .fill(accountName);

    await page
      .getByLabel("Account type")
      .selectOption("asset");

    await page
      .getByLabel("Availability")
      .selectOption("immediate");

    await page
      .getByLabel("Currency")
      .selectOption("BDT");

    await page.getByRole("button", {
      name: "Create Account",
      exact: true,
    }).click();

    await page.waitForURL(
      (url) => url.pathname === "/accounts",
      {
        timeout: 30000,
      },
    );

    console.log("E2E ACCOUNT:", accountName);

    const categoryName = `E2E Expense ${Date.now()}`;

    await page.goto(`${origin}/categories`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await expect(
      page.getByLabel("Category name"),
    ).toBeVisible();

    await page
      .getByLabel("Category name")
      .fill(categoryName);

    await page
      .getByLabel("Category type")
      .selectOption("expense");

    const createCategoryButton = page.getByRole(
      "button",
      {
        name: "Create Category",
        exact: true,
      },
    );

    await expect(createCategoryButton).toBeEnabled();

    await createCategoryButton.click();

    await expect(
      page.getByText(categoryName, {
        exact: true,
      }),
    ).toBeVisible({
      timeout: 30000,
    });

    console.log("E2E CATEGORY:", categoryName);

    await context.storageState({
      path: "playwright/.auth/user.json",
    });

    console.log(
      "Playwright authentication state saved successfully.",
    );
  } catch (error) {
    console.error(
      "Playwright authentication setup failed.",
    );

    console.error(
      "Current URL:",
      page.url(),
    );

    console.error(
      "Page title:",
      await page.title().catch(() => "Unable to read title"),
    );

    console.error(
      "Visible body text:",
      (
        await page
          .locator("body")
          .innerText()
          .catch(() => "Unable to read body")
      ).slice(0, 5000),
    );

    throw error;
  } finally {
    await browser.close();
  }
});


