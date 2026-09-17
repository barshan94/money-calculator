import { beforeAll, describe, expect, it } from "vitest";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const email =
  process.env.PLAYWRIGHT_TEST_EMAIL;

const password =
  process.env.PLAYWRIGHT_TEST_PASSWORD;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables",
  );
}

if (!email || !password) {
  throw new Error(
    "Missing Playwright test credentials",
  );
}

let supabase: SupabaseClient;

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

describe("Cross-module financial integrity", () => {
  it("keeps transaction reversal entries balanced", async () => {
    const { data: accounts, error: accountsError } =
      await supabase.rpc("get_account_balances");

    expect(accountsError).toBeNull();
    expect(accounts?.length).toBeGreaterThanOrEqual(2);

    const source = accounts![0];
    const destination = accounts![1];

    expect(source.currency).toBe(
      destination.currency,
    );

    const sourceId =
      source.account_id ?? source.id;

    const destinationId =
      destination.account_id ?? destination.id;

    const { data: transactionId, error: createError } =
      await supabase.rpc("create_transaction", {
        p_description:
          "Cross-module integrity test",
        p_entries: [
          {
            account_id: sourceId,
            amount: 100,
            entry_type: "credit",
          },
          {
            account_id: destinationId,
            amount: 100,
            entry_type: "debit",
          },
        ],
        p_notes: null,
        p_reference: null,
        p_transaction_date:
          new Date().toISOString().slice(0, 10),
      });

    expect(createError).toBeNull();
    expect(transactionId).toBeTruthy();

    const { error: voidError } =
      await supabase.rpc("void_transaction", {
        p_transaction_id: transactionId,
      });

    expect(voidError).toBeNull();

    const {
      data: reversal,
      error: reversalError,
    } = await supabase
      .from("transactions")
      .select(
        "id, reversal_of_id, status",
      )
      .eq("reversal_of_id", transactionId)
      .maybeSingle();

    expect(reversalError).toBeNull();
    expect(reversal).toBeTruthy();
    expect(reversal?.reversal_of_id).toBe(
      transactionId,
    );
    expect(reversal?.status).toBe("posted");

    const {
      data: originalEntries,
      error: originalError,
    } = await supabase
      .from("transaction_entries")
      .select(
        "account_id, amount, entry_type",
      )
      .eq("transaction_id", transactionId);

    expect(originalError).toBeNull();
    expect(originalEntries).toHaveLength(2);

    const {
      data: reversalEntries,
      error: reversalEntriesError,
    } = await supabase
      .from("transaction_entries")
      .select(
        "account_id, amount, entry_type",
      )
      .eq("transaction_id", reversal!.id);

    expect(reversalEntriesError).toBeNull();
    expect(reversalEntries).toHaveLength(2);

    const total = (entries: any[]) =>
      entries.reduce(
        (sum, entry) =>
          sum +
          Number(entry.amount) *
            (entry.entry_type === "debit"
              ? 1
              : -1),
        0,
      );

    expect(total(originalEntries!)).toBe(0);
    expect(total(reversalEntries!)).toBe(0);
  });

  it("blocks the revoked legacy create_loan RPC", async () => {
    const { error } =
      await supabase.rpc("create_loan", {
        p_person_name:
          "Blocked Legacy Loan",
        p_loan_type: "lent",
        p_principal_amount: 100,
        p_currency: "BDT",
        p_start_date:
          new Date().toISOString().slice(0, 10),
        p_due_date: null,
        p_description:
          "Should not be callable",
      });

    expect(error).not.toBeNull();
  });
});