import { createClient } from "@supabase/supabase-js";

/**
 * Runs once before the whole Playwright suite.
 *
 * The CI Supabase project is used only for automated E2E testing
 * against one dedicated test account.
 *
 * Every E2E spec creates user-owned rows. To prevent data from
 * accumulating across CI runs, this setup removes all rows belonging
 * to the dedicated Playwright test user before the suite starts.
 *
 * IMPORTANT:
 * - Only the user identified by PLAYWRIGHT_TEST_EMAIL is affected.
 * - The service-role key is required.
 * - No production/other-user data is touched.
 *
 * Delete order follows the database's foreign-key dependencies:
 *
 *   1. long_term_assets
 *   2. tuition_students
 *      └─ cascades tuition_payments
 *   3. investments
 *      └─ cascades investment_activity
 *   4. recurring_transactions
 *   5. loans
 *   6. deposits
 *   7. goals
 *   8. investment_performance
 *   9. transactions
 *      └─ cascades transaction_entries
 *  10. budgets
 *  11. categories
 *  12. accounts
 *
 * transaction_entries has no user_id column and is therefore removed
 * through the transaction cascade.
 */

const TEST_USER_EMAIL =
  process.env.PLAYWRIGHT_TEST_EMAIL;

export default async function globalSetup() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.warn(
      "[global-setup] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — skipping E2E data cleanup.",
    );

    return;
  }

  if (!TEST_USER_EMAIL) {
    console.warn(
      "[global-setup] Missing PLAYWRIGHT_TEST_EMAIL — skipping E2E data cleanup.",
    );

    return;
  }

  const supabase = createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
      },
    },
  );

  /*
   * Resolve the dedicated E2E user's auth ID
   * from their email instead of hardcoding the UUID.
   *
   * This allows the CI test account to be rotated
   * without changing this file.
   */
  const {
    data: usersPage,
    error: userLookupError,
  } =
    await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

  if (userLookupError) {
    console.error(
      "[global-setup] Failed to look up test user:",
      userLookupError.message,
    );

    return;
  }

  const testUser =
    usersPage.users.find(
      (user) =>
        user.email === TEST_USER_EMAIL,
    );

  if (!testUser) {
    console.warn(
      `[global-setup] No auth user found for ${TEST_USER_EMAIL} — skipping E2E data cleanup.`,
    );

    return;
  }

  const userId = testUser.id;

  console.log(
    `[global-setup] Cleaning E2E data for ${TEST_USER_EMAIL}...`,
  );

  /*
   * Tables containing user-owned data.
   *
   * The order is intentional because several tables
   * participate in ON DELETE RESTRICT relationships.
   */
  const deletionOrder = [
    "long_term_assets",
    "tuition_students",
    "investments",
    "recurring_transactions",
    "loans",
    "deposits",
    "goals",
    "investment_performance",
    "transactions",
    "budgets",
    "categories",
    "accounts",
  ] as const;

  let totalDeleted = 0;

  for (const table of deletionOrder) {
    const {
      error,
      count,
    } = await supabase
      .from(table)
      .delete({
        count: "exact",
      })
      .eq("user_id", userId);

    if (error) {
      console.error(
        `[global-setup] Failed to clean ${table}:`,
        error.message,
      );

      throw new Error(
        `E2E cleanup failed for ${table}: ${error.message}`,
      );
    }

    const deletedCount = count ?? 0;

    totalDeleted += deletedCount;

    if (deletedCount > 0) {
      console.log(
        `[global-setup] ${table}: deleted ${deletedCount} row(s).`,
      );
    }
  }

  console.log(
    `[global-setup] E2E cleanup complete. Deleted ${totalDeleted} row(s).`,
  );
}
