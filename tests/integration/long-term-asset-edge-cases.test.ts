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

async function createAsset(
  accountId: string,
  purchasePrice = 10000,
  currentValue = 10000,
) {
  const { data, error } =
    await supabase.rpc(
      "create_long_term_asset",
      {
        p_name:
          `Asset Edge ${Date.now()}`,
        p_asset_type: "land",
        p_currency: "BDT",
        p_purchase_date:
          new Date()
            .toISOString()
            .slice(0, 10),
        p_purchase_price:
          purchasePrice,
        p_acquisition_cost: 0,
        p_source_account_id:
          accountId,
        p_description:
          "Long-term asset edge test",
      },
    );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as string;
}


describe("long-term asset edge cases", () => {
  it("rejects zero purchase price", async () => {
    const account = await getAccount();

    const result =
      await supabase.rpc(
        "create_long_term_asset",
        {
          p_name:
            `Zero Asset ${Date.now()}`,
          p_asset_type: "land",
          p_currency: "BDT",
          p_purchase_date:
            new Date()
              .toISOString()
              .slice(0, 10),
          p_purchase_price: 0,
          p_acquisition_cost: 0,
          p_current_value: 0,
          p_source_account_id:
            account,
          p_description:
            "Zero purchase price test",
        },
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("rejects negative purchase price", async () => {
    const account = await getAccount();

    const result =
      await supabase.rpc(
        "create_long_term_asset",
        {
          p_name:
            `Negative Asset ${Date.now()}`,
          p_asset_type: "land",
          p_currency: "BDT",
          p_purchase_date:
            new Date()
              .toISOString()
              .slice(0, 10),
          p_purchase_price: -1,
          p_acquisition_cost: 0,
          p_current_value: 0,
          p_source_account_id:
            account,
          p_description:
            "Negative purchase price test",
        },
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("rejects negative acquisition cost", async () => {
    const account = await getAccount();

    const result =
      await supabase.rpc(
        "create_long_term_asset",
        {
          p_name:
            `Negative Cost ${Date.now()}`,
          p_asset_type: "land",
          p_currency: "BDT",
          p_purchase_date:
            new Date()
              .toISOString()
              .slice(0, 10),
          p_purchase_price: 10000,
          p_acquisition_cost: -1,
          p_current_value: 10000,
          p_source_account_id:
            account,
          p_description:
            "Negative acquisition cost test",
        },
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("rejects negative current value", async () => {
    const account = await getAccount();

    const result =
      await supabase.rpc(
        "create_long_term_asset",
        {
          p_name:
            `Negative Value ${Date.now()}`,
          p_asset_type: "land",
          p_currency: "BDT",
          p_purchase_date:
            new Date()
              .toISOString()
              .slice(0, 10),
          p_purchase_price: 10000,
          p_acquisition_cost: 0,
          p_current_value: -1,
          p_source_account_id:
            account,
          p_description:
            "Negative current value test",
        },
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("rejects zero sale price", async () => {
    const account = await getAccount();
    const assetId =
      await createAsset(account);

    const result =
      await supabase.rpc(
        "sell_long_term_asset",
        {
          p_asset_id: assetId,
          p_sale_price: 0,
          p_sale_date:
            new Date()
              .toISOString()
              .slice(0, 10),
          p_destination_account_id:
            account,
          p_description:
            "Zero sale price test",
        },
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();

    await supabase.rpc(
      "cancel_long_term_asset",
      {
        p_asset_id: assetId,
      },
    );
  });

  it("rejects negative sale price", async () => {
    const account = await getAccount();
    const assetId =
      await createAsset(account);

    const result =
      await supabase.rpc(
        "sell_long_term_asset",
        {
          p_asset_id: assetId,
          p_sale_price: -1,
          p_sale_date:
            new Date()
              .toISOString()
              .slice(0, 10),
          p_destination_account_id:
            account,
          p_description:
            "Negative sale price test",
        },
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();

    await supabase.rpc(
      "cancel_long_term_asset",
      {
        p_asset_id: assetId,
      },
    );
  });

  it("rejects updating value to a negative amount", async () => {
    const account = await getAccount();
    const assetId =
      await createAsset(account);

    const result =
      await supabase.rpc(
        "update_long_term_asset_value",
        {
          p_asset_id: assetId,
          p_current_value: -1,
        },
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();

    await supabase.rpc(
      "cancel_long_term_asset",
      {
        p_asset_id: assetId,
      },
    );
  });

  it("allows current value to become zero", async () => {
    const account = await getAccount();
    const assetId =
      await createAsset(account);

    try {
      const result =
        await supabase.rpc(
          "update_long_term_asset_value",
          {
            p_asset_id: assetId,
            p_current_value: 0,
          },
        );

      expect(result.error).toBeNull();
    } finally {
      await supabase.rpc(
        "cancel_long_term_asset",
        {
          p_asset_id: assetId,
        },
      );
    }
  });

  it("rejects selling an already sold asset", async () => {
    const account = await getAccount();
    const assetId =
      await createAsset(account);

    const first =
      await supabase.rpc(
        "sell_long_term_asset",
        {
          p_asset_id: assetId,
          p_sale_price: 12000,
          p_sale_date:
            new Date()
              .toISOString()
              .slice(0, 10),
          p_destination_account_id:
            account,
          p_description:
            "First asset sale",
        },
      );

    expect(first.error).toBeNull();

    const second =
      await supabase.rpc(
        "sell_long_term_asset",
        {
          p_asset_id: assetId,
          p_sale_price: 12000,
          p_sale_date:
            new Date()
              .toISOString()
              .slice(0, 10),
          p_destination_account_id:
            account,
          p_description:
            "Duplicate asset sale",
        },
      );

    expect(second.data).toBeNull();
    expect(second.error).toBeTruthy();
  });

  it("rejects updating value after asset is sold", async () => {
    const account = await getAccount();
    const assetId =
      await createAsset(account);

    const sold =
      await supabase.rpc(
        "sell_long_term_asset",
        {
          p_asset_id: assetId,
          p_sale_price: 12000,
          p_sale_date:
            new Date()
              .toISOString()
              .slice(0, 10),
          p_destination_account_id:
            account,
          p_description:
            "Sold asset value test",
        },
      );

    expect(sold.error).toBeNull();

    const result =
      await supabase.rpc(
        "update_long_term_asset_value",
        {
          p_asset_id: assetId,
          p_current_value: 15000,
        },
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });
});
