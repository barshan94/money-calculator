import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

const email = process.env.PLAYWRIGHT_TEST_EMAIL!;
const password = process.env.PLAYWRIGHT_TEST_PASSWORD!;

let accountId: string;

async function createTestAccount() {
  const { data, error } = await supabase.rpc("create_account", {
    p_name: `Deposit Test Account ${Date.now()}`,
    p_account_type: "asset",
    p_currency: "BDT",
    p_liquidity_class: "immediate",
  });

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as string;
}

async function createDeposit() {
  const { data, error } = await supabase.rpc("create_deposit", {
    p_name: `Test Deposit ${Date.now()}`,
    p_deposit_type: "fixed_deposit",
    p_currency: "BDT",
    p_principal_amount: 1000,
    p_interest_rate: 10,
    p_maturity_amount: 1100,
    p_start_date: "2026-01-01",
    p_maturity_date: "2027-01-01",
    p_source_account_id: accountId,
    p_description: "Deposit edge-case test",
  });

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as string;
}

async function cleanupDeposit(depositId: string) {
  await supabase.from("deposits").delete().eq("id", depositId);
}

describe("Deposit edge cases", () => {
  beforeAll(async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    expect(error).toBeNull();

    accountId = await createTestAccount();
  });

  it("rejects NaN and infinite principal amounts", async () => {
    const values = ["NaN", "Infinity", "-Infinity"];

    for (const value of values) {
      const { data, error } = await supabase.rpc("create_deposit", {
        p_name: `Invalid Principal ${value}`,
        p_deposit_type: "fixed_deposit",
        p_currency: "BDT",
        p_principal_amount: value,
        p_interest_rate: 10,
        p_maturity_amount: 1100,
        p_start_date: "2026-01-01",
        p_maturity_date: "2027-01-01",
        p_source_account_id: accountId,
        p_description: "Invalid principal test",
      });

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.message).toContain("finite number");
    }
  });

  it("rejects NaN and infinite interest rates", async () => {
    const values = ["NaN", "Infinity", "-Infinity"];

    for (const value of values) {
      const { data, error } = await supabase.rpc("create_deposit", {
        p_name: `Invalid Interest ${value}`,
        p_deposit_type: "fixed_deposit",
        p_currency: "BDT",
        p_principal_amount: 1000,
        p_interest_rate: value,
        p_maturity_amount: 1100,
        p_start_date: "2026-01-01",
        p_maturity_date: "2027-01-01",
        p_source_account_id: accountId,
        p_description: "Invalid interest test",
      });

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.message).toContain("finite number");
    }
  });

  it("rejects NaN and infinite maturity amounts", async () => {
    const values = ["NaN", "Infinity", "-Infinity"];

    for (const value of values) {
      const { data, error } = await supabase.rpc("create_deposit", {
        p_name: `Invalid Maturity ${value}`,
        p_deposit_type: "fixed_deposit",
        p_currency: "BDT",
        p_principal_amount: 1000,
        p_interest_rate: 10,
        p_maturity_amount: value,
        p_start_date: "2026-01-01",
        p_maturity_date: "2027-01-01",
        p_source_account_id: accountId,
        p_description: "Invalid maturity test",
      });

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.message).toContain("finite number");
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
      p_source_account_id: accountId,
      p_description: "Invalid maturity test",
    });

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error?.message).toContain("Maturity amount");
  });

  it("rejects NaN and infinite withdrawal amounts", async () => {
    const depositId = await createDeposit();

    try {
      const values = ["NaN", "Infinity", "-Infinity"];

      for (const value of values) {
        const { data, error } = await supabase.rpc("withdraw_deposit", {
          p_deposit_id: depositId,
          p_destination_account_id: accountId,
          p_received_amount: value,
          p_withdrawal_date: "2027-01-01",
          p_description: "Invalid withdrawal test",
        });

        expect(data).toBeNull();
        expect(error).not.toBeNull();
        expect(error?.message).toContain("finite number");
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
      p_maturity_date: null,
      p_source_account_id: accountId,
      p_description: "Zero interest test",
    });

    expect(error).toBeNull();
    expect(data).toBeTruthy();

    await cleanupDeposit(data as string);
  });

  it("allows withdrawal at exactly principal amount", async () => {
    const depositId = await createDeposit();

    try {
      const { data: debugDeposit, error: debugError } =
        await supabase
          .from("deposits")
          .select("id, user_id, status, principal_amount")
          .eq("id", depositId)
          .single();

      console.log("DEBUG DEPOSIT:", {
        depositId,
        debugDeposit,
        debugError,
      });

      expect(debugError).toBeNull();
      expect(debugDeposit).toBeTruthy();
      expect(debugDeposit?.id).toBe(depositId);
      expect(debugDeposit?.status).toBe("active");
      expect(debugDeposit?.principal_amount).toBe(1000);

      const { data, error } = await supabase.rpc("withdraw_deposit", {
        p_deposit_id: depositId,
        p_destination_account_id: accountId,
        p_received_amount: 1000,
        p_withdrawal_date: "2026-06-01",
        p_description: "Principal-only withdrawal test",
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    } finally {
      await cleanupDeposit(depositId);
    }
  });
});