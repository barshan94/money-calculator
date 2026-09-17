import { chromium, test as setup } from "@playwright/test";

setup("authenticate", async () => {
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

  await page.goto("http://127.0.0.1:3000/auth/login", {
    waitUntil: "networkidle",
    timeout: 30000,
  });

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
    (await context.cookies()).map((cookie) => cookie.name),
  );

  // Prepare an E2E asset account for financial tests.
  const accountName = `E2E Cash ${Date.now()}`;

  await page.goto("http://127.0.0.1:3000/accounts/new", {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  await page.getByLabel("Account name").fill(accountName);

  await page.getByLabel("Account type").selectOption("asset");

  await page.getByLabel("Availability").selectOption(
    "immediate",
  );

  await page.getByLabel("Currency").selectOption("BDT");

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

  await context.storageState({
    path: "playwright/.auth/user.json",
  });

  await browser.close();
});