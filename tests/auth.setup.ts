
import { test as setup, expect } from "@playwright/test";

const authFile = "playwright/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing PLAYWRIGHT_TEST_EMAIL or PLAYWRIGHT_TEST_PASSWORD",
    );
  }

  page.on("pageerror", (error) => {
    console.log("PAGE ERROR:", error.message);
  });

  page.on("console", (message) => {
    console.log(
      `BROWSER ${message.type().toUpperCase()}:`,
      message.text(),
    );
  });

  page.on("request", (request) => {
    if (
      request.url().includes("/auth/v1/") ||
      request.url().includes("/rest/v1/")
    ) {
      console.log(
        "SUPABASE REQUEST:",
        request.method(),
        request.url(),
      );
    }
  });

  page.on("response", (response) => {
    if (
      response.url().includes("/auth/v1/") ||
      response.url().includes("/rest/v1/")
    ) {
      console.log(
        "SUPABASE RESPONSE:",
        response.status(),
        response.url(),
      );
    }
  });

  await page.goto("/auth/login");

  console.log(
    "LOGIN BUTTON COUNT:",
    await page.getByRole("button", {
      name: "Login",
    }).count(),
  );

  console.log(
    "EMAIL VALUE BEFORE:",
    await page.getByPlaceholder("Email").inputValue(),
  );

  await page
    .getByPlaceholder("Email")
    .fill(email);

  await page
    .getByPlaceholder("Password")
    .fill(password);

  console.log(
    "EMAIL VALUE AFTER:",
    await page.getByPlaceholder("Email").inputValue(),
  );

  console.log(
    "PASSWORD FILLED:",
    Boolean(
      await page
        .getByPlaceholder("Password")
        .inputValue(),
    ),
  );

  console.log("CLICKING LOGIN...");

  await page
    .getByRole("button", { name: "Login" })
    .click();

  console.log("LOGIN CLICK COMPLETED");

  await page.waitForTimeout(3000);

  console.log(
    "FINAL URL:",
    page.url(),
  );

  console.log(
    "PAGE TEXT:",
    await page.locator("body").innerText(),
  );

  console.log(
    "COOKIE NAMES:",
    (await page.context().cookies()).map(
      (cookie) => cookie.name,
    ),
  );

  console.log(
    "SUPABASE STORAGE KEYS:",
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) =>
        key.includes("supabase"),
      ),
    ),
  );

  await expect(page).toHaveURL("/");

  await page.context().storageState({
    path: authFile,
  });
});