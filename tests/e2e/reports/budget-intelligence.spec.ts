import { expect, test } from "@playwright/test";

test.describe("Budget Intelligence report", () => {
  test("budget intelligence report loads", async ({ page }) => {
    await page.goto("/reports/budget-intelligence");

    await expect(
      page.getByRole("heading", {
        name: "Budget Intelligence",
      }),
    ).toBeVisible();

    await expect(
      page.getByText(
        "See where current spending pace is projected to take each active budget by the end of its period.",
      ),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Methodology",
      }),
    ).toBeVisible();
  });

  test("reports navigation includes Budget Intelligence", async ({
    page,
  }) => {
    await page.goto("/reports");

    const budgetIntelligenceLink =
      page.getByRole("link", {
        name: "Budget Intelligence",
      });

    await expect(
      budgetIntelligenceLink,
    ).toBeVisible();

    await budgetIntelligenceLink.click();

    await expect(page).toHaveURL(
      /\/reports\/budget-intelligence$/,
    );

    await expect(
      page.getByRole("heading", {
        name: "Budget Intelligence",
      }),
    ).toBeVisible();
  });
});
