import { createClient } from "@supabase/supabase-js";

/**
 * Runs once before the whole Playwright suite.
 *
 * The CI Supabase project is used only for automated E2E testing
 * against one dedicated test account.
 *
 * Only the user identified by PLAYWRIGHT_TEST_EMAIL is affected.
 *
 * IMPORTANT:
 * transaction_entries does NOT have a user_id column.
 * It must therefore be deleted explicitly before transactions
 * and accounts are removed.
 */

const TEST_USER_EMAIL =
  process.env.PLAYWRIGHT_TEST_EMAIL;

async function getTestUser(
  supabase: ReturnType<typeof createClient>,
) {
  const {
    data,
    error,
  } =
    await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

  if (error) {
    throw new Error(
      `[global-setup] Failed to look up test user: ${error.message}`,
    );
  }

  return data.users.find(
    (user) =>
      user.email?.toLowerCase() ===
      TEST_USER_EMAIL!.toLowerCase(),
  );
}

async function getUserIds(
  supabase: ReturnType<typeof createClient>,
  table: "accounts" | "transactions",
  userId: string,
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(table)
      .select("id")
      .eq("user_id", userId);

  if (error) {
    throw new Error(
      `[global-setup] Failed to find ${table}: ${error.message}`,
    );
  }

  return (
    data?.map((row) => row.id) ?? []
  );
}

async function deleteUserRows(
  supabase: ReturnType<typeof createClient>,
  table: string,
  userId: string,
) {
  const {
    error,
    count,
  } =
    await supabase
      .from(table)
      .delete({
        count: "exact",
      })
      .eq("user_id", userId);

  if (error) {
    throw new Error(
      `E2E cleanup failed for ${table}: ${error.message}`,
    );
  }

  if ((count ?? 0) > 0) {
    console.log(
      `[global-setup] ${table}: deleted ${count} row(s).`,
    );
  }

  return count ?? 0;
}

async function deleteLongTermAssets(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  transactionIds: string[],
) {
  /*
   * First remove assets directly owned by the test user.
   */
  await deleteUserRows(
    supabase,
    "long_term_assets",
    userId,
  );

  /*
   * Then remove any remaining assets whose purchase
   * transaction belongs to the test user.
   *
   * This protects transaction cleanup from the
   * purchase_transaction_id foreign key.
   */
  if (transactionIds.length === 0) {
    return;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from("long_term_assets")
      .select(
        "id, purchase_transaction_id",
      )
      .in(
        "purchase_transaction_id",
        transactionIds,
      );

  if (error) {
    throw new Error(
      `[global-setup] Failed to find transaction-linked long-term assets: ${error.message}`,
    );
  }

  const assetIds =
    data?.map(
      (asset) => asset.id,
    ) ?? [];

  if (assetIds.length === 0) {
    return;
  }

  const {
    error: deleteError,
  } =
    await supabase
      .from("long_term_assets")
      .delete()
      .in(
        "id",
        assetIds,
      );

  if (deleteError) {
    throw new Error(
      `[global-setup] Failed to clean transaction-linked long-term assets: ${deleteError.message}`,
    );
  }

  console.log(
    `[global-setup] long_term_assets: deleted ${assetIds.length} transaction-linked row(s).`,
  );
}

async function deleteTransactionEntries(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  transactionIds: string[],
  accountIds: string[],
) {
  const entryIds: string[] = [];

  /*
   * Entries belonging to the test user's transactions.
   */
  if (transactionIds.length > 0) {
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
          "transaction_id",
          transactionIds,
        );

    if (error) {
      throw new Error(
        `[global-setup] Failed to find transaction entries: ${error.message}`,
      );
    }

    entryIds.push(
      ...(data ?? []).map(
        (entry) => entry.id,
      ),
    );
  }

  /*
   * Entries belonging to the test user's accounts.
   *
   * These may reference transactions created by the
   * test user, so verify ownership before deleting.
   */
  if (accountIds.length > 0) {
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
        );

    if (error) {
      throw new Error(
        `[global-setup] Failed to find account transaction entries: ${error.message}`,
      );
    }

    const accountEntries =
      data ?? [];

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
          `[global-setup] Failed to verify transaction ownership: ${transactionError.message}`,
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

      /*
       * Never delete another user's ledger entries.
       */
      if (
        foreignTransactions.length >
        0
      ) {
        throw new Error(
          `[global-setup] Refusing to delete transaction entries belonging to another user.`,
        );
      }
    }

    entryIds.push(
      ...accountEntries.map(
        (entry) => entry.id,
      ),
    );
  }

  const uniqueEntryIds =
    Array.from(
      new Set(entryIds),
    );

  if (uniqueEntryIds.length === 0) {
    return;
  }

  const {
    error: deleteError,
  } =
    await supabase
      .from("transaction_entries")
      .delete()
      .in(
        "id",
        uniqueEntryIds,
      );

  if (deleteError) {
    throw new Error(
      `[global-setup] Failed to clean transaction_entries: ${deleteError.message}`,
    );
  }

  console.log(
    `[global-setup] transaction_entries: deleted ${uniqueEntryIds.length} row(s).`,
  );
}

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

  const supabase =
    createClient(
      url,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

  const testUser =
    await getTestUser(
      supabase,
    );

  if (!testUser) {
    console.warn(
      `[global-setup] No auth user found for ${TEST_USER_EMAIL} — skipping E2E data cleanup.`,
    );

    return;
  }

  const userId =
    testUser.id;

  console.log(
    `[global-setup] Cleaning E2E data for ${TEST_USER_EMAIL}...`,
  );

  /*
   * Capture these BEFORE deleting anything.
   */
  const accountIds =
    await getUserIds(
      supabase,
      "accounts",
      userId,
    );

  const transactionIds =
    await getUserIds(
      supabase,
      "transactions",
      userId,
    );

  let totalDeleted = 0;

  /*
   * 1. Long-term assets must disappear before
   *    their purchase transactions.
   */
  await deleteLongTermAssets(
    supabase,
    userId,
    transactionIds,
  );

  /*
   * 2. Module-owned rows.
   *
   * These are safe to remove before ledger rows.
   */
  const moduleTables = [
    "tuition_students",
    "investments",
    "recurring_transactions",
    "loans",
    "deposits",
    "goals",
    "investment_performance",
  ] as const;

  for (
    const table of moduleTables
  ) {
    totalDeleted +=
      await deleteUserRows(
        supabase,
        table,
        userId,
      );
  }

  /*
   * 3. transaction_entries must be removed
   *    explicitly before transactions/accounts.
   */
  await deleteTransactionEntries(
    supabase,
    userId,
    transactionIds,
    accountIds,
  );

  /*
   * 4. Now transactions can safely be removed.
   */
  totalDeleted +=
    await deleteUserRows(
      supabase,
      "transactions",
      userId,
    );

  /*
   * 5. Budgets.
   */
  totalDeleted +=
    await deleteUserRows(
      supabase,
      "budgets",
      userId,
    );

  /*
   * 6. Categories reference account ledger
   *    accounts, so remove them before accounts.
   */
  totalDeleted +=
    await deleteUserRows(
      supabase,
      "categories",
      userId,
    );

  /*
   * 7. Accounts are now safe to remove because
   *    transaction_entries have already gone.
   */
  totalDeleted +=
    await deleteUserRows(
      supabase,
      "accounts",
      userId,
    );

  console.log(
    `[global-setup] E2E cleanup complete. Deleted ${totalDeleted} user-owned row(s).`,
  );
}
