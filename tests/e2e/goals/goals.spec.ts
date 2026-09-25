import { test, expect } from "@playwright/test";

async function createGoal(
  page: any,
  goalName: string,
  targetAmount: string,
) {
  await page.goto("/goals/new");

  await expect(
    page.getByRole("heading", {
      name: "New Goal",
    }),
  ).toBeVisible();

  await page
    .getByLabel("Goal Name")
    .fill(goalName);

  await page
    .getByLabel("Goal Type")
    .selectOption("savings");

  await page
    .getByLabel("Currency")
    .selectOption("BDT");

  await page
    .getByLabel("Target Amount")
    .fill(targetAmount);

  await page.getByRole("button", {
    name: "Create Goal",
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/goals$/);

  const goalHeading = page.getByRole("heading", {
    level: 2,
    name: goalName,
    exact: true,
  });

  await expect(goalHeading).toBeVisible();

  return goalHeading.locator("..");
}

async function openGoalDetail(
  page: any,
  goalName: string,
) {
  const goalHeading = page.getByRole("heading", {
    level: 2,
    name: goalName,
    exact: true,
  });

  await expect(goalHeading).toBeVisible();

  const goalLink = goalHeading
    .locator("xpath=..")
    .locator("..");

  await goalLink.click();

  await expect(page).toHaveURL(
    /\/goals\/[^/]+$/,
  );

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: goalName,
      exact: true,
    }),
  ).toBeVisible();
}

test.describe("Goals", () => {
  test("creates a goal", async ({ page }) => {
    const goalName = `E2E Goal ${Date.now()}`;

    await createGoal(
      page,
      goalName,
      "50000",
    );
  });

  test("updates goal progress", async ({
    page,
  }) => {
    const goalName =
      `E2E Progress Goal ${Date.now()}`;

    await createGoal(
      page,
      goalName,
      "10000",
    );

    await openGoalDetail(
      page,
      goalName,
    );

    await page
      .getByRole("link", {
        name: "Update Progress",
        exact: true,
      })
      .click();

    await expect(
      page.getByRole("heading", {
        name: "Update Progress",
      }),
    ).toBeVisible();

    await page
      .getByLabel("Current Amount")
      .fill("4000");

    await page.getByRole("button", {
      name: "Update Progress",
      exact: true,
    }).click();

    await expect(page).toHaveURL(
      /\/goals\/[^/]+$/,
    );

    await expect(
      page.getByText(
        "40.0% complete",
        { exact: true },
      ),
    ).toBeVisible();
  });

  test("edits an existing goal", async ({
    page,
  }) => {
    const goalName =
      `E2E Edit Goal ${Date.now()}`;

    const updatedName =
      `${goalName} Updated`;

    await createGoal(
      page,
      goalName,
      "20000",
    );

    await openGoalDetail(
      page,
      goalName,
    );

    await page
      .getByRole("link", {
        name: "Edit Goal",
        exact: true,
      })
      .click();

    await expect(
      page.getByRole("heading", {
        name: "Edit Goal",
      }),
    ).toBeVisible();

    await page
      .getByLabel("Goal Name")
      .fill(updatedName);

    await page
      .getByLabel("Target Amount")
      .fill("25000");

    await page.getByRole("button", {
      name: "Save Changes",
      exact: true,
    }).click();

    await expect(page).toHaveURL(
      /\/goals\/[^/]+$/,
    );

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: updatedName,
        exact: true,
      }),
    ).toBeVisible();
  });

  test("rejects progress above target", async ({
    page,
  }) => {
    const goalName =
      `E2E Progress Validation ${Date.now()}`;

    await createGoal(
      page,
      goalName,
      "1000",
    );

    await openGoalDetail(
      page,
      goalName,
    );

    await page
      .getByRole("link", {
        name: "Update Progress",
        exact: true,
      })
      .click();

    await expect(
      page.getByRole("heading", {
        name: "Update Progress",
      }),
    ).toBeVisible();

    await page
      .getByLabel("Current Amount")
      .fill("1500");

    await page.getByRole("button", {
      name: "Update Progress",
      exact: true,
    }).click();

    await expect(
      page.getByText(
        "Amount cannot exceed the target.",
        {
          exact: true,
        },
      ),
    ).toBeVisible();
  });
});
