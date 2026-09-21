import { expect, test } from "@playwright/test";

test.describe("Liquidity & Risk Warnings report", () => {
  test("loads from Reports and displays the risk review", async ({
    page,
  }) => {
    await page.goto("/reports");

    await expect(
      page.getByRole("link", {
        name: "Liquidity & Risk Warnings",
      }),
    ).toBeVisible();

    await page
      .getByRole("link", {
        name: "Liquidity & Risk Warnings",
      })
      .click();

    await expect(
      page.getByRole("heading", {
        name: "Liquidity & Risk Warnings",
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Financial intelligence"),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Methodology",
      }),
    ).toBeVisible();
  });
});
