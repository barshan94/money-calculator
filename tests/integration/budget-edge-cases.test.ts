import { beforeAll, describe, expect, it } from "vitest";
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

    const first = await supabase.rpc(
      "create_budget",
      {
        p_category_id: category.id,
        p_amount: 100,
        p_currency: category.currency,
        p_period: "monthly",
        p_start_date: "2099-09-01",
        p_end_date: null,
      },
    );

    expect(first.error).toBeNull();
    expect(first.data).toBeTruthy();

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

    await supabase.rpc(
      "archive_budget",
      {
        p_budget_id: first.data,
      },
    );
  });
});
