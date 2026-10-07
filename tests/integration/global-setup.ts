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
   * First collect entries attached to the user's
   * transactions.
   */
  let transactionEntryIds: string[] = [];

  if (userTransactionIds.length > 0) {
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
   * Now collect entries attached directly to the
   * user's accounts.
   *
   * This is the important FK cleanup path:
   *
   * transaction_entries.account_id
   *     -> accounts.id
   */
  if (userAccountIds.length > 0) {
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
     * a user-owned account entry is also owned by
     * the test user.
     *
     * Never silently delete another user's transaction
     * data.
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
   * Deduplicate entry IDs because an entry can be
   * discovered through both ownership paths.
   */
  const uniqueEntryIds =
    Array.from(
      new Set(transactionEntryIds),
    );

  if (uniqueEntryIds.length === 0) {
    return;
  }

  /*
   * Delete by PRIMARY KEY rather than relying on
   * transaction_id alone.
   *
   * This guarantees that entries discovered through
   * account_id are also removed.
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
   * Capture the ownership graph BEFORE cleanup.
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
   * Remove module records first.
   *
   * long_term_assets can reference transactions,
   * so it must be removed before transaction cleanup.
   */
  const moduleTables = [
    "long_term_assets",
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
   * Remove every transaction_entry belonging to
   * the user's transaction/account ownership graph.
   */
  await deleteUserTransactionEntries(
    userId,
    userTransactionIds,
    userAccountIds,
  );

  /*
   * Now transactions can safely be deleted.
   */
  await deleteUserRows(
    "transactions",
    userId,
  );

  /*
   * Categories can reference accounts through
   * ledger_account_id, so categories must disappear
   * before accounts.
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
   * Therefore user-owned accounts are safe to remove.
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

