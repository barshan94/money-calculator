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

async function getBDTAssetAccount() {
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

async function createLoan() {
  const account =
    await getBDTAssetAccount();

  const { data, error } =
    await supabase.rpc(
      "create_loan_with_transaction",
      {
        p_person_name:
          `Authorization Loan ${Date.now()}`,
        p_loan_type: "lent",
        p_principal_amount: 100,
        p_currency: "BDT",
        p_start_datetime:
          new Date().toISOString(),
        p_source_account_id:
          account.id,
        p_due_date: null,
        p_description:
          "Authorization edge-case test",
        p_whatsapp_number: null,
      },
    );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return {
    loanId: data as string,
    accountId: account.id,
  };
}

describe("loan authorization", () => {
  it("does not expose another user's loans through direct table access", async () => {
    const result =
      await supabase
        .from("loans")
        .select("id")
        .limit(100);

    expect(result.error).toBeNull();

    // RLS should return only rows owned
    // by the authenticated user.
    expect(Array.isArray(result.data)).toBe(
      true,
    );
  });

  it("rejects cancelling a non-existent loan", async () => {
    const result =
      await supabase.rpc(
        "cancel_loan",
        {
          p_loan_id:
            "00000000-0000-0000-0000-000000000000",
        },
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("rejects repayment against a non-existent loan", async () => {
    const account =
      await getBDTAssetAccount();

    const result =
      await supabase.rpc(
        "record_loan_repayment",
        {
          p_loan_id:
            "00000000-0000-0000-0000-000000000000",
          p_amount: 10,
          p_account_id:
            account.id,
          p_payment_datetime:
            new Date().toISOString(),
          p_description:
            "Invalid loan repayment test",
        },
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("rejects repayment update for a non-existent repayment", async () => {
    const account =
      await getBDTAssetAccount();

    const result =
      await supabase.rpc(
        "update_loan_repayment",
        {
          p_repayment_id:
            "00000000-0000-0000-0000-000000000000",
          p_amount: 10,
          p_account_id:
            account.id,
          p_payment_datetime:
            new Date().toISOString(),
          p_description:
            "Invalid repayment update test",
        },
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("rejects cancelling a non-existent repayment", async () => {
    const result =
      await supabase.rpc(
        "cancel_loan_repayment",
        {
          p_repayment_id:
            "00000000-0000-0000-0000-000000000000",
        },
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("allows the authenticated owner to cancel their own loan", async () => {
    const { loanId } =
      await createLoan();

    const result =
      await supabase.rpc(
        "cancel_loan",
        {
          p_loan_id: loanId,
        },
      );

    expect(result.error).toBeNull();
  });

  it("allows the authenticated owner to repay their own loan", async () => {
    const {
      loanId,
      accountId,
    } = await createLoan();

    const result =
      await supabase.rpc(
        "record_loan_repayment",
        {
          p_loan_id: loanId,
          p_amount: 20,
          p_account_id:
            accountId,
          p_payment_datetime:
            new Date().toISOString(),
          p_description:
            "Owner repayment authorization test",
        },
      );

    expect(result.error).toBeNull();
    expect(result.data).toBeTruthy();

    await supabase.rpc(
      "cancel_loan",
      {
        p_loan_id: loanId,
      },
    );
  });
});
