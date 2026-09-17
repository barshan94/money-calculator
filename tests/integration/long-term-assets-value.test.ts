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

async function getTestAccount() {
  const {
    data,
    error,
  } = await supabase
    .from("accounts")
    .select(
      "id, currency, account_type, is_system, is_archived",
    )
    .eq("currency", "BDT")
    .eq("account_type", "asset")
    .eq("is_system", false)
    .eq("is_archived", false)
    .limit(1)
    .single();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data!;
}

async function createTestAsset() {
  const sourceAccount =
    await getTestAccount();

  const name =
    `Value Test Asset ${Date.now()}-${Math.random()}`;

  const purchasePrice = 10000;
  const acquisitionCost = 500;

  const {
    data,
    error,
  } = await supabase.rpc(
    "create_long_term_asset",
    {
      p_name: name,
      p_asset_type: "land",
      p_currency:
        sourceAccount.currency,
      p_purchase_price:
        purchasePrice,
      p_acquisition_cost:
        acquisitionCost,
      p_purchase_date:
        "2026-01-15",
      p_source_account_id:
        sourceAccount.id,
      p_description:
        "Long-term asset value integration test",
    },
  );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return {
    assetId: data as string,
    sourceAccount,
    purchasePrice,
    acquisitionCost,
    initialValue:
      purchasePrice +
      acquisitionCost,
  };
}

async function cleanupAsset(
  assetId: string,
) {
  const {
    data: asset,
    error: assetError,
  } = await supabase
    .from("long_term_assets")
    .select("id, name")
    .eq("id", assetId)
    .maybeSingle();

  expect(assetError).toBeNull();

  if (!asset) {
    return;
  }

  const {
    data: transactions,
    error: transactionError,
  } = await supabase
    .from("transactions")
    .select("id")
    .eq(
      "description",
      `Long-term asset purchase: ${asset.name}`,
    );

  expect(transactionError).toBeNull();

  for (const transaction of transactions ?? []) {
    const {
      error: entriesDeleteError,
    } = await supabase
      .from("transaction_entries")
      .delete()
      .eq(
        "transaction_id",
        transaction.id,
      );

    expect(entriesDeleteError).toBeNull();

    const {
      error: transactionDeleteError,
    } = await supabase
      .from("transactions")
      .delete()
      .eq(
        "id",
        transaction.id,
      );

    expect(transactionDeleteError).toBeNull();
  }

  const {
    error: assetDeleteError,
  } = await supabase
    .from("long_term_assets")
    .delete()
    .eq("id", assetId);

  expect(assetDeleteError).toBeNull();
}

describe(
  "long-term asset valuation lifecycle",
  () => {
    it(
      "updates only the current value",
      async () => {
        const {
          assetId,
          purchasePrice,
          acquisitionCost,
        } = await createTestAsset();

        try {
          const {
            data,
            error,
          } = await supabase.rpc(
            "update_long_term_asset_value",
            {
              p_asset_id:
                assetId,
              p_current_value:
                15000,
            },
          );

          expect(data).toBeNull();
          expect(error).toBeNull();

          const {
            data: asset,
            error: assetError,
          } = await supabase
            .from("long_term_assets")
            .select(
              "purchase_price, acquisition_cost, current_value, status, archived_at",
            )
            .eq("id", assetId)
            .single();

          expect(assetError).toBeNull();
          expect(asset).toBeTruthy();

          expect(
            Number(
              asset.purchase_price,
            ),
          ).toBe(purchasePrice);

          expect(
            Number(
              asset.acquisition_cost,
            ),
          ).toBe(acquisitionCost);

          expect(
            Number(
              asset.current_value,
            ),
          ).toBe(15000);

          expect(
            asset.status,
          ).toBe("active");

          expect(
            asset.archived_at,
          ).toBeNull();
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
    );

    it(
      "allows a zero current value",
      async () => {
        const {
          assetId,
        } = await createTestAsset();

        try {
          const {
            data,
            error,
          } = await supabase.rpc(
            "update_long_term_asset_value",
            {
              p_asset_id:
                assetId,
              p_current_value: 0,
            },
          );

          expect(data).toBeNull();
          expect(error).toBeNull();

          const {
            data: asset,
            error: assetError,
          } = await supabase
            .from("long_term_assets")
            .select(
              "current_value",
            )
            .eq("id", assetId)
            .single();

          expect(
            assetError,
          ).toBeNull();

          expect(
            Number(
              asset?.current_value,
            ),
          ).toBe(0);
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
    );

    it(
      "rejects negative current value",
      async () => {
        const {
          assetId,
        } = await createTestAsset();

        try {
          const {
            data,
            error,
          } = await supabase.rpc(
            "update_long_term_asset_value",
            {
              p_asset_id:
                assetId,
              p_current_value:
                -1,
            },
          );

          expect(data).toBeNull();
          expect(error).toBeTruthy();

          expect(
            error!.message,
          ).toContain(
            "Current value must be a finite number greater than or equal to zero",
          );
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
    );

    it(
      "rejects non-finite current values",
      async () => {
        const {
          assetId,
        } = await createTestAsset();

        try {
          for (const value of [
            "NaN",
            "Infinity",
            "-Infinity",
          ]) {
            const {
              data,
              error,
            } = await supabase.rpc(
              "update_long_term_asset_value",
              {
                p_asset_id:
                  assetId,
                p_current_value:
                  value,
              },
            );

            expect(
              data,
            ).toBeNull();

            expect(
              error,
            ).toBeTruthy();

            expect(
              error!.message,
            ).toContain(
              "Current value must be a finite number greater than or equal to zero",
            );
          }
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
    );

    it(
      "rejects a missing asset",
      async () => {
        const {
          data,
          error,
        } = await supabase.rpc(
          "update_long_term_asset_value",
          {
            p_asset_id:
              "00000000-0000-0000-0000-000000000000",
            p_current_value:
              15000,
          },
        );

        expect(data).toBeNull();
        expect(error).toBeTruthy();

        expect(
          error!.message,
        ).toContain(
          "Only active long-term assets can have their value updated",
        );
      },
    );

    it(
      "rejects updating a cancelled asset",
      async () => {
        const {
          assetId,
        } = await createTestAsset();

        try {
          const {
            error:
              statusError,
          } = await supabase
            .from(
              "long_term_assets",
            )
            .update({
              status:
                "cancelled",
              archived_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              assetId,
            );

          expect(
            statusError,
          ).toBeNull();

          const {
            data,
            error,
          } = await supabase.rpc(
            "update_long_term_asset_value",
            {
              p_asset_id:
                assetId,
              p_current_value:
                20000,
            },
          );

          expect(data).toBeNull();
          expect(error).toBeTruthy();

          expect(
            error!.message,
          ).toContain(
            "Only active long-term assets can have their value updated",
          );
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
    );

    it(
      "does not create a transaction when value changes",
      async () => {
        const {
          assetId,
          purchasePrice,
          acquisitionCost,
        } = await createTestAsset();

        try {
          const {
            data:
              beforeTransactions,
            error:
              beforeError,
          } = await supabase
            .from("transactions")
            .select("id")
            .ilike(
              "description",
              `%Long-term asset purchase:%`,
            );

          expect(
            beforeError,
          ).toBeNull();

          const {
            error,
          } = await supabase.rpc(
            "update_long_term_asset_value",
            {
              p_asset_id:
                assetId,
              p_current_value:
                25000,
            },
          );

          expect(
            error,
          ).toBeNull();

          const {
            data:
              afterTransactions,
            error:
              afterError,
          } = await supabase
            .from("transactions")
            .select("id")
            .ilike(
              "description",
              `%Long-term asset purchase:%`,
            );

          expect(
            afterError,
          ).toBeNull();

          expect(
            afterTransactions?.length,
          ).toBe(
            beforeTransactions?.length,
          );

          const {
            data: asset,
            error:
              assetError,
          } = await supabase
            .from(
              "long_term_assets",
            )
            .select(
              "purchase_price, acquisition_cost, current_value",
            )
            .eq(
              "id",
              assetId,
            )
            .single();

          expect(
            assetError,
          ).toBeNull();

          expect(
            Number(
              asset?.purchase_price,
            ),
          ).toBe(purchasePrice);

          expect(
            Number(
              asset?.acquisition_cost,
            ),
          ).toBe(acquisitionCost);

          expect(
            Number(
              asset?.current_value,
            ),
          ).toBe(25000);
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
    );
  },
);