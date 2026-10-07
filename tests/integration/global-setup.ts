import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const testEmail =
  process.env.PLAYWRIGHT_TEST_EMAIL;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
}

if (!testEmail) {
  throw new Error(
    "Missing PLAYWRIGHT_TEST_EMAIL",
  );
}

const supabase: SupabaseClient = createClient(
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
  const perPage = 1000;
  let page = 1;

  while (true) {
    const {
      data,
      error,
    } = await supabase.auth.admin.listUsers({
      page,
      perPage,
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

    if (user) {
      return user.id;
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  throw new Error(
    `[integration-global-setup] Test user not found: ${testEmail}`,
  );
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

async function createBaselineAccounts(
  userId: string,
) {
  const { error } = await supabase
    .from("accounts")
    .insert([
      {
        user_id: userId,
        name: "Cash",
        account_type: "asset",
        currency: "BDT",
        is_system: false,
        is_archived: false,
        liquidity_class: "immediate",
      },
      {
        user_id: userId,
        name: "Bank",
        account_type: "asset",
        currency: "BDT",
        is_system: false,
        is_archived: false,
        liquidity_class: "immediate",
      },
    ]);

  if (error) {
    throw new Error(
      `[integration-global-setup] Failed to create baseline accounts: ${error.message}`,
    );
  }
}

export default async function globalSetup() {
  const userId = await getTestUserId();

  /*
   * Delete child/dependent records before their
   * referenced transactions and accounts.
   *
   * long_term_assets MUST be deleted before
   * transactions because purchase_transaction_id
   * references transactions.id.
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

  /*
   * Transaction integration tests require at least
   * two real user-owned accounts.
   *
   * Keep both in BDT so tests that group accounts
   * by currency have a deterministic fixture.
   */
  await createBaselineAccounts(userId);

  console.log(
    "[integration-global-setup] Cleaned dedicated integration test user and created baseline BDT Cash and Bank accounts.",
  );
}

