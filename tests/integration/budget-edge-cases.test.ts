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

type Category = {
  id: string;
  currency: string;
};

async function getExpenseCategory(): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .select(`
      id,
      accounts!inner(currency)
    `)
    .eq("category_type", "expense")
    .eq("is_archived", false)
    .limit(1)
    .single();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  const row = data as unknown as {
    id: string;
    accounts: { currency: string };
  };

  return {
    id: row.id,
    currency: row.accounts.currency,
  };
}

async function createBudget(
  category: Category,
  startDate: string,
  amount = 100,
) {
  const { data, error } = await supabase.rpc(
    "create_budget",
    {
      p_category_id: category.id,
      p_amount: amount,
      p_currency: category.currency,
      p_period: "monthly",
      p_start_date: startDate,
      p_end_date: null,
    },
  );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as string;
}

async function archiveBudget(budgetId: string) {
  const { error } = await supabase.rpc(
    "archive_budget",
    {
      p_budget_id: budgetId,
    },
  );

  expect(error).toBeNull();
}

async function deleteBudget(budgetId: string) {
  const { error } = await supabase.rpc(
    "delete_budget",
    {
      p_budget_id: budgetId,
    },
  );

  expect(error).toBeNull();
}

describe("budget edge cases", () => {
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

  it("rejects NaN budget amounts", async () => {
    const category = await getExpenseCategory();

    const { error } = await supabase.rpc(
      "create_budget",
      {
        p_category_id: category.id,
        p_amount: "NaN",
        p_currency: category.currency,
        p_period: "monthly",
        p_start_date: "2099-01-01",
        p_end_date: null,
      },
    );

    expect(error).toBeTruthy();
  });

  it("rejects infinite budget amounts", async () => {
    const category = await getExpenseCategory();

    const { error } = await supabase.rpc(
      "create_budget",
      {
        p_category_id: category.id,
        p_amount: "Infinity",
        p_currency: category.currency,
        p_period: "monthly",
        p_start_date: "2099-02-01",
        p_end_date: null,
      },
    );

    expect(error).toBeTruthy();
  });

  it("rejects zero budget amounts", async () => {
    const category = await getExpenseCategory();

    const { error } = await supabase.rpc(
      "create_budget",
      {
        p_category_id: category.id,
        p_amount: 0,
        p_currency: category.currency,
        p_period: "monthly",
        p_start_date: "2099-03-01",
        p_end_date: null,
      },
    );

    expect(error).toBeTruthy();
  });

  it("rejects negative budget amounts", async () => {
    const category = await getExpenseCategory();

    const { error } = await supabase.rpc(
      "create_budget",
      {
        p_category_id: category.id,
        p_amount: -100,
        p_currency: category.currency,
        p_period: "monthly",
        p_start_date: "2099-04-01",
        p_end_date: null,
      },
    );

    expect(error).toBeTruthy();
  });

  it("rejects invalid budget periods", async () => {
    const category = await getExpenseCategory();

    const { error } = await supabase.rpc(
      "create_budget",
      {
        p_category_id: category.id,
        p_amount: 100,
        p_currency: category.currency,
        p_period: "daily",
        p_start_date: "2099-05-01",
        p_end_date: null,
      },
    );

    expect(error).toBeTruthy();
  });

  it("rejects an end date before the start date", async () => {
    const category = await getExpenseCategory();

    const { error } = await supabase.rpc(
      "create_budget",
      {
        p_category_id: category.id,
        p_amount: 100,
        p_currency: category.currency,
        p_period: "monthly",
        p_start_date: "2099-06-10",
        p_end_date: "2099-06-01",
      },
    );

    expect(error).toBeTruthy();
  });

  it("rejects invalid currencies", async () => {
    const category = await getExpenseCategory();

    const { error } = await supabase.rpc(
      "create_budget",
      {
        p_category_id: category.id,
        p_amount: 100,
        p_currency: "XYZ",
        p_period: "monthly",
        p_start_date: "2099-07-01",
        p_end_date: null,
      },
    );

    expect(error).toBeTruthy();
  });

  it("rejects currency mismatch with the category", async () => {
    const category = await getExpenseCategory();

    const mismatchedCurrency =
      category.currency === "BDT"
        ? "USD"
        : "BDT";

    const { error } = await supabase.rpc(
      "create_budget",
      {
        p_category_id: category.id,
        p_amount: 100,
        p_currency: mismatchedCurrency,
        p_period: "monthly",
        p_start_date: "2099-08-01",
        p_end_date: null,
      },
    );

    expect(error).toBeTruthy();
  });

  it("rejects overlapping active budgets", async () => {
    const category = await getExpenseCategory();

    const firstId = await createBudget(
      category,
      "2099-09-01",
    );

    const second = await supabase.rpc(
      "create_budget",
      {
        p_category_id: category.id,
        p_amount: 200,
        p_currency: category.currency,
        p_period: "monthly",
        p_start_date: "2099-09-15",
        p_end_date: null,
      },
    );

    expect(second.error).toBeTruthy();

    await archiveBudget(firstId);
    await deleteBudget(firstId);
  });

  it("allows updating an existing budget", async () => {
    const category = await getExpenseCategory();

    const budgetId = await createBudget(
      category,
      "2099-10-01",
    );

    const { error } = await supabase.rpc(
      "update_budget",
      {
        p_budget_id: budgetId,
        p_category_id: category.id,
        p_amount: 250,
        p_currency: category.currency,
        p_period: "yearly",
        p_start_date: "2099-10-01",
        p_end_date: "2099-12-31",
      },
    );

    expect(error).toBeNull();

    const { data, error: readError } =
      await supabase
        .from("budgets")
        .select(
          "amount, currency, period, start_date, end_date",
        )
        .eq("id", budgetId)
        .single();

    expect(readError).toBeNull();
    expect(data).toMatchObject({
      amount: 250,
      currency: category.currency,
      period: "yearly",
      start_date: "2099-10-01",
      end_date: "2099-12-31",
    });

    await archiveBudget(budgetId);
    await deleteBudget(budgetId);
  });

  it("rejects invalid amounts when updating a budget", async () => {
    const category = await getExpenseCategory();

    const budgetId = await createBudget(
      category,
      "2100-01-01",
    );

    const { error } = await supabase.rpc(
      "update_budget",
      {
        p_budget_id: budgetId,
        p_category_id: category.id,
        p_amount: "NaN",
        p_currency: category.currency,
        p_period: "monthly",
        p_start_date: "2100-01-01",
        p_end_date: null,
      },
    );

    expect(error).toBeTruthy();

    await archiveBudget(budgetId);
    await deleteBudget(budgetId);
  });

  it("rejects an overlapping range when updating a budget", async () => {
    const category = await getExpenseCategory();

    const firstId = await createBudget(
      category,
      "2101-01-01",
    );

    const secondId = await createBudget(
      category,
      "2101-03-01",
    );

    const { error } = await supabase.rpc(
      "update_budget",
      {
        p_budget_id: secondId,
        p_category_id: category.id,
        p_amount: 150,
        p_currency: category.currency,
        p_period: "monthly",
        p_start_date: "2101-01-15",
        p_end_date: null,
      },
    );

    expect(error).toBeTruthy();

    await archiveBudget(firstId);
    await deleteBudget(firstId);

    await archiveBudget(secondId);
    await deleteBudget(secondId);
  });

  it("archives an active budget", async () => {
    const category = await getExpenseCategory();

    const budgetId = await createBudget(
      category,
      "2102-01-01",
    );

    await archiveBudget(budgetId);

    const { data, error } =
      await supabase
        .from("budgets")
        .select("is_active")
        .eq("id", budgetId)
        .single();

    expect(error).toBeNull();
    expect(data?.is_active).toBe(false);

    await deleteBudget(budgetId);
  });

  it("rejects archiving an already archived budget", async () => {
    const category = await getExpenseCategory();

    const budgetId = await createBudget(
      category,
      "2103-01-01",
    );

    await archiveBudget(budgetId);

    const { error } = await supabase.rpc(
      "archive_budget",
      {
        p_budget_id: budgetId,
      },
    );

    expect(error).toBeTruthy();

    await deleteBudget(budgetId);
  });

  it("rejects deleting an active budget", async () => {
    const category = await getExpenseCategory();

    const budgetId = await createBudget(
      category,
      "2104-01-01",
    );

    const { error } = await supabase.rpc(
      "delete_budget",
      {
        p_budget_id: budgetId,
      },
    );

    expect(error).toBeTruthy();

    await archiveBudget(budgetId);
    await deleteBudget(budgetId);
  });

  it("deletes an archived budget", async () => {
    const category = await getExpenseCategory();

    const budgetId = await createBudget(
      category,
      "2105-01-01",
    );

    await archiveBudget(budgetId);
    await deleteBudget(budgetId);

    const { data, error } =
      await supabase
        .from("budgets")
        .select("id")
        .eq("id", budgetId)
        .maybeSingle();

    expect(error).toBeNull();
    expect(data).toBeNull();
  });
});