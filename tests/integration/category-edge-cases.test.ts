import {
  beforeAll,
  afterAll,
  describe,
  expect,
  it,
} from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

import {
  createAdminClient,
  createAuthenticatedClient,
  signInTestUser,
} from "./test-helpers";

let supabase: SupabaseClient;
let admin: SupabaseClient;

const createdCategoryIds: string[] = [];
const createdRecurringIds: string[] = [];

function uniqueName(prefix: string) {
  return `${prefix} ${Date.now()} ${randomUUID()}`;
}

async function createTestCategory(
  name: string,
  type: "income" | "expense",
) {
  const { data, error } =
    await supabase.rpc(
      "create_category",
      {
        p_name: name,
        p_category_type: type,
      },
    );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  const categoryId = data as string;
  createdCategoryIds.push(categoryId);

  return categoryId;
}

async function createTransactionHistory(
  categoryId: string,
) {
  const {
    data: category,
    error: categoryError,
  } = await supabase
    .from("categories")
    .select("ledger_account_id")
    .eq("id", categoryId)
    .single();

  expect(categoryError).toBeNull();
  expect(category?.ledger_account_id).toBeTruthy();

  const {
    data: accounts,
    error: accountError,
  } = await supabase
    .from("accounts")
    .select("id, currency")
    .eq("account_type", "asset")
    .eq("is_system", false)
    .eq("is_archived", false)
    .eq("currency", "BDT")
    .limit(1);

  expect(accountError).toBeNull();
  expect(accounts).toHaveLength(1);

  const {
    data: transactionId,
    error: transactionError,
  } = await supabase.rpc(
    "create_transaction",
    {
      p_transaction_date:
        new Date().toISOString(),
      p_description:
        uniqueName("Category History"),
      p_reference: null,
      p_notes: null,
      p_entries: [
        {
          account_id:
            category!.ledger_account_id,
          category_id: categoryId,
          amount: 100,
          entry_type: "debit",
        },
        {
          account_id: accounts![0].id,
          category_id: null,
          amount: 100,
          entry_type: "credit",
        },
      ],
    },
  );

  expect(transactionError).toBeNull();
  expect(transactionId).toBeTruthy();

  return transactionId as string;
}

describe("category edge cases", () => {
  beforeAll(async () => {
    supabase =
      createAuthenticatedClient();

    admin = createAdminClient();

    await signInTestUser(supabase);
  });

  afterAll(async () => {
    /*
     * Recurring transactions are test fixtures.
     * Cleanup intentionally uses the service-role
     * client because production authenticated
     * users will not retain direct DELETE
     * privileges on this table.
     */
    for (const recurringId of createdRecurringIds) {
      await admin
        .from("recurring_transactions")
        .delete()
        .eq("id", recurringId);
    }

    /*
     * Category deletion itself must continue
     * through the authenticated RPC because
     * delete_category is application logic under test.
     */
    for (const categoryId of createdCategoryIds) {
      await supabase.rpc(
        "delete_category",
        {
          p_category_id: categoryId,
        },
      );
    }

    await supabase.auth.signOut();
  });

  it("creates a category with a matching ledger account", async () => {
    const name =
      uniqueName("Category Create");

    const categoryId =
      await createTestCategory(
        name,
        "expense",
      );

    const {
      data: category,
      error: categoryError,
    } = await supabase
      .from("categories")
      .select(
        "id, name, category_type, ledger_account_id",
      )
      .eq("id", categoryId)
      .single();

    expect(categoryError).toBeNull();
    expect(category?.name).toBe(name);
    expect(category?.category_type).toBe(
      "expense",
    );
    expect(
      category?.ledger_account_id,
    ).toBeTruthy();

    const {
      data: account,
      error: accountError,
    } = await supabase
      .from("accounts")
      .select(
        "id, name, account_type, is_system",
      )
      .eq(
        "id",
        category!.ledger_account_id,
      )
      .single();

    expect(accountError).toBeNull();
    expect(account?.name).toBe(name);
    expect(account?.account_type).toBe(
      "expense",
    );
    expect(account?.is_system).toBe(true);
  });

  it("renames a category and its ledger account together", async () => {
    const originalName =
      uniqueName("Category Rename");

    const categoryId =
      await createTestCategory(
        originalName,
        "expense",
      );

    const { data: before } =
      await supabase
        .from("categories")
        .select("ledger_account_id")
        .eq("id", categoryId)
        .single();

    expect(before?.ledger_account_id).toBeTruthy();

    const newName =
      uniqueName("Category Renamed");

    const { error } =
      await supabase.rpc(
        "update_category",
        {
          p_category_id: categoryId,
          p_name: newName,
          p_category_type: "expense",
        },
      );

    expect(error).toBeNull();

    const { data: category } =
      await supabase
        .from("categories")
        .select(
          "name, category_type, ledger_account_id",
        )
        .eq("id", categoryId)
        .single();

    expect(category?.name).toBe(newName);
    expect(category?.category_type).toBe(
      "expense",
    );
    expect(
      category?.ledger_account_id,
    ).toBe(
      before!.ledger_account_id,
    );

    const { data: account } =
      await supabase
        .from("accounts")
        .select(
          "name, account_type",
        )
        .eq(
          "id",
          before!.ledger_account_id,
        )
        .single();

    expect(account?.name).toBe(newName);
    expect(account?.account_type).toBe(
      "expense",
    );
  });

  it("allows type change for an unused category", async () => {
    const name =
      uniqueName("Category Type");

    const categoryId =
      await createTestCategory(
        name,
        "expense",
      );

    const { error } =
      await supabase.rpc(
        "update_category",
        {
          p_category_id: categoryId,
          p_name: name,
          p_category_type: "income",
        },
      );

    expect(error).toBeNull();

    const { data: category } =
      await supabase
        .from("categories")
        .select(
          "category_type, ledger_account_id",
        )
        .eq("id", categoryId)
        .single();

    expect(
      category?.category_type,
    ).toBe("income");

    const { data: account } =
      await supabase
        .from("accounts")
        .select("account_type")
        .eq(
          "id",
          category!.ledger_account_id,
        )
        .single();

    expect(account?.account_type).toBe(
      "income",
    );
  });

  it("blocks type change when transaction history exists", async () => {
    const name =
      uniqueName(
        "Category Type History",
      );

    const categoryId =
      await createTestCategory(
        name,
        "expense",
      );

    await createTransactionHistory(
      categoryId,
    );

    const { error: updateError } =
      await supabase.rpc(
        "update_category",
        {
          p_category_id: categoryId,
          p_name: name,
          p_category_type: "income",
        },
      );

    expect(updateError).toBeTruthy();
    expect(
      updateError!.message,
    ).toContain(
      "Category type cannot be changed",
    );
  });

  it("blocks deletion when transaction history exists", async () => {
    const categoryId =
      await createTestCategory(
        uniqueName(
          "Category Delete History",
        ),
        "expense",
      );

    await createTransactionHistory(
      categoryId,
    );

    const { error: deleteError } =
      await supabase.rpc(
        "delete_category",
        {
          p_category_id: categoryId,
        },
      );

    expect(deleteError).toBeTruthy();
    expect(
      deleteError!.message,
    ).toContain(
      "transaction history",
    );
  });

  it("blocks deletion when a budget references the category", async () => {
    const categoryId =
      await createTestCategory(
        uniqueName("Category Budget"),
        "expense",
      );

    const {
      data: categoryAccount,
      error: accountError,
    } = await supabase
      .from("categories")
      .select(`
        accounts!inner(currency)
      `)
      .eq("id", categoryId)
      .single();

    expect(accountError).toBeNull();

    const row =
      categoryAccount as unknown as {
        accounts: {
          currency: string;
        };
      };

    const { error: budgetError } =
      await supabase.rpc(
        "create_budget",
        {
          p_category_id: categoryId,
          p_amount: 1000,
          p_currency:
            row.accounts.currency,
          p_period: "monthly",
          p_start_date:
            new Date()
              .toISOString()
              .slice(0, 10),
          p_end_date: null,
        },
      );

    expect(budgetError).toBeNull();

    const { error: deleteError } =
      await supabase.rpc(
        "delete_category",
        {
          p_category_id: categoryId,
        },
      );

    expect(deleteError).toBeTruthy();
    expect(
      deleteError!.message,
    ).toContain("budget");
  });

  it("blocks deletion when an active recurring transaction references the category", async () => {
    const categoryId =
      await createTestCategory(
        uniqueName(
          "Category Recurring",
        ),
        "expense",
      );

    const {
      data: account,
      error: accountError,
    } = await supabase
      .from("accounts")
      .select(
        "id, currency",
      )
      .eq(
        "account_type",
        "asset",
      )
      .eq(
        "is_system",
        false,
      )
      .eq(
        "is_archived",
        false,
      )
      .limit(1)
      .single();

    expect(accountError).toBeNull();

    const {
      data: recurringId,
      error: recurringError,
    } = await supabase.rpc(
      "create_recurring_transaction",
      {
        p_name:
          uniqueName(
            "Category Recurring",
          ),
        p_amount: 100,
        p_currency:
          account!.currency,
        p_frequency: "monthly",
        p_next_run_date:
          "2099-01-01",
        p_transaction_type:
          "expense",
        p_category_id:
          categoryId,
        p_source_account_id:
          account!.id,
        p_destination_account_id:
          null,
        p_description:
          "Category integrity test",
      },
    );

    expect(recurringError).toBeNull();
    expect(recurringId).toBeTruthy();

    createdRecurringIds.push(
      recurringId as string,
    );

    const { error: deleteError } =
      await supabase.rpc(
        "delete_category",
        {
          p_category_id: categoryId,
        },
      );

    expect(deleteError).toBeTruthy();
    expect(
      deleteError!.message,
    ).toContain(
      "active recurring",
    );
  });

  it("deletes an unused category and its ledger account", async () => {
    const categoryId =
      await createTestCategory(
        uniqueName(
          "Category Delete",
        ),
        "expense",
      );

    const {
      data: category,
      error,
    } = await supabase
      .from("categories")
      .select("ledger_account_id")
      .eq("id", categoryId)
      .single();

    expect(error).toBeNull();

    const ledgerAccountId =
      category!.ledger_account_id;

    const { error: deleteError } =
      await supabase.rpc(
        "delete_category",
        {
          p_category_id: categoryId,
        },
      );

    expect(deleteError).toBeNull();

    const {
      data: deletedCategory,
    } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .maybeSingle();

    expect(deletedCategory).toBeNull();

    const {
      data: deletedAccount,
    } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", ledgerAccountId)
      .maybeSingle();

    expect(deletedAccount).toBeNull();
  });
});
