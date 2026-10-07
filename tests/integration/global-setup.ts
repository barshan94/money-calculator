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

/**
 * Collect all account IDs owned by the integration user.
 *
 * transaction_entries.account_id references accounts.id,
 * so account ownership is another path by which an entry
 * can belong to the integration user's financial dataset.
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
      `[integration-global-setup] Failed to find user accounts: ${error.message}`,
    );
  }

  return (
    data?.map((row) => row.id) ?? []
  );
}

/**
 * Collect transaction IDs directly owned by the user.
 */
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
 * An entry can therefore be connected to the user's
 * financial data through either:
 *
 *   transaction_entries.transaction_id
 *       -> transactions.user_id
 *
 * or:
 *
 *   transaction_entries.account_id
 *       -> accounts.user_id
 *
 * We collect both sets of transaction IDs before
 * deleting entries.
 *
 * If an entry attached to one of the user's accounts
 * points to a transaction owned by another user, we stop
 * instead of silently deleting another user's financial
 * data.
 */
async function deleteUserTransactionEntries(
  userId: string,
  userTransactionIds: string[],
  userAccountIds: string[],
) {
  const transactionIds =
    new Set(userTransactionIds);

  if (userAccountIds.length > 0) {
    const {
      data: accountEntries,
      error: accountEntryError,
    } =
      await supabase
        .from("transaction_entries")
        .select(
          "id, transaction_id, account_id",
        )
        .in(
          "account_id",
          userAccountIds,
        );

    if (accountEntryError) {
      throw new Error(
        `[integration-global-setup] Failed to find account transaction entries: ${accountEntryError.message}`,
      );
    }

    const accountEntryTransactionIds =
      Array.from(
        new Set(
          (
            accountEntries ?? []
          ).map(
            (entry) =>
              entry.transaction_id,
          ),
        ),
      );

    if (
      accountEntryTransactionIds.length >
      0
    ) {
      const {
        data: relatedTransactions,
        error:
          relatedTransactionError,
      } =
        await supabase
          .from("transactions")
          .select(
            "id, user_id",
          )
          .in(
            "id",
            accountEntryTransactionIds,
          );

      if (relatedTransactionError) {
        throw new Error(
          `[integration-global-setup] Failed to verify transaction ownership: ${relatedTransactionError.message}`,
        );
      }

      const foreignTransactions =
        (
          relatedTransactions ?? []
        ).filter(
          (transaction) =>
            transaction.user_id !==
            userId,
        );

      if (
        foreignTransactions.length > 0
      ) {
        throw new Error(
          `[integration-global-setup] Refusing to delete transaction entries belonging to another user. Found ${foreignTransactions.length} foreign transaction(s) referenced by integration-test account(s).`,
        );
      }

      for (
        const transactionId of
          accountEntryTransactionIds
      ) {
        transactionIds.add(
          transactionId,
        );
      }
    }
  }

  const ids =
    Array.from(transactionIds);

  if (ids.length === 0) {
    return;
  }

  const {
    error,
  } = await supabase
    .from("transaction_entries")
    .delete()
    .in(
      "transaction_id",
      ids,
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
   * Capture the existing ownership graph
   * BEFORE deleting anything.
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
   * Delete module records that can reference
   * transactions or other financial objects.
   *
   * Long-term assets must be removed before their
   * purchase transactions.
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
   * transaction_entries has no user_id.
   *
   * Remove every entry belonging to the user's
   * transaction/account ownership graph.
   */
  await deleteUserTransactionEntries(
    userId,
    userTransactionIds,
    userAccountIds,
  );

  /*
   * All transaction entries belonging to the
   * integration user's financial graph are now gone.
   */
  await deleteUserRows(
    "transactions",
    userId,
  );

  /*
   * Categories may reference user accounts through
   * categories.ledger_account_id, so remove them
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
   * Accounts are now safe:
   *
   * - transaction_entries were removed
   * - transactions were removed
   * - categories were removed
   */
  await deleteUserRows(
    "accounts",
    userId,
  );

  /*
   * Transaction tests require at least two
   * user-owned, non-system, non-archived accounts.
   */
  await createBaselineAccounts(
    userId,
  );

  console.log(
    "[integration-global-setup] Cleaned dedicated integration test user and created baseline BDT Cash and Bank accounts.",
  );
}

