import { createClient } from "@supabase/supabase-js";

const TEST_USER_EMAIL =
  process.env.PLAYWRIGHT_TEST_EMAIL;

const PAGE_SIZE = 500;

type SupabaseClient = ReturnType<
  typeof createClient
>;

type TransactionRow = {
  id: string;
  user_id: string;
};

type TransactionEntryRow = {
  id: string;
  transaction_id: string;
  account_id: string;
};

type LongTermAssetRow = {
  id: string;
  purchase_transaction_id:
    | string
    | null;
};

async function getTestUser(
  supabase: SupabaseClient,
) {
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
        `[global-setup] Failed to look up test user: ${error.message}`,
      );
    }

    const user =
      data.users.find(
        (candidate) =>
          candidate.email?.toLowerCase() ===
          TEST_USER_EMAIL!.toLowerCase(),
      );

    if (user) {
      return user;
    }

    if (
      data.users.length < perPage
    ) {
      break;
    }

    page += 1;
  }

  return undefined;
}

async function getAllTransactions(
  supabase: SupabaseClient,
) {
  const transactions: TransactionRow[] =
    [];

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
        .from("transactions")
        .select("id, user_id")
        .order("id", {
          ascending: true,
        })
        .range(
          offset,
          offset + PAGE_SIZE - 1,
        );

    if (error) {
      throw new Error(
        `[global-setup] Failed to scan transactions: ${error.message}`,
      );
    }

    const rows =
      (data as TransactionRow[] | null) ??
      [];

    transactions.push(...rows);

    if (
      rows.length < PAGE_SIZE
    ) {
      break;
    }
  }

  return transactions;
}

async function getUserAccountIds(
  supabase: SupabaseClient,
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
      `[global-setup] Failed to find accounts: ${error.message}`,
    );
  }

  return (
    data?.map((row) => row.id) ?? []
  );
}

async function deleteUserRows(
  supabase: SupabaseClient,
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
      `[global-setup] Failed to clean ${table}: ${error.message}`,
    );
  }

  if (
    (count ?? 0) > 0
  ) {
    console.log(
      `[global-setup] ${table}: deleted ${count} row(s).`,
    );
  }

  return count ?? 0;
}

async function getAllTransactionEntries(
  supabase: SupabaseClient,
) {
  const entries: TransactionEntryRow[] =
    [];

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
        .order("id", {
          ascending: true,
        })
        .range(
          offset,
          offset + PAGE_SIZE - 1,
        );

    if (error) {
      throw new Error(
        `[global-setup] Failed to scan transaction entries: ${error.message}`,
      );
    }

    const rows =
      (data as TransactionEntryRow[] | null) ??
      [];

    entries.push(...rows);

    if (
      rows.length < PAGE_SIZE
    ) {
      break;
    }
  }

  return entries;
}

async function getTransactionLinkedLongTermAssetIds(
  supabase: SupabaseClient,
  userTransactionIds: Set<string>,
) {
  if (
    userTransactionIds.size === 0
  ) {
    return [];
  }

  const matchingAssetIds: string[] =
    [];

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
        .order("id", {
          ascending: true,
        })
        .range(
          offset,
          offset + PAGE_SIZE - 1,
        );

    if (error) {
      throw new Error(
        `[global-setup] Failed to scan long-term assets: ${error.message}`,
      );
    }

    const rows =
      (data as LongTermAssetRow[] | null) ??
      [];

    for (const asset of rows) {
      if (
        asset.purchase_transaction_id &&
        userTransactionIds.has(
          asset.purchase_transaction_id,
        )
      ) {
        matchingAssetIds.push(
          asset.id,
        );
      }
    }

    if (
      rows.length < PAGE_SIZE
    ) {
      break;
    }
  }

  return matchingAssetIds;
}

async function deleteRowsById(
  supabase: SupabaseClient,
  table: string,
  ids: string[],
) {
  for (const id of ids) {
    const {
      error,
    } =
      await supabase
        .from(table)
        .delete()
        .eq("id", id);

    if (error) {
      throw new Error(
        `[global-setup] Failed to delete ${table} row ${id}: ${error.message}`,
      );
    }
  }
}

async function deleteLongTermAssets(
  supabase: SupabaseClient,
  userId: string,
  allTransactions: TransactionRow[],
) {
  const userTransactionIds =
    new Set(
      allTransactions
        .filter(
          (transaction) =>
            transaction.user_id ===
            userId,
        )
        .map(
          (transaction) =>
            transaction.id,
        ),
    );

  /*
   * Directly-owned assets.
   */
  await deleteUserRows(
    supabase,
    "long_term_assets",
    userId,
  );

  /*
   * Assets linked through purchase_transaction_id.
   */
  const assetIds =
    await getTransactionLinkedLongTermAssetIds(
      supabase,
      userTransactionIds,
    );

  if (
    assetIds.length === 0
  ) {
    return;
  }

  await deleteRowsById(
    supabase,
    "long_term_assets",
    assetIds,
  );

  console.log(
    `[global-setup] long_term_assets: deleted ${assetIds.length} transaction-linked row(s).`,
  );
}

async function deleteTransactionEntries(
  supabase: SupabaseClient,
  userId: string,
  userAccountIds: string[],
  allTransactions: TransactionRow[],
) {
  const allEntries =
    await getAllTransactionEntries(
      supabase,
    );

  const userTransactionIds =
    new Set(
      allTransactions
        .filter(
          (transaction) =>
            transaction.user_id ===
            userId,
        )
        .map(
          (transaction) =>
            transaction.id,
        ),
    );

  const userAccountIdSet =
    new Set(userAccountIds);

  const transactionOwners =
    new Map<string, string>();

  for (
    const transaction of
      allTransactions
  ) {
    transactionOwners.set(
      transaction.id,
      transaction.user_id,
    );
  }

  const candidateEntries =
    allEntries.filter(
      (entry) =>
        userTransactionIds.has(
          entry.transaction_id,
        ) ||
        userAccountIdSet.has(
          entry.account_id,
        ),
    );

  const foreignEntries =
    candidateEntries.filter(
      (entry) => {
        const owner =
          transactionOwners.get(
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
      "[global-setup] Refusing to delete transaction entries belonging to another user.",
    );
  }

  const unresolvedEntries =
    candidateEntries.filter(
      (entry) =>
        !transactionOwners.has(
          entry.transaction_id,
        ),
    );

  if (
    unresolvedEntries.length > 0
  ) {
    throw new Error(
      `[global-setup] Refusing to delete ${unresolvedEntries.length} transaction entries with unresolved transactions.`,
    );
  }

  const uniqueEntryIds =
    Array.from(
      new Set(
        candidateEntries.map(
          (entry) => entry.id,
        ),
      ),
    );

  if (
    uniqueEntryIds.length === 0
  ) {
    return;
  }

  await deleteRowsById(
    supabase,
    "transaction_entries",
    uniqueEntryIds,
  );

  console.log(
    `[global-setup] transaction_entries: deleted ${uniqueEntryIds.length} row(s).`,
  );

  const remainingEntries =
    await getAllTransactionEntries(
      supabase,
    );

  const remainingUserEntries =
    remainingEntries.filter(
      (entry) =>
        userTransactionIds.has(
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
      `[global-setup] Transaction-entry cleanup incomplete: ${remainingUserEntries.length} entry reference(s) remain.`,
    );
  }
}

export default async function globalSetup() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.warn(
      "[global-setup] Missing Supabase environment variables — skipping cleanup.",
    );

    return;
  }

  if (!TEST_USER_EMAIL) {
    console.warn(
      "[global-setup] Missing PLAYWRIGHT_TEST_EMAIL — skipping cleanup.",
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
      `[global-setup] Test user ${TEST_USER_EMAIL} was not found — skipping cleanup.`,
    );

    return;
  }

  const userId =
    testUser.id;

  console.log(
    `[global-setup] Cleaning E2E data for ${TEST_USER_EMAIL}...`,
  );

  /*
   * One complete transaction scan becomes the
   * source of truth for transaction ownership.
   */
  const allTransactions =
    await getAllTransactions(
      supabase,
    );

  const userAccountIds =
    await getUserAccountIds(
      supabase,
      userId,
    );

  /*
   * 1. Long-term assets.
   */
  await deleteLongTermAssets(
    supabase,
    userId,
    allTransactions,
  );

  /*
   * 2. Module-owned rows.
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

  let totalDeleted = 0;

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
   * 3. Transaction entries.
   */
  await deleteTransactionEntries(
    supabase,
    userId,
    userAccountIds,
    allTransactions,
  );

  /*
   * 4. Transactions.
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
   * 6. Categories.
   */
  totalDeleted +=
    await deleteUserRows(
      supabase,
      "categories",
      userId,
    );

  /*
   * 7. Accounts.
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

