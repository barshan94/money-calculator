import { expect, test } from "@playwright/test";

test.describe("Goal Forecast report", () => {
  test("goal forecast report loads", async ({ page }) => {
    await page.goto("/reports/goal-forecast");

    await expect(
      page.getByRole("heading", {
        name: "Goal Forecast",
      }),
    ).toBeVisible();

    await expect(
      page.getByText(
        "See the contribution pace required to reach each active goal by its target date.",
      ),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Methodology",
      }),
    ).toBeVisible();
  });

  test("reports navigation includes Goal Forecast", async ({
    page,
  }) => {
    await page.goto("/reports");

    const goalForecastLink = page.getByRole("link", {
      name: "Goal Forecast",
    });

    await expect(goalForecastLink).toBeVisible();

    await goalForecastLink.click();

    await expect(page).toHaveURL(
      /\/reports\/goal-forecast$/,
    );

    await expect(
      page.getByRole("heading", {
        name: "Goal Forecast",
      }),
    ).toBeVisible();
  });
});


