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
    executablePath: "/usr/bin/chromium",
    headless: true,
    timeout: 10000,
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-software-rasterizer",
      "--disable-features=UseDBus",
    ],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("http://127.0.0.1:3000/auth/login", {
    waitUntil: "domcontentloaded",
    timeout: 10000,
  });

  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);

  await page.getByRole("button", { name: "Login", exact: true }).click();

  await page.waitForTimeout(2000);

console.log("URL AFTER LOGIN:", page.url());
console.log(
  "LOGIN PAGE TEXT:",
  (await page.locator("body").innerText()).slice(0, 1500),
);


  await context.storageState({
  path: "playwright/.auth/user.json",
});

  

  await context.storageState({
    path: "playwright/.auth/user.json",
  });

  await browser.close();
});

