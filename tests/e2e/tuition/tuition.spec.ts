import { test, expect } from "@playwright/test";

async function openAddStudentForm(page: any) {
  await page.goto("/tuition");

  await expect(
    page.getByRole("heading", {
      name: "Tuition",
      exact: true,
    }),
  ).toBeVisible();

  await page.getByRole("button", {
    name: "Add Student",
    exact: true,
  }).click();

  await expect(page.locator("#student-name")).toBeVisible();
}

async function createStudent(page: any) {
  const timestamp = Date.now();
  const studentName = `E2E Student ${timestamp}`;
  const guardianName = `E2E Guardian ${timestamp}`;

  await openAddStudentForm(page);

  await page.locator("#student-name").fill(studentName);

  await page
    .getByLabel("Guardian Name", { exact: true })
    .fill(guardianName);

  const whatsapp = page.getByLabel("WhatsApp Number", {
    exact: true,
  });

  if (await whatsapp.isVisible().catch(() => false)) {
    await whatsapp.fill("01700000000");
  }

  await page
    .getByLabel("Monthly Fee", { exact: true })
    .fill("6000");

  const dueDay = page.getByLabel("Due Day", {
    exact: true,
  });

  if (await dueDay.isVisible().catch(() => false)) {
    await dueDay.fill("10");
  }

  // Submit and wait for any background network processing to resolve before navigating
  await Promise.all([
    page.waitForLoadState("networkidle").catch(() => {}),
    page.locator('form button[type="submit"]').first().click(),
  ]);

  // Wait for the modal/form input to close before proceeding
  await expect(page.locator("#student-name")).not.toBeVisible({ timeout: 10000 });

  await page.goto("/tuition");

  await expect(
    studentRow(page, studentName),
  ).toBeVisible({ timeout: 15000 });

  return { studentName, guardianName };
}

/** Only match student list rows (have Edit), not history/other tables. */
function studentRow(page: any, studentName: string) {
  return page
    .getByRole("row")
    .filter({ hasText: studentName })
    .filter({
      has: page.getByRole("button", { name: "Edit", exact: true }),
    })
    .first();
}

function tuitionPaymentForm(page: any) {
  return page
    .locator("form")
    .filter({
      has: page.getByLabel("Payment Amount", {
        exact: true,
      }),
    });
}

function paymentHistoryRow(page: any, amount: string) {
  return page
    .locator("table.tuition-table tbody tr")
    .filter({
      hasText: amount,
    })
    .last();
}

test("tuition page loads", async ({ page }) => {
  await page.goto("/tuition");

  await expect(
    page.getByRole("heading", {
      name: "Tuition",
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", {
      name: "Add Student",
      exact: true,
    }),
  ).toBeVisible();
});

test("add student form works", async ({ page }) => {
  const timestamp = Date.now();
  const studentName = `E2E Student ${timestamp}`;
  const guardianName = `E2E Guardian ${timestamp}`;

  await openAddStudentForm(page);

  await page.locator("#student-name").fill(studentName);

  await page
    .getByLabel("Guardian Name", { exact: true })
    .fill(guardianName);

  await page
    .getByLabel("Monthly Fee", { exact: true })
    .fill("6000");

  await page
    .getByLabel("Due Day", { exact: true })
    .fill("10");

  await Promise.all([
    page.waitForLoadState("networkidle").catch(() => {}),
    page.locator('form button[type="submit"]').first().click(),
  ]);

  await expect(page.locator("#student-name")).not.toBeVisible({ timeout: 10000 });

  await page.goto("/tuition");

  await expect(
    studentRow(page, studentName),
  ).toBeVisible({ timeout: 15000 });
});

test("edit a tuition student", async ({ page }) => {
  const { studentName } = await createStudent(page);

  const row = studentRow(page, studentName);

  await row.getByRole("button", {
    name: "Edit",
    exact: true,
  }).click();

  const updatedName = `${studentName} Updated`;

  const editInput = page.locator("#edit-student-name");

  await expect(editInput).toBeVisible();

  await editInput.fill(updatedName);

  await Promise.all([
    page.waitForLoadState("networkidle").catch(() => {}),
    page.getByRole("button", {
      name: "Save Changes",
      exact: true,
    }).click(),
  ]);

  await expect(
    studentRow(page, updatedName),
  ).toBeVisible({ timeout: 15000 });
});

test("record a tuition payment", async ({ page }) => {
  const { studentName } = await createStudent(page);

  const row = studentRow(page, studentName);

  await row.getByRole("button", {
    name: "Record Payment",
    exact: true,
  }).click();

  const paymentForm = tuitionPaymentForm(page);

  await expect(paymentForm).toBeVisible();

  await paymentForm
    .getByLabel("Payment Amount", {
      exact: true,
    })
    .fill("6000");

  const receivedInto = paymentForm.getByLabel(
    "Received Into",
    {
      exact: true,
    },
  );

  const option = receivedInto.locator(
    'option[value]:not([value=""])',
  );

  await expect(option.first()).toBeAttached({
    timeout: 10000,
  });

  await receivedInto.selectOption({
    index: 1,
  });

  await Promise.all([
    page.waitForLoadState("networkidle").catch(() => {}),
    paymentForm.getByRole("button", {
      name: "Record Payment",
      exact: true,
    }).click(),
  ]);

  await expect(
    studentRow(page, studentName),
  ).toBeVisible({ timeout: 15000 });

  await expect(
    studentRow(page, studentName).getByText(
      /paid/i,
    ),
  ).toBeVisible();
});

test("cancel a tuition payment", async ({ page }) => {
  const { studentName } = await createStudent(page);

  let row = studentRow(page, studentName);

  await row
    .getByRole("button", {
      name: "Record Payment",
      exact: true,
    })
    .click();

  const paymentForm = tuitionPaymentForm(page);

  await expect(paymentForm).toBeVisible();

  await paymentForm
    .getByLabel("Payment Amount", {
      exact: true,
    })
    .fill("6000");

  const receivedInto = paymentForm.getByLabel(
    "Received Into",
    {
      exact: true,
    },
  );

  const option = receivedInto.locator(
    'option[value]:not([value=""])',
  );

  await expect(option.first()).toBeAttached({
    timeout: 10000,
  });

  await receivedInto.selectOption({
    index: 1,
  });

  await Promise.all([
    page.waitForLoadState("networkidle").catch(() => {}),
    paymentForm
      .getByRole("button", {
        name: "Record Payment",
        exact: true,
      })
      .click(),
  ]);

  // Re-query after mutation.
  row = studentRow(page, studentName);

  await expect(row).toBeVisible({
    timeout: 15000,
  });

  await expect(
    row.getByText(/paid/i),
  ).toBeVisible();

  await row
    .getByRole("button", {
      name: "History",
      exact: true,
    })
    .click();

  await expect(
    page.getByRole("heading", {
      name: /payment history/i,
    }),
  ).toBeVisible();

  const historyRow = paymentHistoryRow(
    page,
    "6,000",
  );

  await expect(historyRow).toBeVisible({
    timeout: 15000,
  });

  // cancelPayment() uses window.confirm().
  page.once("dialog", (dialog) => dialog.accept());

  await historyRow
    .getByRole("button", {
      name: "Cancel",
      exact: true,
    })
    .click();

  // Cancelled payments remain in history for audit purposes.
  await expect(historyRow).toBeVisible({
    timeout: 15000,
  });

  await page
    .getByRole("button", {
      name: "Close",
      exact: true,
    })
    .click();

  // The cancelled payment must no longer count toward the
  // student's current month's tuition status.
  row = studentRow(page, studentName);

  await expect(row).toBeVisible({
    timeout: 15000,
  });

  await expect(
    row.getByText(/unpaid/i),
  ).toBeVisible();
});

test("student archive works", async ({ page }) => {
  const { studentName } = await createStudent(page);

  const row = studentRow(page, studentName);

  page.on("dialog", (dialog) => dialog.accept());

  await row.getByRole("button", {
    name: "Archive",
    exact: true,
  }).click();

  const confirmBtn = page.getByRole("button", {
    name: /confirm|yes|archive/i,
  });

  if (
    await confirmBtn
      .isVisible()
      .catch(() => false)
  ) {
    await confirmBtn.click();
  }

  await expect(
    studentRow(page, studentName),
  ).not.toBeVisible({ timeout: 15000 });
});

test("student edit form can be cancelled", async ({
  page,
}) => {
  const { studentName } = await createStudent(page);

  const row = studentRow(page, studentName);

  await row.getByRole("button", {
    name: "Edit",
    exact: true,
  }).click();

  const nameInput = page.locator("#edit-student-name");

  await expect(nameInput).toBeVisible();

  await nameInput.fill(
    `${studentName} Cancelled`,
  );

  await page.getByRole("button", {
    name: "Cancel",
    exact: true,
  }).click();

  await expect(
    studentRow(page, studentName),
  ).toBeVisible();

  await expect(
    page.getByText(
      `${studentName} Cancelled`,
      {
        exact: true,
      },
    ),
  ).not.toBeVisible();
});

test("student history action works", async ({
  page,
}) => {
  const { studentName } = await createStudent(page);

  const row = studentRow(page, studentName);

  await row.getByRole("button", {
    name: "History",
    exact: true,
  }).click();

  await expect(
    page.getByRole("heading", {
      name: /payment history/i,
    }),
  ).toBeVisible();

  await page.getByRole("button", {
    name: "Close",
    exact: true,
  }).click();
});


