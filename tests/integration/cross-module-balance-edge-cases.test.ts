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

async function getAccount() {
  const { data, error } =
    await supabase
      .from("accounts")
      .select("id")
      .eq("currency", "BDT")
      .eq("account_type", "asset")
      .eq("is_system", false)
      .eq("is_archived", false)
      .limit(1)
      .single();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data;
}

async function getBalance(
  accountId: string,
) {
  const { data, error } =
    await supabase.rpc(
      "get_account_balances",
    );

  expect(error).toBeNull();

  const account = data?.find(
    (row: any) =>
      row.id === accountId,
  );

  expect(account).toBeTruthy();

  return Number(account.balance);
}

async function createExpenseTransaction(
  accountId: string,
  amount: number,
) {
  const { data, error } =
    await supabase.rpc(
      "create_transaction",
      {
        p_description:
          "Cross-module balance test",
        p_entries: [
          {
            account_id: accountId,
            amount,
            entry_type: "credit",
          },
          {
            account_id: accountId,
            amount,
            entry_type: "debit",
          },
        ],
        p_notes: null,
        p_reference: null,
        p_transaction_date:
          new Date().toISOString(),
      },
    );

  return { data, error };
}

describe("cross-module balance integrity", () => {
  it("restores account balance after a transaction is voided", async () => {
    const account =
      await getAccount();

    const before =
      await getBalance(account.id);

    const { data, error } =
      await createExpenseTransaction(
        account.id,
        100,
      );

    expect(error).toBeNull();
    expect(data).toBeTruthy();

    const transactionId =
      data as string;

    const after =
      await getBalance(account.id);

    expect(after).toBe(before);

    const reversed =
      await supabase.rpc(
        "void_transaction",
        {
          p_transaction_id:
            transactionId,
        },
      );

    expect(reversed.error).toBeNull();

    const restored =
      await getBalance(account.id);

    expect(restored).toBe(before);
  });

  it("does not change account balance after a rejected transaction", async () => {
    const account =
      await getAccount();

    const before =
      await getBalance(account.id);

    const result =
      await supabase.rpc(
        "create_transaction",
        {
          p_description:
            "Rejected transaction balance test",
          p_entries: [
            {
              account_id: account.id,
              amount: -100,
              entry_type: "credit",
            },
          ],
          p_notes: null,
          p_reference: null,
          p_transaction_date:
            new Date().toISOString(),
        },
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();

    const after =
      await getBalance(account.id);

    expect(after).toBe(before);
  });

  it("restores account balance after a loan repayment is cancelled", async () => {
    const account =
      await getAccount();

    const before =
      await getBalance(account.id);

    const loan =
      await supabase.rpc(
        "create_loan_with_transaction",
        {
          p_person_name:
            `Balance Loan ${Date.now()}`,
          p_loan_type: "lent",
          p_principal_amount: 100,
          p_currency: "BDT",
          p_start_datetime:
            new Date().toISOString().slice(0, 10),
          p_source_account_id:
            account.id,
          p_due_date: null,
          p_description:
            "Balance loan test",
          p_whatsapp_number: null,
        },
      );

    expect(loan.error).toBeNull();

    const loanId =
      loan.data as string;

    const afterLoan =
      await getBalance(account.id);

    expect(afterLoan).toBe(
      before - 100,
    );

    const repayment =
      await supabase.rpc(
        "record_loan_repayment",
        {
          p_loan_id: loanId,
          p_amount: 40,
          p_account_id:
            account.id,
          p_payment_datetime:
            new Date().toISOString(),
          p_description:
            "Balance repayment test",
        },
      );

    expect(repayment.error).toBeNull();

    const afterRepayment =
      await getBalance(account.id);

    expect(afterRepayment).toBe(
      before - 60,
    );

    const cancelled =
      await supabase.rpc(
        "cancel_loan_repayment",
        {
          p_transaction_id:
            repayment.data,
        },
      );

    expect(cancelled.error).toBeNull();

    const afterCancel =
      await getBalance(account.id);

    expect(afterCancel).toBe(
      before - 100,
    );

    await supabase.rpc(
      "cancel_loan",
      {
        p_loan_id: loanId,
      },
    );

    const restored =
      await getBalance(account.id);

    expect(restored).toBe(before);
  });

  it("does not change account balance after an overpayment is rejected", async () => {
    const account =
      await getAccount();

    const before =
      await getBalance(account.id);

    const loan =
      await supabase.rpc(
        "create_loan_with_transaction",
        {
          p_person_name:
            `Overpayment Balance ${Date.now()}`,
          p_loan_type: "lent",
          p_principal_amount: 100,
          p_currency: "BDT",
          p_start_datetime:
            new Date().toISOString().slice(0, 10),
          p_source_account_id:
            account.id,
          p_due_date: null,
          p_description:
            "Overpayment balance test",
          p_whatsapp_number: null,
        },
      );

    expect(loan.error).toBeNull();

    const loanId =
      loan.data as string;

    try {
      const rejected =
        await supabase.rpc(
          "record_loan_repayment",
          {
            p_loan_id: loanId,
            p_amount: 101,
            p_account_id:
              account.id,
            p_payment_datetime:
              new Date().toISOString(),
            p_description:
              "Rejected overpayment",
          },
        );

      expect(rejected.data).toBeNull();
      expect(rejected.error).toBeTruthy();

      const balance =
        await getBalance(
          account.id,
        );

      expect(balance).toBe(
        before - 100,
      );
    } finally {
      await supabase.rpc(
        "cancel_loan",
        {
          p_loan_id: loanId,
        },
      );
    }

    const restored =
      await getBalance(account.id);

    expect(restored).toBe(before);
  });
});

