import { createClient } from "@supabase/supabase-js";

/**
 * Runs once before the whole Playwright suite.
 *
 * The CI Supabase project's only purpose is running this E2E suite against
 * one fixed test account (PLAYWRIGHT_TEST_EMAIL). Every spec — tuition,
 * investments, budgets, transactions, accounts, categories, deposits,
 * loans, goals, recurring transactions — creates timestamped rows and
 * never deletes them. Over hundreds of CI runs this left tens of thousands
 * of leftover rows (visible directly in dropdown option counts in the app
 * itself), which slowed every list/reload query enough to blow past the
 * 15-30s timeouts used throughout the specs — producing failures that
 * looked like feature bugs but were actually data-volume/performance
 * issues unrelated to the code under test.
 *
 * Since this account holds no real data (CI-only, confirmed), the fix is
 * a full wipe of every row belonging to this one user before each run,
 * rather than pattern-matching "E2E ..." prefixes table by table (which
 * only ever covers the specs someone remembered to handle).
 *
 * Delete order is dictated by ON DELETE RESTRICT foreign keys uncovered
 * via information_schema (see PR history) — CASCADE/SET NULL relationships
 * are left to the database:
 *
 *   1. long_term_assets      (RESTRICTs transactions)
 *   2. tuition_students      (cascades tuition_payments, which RESTRICTs accounts)
 *   3. investments           (cascades investment_activity)
 *   4. recurring_transactions, loans, deposits, goals, investment_performance
 *      (no blocking FKs among this set — order-independent)
 *   5. transactions          (cascades transaction_entries; safe now that
 *                             long_term_assets is gone)
 *   6. budgets               (RESTRICTs categories)
 *   7. categories            (RESTRICTs accounts; safe now that budgets is gone)
 *   8. accounts              (last — every RESTRICT source above is cleared)
 */

const TEST_USER_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;

export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Resolve the test user's id from their email rather than hardcoding it,
  // so this keeps working if the CI test account is ever rotated.
  const { data: usersPage, error: userLookupError } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });

  if (userLookupError) {
    console.error(
      "[global-setup] Failed to look up test user:",
      userLookupError.message,
    );
    return;
  }

  const testUser = usersPage.users.find(
    (u) => u.email === TEST_USER_EMAIL,
  );

  if (!testUser) {
    console.warn(
      `[global-setup] No auth user found for ${TEST_USER_EMAIL} — skipping E2E data cleanup.`,
    );
    return;
  }

  const userId = testUser.id;

  // Ordered per the FK dependency analysis above. Each entry is a table
  // with a user_id column; transaction_entries has no user_id and is
  // cleaned up purely via CASCADE from the transactions delete.
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
  ];

  for (const table of deletionOrder) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .eq("user_id", userId);

    if (error) {
      console.error(
        `[global-setup] Failed to clean up ${table}:`,
        error.message,
      );
      // Continue with remaining tables rather than aborting the whole
      // suite — a partial cleanup is still better than none, and the
      // specific error will point at whichever FK assumption was wrong.
    } else {
      console.log(
        `[global-setup] Deleted ${count ?? 0} row(s) from ${table}.`,
      );
    }
  }
}


