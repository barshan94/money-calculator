import { test, expect } from "@playwright/test";

// Happy-path smoke tests for each major domain
// One test per domain to verify basic navigation and page load works

test.describe("Happy-path smoke tests", () => {
test("audit domain loads", async ({ page }) => {
await page.goto("/audit");
await expect(
page.getByRole("heading", {
name: "Audit Log",
exact: true,
}),
).toBeVisible();
});

test("accounts domain loads", async ({ page }) => {
await page.goto("/accounts");
await expect(
page.getByRole("heading", {
name: "Accounts",
exact: true,
}),
).toBeVisible();
});

test("budgets domain loads", async ({ page }) => {
await page.goto("/budgets");
await expect(
page.getByRole("heading", {
name: "Budgets",
exact: true,
}),
).toBeVisible();
});

test("categories domain loads", async ({ page }) => {
await page.goto("/categories");
await expect(
page.getByRole("heading", {
name: "Categories",
exact: true,
}),
).toBeVisible();
});

test("dashboard domain loads", async ({ page }) => {
await page.goto("/dashboard");
await expect(
page.getByRole("heading", {
name: "Dashboard",
exact: true,
}),
).toBeVisible();
});

test("deposits domain loads", async ({ page }) => {
await page.goto("/deposits");
await expect(
page.getByRole("heading", {
name: "Deposits",
exact: true,
}),
).toBeVisible();
});

test("goals domain loads", async ({ page }) => {
await page.goto("/goals");
await expect(
page.getByRole("heading", {
name: "Goals",
exact: true,
}),
).toBeVisible();
});

test("investments domain loads", async ({ page }) => {
await page.goto("/investments");
await expect(
page.getByRole("heading", {
name: "Investments",
exact: true,
}),
).toBeVisible();
});

test("loans domain loads", async ({ page }) => {
await page.goto("/loans");
await expect(
page.getByRole("heading", {
name: "Loans",
exact: true,
}),
).toBeVisible();
});

test("long-term-assets domain loads", async ({ page }) => {
await page.goto("/long-term-assets");
await expect(
page.getByRole("heading", {
name: "Long-Term Assets",
exact: true,
}),
).toBeVisible();
});

test("recurring domain loads", async ({ page }) => {
await page.goto("/recurring");
await expect(
page.getByRole("heading", {
name: "Recurring Transactions",
exact: true,
}),
).toBeVisible();
});

test("reports domain loads", async ({ page }) => {
await page.goto("/reports");
await expect(
page.getByRole("heading", {
name: "Reports",
exact: true,
}),
).toBeVisible();
});

test("transactions domain loads", async ({ page }) => {
await page.goto("/transactions");
await expect(
page.getByRole("heading", {
name: "Transactions",
exact: true,
}),
).toBeVisible();
});

test("tuition domain loads", async ({ page }) => {
await page.goto("/tuition");
await expect(
page.getByRole("heading", {
name: "Tuition",
exact: true,
}),
).toBeVisible();
});
});

