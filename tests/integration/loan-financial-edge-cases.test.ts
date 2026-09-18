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
  currency: string;
};

async function getAccount(): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, currency")
    .eq("is_system", false)
    .eq("is_archived", false)
    .in("account_type", ["asset", "liability"])
    .limit(1)
    .single();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as Account;
}

async function createLoan(
  account: Account,
  amount = 100,
) {
  const { data, error } =
    await supabase.rpc(
      "create_loan_with_transaction",
      {
        p_person_name:
          `Financial Edge Loan ${Date.now()}`,
        p_loan_type: "lent",
        p_principal_amount: amount,
        p_currency: account.currency,
        p_start_datetime:
          new Date().toISOString(),
        p_source_account_id:
          account.id,
        p_due_date: null,
        p_description:
          "Financial edge-case test",
        p_whatsapp_number: null,
      },
    );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as string;
}

async function cancelLoan(loanId: string) {
  await supabase.rpc("cancel_loan", {
    p_loan_id: loanId,
  });
}

describe("loan financial edge cases", () => {
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

  it("rejects zero principal amount", async () => {
    const account = await getAccount();

    const { data, error } =
      await supabase.rpc(
        "create_loan_with_transaction",
        {
          p_person_name: "Zero Principal",
          p_loan_type: "lent",
          p_principal_amount: 0,
          p_currency: account.currency,
          p_start_datetime:
            new Date().toISOString(),
          p_source_account_id: account.id,
          p_due_date: null,
          p_description: "Zero principal",
          p_whatsapp_number: null,
        },
      );

    expect(data).toBeNull();
    expect(error).toBeTruthy();
  });

  it("rejects negative principal amount", async () => {
    const account = await getAccount();

    const { data, error } =
      await supabase.rpc(
        "create_loan_with_transaction",
        {
          p_person_name: "Negative Principal",
          p_loan_type: "lent",
          p_principal_amount: -100,
          p_currency: account.currency,
          p_start_datetime:
            new Date().toISOString(),
          p_source_account_id: account.id,
          p_due_date: null,
          p_description: "Negative principal",
          p_whatsapp_number: null,
        },
      );

    expect(data).toBeNull();
    expect(error).toBeTruthy();
  });

  it("rejects zero repayment amount", async () => {
    const account = await getAccount();
    const loanId = await createLoan(account);

    try {
      const { data, error } =
        await supabase.rpc(
          "record_loan_repayment",
          {
            p_loan_id: loanId,
            p_amount: 0,
            p_account_id: account.id,
            p_payment_datetime:
              new Date().toISOString(),
            p_description: "Zero repayment",
          },
        );

      expect(data).toBeNull();
      expect(error).toBeTruthy();
    } finally {
      await cancelLoan(loanId);
    }
  });

  it("rejects negative repayment amount", async () => {
    const account = await getAccount();
    const loanId = await createLoan(account);

    try {
      const { data, error } =
        await supabase.rpc(
          "record_loan_repayment",
          {
            p_loan_id: loanId,
            p_amount: -10,
            p_account_id: account.id,
            p_payment_datetime:
              new Date().toISOString(),
            p_description:
              "Negative repayment",
          },
        );

      expect(data).toBeNull();
      expect(error).toBeTruthy();
    } finally {
      await cancelLoan(loanId);
    }
  });

  it("rejects repayment greater than remaining balance", async () => {
    const account = await getAccount();
    const loanId = await createLoan(
      account,
      100,
    );

    try {
      const { data, error } =
        await supabase.rpc(
          "record_loan_repayment",
          {
            p_loan_id: loanId,
            p_amount: 101,
            p_account_id: account.id,
            p_payment_datetime:
              new Date().toISOString(),
            p_description:
              "Overpayment test",
          },
        );

      expect(data).toBeNull();
      expect(error).toBeTruthy();
    } finally {
      await cancelLoan(loanId);
    }
  });
});
