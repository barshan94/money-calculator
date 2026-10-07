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
  const perPage = 1000;
  let page = 1;

  while (true) {
    const {
      data,
      error,
    } =
      await supabase.auth.admin.listUsers({
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
  const { error } =
    await supabase
      .from(table)
      .delete()
      .eq("user_id", userId);

  if (error) {
    throw new Error(
      `[integration-global-setup] Failed to clean ${table}: ${error.message}`,
    );
  }
}

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
      `[integration-global-setup] Failed to find user accounts: ${error.message}`,
    );
  }

  return (
    data?.map((row) => row.id) ?? []
  );
}

async function getUserTransactionIds(
  userId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `[integration-global-setup] Failed to find user transactions: ${error.message}`,
    );
  }

  return (
    data?.map((row) => row.id) ?? []
  );
}

/**
 * long_term_assets normally belongs to the user
 * through user_id.
 *
 * However, purchase_transaction_id also creates a
 * direct FK dependency on transactions.
 *
 * Therefore we clean it through BOTH ownership paths
 * before transactions are deleted.
 */
async function deleteUserLongTermAssets(
  userId: string,
  userTransactionIds: string[],
) {
  /*
   * First remove normally user-owned long-term assets.
   */
  await deleteUserRows(
    "long_term_assets",
    userId,
  );

  /*
   * Some rows may have a NULL/different user_id while
   * still referencing a transaction owned by this user.
   *
   * Remove those rows through purchase_transaction_id.
   */
  if (
    userTransactionIds.length === 0
  ) {
    return;
  }

  const {
    data: referencedAssets,
    error: lookupError,
  } = await supabase
    .from("long_term_assets")
    .select(
      "id, purchase_transaction_id",
    )
    .in(
      "purchase_transaction_id",
      userTransactionIds,
    );

  if (lookupError) {
    throw new Error(
      `[integration-global-setup] Failed to find transaction-linked long-term assets: ${lookupError.message}`,
    );
  }

  const assetIds =
    referencedAssets?.map(
      (asset) => asset.id,
    ) ?? [];

  if (assetIds.length === 0) {
    return;
  }

  const {
    error: deleteError,
  } = await supabase
    .from("long_term_assets")
    .delete()
    .in(
      "id",
      assetIds,
    );

  if (deleteError) {
    throw new Error(
      `[integration-global-setup] Failed to clean transaction-linked long-term assets: ${deleteError.message}`,
    );
  }
}

/**
 * transaction_entries has no user_id.
 *
 * Entries are owned through:
 *
 *   transaction_entries.transaction_id
 *       -> transactions.user_id
 *
 * and:
 *
 *   transaction_entries.account_id
 *       -> accounts.user_id
 *
 * We therefore remove entries through BOTH foreign-key
 * paths before deleting transactions or accounts.
 */
async function deleteUserTransactionEntries(
  userId: string,
  userTransactionIds: string[],
  userAccountIds: string[],
) {
  /*
   * Collect entry IDs attached to the user's
   * transactions.
   */
  const transactionEntryIds: string[] = [];

  if (
    userTransactionIds.length > 0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("transaction_entries")
      .select(
        "id, transaction_id, account_id",
      )
      .in(
        "transaction_id",
        userTransactionIds,
      );

    if (error) {
      throw new Error(
        `[integration-global-setup] Failed to find transaction-owned entries: ${error.message}`,
      );
    }

    transactionEntryIds.push(
      ...(data ?? []).map(
        (entry) => entry.id,
      ),
    );
  }

  /*
   * Also collect entries attached directly to
   * the user's accounts.
   */
  if (
    userAccountIds.length > 0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("transaction_entries")
      .select(
        "id, transaction_id, account_id",
      )
      .in(
        "account_id",
        userAccountIds,
      );

    if (error) {
      throw new Error(
        `[integration-global-setup] Failed to find account-owned entries: ${error.message}`,
      );
    }

    const accountEntries =
      data ?? [];

    /*
     * Verify that every transaction referenced by
     * these account entries belongs to this test user.
     *
     * Never delete another user's financial data.
     */
    const referencedTransactionIds =
      Array.from(
        new Set(
          accountEntries.map(
            (entry) =>
              entry.transaction_id,
          ),
        ),
      );

    if (
      referencedTransactionIds.length >
      0
    ) {
      const {
        data: transactions,
        error:
          transactionError,
      } =
        await supabase
          .from("transactions")
          .select(
            "id, user_id",
          )
          .in(
            "id",
            referencedTransactionIds,
          );

      if (transactionError) {
        throw new Error(
          `[integration-global-setup] Failed to verify account entry transaction ownership: ${transactionError.message}`,
        );
      }

      const foreignTransactions =
        (
          transactions ?? []
        ).filter(
          (transaction) =>
            transaction.user_id !==
            userId,
        );

      if (
        foreignTransactions.length >
        0
      ) {
        throw new Error(
          `[integration-global-setup] Refusing to delete transaction entries referencing ${foreignTransactions.length} transaction(s) owned by another user.`,
        );
      }
    }

    transactionEntryIds.push(
      ...accountEntries.map(
        (entry) => entry.id,
      ),
    );
  }

  /*
   * An entry may be discovered through both paths,
   * so deduplicate before deleting.
   */
  const uniqueEntryIds =
    Array.from(
      new Set(transactionEntryIds),
    );

  if (
    uniqueEntryIds.length === 0
  ) {
    return;
  }

  /*
   * Delete by primary key so entries discovered
   * through account_id are also removed.
   */
  const {
    error,
  } = await supabase
    .from("transaction_entries")
    .delete()
    .in(
      "id",
      uniqueEntryIds,
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
  const { error } =
    await supabase
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
  const userId =
    await getTestUserId();

  /*
   * Capture the complete ownership graph BEFORE
   * deleting anything.
   */
  const userAccountIds =
    await getUserAccountIds(
      userId,
    );

  const userTransactionIds =
    await getUserTransactionIds(
      userId,
    );

  /*
   * long_term_assets must be handled specially
   * because purchase_transaction_id can reference
   * transactions even when user_id does not match.
   */
  await deleteUserLongTermAssets(
    userId,
    userTransactionIds,
  );

  /*
   * Remove the remaining module records first.
   */
  const moduleTables = [
    "tuition_students",
    "investments",
    "recurring_transactions",
    "loans",
    "deposits",
    "goals",
    "investment_performance",
  ];

  for (
    const table of moduleTables
  ) {
    await deleteUserRows(
      table,
      userId,
    );
  }

  /*
   * transaction_entries has no user_id, so clean
   * every entry reachable through this user's
   * transactions or accounts.
   */
  await deleteUserTransactionEntries(
    userId,
    userTransactionIds,
    userAccountIds,
  );

  /*
   * Now transactions can safely be removed.
   */
  await deleteUserRows(
    "transactions",
    userId,
  );

  /*
   * Budgets and categories must disappear before
   * accounts because categories can reference
   * ledger accounts.
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
   * At this point:
   *
   * transaction_entries -> deleted
   * transactions         -> deleted
   * categories           -> deleted
   *
   * User-owned accounts can now be removed safely.
   */
  await deleteUserRows(
    "accounts",
    userId,
  );

  /*
   * Transaction integration tests require at least
   * two non-system, non-archived accounts.
   */
  await createBaselineAccounts(
    userId,
  );

  console.log(
    "[integration-global-setup] Cleaned dedicated integration test user and created baseline BDT Cash and Bank accounts.",
  );
}

