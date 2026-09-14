cat > tests/e2e/loans.spec.ts <<'EOF'
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
      name: /new loan/i,
    }),
  ).toBeVisible();
});
EOF


