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
   * Also remove assets referenced by this user's
   * transactions, regardless of their user_id value.
   */
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
        .in(
          "purchase_transaction_id",
          userTransactionIds,
        )
        .range(
          offset,
          offset + PAGE_SIZE - 1,
        );

    if (error) {
      throw new Error(
        `[integration-global-setup] Failed to find transaction-linked long-term assets: ${error.message}`,
      );
    }

    const rows = data ?? [];

    if (rows.length === 0) {
      break;
    }

    const assetIds =
      rows.map(
        (asset) => asset.id,
      );

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
        `[integration-global-setup] Failed to clean transaction-linked long-term assets: ${deleteError.message}`,
      );
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
          .select(
            "id, user_id",
          )
          .in(
            "id",
            referencedTransactionIds,
          )
          .range(
            offset,
            offset + PAGE_SIZE - 1,
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

      if (
        (data ?? []).length <
        PAGE_SIZE
      ) {
        break;
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
   * This is intentionally strict: if even one entry
   * remains attached to the user's accounts or
   * transactions, account deletion must not proceed.
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

