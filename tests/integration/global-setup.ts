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

async function getAllTransactionEntries() {
  const entries: Array<{
    id: string;
    transaction_id: string;
    account_id: string;
  }> = [];

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
        .order(
          "id",
          {
            ascending: true,
          },
        )
        .range(
          offset,
          offset + PAGE_SIZE - 1,
        );

    if (error) {
      throw new Error(
        `[integration-global-setup] Failed to scan transaction entries: ${error.message}`,
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
   * Remove normally user-owned long-term assets first.
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
   * Never send the complete transaction ID list to
   * PostgREST through .in().
   *
   * Scan long_term_assets in bounded pages and match
   * purchase_transaction_id locally.
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
        .order(
          "id",
          {
            ascending: true,
          },
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

    if (
      matchingAssetIds.length > 0
    ) {
      const {
        error: deleteError,
      } =
        await supabase
          .from("long_term_assets")
          .delete()
          .in(
            "id",
            matchingAssetIds,
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
   * Read transaction_entries without filtering by a
   * potentially huge list of transaction IDs.
   *
   * This avoids the CI "TypeError: fetch failed"
   * caused by large PostgREST .in() requests.
   */
  const allEntries =
    await getAllTransactionEntries();

  const userTransactionIdSet =
    new Set(userTransactionIds);

  const userAccountIdSet =
    new Set(userAccountIds);

  /*
   * An entry belongs to this cleanup when either:
   *
   * 1. its transaction belongs to the test user, OR
   * 2. its account belongs to the test user.
   *
   * This is important because double-entry transactions
   * may contain entries against system accounts.
   */
  const userEntries =
    allEntries.filter(
      (entry) =>
        userTransactionIdSet.has(
          entry.transaction_id,
        ) ||
        userAccountIdSet.has(
          entry.account_id,
        ),
    );

  /*
   * Never silently delete an entry belonging to another
   * user's transaction merely because it touches one of
   * the test user's accounts.
   *
   * Because we already loaded the complete transaction
   * entry set, verify ownership locally.
   */
  const transactionIdsToVerify =
    Array.from(
      new Set(
        userEntries.map(
          (entry) =>
            entry.transaction_id,
        ),
      ),
    );

  if (
    transactionIdsToVerify.length > 0
  ) {
    /*
     * Fetch transactions in bounded batches.
     * This list is now bounded by the entries actually
     * selected for cleanup rather than every transaction
     * in the database.
     */
    const transactionOwnership =
      new Map<
        string,
        string
      >();

    for (
      let index = 0;
      index <
      transactionIdsToVerify.length;
      index += PAGE_SIZE
    ) {
      const batch =
        transactionIdsToVerify.slice(
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
            batch,
          );

      if (error) {
        throw new Error(
          `[integration-global-setup] Failed to verify transaction ownership: ${error.message}`,
        );
      }

      for (
        const transaction of
          data ?? []
      ) {
        transactionOwnership.set(
          transaction.id,
          transaction.user_id,
        );
      }
    }

    const foreignEntries =
      userEntries.filter(
        (entry) => {
          const owner =
            transactionOwnership.get(
              entry.transaction_id,
            );

          return (
            owner !== undefined &&
            owner !== userId
          );
        },
      );

    if (
      foreignEntries.length > 0
    ) {
      throw new Error(
        `[integration-global-setup] Refusing to delete transaction entries referencing another user's transaction.`,
      );
    }
  }

  const uniqueEntryIds =
    Array.from(
      new Set(
        userEntries.map(
          (entry) => entry.id,
        ),
      ),
    );

  if (
    uniqueEntryIds.length === 0
  ) {
    return;
  }

  /*
   * Delete entry IDs in small bounded batches.
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
   * Final verification uses the same bounded full scan.
   * No large .in() query is needed.
   */
  const remainingEntries =
    await getAllTransactionEntries();

  const remainingUserEntries =
    remainingEntries.filter(
      (entry) =>
        userTransactionIdSet.has(
          entry.transaction_id,
        ) ||
        userAccountIdSet.has(
          entry.account_id,
        ),
    );

  if (
    remainingUserEntries.length > 0
  ) {
    throw new Error(
      `[integration-global-setup] Transaction-entry cleanup incomplete: ${remainingUserEntries.length} entry reference(s) remain.`,
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


