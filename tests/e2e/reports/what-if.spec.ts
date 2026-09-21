import { expect, test } from "@playwright/test";

test.describe("What-if Simulation report", () => {
  test("what-if simulation report loads", async ({
    page,
  }) => {
    await page.goto("/reports/what-if");

    await expect(
      page.getByRole("heading", {
        name: "What-if Simulation",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Scenario settings",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Run Simulation",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Methodology",
      }),
    ).toBeVisible();
  });

  test("what-if simulation can run a scenario", async ({
    page,
  }) => {
    await page.goto("/reports/what-if");

    await page
      .getByLabel("Monthly income change")
      .fill("5000");

    await page
      .getByLabel("Monthly expense change")
      .fill("-1000");

    await page
      .getByLabel("Forecast horizon")
      .selectOption("6");

    await page
      .getByLabel("Historical lookback")
      .selectOption("6");

    await page
      .getByRole("button", {
        name: "Run Simulation",
      })
      .click();

    await expect(
      page.getByRole("heading", {
        name: "Baseline vs Scenario",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Net Difference Visualization",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Scenario by Month",
      }),
    ).toBeVisible();
  });

  test("reports navigation includes What-if Simulation", async ({
    page,
  }) => {
    await page.goto("/reports");

    const whatIfLink = page.getByRole("link", {
      name: "What-if Simulation",
    });

    await expect(whatIfLink).toBeVisible();

    await whatIfLink.click();

    await expect(page).toHaveURL(
      /\/reports\/what-if$/,
    );

    await expect(
      page.getByRole("heading", {
        name: "What-if Simulation",
      }),
    ).toBeVisible();
  });
});
