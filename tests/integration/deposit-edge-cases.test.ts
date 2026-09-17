
import { beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

const email = process.env.PLAYWRIGHT_TEST_EMAIL!;
const password = process.env.PLAYWRIGHT_TEST_PASSWORD!;

let accountId: string;

async function createTestAccount() {
  const uniqueName = `Deposit Test Account ${Date.now()}`;

  const { data, error } = await supabase.rpc("create_account", {
    p_name: uniqueName,
    p_account_type: "asset",
    p_currency: "BDT",
    p_liquidity_class: "near_liquid",
  });

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as string;
}

async function createDeposit() {
  const { data, error } = await supabase.rpc("create_deposit", {
    p_name: "Test Deposit",
    p_deposit_type: "fixed_deposit",
    p_currency: "BDT",
    p_principal_amount: 1000,
    p_interest_rate: 10,
    p_maturity_amount: 1100,
    p_start_date: "2026-01-01",
    p_maturity_date: "2027-01-01",
    p_description: "Deposit edge-case test",
    p_source_account_id: accountId,
  });

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as string;
}

async function cleanupDeposit(depositId: string) {
  await supabase
    .from("deposits")
    .delete()
    .eq("id", depositId);
}

describe("deposit edge cases", () => {
  beforeAll(async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    expect(error).toBeNull();

    accountId = await createTestAccount();
  });

  it("rejects NaN and infinite principal amounts", async () => {
    const invalidValues = ["NaN", "Infinity", "-Infinity"];

    for (const value of invalidValues) {
      const { data, error } = await supabase.rpc("create_deposit", {
        p_name: "Invalid Principal",
        p_deposit_type: "fixed_deposit",
        p_currency: "BDT",
        p_principal_amount: value,
        p_interest_rate: 10,
        p_maturity_amount: 1100,
        p_start_date: "2026-01-01",
        p_maturity_date: "2027-01-01",
        p_description: null,
        p_source_account_id: accountId,
      });

      expect(data).toBeNull();
      expect(error).not.toBeNull();
    }
  });

  it("rejects NaN and infinite interest rates", async () => {
    const invalidValues = ["NaN", "Infinity", "-Infinity"];

    for (const value of invalidValues) {
      const { data, error } = await supabase.rpc("create_deposit", {
        p_name: "Invalid Interest Rate",
        p_deposit_type: "fixed_deposit",
        p_currency: "BDT",
        p_principal_amount: 1000,
        p_interest_rate: value,
        p_maturity_amount: 1100,
        p_start_date: "2026-01-01",
        p_maturity_date: "2027-01-01",
        p_description: null,
        p_source_account_id: accountId,
      });

      expect(data).toBeNull();
      expect(error).not.toBeNull();
    }
  });

  it("rejects NaN and infinite maturity amounts", async () => {
    const invalidValues = ["NaN", "Infinity", "-Infinity"];

    for (const value of invalidValues) {
      const { data, error } = await supabase.rpc("create_deposit", {
        p_name: "Invalid Maturity",
        p_deposit_type: "fixed_deposit",
        p_currency: "BDT",
        p_principal_amount: 1000,
        p_interest_rate: 10,
        p_maturity_amount: value,
        p_start_date: "2026-01-01",
        p_maturity_date: "2027-01-01",
        p_description: null,
        p_source_account_id: accountId,
      });

      expect(data).toBeNull();
      expect(error).not.toBeNull();
    }
  });

  it("rejects maturity amount below principal", async () => {
    const { data, error } = await supabase.rpc("create_deposit", {
      p_name: "Invalid Maturity Below Principal",
      p_deposit_type: "fixed_deposit",
      p_currency: "BDT",
      p_principal_amount: 1000,
      p_interest_rate: 10,
      p_maturity_amount: 999,
      p_start_date: "2026-01-01",
      p_maturity_date: "2027-01-01",
      p_description: null,
      p_source_account_id: accountId,
    });

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("rejects NaN and infinite withdrawal amounts", async () => {
    const depositId = await createDeposit();

    try {
      for (const value of ["NaN", "Infinity", "-Infinity"]) {
        const { data, error } = await supabase.rpc("withdraw_deposit", {
          p_deposit_id: depositId,
          p_received_amount: value,
          p_withdrawal_date: "2026-06-01",
          p_destination_account_id: accountId,
          p_description: "Invalid withdrawal test",
        });

        expect(data).toBeNull();
        expect(error).not.toBeNull();
      }
    } finally {
      await cleanupDeposit(depositId);
    }
  });

  it("allows zero interest rate", async () => {
    const { data, error } = await supabase.rpc("create_deposit", {
      p_name: "Zero Interest Deposit",
      p_deposit_type: "fixed_deposit",
      p_currency: "BDT",
      p_principal_amount: 1000,
      p_interest_rate: 0,
      p_maturity_amount: 1000,
      p_start_date: "2026-01-01",
      p_maturity_date: "2027-01-01",
      p_description: null,
      p_source_account_id: accountId,
    });

    expect(error).toBeNull();
    expect(data).toBeTruthy();

    if (data) {
      await cleanupDeposit(data as string);
    }
  });

  it("allows withdrawal at exactly principal", async () => {
    const depositId = await createDeposit();

    try {
      const { data, error } = await supabase.rpc("withdraw_deposit", {
        p_deposit_id: depositId,
        p_received_amount: 1000,
        p_withdrawal_date: "2026-06-01",
        p_destination_account_id: accountId,
        p_description: "Principal-only withdrawal",
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    } finally {
      await cleanupDeposit(depositId);
    }
  });

  it("updates editable deposit fields through update_deposit", async () => {
    const depositId = await createDeposit();

    try {
      const { data, error } = await supabase.rpc("update_deposit", {
        p_deposit_id: depositId,
        p_name: "Updated Deposit",
        p_interest_rate: 12.5,
        p_maturity_amount: 1125,
        p_maturity_date: "2027-02-01",
        p_description: "Updated description",
      });

      expect(error).toBeNull();
      expect(data).toBeNull();

      const { data: updated, error: selectError } = await supabase
        .from("deposits")
        .select(
          "name, interest_rate, maturity_amount, maturity_date, description, principal_amount, status",
        )
        .eq("id", depositId)
        .single();

      expect(selectError).toBeNull();

      expect(updated).toEqual({
        name: "Updated Deposit",
        interest_rate: 12.5,
        maturity_amount: 1125,
        maturity_date: "2027-02-01",
        description: "Updated description",
        principal_amount: 1000,
        status: "active",
      });
    } finally {
      await cleanupDeposit(depositId);
    }
  });

  it("rejects maturity amount below principal when updating", async () => {
    const depositId = await createDeposit();

    try {
      const { data, error } = await supabase.rpc("update_deposit", {
        p_deposit_id: depositId,
        p_name: "Invalid Updated Deposit",
        p_interest_rate: 12,
        p_maturity_amount: 999,
        p_maturity_date: "2027-02-01",
        p_description: "Invalid update",
      });

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.message).toContain(
        "Maturity amount cannot be less than principal",
      );
    } finally {
      await cleanupDeposit(depositId);
    }
  });

  it("rejects updating a closed deposit", async () => {
    const depositId = await createDeposit();

    try {
      const { error: withdrawError } = await supabase.rpc(
        "withdraw_deposit",
        {
          p_deposit_id: depositId,
          p_received_amount: 1000,
          p_withdrawal_date: "2026-06-01",
          p_destination_account_id: accountId,
          p_description: "Close deposit before update",
        },
      );

      expect(withdrawError).toBeNull();

      const { data, error } = await supabase.rpc("update_deposit", {
        p_deposit_id: depositId,
        p_name: "Should Fail",
        p_interest_rate: 15,
        p_maturity_amount: 1150,
        p_maturity_date: "2027-03-01",
        p_description: "Should not update",
      });

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.message).toContain(
        "Deposit not found or already closed",
      );
    } finally {
      await cleanupDeposit(depositId);
    }
  });
});