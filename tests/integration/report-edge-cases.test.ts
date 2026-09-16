import { beforeAll, describe, expect, it } from "vitest";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

describe("Report edge cases", () => {
  let supabase: SupabaseClient;

  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );

    const email =
      process.env.PLAYWRIGHT_TEST_EMAIL!;
    const password =
      process.env.PLAYWRIGHT_TEST_PASSWORD!;

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) throw error;
  });

  it("removes a voided expense from category report", async () => {
    const { data: accounts, error: accountError } =
      await supabase
        .from("accounts")
        .select("id")
        .eq("is_system", false)
        .eq("is_archived", false)
        .eq("account_type", "asset")
        .eq("currency", "BDT")
        .limit(1);

    if (accountError) throw accountError;

    expect(accounts).toHaveLength(1);

    const { data: categories, error: categoryError } =
      await supabase
        .from("categories")
        .select(
          "id, name, ledger_account_id",
        )
        .eq("category_type", "expense")
        .eq("is_archived", false)
        .not("ledger_account_id", "is", null)
        .limit(1);

    if (categoryError) throw categoryError;

    expect(categories).toHaveLength(1);

    const accountId = accounts![0].id;
    const category = categories![0];

    const { data: before, error: beforeError } =
      await supabase.rpc(
        "get_category_expense_report",
        {
          p_currency: "BDT",
        },
      );

    if (beforeError) throw beforeError;

    const beforeRow = (before ?? []).find(
      (row: { category: string }) =>
        row.category === category.name,
    );

    const beforeAmount =
      Number(beforeRow?.amount ?? 0);

    const { data: transactionId, error: createError } =
      await supabase.rpc(
        "create_transaction",
        {
          p_transaction_date:
            new Date().toISOString(),
          p_description:
            "Category report reversal regression",
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
              account_id: accountId,
              category_id: null,
              amount: 100,
              entry_type: "credit",
            },
          ],
        },
      );

    if (createError) throw createError;

    expect(transactionId).toBeTruthy();

    const { data: afterCreate, error: createReportError } =
      await supabase.rpc(
        "get_category_expense_report",
        {
          p_currency: "BDT",
        },
      );

    if (createReportError) {
      throw createReportError;
    }

    const createdRow =
      (afterCreate ?? []).find(
        (row: { category: string }) =>
          row.category === category.name,
      );

    expect(createdRow).toBeTruthy();

    expect(
      Number(createdRow!.amount),
    ).toBe(beforeAmount + 100);

    const { error: voidError } =
      await supabase.rpc(
        "void_transaction",
        {
          p_transaction_id: transactionId,
        },
      );

    if (voidError) throw voidError;

    const { data: afterVoid, error: voidReportError } =
      await supabase.rpc(
        "get_category_expense_report",
        {
          p_currency: "BDT",
        },
      );

    if (voidReportError) {
      throw voidReportError;
    }

    const voidedRow =
      (afterVoid ?? []).find(
        (row: { category: string }) =>
          row.category === category.name,
      );

    expect(
      Number(voidedRow?.amount ?? 0),
    ).toBe(beforeAmount);
  });
});

