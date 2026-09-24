import { beforeAll, describe, expect, it } from "vitest";
import {
  createAuthenticatedClient,
  createAdminClient,
  signInTestUser,
} from "./test-helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient;
let admin: SupabaseClient;

beforeAll(async () => {
  supabase = createAuthenticatedClient();
  admin = createAdminClient();

  await signInTestUser(supabase);
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

  return data.id;
}

async function createDeposit(
  accountId: string,
  principal = 10000,
) {
  const { data, error } =
    await supabase.rpc(
      "create_deposit",
      {
        p_name:
          `Deposit Edge ${Date.now()}`,
        p_deposit_type:
          "fixed_deposit",
        p_principal_amount:
          principal,
        p_currency: "BDT",
        p_interest_rate: 10,
        p_maturity_amount:
          principal + 1000,
        p_start_date:
          new Date()
            .toISOString()
            .slice(0, 10),
        p_maturity_date:
          new Date(
            Date.now() +
              86400000 * 30,
          )
            .toISOString()
            .slice(0, 10),
        p_source_account_id:
          accountId,
        p_description:
          "Deposit edge-case test",
      },
    );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as string;
}

async function withdrawDeposit(
  depositId: string,
  accountId: string,
  amount: number,
) {
  return await supabase.rpc(
    "withdraw_deposit",
    {
      p_deposit_id:
        depositId,
      p_received_amount: amount,
      p_destination_account_id:
        accountId,
      p_withdrawal_date:
        new Date()
          .toISOString()
          .slice(0, 10),
      p_description:
        "Deposit withdrawal edge test",
    },
  );
}

describe("deposit financial edge cases", () => {
  it("rejects zero principal", async () => {
    const account = await getAccount();

    const result =
      await supabase.rpc(
        "create_deposit",
        {
          p_name:
            `Zero Deposit ${Date.now()}`,
          p_deposit_type:
            "fixed_deposit",
          p_principal_amount: 0,
          p_currency: "BDT",
          p_interest_rate: 10,
          p_maturity_amount: 0,
          p_start_date:
            new Date()
              .toISOString()
              .slice(0, 10),
          p_maturity_date:
            new Date(
              Date.now() +
                86400000 * 30,
            )
              .toISOString()
              .slice(0, 10),
          p_source_account_id:
            account,
          p_description:
            "Zero deposit test",
        },
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("rejects negative principal", async () => {
    const account = await getAccount();

    const result =
      await supabase.rpc(
        "create_deposit",
        {
          p_name:
            `Negative Deposit ${Date.now()}`,
          p_deposit_type:
            "fixed_deposit",
          p_principal_amount: -100,
          p_currency: "BDT",
          p_interest_rate: 10,
          p_maturity_amount: 0,
          p_start_date:
            new Date()
              .toISOString()
              .slice(0, 10),
          p_maturity_date:
            new Date(
              Date.now() +
                86400000 * 30,
            )
              .toISOString()
              .slice(0, 10),
          p_source_account_id:
            account,
          p_description:
            "Negative deposit test",
        },
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("rejects withdrawal greater than deposit balance", async () => {
    const account = await getAccount();
    const depositId =
      await createDeposit(
        account,
        10000,
      );

    try {
      const result =
        await withdrawDeposit(
          depositId,
          account,
          11001,
        );

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    } finally {
      await admin
        .from("deposits")
        .update({
          status: "withdrawn",
        })
        .eq("id", depositId);
    }
  });

  it("rejects zero withdrawal", async () => {
    const account = await getAccount();
    const depositId =
      await createDeposit(
        account,
        10000,
      );

    try {
      const result =
        await withdrawDeposit(
          depositId,
          account,
          0,
        );

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    } finally {
      await admin
        .from("deposits")
        .update({
          status: "withdrawn",
        })
        .eq("id", depositId);
    }
  });

  it("rejects negative withdrawal", async () => {
    const account = await getAccount();
    const depositId =
      await createDeposit(
        account,
        10000,
      );

    try {
      const result =
        await withdrawDeposit(
          depositId,
          account,
          -1,
        );

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    } finally {
      await admin
        .from("deposits")
        .update({
          status: "withdrawn",
        })
        .eq("id", depositId);
    }
  });

  it("rejects withdrawal from an already withdrawn deposit", async () => {
    const account = await getAccount();
    const depositId =
      await createDeposit(
        account,
        10000,
      );

    const first =
      await withdrawDeposit(
        depositId,
        account,
        10000,
      );

    expect(first.error).toBeNull();

    const second =
      await withdrawDeposit(
        depositId,
        account,
        1,
      );

    expect(second.data).toBeNull();
    expect(second.error).toBeTruthy();
  });

  it("allows withdrawal up to the principal amount", async () => {
    const account = await getAccount();
    const depositId =
      await createDeposit(
        account,
        10000,
      );

    const result =
      await withdrawDeposit(
        depositId,
        account,
        10000,
      );

    expect(result.error).toBeNull();
  });

  it("preserves the deposit after a rejected over-withdrawal", async () => {
    const account = await getAccount();
    const depositId =
      await createDeposit(
        account,
        10000,
      );

    try {
      const result =
        await withdrawDeposit(
          depositId,
          account,
          20000,
        );

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();

      const { data, error } =
        await supabase
          .from("deposits")
          .select(
            "status, principal_amount",
          )
          .eq("id", depositId)
          .single();

      expect(error).toBeNull();
      expect(data.status).toBe("active");
      expect(
        Number(
          data.principal_amount,
        ),
      ).toBe(10000);
    } finally {
      await admin
        .from("deposits")
        .update({
          status: "withdrawn",
        })
        .eq("id", depositId);
    }
  });
});

