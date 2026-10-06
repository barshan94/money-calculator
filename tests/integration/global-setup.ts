import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const testEmail =
  process.env.PLAYWRIGHT_TEST_EMAIL;

if (!supabaseUrl) {
  throw new Error(
    "[integration-global-setup] Missing NEXT_PUBLIC_SUPABASE_URL.",
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "[integration-global-setup] Missing SUPABASE_SERVICE_ROLE_KEY.",
  );
}

if (!testEmail) {
  throw new Error(
    "[integration-global-setup] Missing PLAYWRIGHT_TEST_EMAIL.",
  );
}

const supabase: SupabaseClient =
  createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

async function getTestUserId() {
  const {
    data,
    error,
  } =
    await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (error) {
    throw new Error(
      `[integration-global-setup] Failed to list users: ${error.message}`,
    );
  }

  const user = data.users.find(
    (candidate) =>
      candidate.email?.toLowerCase() ===
      testEmail.toLowerCase(),
  );

  if (!user) {
    throw new Error(
      `[integration-global-setup] Test user not found: ${testEmail}`,
    );
  }

  return user.id;
}

async function deleteUserRows(
  table: string,
  userId: string,
) {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `[integration-global-setup] Failed to clean ${table}: ${error.message}`,
    );
  }
}

export default async function globalSetup() {
  const userId = await getTestUserId();

  /*
   * Clean the dedicated integration-test user's
   * financial data in FK-safe order.
   *
   * Integration tests create their own accounts,
   * categories, transactions, loans, tuition records,
   * investments, etc. They do not depend on named
   * Cash/Bank seed accounts.
   */

  const tablesInDeletionOrder = [
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

  for (const table of tablesInDeletionOrder) {
    await deleteUserRows(
      table,
      userId,
    );
  }

  console.log(
    "[integration-global-setup] Cleaned dedicated integration test user.",
  );
}
