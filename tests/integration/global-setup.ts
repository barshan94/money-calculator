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

    if (
      data.users.length < perPage
    ) {
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

async function getAllTransactions() {
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
        `[integration-global-setup] Failed to scan transactions: ${error.message}`,
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

async function getAllTransactionEntries() {
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
        `[integration-global-setup] Failed to scan transaction entries: ${error.message}`,
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
        `[integration-global-setup] Failed to scan long-term assets: ${error.message}`,
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
        `[integration-global-setup] Failed to delete ${table} row ${id}: ${error.message}`,
      );
    }
  }
}

async function deleteUserLongTermAssets(
  userId: string,
  allTransactions: TransactionRow[],
) {
  /*
   * Build ownership directly from the complete
   * transaction scan.
   *
   * This avoids relying on a potentially truncated
   * single Supabase response.
   */
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
   * Delete assets directly owned by the user.
   */
  await deleteUserRows(
    "long_term_assets",
    userId,
  );

  /*
   * Also delete assets owned indirectly through
   * purchase_transaction_id.
   */
  const assetIds =
    await getTransactionLinkedLongTermAssetIds(
      userTransactionIds,
    );

  if (
    assetIds.length === 0
  ) {
    return;
  }

  await deleteRowsById(
    "long_term_assets",
    assetIds,
  );

  console.log(
    `[integration-global-setup] Deleted ${assetIds.length} transaction-linked long-term asset(s).`,
  );
}

async function deleteUserTransactionEntries(
  userId: string,
  userAccountIds: string[],
  allTransactions: TransactionRow[],
) {
  const allEntries =
    await getAllTransactionEntries();

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
      "[integration-global-setup] Refusing to delete transaction entries belonging to another user.",
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
      `[integration-global-setup] Refusing to delete ${unresolvedEntries.length} transaction entries with unresolved transactions.`,
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
    "transaction_entries",
    uniqueEntryIds,
  );

  console.log(
    `[integration-global-setup] Deleted ${uniqueEntryIds.length} transaction_entries row(s).`,
  );

  const remainingEntries =
    await getAllTransactionEntries();

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
   * Scan the complete transaction table ONCE.
   *
   * This is now the source of truth for:
   * - transaction ownership
   * - long-term-asset ownership
   * - transaction-entry ownership
   */
  const allTransactions =
    await getAllTransactions();

  const userAccountIds =
    await getUserAccountIds(
      userId,
    );

  /*
   * 1. Long-term assets must be removed before
   *    transactions because of:
   *
   * long_term_assets.purchase_transaction_id
   *        ↓
   * transactions.id
   */
  await deleteUserLongTermAssets(
    userId,
    allTransactions,
  );

  /*
   * 2. Module-owned records.
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
   * 3. Transaction entries.
   *
   * These must disappear before transactions.
   */
  await deleteUserTransactionEntries(
    userId,
    userAccountIds,
    allTransactions,
  );

  /*
   * 4. Transactions.
   */
  await deleteUserRows(
    "transactions",
    userId,
  );

  /*
   * 5. Budgets.
   */
  await deleteUserRows(
    "budgets",
    userId,
  );

  /*
   * 6. Categories.
   *
   * Categories are removed before accounts
   * because categories may reference ledger accounts.
   */
  await deleteUserRows(
    "categories",
    userId,
  );

  /*
   * 7. Accounts.
   */
  await deleteUserRows(
    "accounts",
    userId,
  );

  /*
   * 8. Deterministic baseline.
   */
  await createBaselineAccounts(
    userId,
  );

  console.log(
    "[integration-global-setup] Cleanup complete. Baseline BDT Cash and Bank accounts created.",
  );
}


