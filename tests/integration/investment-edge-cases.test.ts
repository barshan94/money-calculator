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

  return data.id;
}

async function createInvestment(
  accountId: string,
) {
  const { data, error } =
    await supabase.rpc(
      "create_investment",
      {
        p_name:
          `Investment Edge ${Date.now()}`,
        p_investment_type:
          "other",
        p_currency: "BDT",
        p_invested_amount: 1000,
        p_purchase_date:
          new Date()
            .toISOString()
            .slice(0, 10),
        p_purchase_price: 1000,
        p_quantity: 1,
        p_source_account_id:
          accountId,
        p_description:
          "Investment edge-case test",
      },
    );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as string;
}

describe(
  "investment financial edge cases",
  () => {
    it(
      "rejects zero current value",
      async () => {
        const account =
          await getAccount();

        const result =
          await supabase.rpc(
            "create_investment",
            {
              p_name:
                `Zero Investment ${Date.now()}`,
              p_investment_type:
                "other",
              p_currency: "BDT",
              p_invested_amount: 0,
              p_purchase_date:
                new Date()
                  .toISOString()
                  .slice(0, 10),
              p_purchase_price: 0,
              p_quantity: 1,
              p_source_account_id:
                account,
              p_description:
                "Zero investment test",
            },
          );

        expect(result.data).toBeNull();
        expect(result.error).toBeTruthy();
      },
    );

    it(
      "rejects negative current value",
      async () => {
        const account =
          await getAccount();

        const result =
          await supabase.rpc(
            "create_investment",
            {
              p_name:
                `Negative Investment ${Date.now()}`,
              p_investment_type:
                "other",
              p_currency: "BDT",
              p_invested_amount: -1,
              p_purchase_date:
                new Date()
                  .toISOString()
                  .slice(0, 10),
              p_purchase_price: 1000,
              p_quantity: 1,
              p_source_account_id:
                account,
              p_description:
                "Negative investment test",
            },
          );

        expect(result.data).toBeNull();
        expect(result.error).toBeTruthy();
      },
    );

    it(
      "rejects negative purchase price",
      async () => {
        const account =
          await getAccount();

        const result =
          await supabase.rpc(
            "create_investment",
            {
              p_name:
                `Negative Purchase ${Date.now()}`,
              p_investment_type:
                "other",
              p_currency: "BDT",
              p_invested_amount: 1000,
              p_purchase_date:
                new Date()
                  .toISOString()
                  .slice(0, 10),
              p_purchase_price: -1,
              p_quantity: 1,
              p_source_account_id:
                account,
              p_description:
                "Negative purchase test",
            },
          );

        expect(result.data).toBeNull();
        expect(result.error).toBeTruthy();
      },
    );

    it(
      "rejects selling zero quantity",
      async () => {
        const account =
          await getAccount();

        const investmentId =
          await createInvestment(
            account,
          );

        try {
          const result =
            await supabase.rpc(
              "sell_investment",
              {
                p_investment_id:
                  investmentId,
                p_quantity: 0,
                p_sale_price: 100,
                p_received_account_id:
                  account,
                p_sale_date:
                  new Date()
                    .toISOString()
                    .slice(0, 10),
                p_description:
                  "Zero quantity sale test",
              },
            );

          expect(result.data).toBeNull();
          expect(result.error).toBeTruthy();
        } finally {
          await supabase.rpc(
            "archive_investment",
            {
              p_investment_id:
                investmentId,
            },
          );
        }
      },
    );

    it(
      "rejects selling negative quantity",
      async () => {
        const account =
          await getAccount();

        const investmentId =
          await createInvestment(
            account,
          );

        try {
          const result =
            await supabase.rpc(
              "sell_investment",
              {
                p_investment_id:
                  investmentId,
                p_quantity: -1,
                p_sale_price: 100,
                p_received_account_id:
                  account,
                p_sale_date:
                  new Date()
                    .toISOString()
                    .slice(0, 10),
                p_description:
                  "Negative quantity sale test",
              },
            );

          expect(result.data).toBeNull();
          expect(result.error).toBeTruthy();
        } finally {
          await supabase.rpc(
            "archive_investment",
            {
              p_investment_id:
                investmentId,
            },
          );
        }
      },
    );

    it(
      "rejects selling more than owned quantity",
      async () => {
        const account =
          await getAccount();

        const investmentId =
          await createInvestment(
            account,
          );

        try {
          const buy =
            await supabase.rpc(
              "buy_investment",
              {
                p_investment_id:
                  investmentId,
                p_quantity: 10,
                p_purchase_price: 100,
                p_amount: 1000,
                p_source_account_id:
                  account,
                p_purchase_date:
                  new Date()
                    .toISOString()
                    .slice(0, 10),
                p_description:
                  "Investment quantity test",
              },
            );

          expect(buy.error).toBeNull();

          const result =
            await supabase.rpc(
              "sell_investment",
              {
                p_investment_id:
                  investmentId,
                p_quantity: 11,
                p_sale_price: 100,
                p_received_account_id:
                  account,
                p_sale_date:
                  new Date()
                    .toISOString()
                    .slice(0, 10),
                p_description:
                  "Over quantity sale test",
              },
            );

          expect(result.data).toBeNull();
          expect(result.error).toBeTruthy();
        } finally {
          await supabase.rpc(
            "archive_investment",
            {
              p_investment_id:
                investmentId,
            },
          );
        }
      },
    );

    it(
      "rejects zero sale price",
      async () => {
        const account =
          await getAccount();

        const investmentId =
          await createInvestment(
            account,
          );

        try {
          const result =
            await supabase.rpc(
              "sell_investment",
              {
                p_investment_id:
                  investmentId,
                p_quantity: 1,
                p_sale_price: 0,
                p_received_account_id:
                  account,
                p_sale_date:
                  new Date()
                    .toISOString()
                    .slice(0, 10),
                p_description:
                  "Zero sale price test",
              },
            );

          expect(result.data).toBeNull();
          expect(result.error).toBeTruthy();
        } finally {
          await supabase.rpc(
            "archive_investment",
            {
              p_investment_id:
                investmentId,
            },
          );
        }
      },
    );

    it(
      "rejects negative sale price",
      async () => {
        const account =
          await getAccount();

        const investmentId =
          await createInvestment(
            account,
          );

        try {
          const result =
            await supabase.rpc(
              "sell_investment",
              {
                p_investment_id:
                  investmentId,
                p_quantity: 1,
                p_sale_price: -10,
                p_received_account_id:
                  account,
                p_sale_date:
                  new Date()
                    .toISOString()
                    .slice(0, 10),
                p_description:
                  "Negative sale price test",
              },
            );

          expect(result.data).toBeNull();
          expect(result.error).toBeTruthy();
        } finally {
          await supabase.rpc(
            "archive_investment",
            {
              p_investment_id:
                investmentId,
            },
          );
        }
      },
    );

    it(
      "rejects buying zero quantity",
      async () => {
        const account =
          await getAccount();

        const investmentId =
          await createInvestment(
            account,
          );

        try {
          const result =
            await supabase.rpc(
              "buy_investment",
              {
                p_investment_id:
                  investmentId,
                p_quantity: 0,
                p_purchase_price: 100,
                p_amount: 0,
                p_source_account_id:
                  account,
                p_purchase_date:
                  new Date()
                    .toISOString()
                    .slice(0, 10),
                p_description:
                  "Zero quantity buy test",
              },
            );

          expect(result.data).toBeNull();
          expect(result.error).toBeTruthy();
        } finally {
          await supabase.rpc(
            "archive_investment",
            {
              p_investment_id:
                investmentId,
            },
          );
        }
      },
    );

    it(
      "rejects buying a negative quantity",
      async () => {
        const account =
          await getAccount();

        const investmentId =
          await createInvestment(
            account,
          );

        try {
          const result =
            await supabase.rpc(
              "buy_investment",
              {
                p_investment_id:
                  investmentId,
                p_quantity: -1,
                p_purchase_price: 100,
                p_amount: -100,
                p_source_account_id:
                  account,
                p_purchase_date:
                  new Date()
                    .toISOString()
                    .slice(0, 10),
                p_description:
                  "Negative quantity buy test",
              },
            );

          expect(result.data).toBeNull();
          expect(result.error).toBeTruthy();
        } finally {
          await supabase.rpc(
            "archive_investment",
            {
              p_investment_id:
                investmentId,
            },
          );
        }
      },
    );

    it(
      "rejects buying at a negative unit price",
      async () => {
        const account =
          await getAccount();

        const investmentId =
          await createInvestment(
            account,
          );

        try {
          const result =
            await supabase.rpc(
              "buy_investment",
              {
                p_investment_id:
                  investmentId,
                p_quantity: 1,
                p_purchase_price: -1,
                p_amount: -1,
                p_source_account_id:
                  account,
                p_purchase_date:
                  new Date()
                    .toISOString()
                    .slice(0, 10),
                p_description:
                  "Negative purchase price test",
              },
            );

          expect(result.data).toBeNull();
          expect(result.error).toBeTruthy();
        } finally {
          await supabase.rpc(
            "archive_investment",
            {
              p_investment_id:
                investmentId,
            },
          );
        }
      },
    );
  },
);

