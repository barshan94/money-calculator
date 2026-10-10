import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY!;
const testEmail = process.env.PLAYWRIGHT_TEST_EMAIL!;

const PAGE_SIZE = 500;

if (!supabaseUrl) {
  throw new Error(
    "[integration-global-setup] NEXT_PUBLIC_SUPABASE_URL is missing.",
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "[integration-global-setup] SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY is missing.",
  );
}

if (!testEmail) {
  throw new Error(
    "[integration-global-setup] PLAYWRIGHT_TEST_EMAIL is missing.",
  );
}

type Row = Record<string, unknown>;

type UserRow = {
  id: string;
  email?: string | null;
};

type AccountRow = {
  id: string;
  user_id: string | null;
  currency: string;
  account_type: string;
  is_system: boolean;
  is_archived: boolean;
};

type TransactionRow = {
  id: string;
  user_id: string | null;
};

type TransactionEntryRow = {
  id: string;
  transaction_id: string;
  account_id: string;
};

type LongTermAssetRow = {
  id: string;
  user_id: string | null;
  purchase_transaction_id: string | null;
};

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

function unique(values: string[]) {
  return [...new Set(values)];
}

async function getAllRows<T extends Row>(
  table: string,
  select: string,
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(
        `[integration-global-setup] Failed to scan ${table}: ${error.message}`,
      );
    }

    const page = (data ?? []) as T[];

    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

async function getTestUser(): Promise<UserRow> {
  const {
    data,
    error,
  } = await supabase.auth.admin.listUsers({
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
      `[integration-global-setup] Test user not found for ${testEmail}.`,
    );
  }

  return {
    id: user.id,
    email: user.email,
  };
}

async function deleteRowsById(
  table: string,
  ids: string[],
) {
  for (const id of unique(ids)) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(
        `[integration-global-setup] Failed deleting ${table}.${id}: ${error.message}`,
      );
    }
  }
}

async function getAllTransactions() {
  return getAllRows<TransactionRow>(
    "transactions",
    "id, user_id",
  );
}

async function getAllTransactionEntries() {
  return getAllRows<TransactionEntryRow>(
    "transaction_entries",
    "id, transaction_id, account_id",
  );
}

async function getAllLongTermAssets() {
  return getAllRows<LongTermAssetRow>(
    "long_term_assets",
    "id, user_id, purchase_transaction_id",
  );
}

async function deleteUserLongTermAssets(
  userId: string,
  userTransactionIds: Set<string>,
) {
  const assets = await getAllLongTermAssets();

  const directUserAssets = assets.filter(
    (asset) => asset.user_id === userId,
  );

  const transactionLinkedAssets = assets.filter(
    (asset) =>
      asset.purchase_transaction_id !== null &&
      userTransactionIds.has(
        asset.purchase_transaction_id,
      ),
  );

  const assetIds = unique([
    ...directUserAssets.map(
      (asset) => asset.id,
    ),
    ...transactionLinkedAssets.map(
      (asset) => asset.id,
    ),
  ]);

  if (assetIds.length > 0) {
    await deleteRowsById(
      "long_term_assets",
      assetIds,
    );
  }

  /*
   * Hard verification:
   * no long-term asset may still reference a
   * transaction owned by the test user.
   */
  const remainingAssets =
    await getAllLongTermAssets();

  const remainingReferences =
    remainingAssets.filter(
      (asset) =>
        asset.purchase_transaction_id !==
          null &&
        userTransactionIds.has(
          asset.purchase_transaction_id,
        ),
    );

  if (remainingReferences.length > 0) {
    throw new Error(
      `[integration-global-setup] ${remainingReferences.length} long-term asset purchase reference(s) still point to test-user transactions.`,
    );
  }

  console.log(
    "[integration-global-setup] Verified zero long-term asset purchase references remain for test-user transactions.",
  );
}

async function deleteUserTransactionEntries(
  userId: string,
  userAccountIds: Set<string>,
  userTransactionIds: Set<string>,
  allTransactions: TransactionRow[],
) {
  const entries =
    await getAllTransactionEntries();

  const transactionOwners =
    new Map<string, string | null>();

  for (const transaction of allTransactions) {
    transactionOwners.set(
      transaction.id,
      transaction.user_id,
    );
  }

  /*
   * A transaction entry has no user_id.
   *
   * Ownership is therefore established through:
   *
   * 1. its transaction, or
   * 2. its account.
   */
  const candidateEntries =
    entries.filter(
      (entry) =>
        userTransactionIds.has(
          entry.transaction_id,
        ) ||
        userAccountIds.has(
          entry.account_id,
        ),
    );

  /*
   * Never delete an entry whose transaction
   * clearly belongs to another user.
   */
  const foreignEntries =
    candidateEntries.filter((entry) => {
      const owner =
        transactionOwners.get(
          entry.transaction_id,
        );

      return (
        owner !== undefined &&
        owner !== null &&
        owner !== userId
      );
    });

  if (foreignEntries.length > 0) {
    throw new Error(
      `[integration-global-setup] Refusing to delete ${foreignEntries.length} transaction entries belonging to another user.`,
    );
  }

  /*
   * Some old test data may contain an entry whose
   * transaction has already disappeared.
   *
   * If that orphaned entry is attached to one of
   * the test user's accounts, it is safe cleanup
   * data and must not block the suite.
   */
  const unresolvedEntries =
    candidateEntries.filter(
      (entry) =>
        !transactionOwners.has(
          entry.transaction_id,
        ),
    );

  const unsafeUnresolvedEntries =
    unresolvedEntries.filter(
      (entry) =>
        !userAccountIds.has(
          entry.account_id,
        ),
    );

  if (unsafeUnresolvedEntries.length > 0) {
    throw new Error(
      `[integration-global-setup] Refusing to delete ${unsafeUnresolvedEntries.length} unresolved transaction entries not tied to test-user accounts.`,
    );
  }

  if (unresolvedEntries.length > 0) {
    console.log(
      `[integration-global-setup] Deleting ${unresolvedEntries.length} orphaned transaction entry(s) attached to test-user accounts.`,
    );
  }

  if (candidateEntries.length > 0) {
    await deleteRowsById(
      "transaction_entries",
      candidateEntries.map(
        (entry) => entry.id,
      ),
    );
  }

  /*
   * Final verification.
   */
  const remainingEntries =
    await getAllTransactionEntries();

  const remainingUserEntries =
    remainingEntries.filter(
      (entry) =>
        userTransactionIds.has(
          entry.transaction_id,
        ) ||
        userAccountIds.has(
          entry.account_id,
        ),
    );

  if (remainingUserEntries.length > 0) {
    throw new Error(
      `[integration-global-setup] ${remainingUserEntries.length} transaction entries still remain for the test user.`,
    );
  }
}

async function deleteUserModuleData(
  userId: string,
) {
  /*
   * Delete child/module records before deleting
   * transactions and accounts.
   *
   * Missing tables are intentionally not ignored:
   * if the application schema changes, CI should
   * tell us instead of silently leaving data behind.
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

  for (const table of moduleTables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("user_id", userId);

    if (error) {
      throw new Error(
        `[integration-global-setup] Failed cleaning ${table}: ${error.message}`,
      );
    }
  }
}

async function deleteUserTransactions(
  userId: string,
  userTransactionIds: string[],
) {
  if (userTransactionIds.length === 0) {
    return;
  }

  await deleteRowsById(
    "transactions",
    userTransactionIds,
  );

  /*
   * Final transaction verification.
   */
  const remainingTransactions =
    await getAllTransactions();

  const remainingUserTransactions =
    remainingTransactions.filter(
      (transaction) =>
        transaction.user_id === userId,
    );

  if (remainingUserTransactions.length > 0) {
    throw new Error(
      `[integration-global-setup] ${remainingUserTransactions.length} test-user transactions still remain after cleanup.`,
    );
  }
}

async function deleteUserBudgets(
  userId: string,
) {
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `[integration-global-setup] Failed cleaning budgets: ${error.message}`,
    );
  }
}

async function deleteUserCategories(
  userId: string,
) {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `[integration-global-setup] Failed cleaning categories: ${error.message}`,
    );
  }
}

async function deleteUserAccounts(
  userId: string,
) {
  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `[integration-global-setup] Failed cleaning accounts: ${error.message}`,
    );
  }
}

async function createBaselineAccounts(
  userId: string,
) {
  /*
   * Verify the authenticated test user matches
   * the user whose baseline accounts are created.
   */
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.admin.getUserById(
    userId,
  );

  if (userError || !user) {
    throw new Error(
      `[integration-global-setup] Could not verify test user: ${
        userError?.message ?? "User not found"
      }`,
    );
  }

  const baselineAccounts = [
    "Cash",
    "Bank",
  ];

  for (const name of baselineAccounts) {
    const { error } = await supabase.rpc(
      "create_account",
      {
        p_name: name,
        p_account_type: "asset",
        p_currency: "BDT",
        p_liquidity_class: "immediate",
      },
    );

    if (error) {
      throw new Error(
        `[integration-global-setup] Failed creating baseline account "${name}": ${error.message}`,
      );
    }
  }

  console.log(
    "[integration-global-setup] Baseline Cash and Bank accounts created.",
  );
}


async function cleanup() {
  const user = await getTestUser();

  console.log(
    `[integration-global-setup] Cleaning data for ${user.email ?? testEmail} (${user.id}).`,
  );

  /*
   * Capture current state before deleting anything.
   */
  const allTransactions =
    await getAllTransactions();

  const allAccounts =
    await getAllRows<AccountRow>(
      "accounts",
      "id, user_id, currency, account_type, is_system, is_archived",
    );

  const userTransactions =
    allTransactions.filter(
      (transaction) =>
        transaction.user_id === user.id,
    );

  const userTransactionIds =
    userTransactions.map(
      (transaction) => transaction.id,
    );

  const userTransactionIdSet =
    new Set(userTransactionIds);

  const userAccounts =
    allAccounts.filter(
      (account) =>
        account.user_id === user.id,
    );

  const userAccountIds =
    userAccounts.map(
      (account) => account.id,
    );

  const userAccountIdSet =
    new Set(userAccountIds);

  /*
   * LONG-TERM ASSETS
   *
   * Must be deleted before their purchase
   * transactions because:
   *
   * long_term_assets.purchase_transaction_id
   * -> transactions.id
   */
  await deleteUserLongTermAssets(
    user.id,
    userTransactionIdSet,
  );

  /*
   * MODULE DATA.
   */
  await deleteUserModuleData(
    user.id,
  );

  /*
   * TRANSACTION ENTRIES
   *
   * Must be deleted before transactions/accounts.
   */
  await deleteUserTransactionEntries(
    user.id,
    userAccountIdSet,
    userTransactionIdSet,
    allTransactions,
  );

  /*
   * TRANSACTIONS.
   */
  await deleteUserTransactions(
    user.id,
    userTransactionIds,
  );

  /*
   * BUDGETS / CATEGORIES.
   */
  await deleteUserBudgets(
    user.id,
  );

  await deleteUserCategories(
    user.id,
  );

  /*
   * ACCOUNTS.
   */
  await deleteUserAccounts(
    user.id,
  );

  /*
   * Recreate the two baseline accounts expected
   * by the integration suite.
   */
  await createBaselineAccounts(
    user.id,
  );

  console.log(
    "[integration-global-setup] Test database cleanup completed successfully.",
  );
}

export default async function globalSetup() {
  try {
    await cleanup();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      `[integration-global-setup] ${message}`,
    );

    throw error;
  }
}

