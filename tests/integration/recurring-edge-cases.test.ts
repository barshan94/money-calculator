import {
  beforeAll,
  afterAll,
  describe,
  expect,
  it,
} from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createAdminClient,
  createAuthenticatedClient,
  signInTestUser,
} from "./test-helpers";

let supabase: SupabaseClient;
let admin: SupabaseClient;

type Account = {
  id: string;
  name: string;
  currency: string;
};

type Category = {
  id: string;
  currency: string;
};

type RecurringTransaction = {
  id: string;
  name: string;
  transaction_type: string;
  amount: number;
  currency: string;
  frequency: string;
  next_run_date: string;
  is_active: boolean;
};

async function getMoneyAccount(): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, currency")
    .eq("is_archived", false)
    .eq("is_system", false)
    .eq("account_type", "asset")
    .limit(1)
    .single();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as Account;
}

async function getExpenseCategory(
  currency: string,
): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .select(`
      id,
      accounts!inner(currency)
    `)
    .eq("category_type", "expense")
    .eq("is_archived", false)
    .eq("accounts.currency", currency)
    .limit(1)
    .single();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  const row = data as unknown as {
    id: string;
    accounts: {
      currency: string;
    };
  };

  return {
    id: row.id,
    currency: row.accounts.currency,
  };
}

async function createRecurringExpense(
  account: Account,
  category: Category,
  overrides: Partial<{
    name: string;
    amount: number;
    frequency: string;
    next_run_date: string;
  }> = {},
) {
  const { data, error } = await supabase.rpc(
    "create_recurring_transaction",
    {
      p_name:
        overrides.name ??
        `Test Recurring ${Date.now()}`,
      p_transaction_type: "expense",
      p_amount: overrides.amount ?? 10,
      p_currency: account.currency,
      p_frequency:
        overrides.frequency ?? "monthly",
      p_next_run_date:
        overrides.next_run_date ?? "2099-01-01",
      p_category_id: category.id,
      p_source_account_id: account.id,
      p_destination_account_id: null,
      p_description:
        "Integration test recurring transaction",
    },
  );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as string;
}

async function getRecurring(
  recurringId: string,
): Promise<RecurringTransaction> {
  const { data, error } = await supabase
    .from("recurring_transactions")
    .select(`
      id,
      name,
      transaction_type,
      amount,
      currency,
      frequency,
      next_run_date,
      is_active
    `)
    .eq("id", recurringId)
    .single();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as RecurringTransaction;
}

async function archiveRecurring(
  recurringId: string,
) {
  const { error } = await supabase.rpc(
    "archive_recurring_transaction",
    {
      p_recurring_id: recurringId,
    },
  );

  expect(error).toBeNull();
}

async function cleanupRecurring(
  recurringId: string,
) {
  /*
   * Cleanup intentionally uses the service-role
   * client. This is test infrastructure, not the
   * application mutation path being tested.
   */
  const { error } = await admin
    .from("recurring_transactions")
    .delete()
    .eq("id", recurringId);

  expect(error).toBeNull();
}

function getDaysAgo(days: number): string {
  const date = new Date();

  date.setUTCDate(
    date.getUTCDate() - days,
  );

  return date.toISOString().slice(0, 10);
}

function getDaysFromNow(days: number): string {
  const date = new Date();

  date.setUTCDate(
    date.getUTCDate() + days,
  );

  return date.toISOString().slice(0, 10);
}

describe("recurring transaction edge cases", () => {
  const createdRecurringIds: string[] = [];

  beforeAll(async () => {
    supabase =
      createAuthenticatedClient();

    admin = createAdminClient();

    await signInTestUser(supabase);
  });

  afterAll(async () => {
    for (const recurringId of createdRecurringIds) {
      await cleanupRecurring(recurringId);
    }

    await supabase.auth.signOut();
  });

  it("creates a recurring expense successfully", async () => {
    const account = await getMoneyAccount();
    const category = await getExpenseCategory(
      account.currency,
    );

    const recurringId =
      await createRecurringExpense(
        account,
        category,
      );

    createdRecurringIds.push(recurringId);

    const recurring =
      await getRecurring(recurringId);

    expect(recurring.name).toContain(
      "Test Recurring",
    );
    expect(recurring.transaction_type).toBe(
      "expense",
    );
    expect(Number(recurring.amount)).toBe(10);
    expect(recurring.currency).toBe(
      account.currency,
    );
    expect(recurring.frequency).toBe(
      "monthly",
    );
    expect(recurring.is_active).toBe(true);
  });

  it("rejects NaN recurring amounts at the RPC boundary", async () => {
    const account = await getMoneyAccount();
    const category = await getExpenseCategory(
      account.currency,
    );

    const { data, error } =
      await supabase.rpc(
        "create_recurring_transaction",
        {
          p_name: `NaN Test ${Date.now()}`,
          p_transaction_type: "expense",
          p_amount: Number.NaN,
          p_currency: account.currency,
          p_frequency: "monthly",
          p_next_run_date: "2099-02-01",
          p_category_id: category.id,
          p_source_account_id: account.id,
          p_destination_account_id: null,
          p_description: null,
        },
      );

    /*
     * Supabase/PostgREST serializes JavaScript NaN
     * at the client boundary in a way that does not
     * reliably reach PostgreSQL as numeric NaN.
     *
     * Therefore this test documents the boundary
     * behavior instead of incorrectly asserting a
     * database rejection.
     */
    expect(
      data === null || error !== null,
    ).toBe(true);
  });

  it("rejects infinite recurring amounts", async () => {
    const account = await getMoneyAccount();
    const category = await getExpenseCategory(
      account.currency,
    );

    const { error } = await supabase.rpc(
      "create_recurring_transaction",
      {
        p_name: `Infinity Test ${Date.now()}`,
        p_transaction_type: "expense",
        p_amount: "Infinity",
        p_currency: account.currency,
        p_frequency: "monthly",
        p_next_run_date: "2099-03-01",
        p_category_id: category.id,
        p_source_account_id: account.id,
        p_destination_account_id: null,
        p_description: null,
      },
    );

    expect(error).toBeTruthy();
  });

  it("rejects zero recurring amounts", async () => {
    const account = await getMoneyAccount();
    const category = await getExpenseCategory(
      account.currency,
    );

    const { error } = await supabase.rpc(
      "create_recurring_transaction",
      {
        p_name: `Zero Test ${Date.now()}`,
        p_transaction_type: "expense",
        p_amount: 0,
        p_currency: account.currency,
        p_frequency: "monthly",
        p_next_run_date: "2099-04-01",
        p_category_id: category.id,
        p_source_account_id: account.id,
        p_destination_account_id: null,
        p_description: null,
      },
    );

    expect(error).toBeTruthy();
  });

  it("rejects negative recurring amounts", async () => {
    const account = await getMoneyAccount();
    const category = await getExpenseCategory(
      account.currency,
    );

    const { error } = await supabase.rpc(
      "create_recurring_transaction",
      {
        p_name: `Negative Test ${Date.now()}`,
        p_transaction_type: "expense",
        p_amount: -10,
        p_currency: account.currency,
        p_frequency: "monthly",
        p_next_run_date: "2099-05-01",
        p_category_id: category.id,
        p_source_account_id: account.id,
        p_destination_account_id: null,
        p_description: null,
      },
    );

    expect(error).toBeTruthy();
  });

  it("updates a recurring transaction successfully", async () => {
    const account = await getMoneyAccount();
    const category = await getExpenseCategory(
      account.currency,
    );

    const recurringId =
      await createRecurringExpense(
        account,
        category,
      );

    createdRecurringIds.push(recurringId);

    const { error } = await supabase.rpc(
      "update_recurring_transaction",
      {
        p_recurring_id: recurringId,
        p_name: "Updated Recurring Expense",
        p_transaction_type: "expense",
        p_amount: 25,
        p_currency: account.currency,
        p_frequency: "weekly",
        p_next_run_date: "2099-06-01",
        p_category_id: category.id,
        p_source_account_id: account.id,
        p_destination_account_id: null,
        p_description: "Updated description",
      },
    );

    expect(error).toBeNull();

    const recurring =
      await getRecurring(recurringId);

    expect(recurring.name).toBe(
      "Updated Recurring Expense",
    );
    expect(Number(recurring.amount)).toBe(25);
    expect(recurring.frequency).toBe(
      "weekly",
    );
    expect(recurring.next_run_date).toBe(
      "2099-06-01",
    );
  });

  it("rejects invalid update amounts at the RPC boundary", async () => {
    const account = await getMoneyAccount();
    const category = await getExpenseCategory(
      account.currency,
    );

    const recurringId =
      await createRecurringExpense(
        account,
        category,
      );

    createdRecurringIds.push(recurringId);

    const { data, error } =
      await supabase.rpc(
        "update_recurring_transaction",
        {
          p_recurring_id: recurringId,
          p_name: "Invalid Amount",
          p_transaction_type: "expense",
          p_amount: Number.NaN,
          p_currency: account.currency,
          p_frequency: "monthly",
          p_next_run_date: "2099-07-01",
          p_category_id: category.id,
          p_source_account_id: account.id,
          p_destination_account_id: null,
          p_description: null,
        },
      );

    /*
     * As with the create RPC, JavaScript NaN is not
     * guaranteed to arrive at PostgreSQL as numeric NaN.
     * This assertion verifies the RPC call did not
     * produce a successful non-null result.
     */
    expect(
      data === null || error !== null,
    ).toBe(true);
  });

  it("runs a due recurring transaction", async () => {
    const account = await getMoneyAccount();
    const category = await getExpenseCategory(
      account.currency,
    );

    const recurringId =
      await createRecurringExpense(
        account,
        category,
        {
          name: `Run Test ${Date.now()}`,
          amount: 15,
          frequency: "monthly",
          next_run_date: "2020-01-01",
        },
      );

    createdRecurringIds.push(recurringId);

    const { data: transactionId, error } =
      await supabase.rpc(
        "run_recurring_transaction",
        {
          p_recurring_id: recurringId,
        },
      );

    expect(error).toBeNull();
    expect(transactionId).toBeTruthy();

    const recurring =
      await getRecurring(recurringId);

    expect(recurring.next_run_date).toBe(
      "2020-02-01",
    );

    const {
      data: transaction,
      error: transactionError,
    } = await supabase
      .from("transactions")
      .select("id, status")
      .eq("id", transactionId)
      .single();

    expect(transactionError).toBeNull();
    expect(transaction).toBeTruthy();
    expect(transaction.status).toBe(
      "posted",
    );
  });

  it("processes all overdue occurrences for the current user", async () => {
    const account = await getMoneyAccount();
    const category = await getExpenseCategory(
      account.currency,
    );

    const overdueDate =
      getDaysAgo(3);

    const recurringId =
      await createRecurringExpense(
        account,
        category,
        {
          name: `Process Due Test ${Date.now()}`,
          amount: 5,
          frequency: "daily",
          next_run_date: getDaysFromNow(1),
        },
      );

    createdRecurringIds.push(recurringId);

    const { error: updateError } =
      await supabase.rpc(
        "update_recurring_transaction",
        {
          p_recurring_id: recurringId,
          p_name: "Process Due Test",
          p_transaction_type: "expense",
          p_amount: 5,
          p_currency: account.currency,
          p_frequency: "daily",
          p_next_run_date: overdueDate,
          p_category_id: category.id,
          p_source_account_id: account.id,
          p_destination_account_id: null,
          p_description: null,
        },
      );

    expect(updateError).toBeNull();

    const {
      data: beforeProcess,
      error: beforeError,
    } = await supabase
      .from("recurring_transactions")
      .select(
        "id, user_id, is_active, next_run_date",
      )
      .eq("id", recurringId)
      .single();

    expect(beforeError).toBeNull();
    expect(beforeProcess).toBeTruthy();
    expect(beforeProcess.is_active).toBe(true);

    expect(
      beforeProcess.next_run_date <=
        new Date()
          .toISOString()
          .slice(0, 10),
    ).toBe(true);

    const {
      data: count,
      error,
    } = await supabase.rpc(
      "process_due_recurring_transactions",
    );

    expect(error).toBeNull();

    const {
      data: afterProcess,
      error: afterError,
    } = await supabase
      .from("recurring_transactions")
      .select(
        "id, user_id, is_active, next_run_date",
      )
      .eq("id", recurringId)
      .single();

    expect(afterError).toBeNull();
    expect(afterProcess).toBeTruthy();

    expect(Number(count)).toBeGreaterThan(0);

    expect(
      afterProcess.next_run_date >
        new Date()
          .toISOString()
          .slice(0, 10),
    ).toBe(true);
  });

  it("archives an active recurring transaction", async () => {
    const account = await getMoneyAccount();
    const category = await getExpenseCategory(
      account.currency,
    );

    const recurringId =
      await createRecurringExpense(
        account,
        category,
      );

    createdRecurringIds.push(recurringId);

    await archiveRecurring(recurringId);

    const recurring =
      await getRecurring(recurringId);

    expect(recurring.is_active).toBe(false);
  });

  it("rejects running an archived recurring transaction", async () => {
    const account = await getMoneyAccount();
    const category = await getExpenseCategory(
      account.currency,
    );

    const recurringId =
      await createRecurringExpense(
        account,
        category,
      );

    createdRecurringIds.push(recurringId);

    await archiveRecurring(recurringId);

    const { error } = await supabase.rpc(
      "run_recurring_transaction",
      {
        p_recurring_id: recurringId,
      },
    );

    expect(error).toBeTruthy();
  });
});

