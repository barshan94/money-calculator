import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
  quiet: true,
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

/**
 * transaction_entries does not contain user_id.
 *
 * It belongs to transactions through transaction_id,
 * while transaction_entries.account_id references accounts.id.
 *
 * Therefore we must first find this user's transactions,
 * delete their entries, and only then delete the
 * transactions and accounts.
 */
async function deleteUserTransactionEntries(
  userId: string,
) {
  const {
    data: transactions,
    error: transactionLookupError,
  } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", userId);

  if (transactionLookupError) {
    throw new Error(
      `[integration-global-setup] Failed to find transactions for transaction_entries cleanup: ${transactionLookupError.message}`,
    );
  }

  const transactionIds =
    transactions?.map(
      (transaction) => transaction.id,
    ) ?? [];

  if (transactionIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("transaction_entries")
    .delete()
    .in(
      "transaction_id",
      transactionIds,
    );

  if (error) {
    throw new Error(
      `[integration-global-setup] Failed to clean transaction_entries: ${error.message}`,
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
   * Delete dependent records before their referenced
   * parent records.
   *
   * Important relationships:
   *
   * long_term_assets.purchase_transaction_id
   *     -> transactions.id
   *
   * transaction_entries.transaction_id
   *     -> transactions.id
   *
   * transaction_entries.account_id
   *     -> accounts.id
   *
   * Therefore:
   *
   * long_term_assets
   *     ↓
   * transaction_entries
   *     ↓
   * transactions
   *     ↓
   * accounts
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
  ];

  for (const table of tablesInDeletionOrder) {
    await deleteUserRows(
      table,
      userId,
    );
  }

  /*
   * transaction_entries has no user_id.
   * Delete the entries belonging to this user's
   * transactions before deleting the transactions.
   */
  await deleteUserTransactionEntries(
    userId,
  );

  /*
   * Now the user's transactions can safely be
   * deleted because their entries are gone.
   */
  await deleteUserRows(
    "transactions",
    userId,
  );

  /*
   * Budgets and categories can now be removed.
   */
  await deleteUserRows(
    "budgets",
    userId,
  );

  await deleteUserRows(
    "categories",
    userId,
  );

  /*
   * Accounts are now safe to delete because:
   *
   * - transaction_entries are gone
   * - transactions are gone
   */
  await deleteUserRows(
    "accounts",
    userId,
  );

  /*
   * Transaction integration tests require at least
   * two real user-owned accounts.
   *
   * Both are BDT assets so currency-grouping tests
   * have a deterministic fixture.
   */
  await createBaselineAccounts(
    userId,
  );

  console.log(
    "[integration-global-setup] Cleaned dedicated integration test user and created baseline BDT Cash and Bank accounts.",
  );
}

