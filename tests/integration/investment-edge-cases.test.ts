import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

async function getTestAccount() {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL!;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD!;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  expect(error).toBeNull();

  const { data, error: accountError } = await supabase
    .from("accounts")
    .select("id, currency")
    .eq("is_archived", false)
    .eq("is_system", false)
    .eq("account_type", "asset")
    .limit(1)
    .single();

  expect(accountError).toBeNull();
  expect(data).toBeTruthy();

  return data!;
}

async function createInvestment() {
  const account = await getTestAccount();

  const { data, error } = await supabase.rpc(
    "create_investment",
    {
      p_name: `Investment Edge Test ${Date.now()}`,
      p_investment_type: "stock",
      p_currency: account.currency,
      p_invested_amount: 1000,
      p_purchase_date: new Date().toISOString().slice(0, 10),
      p_source_account_id: account.id,
      p_quantity: 10,
      p_purchase_price: 100,
      p_description: "Investment edge-case test",
    },
  );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return {
    account,
    investmentId: data as string,
  };
}

async function cleanupInvestment(investmentId: string) {
  await supabase
    .from("investment_activity")
    .delete()
    .eq("investment_id", investmentId);

  await supabase
    .from("investments")
    .delete()
    .eq("id", investmentId);
}

describe("investment edge cases", () => {
  it("rejects NaN and infinite investment amounts", async () => {
    const account = await getTestAccount();

    for (const amount of ["NaN", "Infinity", "-Infinity"]) {
      const { data, error } = await supabase.rpc(
        "create_investment",
        {
          p_name: `Invalid Amount ${amount}`,
          p_investment_type: "stock",
          p_currency: account.currency,
          p_invested_amount: amount,
          p_purchase_date: new Date().toISOString().slice(0, 10),
          p_source_account_id: account.id,
          p_quantity: 1,
          p_purchase_price: 100,
          p_description: null,
        },
      );

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error!.message).toContain(
        "finite number greater than zero",
      );
    }
  });

  it("rejects NaN and infinite quantities", async () => {
    const account = await getTestAccount();

    for (const quantity of ["NaN", "Infinity", "-Infinity"]) {
      const { data, error } = await supabase.rpc(
        "create_investment",
        {
          p_name: `Invalid Quantity ${quantity}`,
          p_investment_type: "stock",
          p_currency: account.currency,
          p_invested_amount: 1000,
          p_purchase_date: new Date().toISOString().slice(0, 10),
          p_source_account_id: account.id,
          p_quantity: quantity,
          p_purchase_price: 100,
          p_description: null,
        },
      );

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error!.message).toContain(
        "finite number greater than zero",
      );
    }
  });

  it("rejects zero quantity", async () => {
    const account = await getTestAccount();

    const { data, error } = await supabase.rpc(
      "create_investment",
      {
        p_name: "Zero Quantity Test",
        p_investment_type: "stock",
        p_currency: account.currency,
        p_invested_amount: 1000,
        p_purchase_date: new Date().toISOString().slice(0, 10),
        p_source_account_id: account.id,
        p_quantity: 0,
        p_purchase_price: 100,
        p_description: null,
      },
    );

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error!.message).toContain(
      "Quantity must be greater than zero",
    );
  });

  it("rejects NaN and infinite purchase prices", async () => {
    const account = await getTestAccount();

    for (const price of ["NaN", "Infinity", "-Infinity"]) {
      const { data, error } = await supabase.rpc(
        "create_investment",
        {
          p_name: `Invalid Price ${price}`,
          p_investment_type: "stock",
          p_currency: account.currency,
          p_invested_amount: 1000,
          p_purchase_date: new Date().toISOString().slice(0, 10),
          p_source_account_id: account.id,
          p_quantity: 10,
          p_purchase_price: price,
          p_description: null,
        },
      );

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error!.message).toContain(
        "finite number greater than zero",
      );
    }
  });

  it("rejects NaN and infinite amounts when buying more", async () => {
    const { account, investmentId } =
      await createInvestment();

    try {
      for (const amount of ["NaN", "Infinity", "-Infinity"]) {
        const { data, error } = await supabase.rpc(
          "buy_investment",
          {
            p_investment_id: investmentId,
            p_amount: amount,
            p_quantity: 1,
            p_purchase_price: 100,
            p_purchase_date: new Date().toISOString().slice(0, 10),
            p_source_account_id: account.id,
            p_description: `Invalid buy amount ${amount}`,
          },
        );

        expect(data).toBeNull();
        expect(error).toBeTruthy();
        expect(error!.message).toContain(
          "finite number greater than zero",
        );
      }
    } finally {
      await cleanupInvestment(investmentId);
    }
  });

  it("rejects NaN and infinite quantities when buying more", async () => {
    const { account, investmentId } =
      await createInvestment();

    try {
      for (const quantity of ["NaN", "Infinity", "-Infinity"]) {
        const { data, error } = await supabase.rpc(
          "buy_investment",
          {
            p_investment_id: investmentId,
            p_amount: 100,
            p_quantity: quantity,
            p_purchase_price: 100,
            p_purchase_date: new Date().toISOString().slice(0, 10),
            p_source_account_id: account.id,
            p_description: `Invalid buy quantity ${quantity}`,
          },
        );

        expect(data).toBeNull();
        expect(error).toBeTruthy();
        expect(error!.message).toContain(
          "finite number greater than zero",
        );
      }
    } finally {
      await cleanupInvestment(investmentId);
    }
  });

  it("rejects NaN and infinite purchase prices when buying more", async () => {
    const { account, investmentId } =
      await createInvestment();

    try {
      for (const price of ["NaN", "Infinity", "-Infinity"]) {
        const { data, error } = await supabase.rpc(
          "buy_investment",
          {
            p_investment_id: investmentId,
            p_amount: 100,
            p_quantity: 1,
            p_purchase_price: price,
            p_purchase_date: new Date().toISOString().slice(0, 10),
            p_source_account_id: account.id,
            p_description: `Invalid buy price ${price}`,
          },
        );

        expect(data).toBeNull();
        expect(error).toBeTruthy();
        expect(error!.message).toContain(
          "finite number greater than zero",
        );
      }
    } finally {
      await cleanupInvestment(investmentId);
    }
  });

  it("rejects NaN and infinite received amounts when selling all", async () => {
    const { account, investmentId } =
      await createInvestment();

    try {
      for (const amount of ["NaN", "Infinity", "-Infinity"]) {
        const { data, error } = await supabase.rpc(
          "sell_investment",
          {
            p_investment_id: investmentId,
            p_received_amount: amount,
            p_destination_account_id: account.id,
            p_sale_date: new Date().toISOString().slice(0, 10),
            p_description: `Invalid sale amount ${amount}`,
          },
        );

        expect(data).toBeNull();
        expect(error).toBeTruthy();
        expect(error!.message).toContain(
          "finite number greater than zero",
        );
      }
    } finally {
      await cleanupInvestment(investmentId);
    }
  });

  it("rejects NaN and infinite quantity when selling partially", async () => {
    const { account, investmentId } =
      await createInvestment();

    try {
      for (const quantity of ["NaN", "Infinity", "-Infinity"]) {
        const { data, error } = await supabase.rpc(
          "sell_investment",
          {
            p_investment_id: investmentId,
            p_quantity: quantity,
            p_sale_price: 100,
            p_destination_account_id: account.id,
            p_sale_date: new Date().toISOString().slice(0, 10),
            p_description: `Invalid sale quantity ${quantity}`,
          },
        );

        expect(data).toBeNull();
        expect(error).toBeTruthy();
        expect(error!.message).toContain(
          "finite number greater than zero",
        );
      }
    } finally {
      await cleanupInvestment(investmentId);
    }
  });

  it("rejects NaN and infinite sale prices when selling partially", async () => {
    const { account, investmentId } =
      await createInvestment();

    try {
      for (const price of ["NaN", "Infinity", "-Infinity"]) {
        const { data, error } = await supabase.rpc(
          "sell_investment",
          {
            p_investment_id: investmentId,
            p_quantity: 1,
            p_sale_price: price,
            p_destination_account_id: account.id,
            p_sale_date: new Date().toISOString().slice(0, 10),
            p_description: `Invalid sale price ${price}`,
          },
        );

        expect(data).toBeNull();
        expect(error).toBeTruthy();
        expect(error!.message).toContain(
          "finite number greater than zero",
        );
      }
    } finally {
      await cleanupInvestment(investmentId);
    }
  });

  it("rejects NaN and infinite current investment values", async () => {
    const { investmentId } =
      await createInvestment();

    try {
      for (const value of ["NaN", "Infinity", "-Infinity"]) {
        const { data, error } = await supabase.rpc(
          "update_investment_value",
          {
            p_investment_id: investmentId,
            p_current_value: value,
          },
        );

        expect(data).toBeNull();
        expect(error).toBeTruthy();
        expect(error!.message).toContain(
          "finite number greater than or equal to zero",
        );
      }

      /*
       * Verify the investment was not corrupted.
       */
      const {
        data: investment,
        error: queryError,
      } = await supabase
        .from("investments")
        .select("current_value, status")
        .eq("id", investmentId)
        .single();

      expect(queryError).toBeNull();
      expect(investment).toBeTruthy();
      expect(Number(investment.current_value)).toBe(1000);
      expect(investment.status).toBe("active");
    } finally {
      await cleanupInvestment(investmentId);
    }
  });
});