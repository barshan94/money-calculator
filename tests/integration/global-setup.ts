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

const PAGE_SIZE = 500;

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
  const {
    error,
  } =
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
  } =
    await supabase
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
  } =
    await supabase
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

async function getAllTransactionEntriesByTransactionIds(
  transactionIds: string[],
) {
  const entryIds: string[] = [];

  if (transactionIds.length === 0) {
    return entryIds;
  }

  for (
    let offset = 0;
    ;
    offset += PAGE_SIZE
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from("transaction_entries")
        .select("id")
        .in(
          "transaction_id",
          transactionIds,
        )
        .range(
          offset,
          offset + PAGE_SIZE - 1,
        );

    if (error) {
      throw new Error(
        `[integration-global-setup] Failed to find transaction-owned entries: ${error.message}`,
      );
    }

    const rows = data ?? [];

    entryIds.push(
      ...rows.map(
        (entry) => entry.id,
      ),
    );

    if (rows.length < PAGE_SIZE) {
      break;
    }
  }

  return entryIds;
}

async function getAllTransactionEntriesByAccountIds(
  accountIds: string[],
) {
  const entries: Array<{
    id: string;
    transaction_id: string;
    account_id: string;
  }> = [];

  if (accountIds.length === 0) {
    return entries;
  }

  for (
    let offset = 0;
    ;
    offset += PAGE_SIZE
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from("transaction_entries")
        .select(
          "id, transaction_id, account_id",
        )
        .in(
          "account_id",
          accountIds,
        )
        .range(
          offset,
          offset + PAGE_SIZE - 1,
        );

    if (error) {
      throw new Error(
        `[integration-global-setup] Failed to find account-owned entries: ${error.message}`,
      );
    }

    const rows = data ?? [];

    entries.push(
      ...rows,
    );

    if (rows.length < PAGE_SIZE) {
      break;
    }
  }

  return entries;
}

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

  if (
    userTransactionIds.length === 0
  ) {
    return;
  }

  /*
   * Some historical rows may reference one of the
   * user's transactions while having a different or
   * missing user_id.
   *
   * Do NOT use:
   *
   *   .in("purchase_transaction_id", userTransactionIds)
   *
   * because that can create a very large HTTP query
   * and has repeatedly produced "TypeError: fetch failed"
   * in GitHub Actions.
   *
   * Instead, scan long_term_assets in bounded pages and
   * compare transaction IDs locally.
   */
  const userTransactionIdSet =
    new Set(userTransactionIds);

  for (
    let offset = 0;
    ;
    offset += PAGE_SIZE
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from("long_term_assets")
        .select(
          "id, purchase_transaction_id",
        )
        .not(
          "purchase_transaction_id",
          "is",
          null,
        )
        .range(
          offset,
          offset + PAGE_SIZE - 1,
        );

    if (error) {
      throw new Error(
        `[integration-global-setup] Failed to scan long-term assets: ${error.message}`,
      );
    }

    const rows = data ?? [];

    if (rows.length === 0) {
      break;
    }

    const matchingAssetIds =
      rows
        .filter(
          (asset) =>
            asset.purchase_transaction_id &&
            userTransactionIdSet.has(
              asset.purchase_transaction_id,
            ),
        )
        .map(
          (asset) => asset.id,
        );

    /*
     * Delete only assets whose purchase transaction
     * belongs to the dedicated integration user.
     */
    for (
      let index = 0;
      index < matchingAssetIds.length;
      index += PAGE_SIZE
    ) {
      const batch =
        matchingAssetIds.slice(
          index,
          index + PAGE_SIZE,
        );

      const {
        error: deleteError,
      } =
        await supabase
          .from("long_term_assets")
          .delete()
          .in(
            "id",
            batch,
          );

      if (deleteError) {
        throw new Error(
          `[integration-global-setup] Failed to clean transaction-linked long-term assets: ${deleteError.message}`,
        );
      }
    }

    if (rows.length < PAGE_SIZE) {
      break;
    }
  }
}

async function deleteUserTransactionEntries(
  userId: string,
  userTransactionIds: string[],
  userAccountIds: string[],
) {
  /*
   * Find every entry reachable through the user's
   * transactions.
   */
  const transactionEntryIds =
    await getAllTransactionEntriesByTransactionIds(
      userTransactionIds,
    );

  /*
   * Find every entry reachable through the user's
   * accounts.
   */
  const accountEntries =
    await getAllTransactionEntriesByAccountIds(
      userAccountIds,
    );

  /*
   * Verify that account-linked entries do not point
   * to another user's transaction.
   *
   * We never silently delete another user's ledger data.
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
    /*
     * Process referenced transaction IDs in bounded
     * batches rather than sending the entire list
     * in one HTTP request.
     */
    for (
      let index = 0;
      index <
      referencedTransactionIds.length;
      index += PAGE_SIZE
    ) {
      const transactionIdBatch =
        referencedTransactionIds.slice(
          index,
          index + PAGE_SIZE,
        );

      const {
        data,
        error,
      } =
        await supabase
          .from("transactions")
          .select(
            "id, user_id",
          )
          .in(
            "id",
            transactionIdBatch,
          );

      if (error) {
        throw new Error(
          `[integration-global-setup] Failed to verify transaction ownership: ${error.message}`,
        );
      }

      const foreignTransactions =
        (
          data ?? []
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
          `[integration-global-setup] Refusing to delete transaction entries referencing another user's transaction.`,
        );
      }
    }
  }

  /*
   * Merge both discovery paths and deduplicate.
   */
  const uniqueEntryIds =
    Array.from(
      new Set([
        ...transactionEntryIds,
        ...accountEntries.map(
          (entry) => entry.id,
        ),
      ]),
    );

  if (
    uniqueEntryIds.length === 0
  ) {
    return;
  }

  /*
   * Delete in chunks so the request remains safe
   * even when a test account has many ledger entries.
   */
  for (
    let index = 0;
    index < uniqueEntryIds.length;
    index += PAGE_SIZE
  ) {
    const batch =
      uniqueEntryIds.slice(
        index,
        index + PAGE_SIZE,
      );

    const {
      error,
    } =
      await supabase
        .from("transaction_entries")
        .delete()
        .in(
          "id",
          batch,
        );

    if (error) {
      throw new Error(
        `[integration-global-setup] Failed to clean transaction_entries: ${error.message}`,
      );
    }
  }

  /*
   * Final verification.
   *
   * If even one entry remains attached to the user's
   * accounts or transactions, account deletion must
   * not proceed.
   */
  const remainingByTransaction =
    await getAllTransactionEntriesByTransactionIds(
      userTransactionIds,
    );

  const remainingByAccount =
    await getAllTransactionEntriesByAccountIds(
      userAccountIds,
    );

  if (
    remainingByTransaction.length > 0 ||
    remainingByAccount.length > 0
  ) {
    throw new Error(
      `[integration-global-setup] Transaction-entry cleanup incomplete: ${remainingByTransaction.length + remainingByAccount.length} entry reference(s) remain.`,
    );
  }
}

async function createBaselineAccounts(
  userId: string,
) {
  const {
    error,
  } =
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
   * Capture ownership IDs before cleanup starts.
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
   * Remove transaction-linked assets first.
   */
  await deleteUserLongTermAssets(
    userId,
    userTransactionIds,
  );

  /*
   * Remove module-owned records.
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
   * Explicitly remove every ledger entry before
   * deleting transactions or accounts.
   */
  await deleteUserTransactionEntries(
    userId,
    userTransactionIds,
    userAccountIds,
  );

  /*
   * Transactions are now safe to delete.
   */
  await deleteUserRows(
    "transactions",
    userId,
  );

  /*
   * Budgets and categories come before accounts.
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
   * Accounts should now have zero remaining
   * transaction_entries references.
   */
  await deleteUserRows(
    "accounts",
    userId,
  );

  /*
   * Recreate the two baseline BDT asset accounts
   * required by the integration suite.
   */
  await createBaselineAccounts(
    userId,
  );

  console.log(
    "[integration-global-setup] Cleaned dedicated integration test user and created baseline BDT Cash and Bank accounts.",
  );
}

