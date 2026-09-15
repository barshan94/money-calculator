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

type Account = {
  id: string;
  account_type: string;
  is_system: boolean;
  is_archived: boolean;
};

type Category = {
  id: string;
  category_type: string;
  ledger_account_id: string | null;
  is_archived: boolean;
};

async function getTestAccounts() {
  const { data, error } = await supabase
    .from("accounts")
    .select(
      "id, account_type, is_system, is_archived",
    )
    .eq("is_system", false)
    .eq("is_archived", false)
    .in("account_type", ["asset", "liability"]);

  expect(error).toBeNull();
  expect(data).toBeTruthy();
  expect(data!.length).toBeGreaterThanOrEqual(2);

  return data as Account[];
}

async function getExpenseCategory() {
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, category_type, ledger_account_id, is_archived",
    )
    .eq("category_type", "expense")
    .eq("is_archived", false)
    .not("ledger_account_id", "is", null)
    .limit(1);

  expect(error).toBeNull();
  expect(data).toHaveLength(1);

  return data![0] as Category;
}

describe("transaction edge cases", () => {
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

  it("rejects zero amount", async () => {
    const accounts = await getTestAccounts();
    const category =
      await getExpenseCategory();

    const { data, error } =
      await supabase.rpc(
        "create_transaction",
        {
          p_transaction_date: new Date().toISOString(),
          p_description:
            "Edge case zero amount",
          p_reference: null,
          p_notes: null,
          p_entries: [
            {
              account_id:
                category.ledger_account_id,
              category_id: category.id,
              amount: 0,
              entry_type: "debit",
            },
            {
              account_id: accounts[0].id,
              category_id: null,
              amount: 0,
              entry_type: "credit",
            },
          ],
        },
      );

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error!.message).toContain(
      "greater than zero",
    );
  });

  it("rejects negative amount", async () => {
    const accounts = await getTestAccounts();
    const category =
      await getExpenseCategory();

    const { data, error } =
      await supabase.rpc(
        "create_transaction",
        {
          p_transaction_date: new Date().toISOString(),
          p_description:
            "Edge case negative amount",
          p_reference: null,
          p_notes: null,
          p_entries: [
            {
              account_id:
                category.ledger_account_id,
              category_id: category.id,
              amount: -100,
              entry_type: "debit",
            },
            {
              account_id: accounts[0].id,
              category_id: null,
              amount: -100,
              entry_type: "credit",
            },
          ],
        },
      );

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error!.message).toContain(
      "greater than zero",
    );
  });

  it("rejects NaN and infinite transaction amounts", async () => {
    const accounts = await getTestAccounts();

    const specialAmounts = [
      "NaN",
      "Infinity",
      "-Infinity",
    ];

    for (const amount of specialAmounts) {
      const { data, error } =
        await supabase.rpc(
          "create_transaction",
          {
            p_transaction_date:
              new Date().toISOString(),
            p_description:
              `Edge case ${amount} amount`,
            p_reference: null,
            p_notes: null,
            p_entries: [
              {
                account_id: accounts[0].id,
                category_id: null,
                amount,
                entry_type: "debit",
              },
              {
                account_id: accounts[1].id,
                category_id: null,
                amount,
                entry_type: "credit",
              },
            ],
          },
        );

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error!.message).toContain(
        "finite number greater than zero",
      );
    }
  });

  it("rejects unbalanced entries", async () => {
    const accounts = await getTestAccounts();

    const { data, error } =
      await supabase.rpc(
        "create_transaction",
        {
          p_transaction_date: new Date().toISOString(),
          p_description:
            "Edge case unbalanced",
          p_reference: null,
          p_notes: null,
          p_entries: [
            {
              account_id: accounts[0].id,
              category_id: null,
              amount: 100,
              entry_type: "debit",
            },
            {
              account_id: accounts[1].id,
              category_id: null,
              amount: 90,
              entry_type: "credit",
            },
          ],
        },
      );

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error!.message).toContain(
      "not balanced",
    );
  });

  it("rejects fewer than two entries", async () => {
    const accounts = await getTestAccounts();

    const { data, error } =
      await supabase.rpc(
        "create_transaction",
        {
          p_transaction_date: new Date().toISOString(),
          p_description:
            "Edge case one entry",
          p_reference: null,
          p_notes: null,
          p_entries: [
            {
              account_id: accounts[0].id,
              category_id: null,
              amount: 100,
              entry_type: "debit",
            },
          ],
        },
      );

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error!.message).toContain(
      "at least two entries",
    );
  });

  it("rejects archived accounts", async () => {
    const category =
      await getExpenseCategory();

    const { data: archivedAccounts, error } =
      await supabase
        .from("accounts")
        .select(
          "id, account_type, is_system, is_archived",
        )
        .eq("is_system", false)
        .eq("is_archived", true)
        .in("account_type", [
          "asset",
          "liability",
        ])
        .limit(1);

    expect(error).toBeNull();

    if (!archivedAccounts?.length) {
      return;
    }

    const { data, error: transactionError } =
      await supabase.rpc(
        "create_transaction",
        {
          p_transaction_date:
            new Date().toISOString(),
          p_description:
            "Edge case archived account",
          p_reference: null,
          p_notes: null,
          p_entries: [
            {
              account_id:
                category.ledger_account_id,
              category_id: category.id,
              amount: 100,
              entry_type: "debit",
            },
            {
              account_id:
                archivedAccounts[0].id,
              category_id: null,
              amount: 100,
              entry_type: "credit",
            },
          ],
        },
      );

    expect(data).toBeNull();
    expect(transactionError).toBeTruthy();
    expect(
      transactionError!.message,
    ).toContain(
      "Account not found or unavailable",
    );
  });

  it("rejects system accounts without a category", async () => {
    const accounts =
      await getTestAccounts();

    const { data: systemAccounts, error } =
      await supabase
        .from("accounts")
        .select(
          "id, account_type, is_system, is_archived",
        )
        .eq("is_system", true)
        .eq("is_archived", false)
        .limit(1);

    expect(error).toBeNull();

    if (!systemAccounts?.length) {
      return;
    }

    const { data, error: transactionError } =
      await supabase.rpc(
        "create_transaction",
        {
          p_transaction_date:
            new Date().toISOString(),
          p_description:
            "Edge case system account",
          p_reference: null,
          p_notes: null,
          p_entries: [
            {
              account_id:
                systemAccounts[0].id,
              category_id: null,
              amount: 100,
              entry_type: "debit",
            },
            {
              account_id:
                accounts[0].id,
              category_id: null,
              amount: 100,
              entry_type: "credit",
            },
          ],
        },
      );

    expect(data).toBeNull();
    expect(transactionError).toBeTruthy();
    expect(
      transactionError!.message,
    ).toContain(
      "System accounts cannot be used without a category",
    );
  });

  it("rejects an invalid category", async () => {
    const accounts = await getTestAccounts();

    const fakeCategoryId =
      "00000000-0000-0000-0000-000000000001";

    const { data, error } =
      await supabase.rpc(
        "create_transaction",
        {
          p_transaction_date:
            new Date().toISOString(),
          p_description:
            "Edge case invalid category",
          p_reference: null,
          p_notes: null,
          p_entries: [
            {
              account_id: accounts[0].id,
              category_id: fakeCategoryId,
              amount: 100,
              entry_type: "debit",
            },
            {
              account_id: accounts[1].id,
              category_id: null,
              amount: 100,
              entry_type: "credit",
            },
          ],
        },
      );

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error!.message).toContain(
      "Category not found or unavailable",
    );
  });
});

