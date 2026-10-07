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
 * Find all accounts owned by the integration test user.
 *
 * We need the IDs because transaction_entries does not
 * contain user_id directly.
 */
async function getUserAccountIds(
  userId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `[integration-global-setup] Failed to find test-user accounts: ${error.message}`,
    );
  }

  return (
    data?.map((account) => account.id) ?? []
  );
}

/**
 * transaction_entries has no user_id.
 *
 * It references both:
 *
 * transaction_entries.transaction_id
 *     -> transactions.id
 *
 * transaction_entries.account_id
 *     -> accounts.id
 *
 * We therefore clean entries through BOTH known
 * ownership paths:
 *
 * 1. entries belonging to this user's transactions
 * 2. entries attached to this user's accounts
 *
 * The second path is especially important because an
 * account cannot be deleted while any entry still
 * references it.
 */
async function deleteUserTransactionEntries(
  userId: string,
  accountIds: string[],
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

  if (transactionIds.length > 0) {
    const {
      error: transactionEntryError,
    } = await supabase
      .from("transaction_entries")
      .delete()
      .in(
        "transaction_id",
        transactionIds,
      );

    if (transactionEntryError) {
      throw new Error(
        `[integration-global-setup] Failed to clean transaction_entries by transaction: ${transactionEntryError.message}`,
      );
    }
  }

  if (accountIds.length > 0) {
    const {
      error: accountEntryError,
    } = await supabase
      .from("transaction_entries")
      .delete()
      .in(
        "account_id",
        accountIds,
      );

    if (accountEntryError) {
      throw new Error(
        `[integration-global-setup] Failed to clean transaction_entries by account: ${accountEntryError.message}`,
      );
    }
  }
}

/**
 * Categories have a ledger_account_id foreign key to
 * accounts.id.
 *
 * User-owned categories should already be removed by
 * deleteUserRows("categories", userId).
 *
 * This additional cleanup handles any user-owned
 * account references that may survive through a
 * category relationship.
 *
 * We only touch categories whose ledger account belongs
 * to this test user. System ledger accounts are never
 * modified.
 */
async function detachUserCategoryLedgerAccounts(
  accountIds: string[],
) {
  if (accountIds.length === 0) {
    return;
  }

  const {
    error,
  } = await supabase
    .from("categories")
    .update({
      ledger_account_id: null,
    })
    .in(
      "ledger_account_id",
      accountIds,
    );

  if (error) {
    throw new Error(
      `[integration-global-setup] Failed to detach category ledger accounts: ${error.message}`,
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
   * Get the user's existing accounts BEFORE deleting
   * anything. Their IDs are required to clean the
   * transaction_entries.account_id foreign key.
   */
  const accountIds =
    await getUserAccountIds(userId);

  /*
   * Remove module-level records first.
   *
   * long_term_assets.purchase_transaction_id
   *     -> transactions.id
   *
   * Other modules reference transactions and/or
   * accounts through their own relationships.
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
   *
   * Clean entries through both transaction ownership
   * and account ownership.
   */
  await deleteUserTransactionEntries(
    userId,
    accountIds,
  );

  /*
   * Transactions can now be removed because their
   * transaction_entries are gone.
   */
  await deleteUserRows(
    "transactions",
    userId,
  );

  /*
   * Categories may reference accounts through
   * ledger_account_id.
   *
   * Detach only references pointing to accounts
   * owned by this integration user.
   *
   * System ledger accounts remain untouched.
   */
  await detachUserCategoryLedgerAccounts(
    accountIds,
  );

  await deleteUserRows(
    "budgets",
    userId,
  );

  await deleteUserRows(
    "categories",
    userId,
  );

  /*
   * Accounts are now safe to remove:
   *
   * - transaction_entries were removed by transaction ID
   * - transaction_entries were also removed by account ID
   * - user-owned category ledger references were detached
   */
  await deleteUserRows(
    "accounts",
    userId,
  );

  /*
   * Transaction integration tests require at least
   * two real user-owned accounts.
   *
   * Both are BDT assets so currency-dependent tests
   * have a deterministic baseline.
   */
  await createBaselineAccounts(
    userId,
  );

  console.log(
    "[integration-global-setup] Cleaned dedicated integration test user and created baseline BDT Cash and Bank accounts.",
  );
}

