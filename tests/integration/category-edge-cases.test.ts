import {
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const email =
  process.env.PLAYWRIGHT_TEST_EMAIL!;

const password =
  process.env.PLAYWRIGHT_TEST_PASSWORD!;

let supabase: SupabaseClient;

async function createTestCategory(
  name: string,
  type: "income" | "expense",
) {
  const { data, error } = await supabase.rpc(
    "create_category",
    {
      p_name: name,
      p_category_type: type,
    },
  );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as string;
}

async function deleteTestCategory(
  categoryId: string,
) {
  const { error } = await supabase.rpc(
    "delete_category",
    {
      p_category_id: categoryId,
    },
  );

  expect(error).toBeNull();
}

describe("category edge cases", () => {
  beforeAll(async () => {
    supabase = createClient(
      supabaseUrl,
      supabaseKey,
    );

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    expect(error).toBeNull();
  });

  it("creates a category with a matching ledger account", async () => {
    const name =
      `Category Create ${Date.now()}`;

    const categoryId =
      await createTestCategory(
        name,
        "expense",
      );

    const { data: category, error: categoryError } =
      await supabase
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
    expect(category?.ledger_account_id).toBeTruthy();

    const { data: account, error: accountError } =
      await supabase
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

    await deleteTestCategory(categoryId);
  });

  it("renames a category and its ledger account together", async () => {
    const originalName =
      `Category Rename ${Date.now()}`;

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

    const newName =
      `Category Renamed ${Date.now()}`;

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
    expect(category?.ledger_account_id).toBe(
      before!.ledger_account_id,
    );

    const { data: account } =
      await supabase
        .from("accounts")
        .select("name, account_type")
        .eq(
          "id",
          before!.ledger_account_id,
        )
        .single();

    expect(account?.name).toBe(newName);
    expect(account?.account_type).toBe(
      "expense",
    );

    await deleteTestCategory(categoryId);
  });

  it("allows type change for an unused category", async () => {
    const name =
      `Category Type ${Date.now()}`;

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

    expect(category?.category_type).toBe(
      "income",
    );

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

    await deleteTestCategory(categoryId);
  });

  it("blocks type change when transaction history exists", async () => {
    const { data: category, error } =
      await supabase
        .from("categories")
        .select("id, category_type")
        .eq("name", "test")
        .single();

    expect(error).toBeNull();
    expect(category?.category_type).toBe(
      "expense",
    );

    const { error: updateError } =
      await supabase.rpc(
        "update_category",
        {
          p_category_id: category!.id,
          p_name: "test",
          p_category_type: "income",
        },
      );

    expect(updateError).toBeTruthy();
    expect(updateError!.message).toContain(
      "Category type cannot be changed",
    );
  });

  it("blocks deletion when transaction history exists", async () => {
    const { data: category, error } =
      await supabase
        .from("categories")
        .select("id")
        .eq("name", "test")
        .single();

    expect(error).toBeNull();

    const { error: deleteError } =
      await supabase.rpc(
        "delete_category",
        {
          p_category_id: category!.id,
        },
      );

    expect(deleteError).toBeTruthy();
    expect(deleteError!.message).toContain(
      "transaction history",
    );
  });

  it("blocks deletion when a budget references the category", async () => {
    const categoryId =
      await createTestCategory(
        `Category Budget ${Date.now()}`,
        "expense",
      );

    const { data: categoryAccount, error: accountError } =
      await supabase
        .from("categories")
        .select(`
          accounts!inner(currency)
        `)
        .eq("id", categoryId)
        .single();

    expect(accountError).toBeNull();

    const row = categoryAccount as unknown as {
      accounts: { currency: string };
    };

    const { error: budgetError } =
      await supabase.rpc(
        "create_budget",
        {
          p_category_id: categoryId,
          p_amount: 1000,
          p_currency: row.accounts.currency,
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
    expect(deleteError!.message).toContain(
      "budget",
    );

    /*
      Category intentionally remains because
      the budget depends on it.
    */
  });

  it("blocks deletion when an active recurring transaction references the category", async () => {
    const categoryId =
      await createTestCategory(
        `Category Recurring ${Date.now()}`,
        "expense",
      );

    const { data: account, error: accountError } =
      await supabase
        .from("accounts")
        .select(
          "id, currency",
        )
        .eq("account_type", "asset")
        .eq("is_system", false)
        .eq("is_archived", false)
        .limit(1)
        .single();

    expect(accountError).toBeNull();

    const { error: recurringError } =
      await supabase.rpc(
        "create_recurring_transaction",
        {
          p_name:
            `Category Recurring ${Date.now()}`,
          p_amount: 100,
          p_currency: account!.currency,
          p_frequency: "monthly",
          p_next_run_date:
            new Date()
              .toISOString()
              .slice(0, 10),
          p_transaction_type: "expense",
          p_category_id: categoryId,
          p_source_account_id: account!.id,
          p_destination_account_id: null,
          p_description:
            "Category integrity test",
        },
      );

    expect(recurringError).toBeNull();

    const { error: deleteError } =
      await supabase.rpc(
        "delete_category",
        {
          p_category_id: categoryId,
        },
      );

    expect(deleteError).toBeTruthy();
    expect(deleteError!.message).toContain(
      "active recurring",
    );

    /*
      Category intentionally remains because
      the active recurring transaction depends on it.
    */
  });

  it("deletes an unused category and its ledger account", async () => {
    const categoryId =
      await createTestCategory(
        `Category Delete ${Date.now()}`,
        "expense",
      );

    const { data: category, error } =
      await supabase
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

    const { data: deletedCategory } =
      await supabase
        .from("categories")
        .select("id")
        .eq("id", categoryId)
        .maybeSingle();

    expect(deletedCategory).toBeNull();

    const { data: deletedAccount } =
      await supabase
        .from("accounts")
        .select("id")
        .eq("id", ledgerAccountId)
        .maybeSingle();

    expect(deletedAccount).toBeNull();
  });
});
