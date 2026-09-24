import {
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createAdminClient,
  createAuthenticatedClient,
  signInTestUser,
} from "./test-helpers";

let supabase: SupabaseClient;
let admin: SupabaseClient;

const CLEANUP_RETRY_COUNT = 3;
const CLEANUP_RETRY_DELAY_MS = 500;

function isTransientFetchError(
  error: unknown,
) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message =
    `${error.name} ${error.message}`.toLowerCase();

  return (
    message.includes("fetch failed") ||
    message.includes("econnaborted") ||
    message.includes("econnreset") ||
    message.includes("etimedout")
  );
}

async function withCleanupRetry<T>(
  operation: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= CLEANUP_RETRY_COUNT;
    attempt += 1
  ) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (
        !isTransientFetchError(error) ||
        attempt === CLEANUP_RETRY_COUNT
      ) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(
          resolve,
          CLEANUP_RETRY_DELAY_MS * attempt,
        ),
      );
    }
  }

  throw lastError;
}

beforeAll(async () => {
  supabase =
    createAuthenticatedClient();

  admin = createAdminClient();

  await signInTestUser(supabase);
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

async function createTestAsset(
  overrides: {
    name?: string;
    assetType?: string;
    purchasePrice?: number;
    acquisitionCost?: number;
  } = {},
) {
  const sourceAccount =
    await getTestAccount();

  const name =
    overrides.name ??
    `Update Asset Test ${Date.now()}-${Math.random()}`;

  const purchasePrice =
    overrides.purchasePrice ?? 10000;

  const acquisitionCost =
    overrides.acquisitionCost ?? 500;

  const {
    data,
    error,
  } = await supabase.rpc(
    "create_long_term_asset",
    {
      p_name: name,
      p_asset_type:
        overrides.assetType ?? "land",
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
        "Long-term asset update integration test",
    },
  );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return {
    assetId: data as string,
    sourceAccount,
  };
}

async function cleanupAsset(
  assetId: string,
) {
  const {
    data: asset,
    error: assetError,
  } = await withCleanupRetry(() =>
    supabase
      .from("long_term_assets")
      .select(
        "id, name, purchase_transaction_id",
      )
      .eq("id", assetId)
      .maybeSingle(),
  );

  expect(assetError).toBeNull();

  if (!asset) {
    return;
  }

  const purchaseTransactionId =
    asset.purchase_transaction_id;

  const {
    data: transactions,
    error: transactionError,
  } = await withCleanupRetry(() =>
    supabase
      .from("transactions")
      .select("id")
      .eq(
        "description",
        `Long-term asset purchase: ${asset.name}`,
      ),
  );

  expect(transactionError).toBeNull();

  /*
   * long_term_assets.purchase_transaction_id
   * references transactions.id.
   *
   * Delete the asset before deleting its
   * purchase transaction.
   */
  const {
    error: assetDeleteError,
  } = await withCleanupRetry(() =>
    admin
      .from("long_term_assets")
      .delete()
      .eq("id", assetId),
  );

  expect(
    assetDeleteError,
  ).toBeNull();

  for (const transaction of
    transactions ?? []) {
    const {
      error: entriesDeleteError,
    } = await withCleanupRetry(() =>
      admin
        .from("transaction_entries")
        .delete()
        .eq(
          "transaction_id",
          transaction.id,
        ),
    );

    expect(
      entriesDeleteError,
    ).toBeNull();

    const {
      error: transactionDeleteError,
    } = await withCleanupRetry(() =>
      admin
        .from("transactions")
        .delete()
        .eq(
          "id",
          transaction.id,
        ),
    );

    expect(
      transactionDeleteError,
    ).toBeNull();
  }

  /*
   * Defensive cleanup in case the purchase
   * transaction was not found by description.
   */
  if (purchaseTransactionId) {
    const {
      data: remainingPurchase,
      error:
        remainingPurchaseError,
    } = await withCleanupRetry(() =>
      admin
        .from("transactions")
        .select("id")
        .eq(
          "id",
          purchaseTransactionId,
        )
        .maybeSingle(),
    );

    expect(
      remainingPurchaseError,
    ).toBeNull();

    if (remainingPurchase) {
      const {
        error: entriesDeleteError,
      } = await withCleanupRetry(() =>
        admin
          .from("transaction_entries")
          .delete()
          .eq(
            "transaction_id",
            purchaseTransactionId,
          ),
      );

      expect(
        entriesDeleteError,
      ).toBeNull();

      const {
        error:
          transactionDeleteError,
      } = await withCleanupRetry(() =>
        admin
          .from("transactions")
          .delete()
          .eq(
            "id",
            purchaseTransactionId,
          ),
      );

      expect(
        transactionDeleteError,
      ).toBeNull();
    }
  }
}

describe(
  "long-term asset update lifecycle",
  () => {
    it(
      "updates metadata of an active long-term asset without changing financial fields",
      async () => {
        const {
          assetId,
        } = await createTestAsset();

        try {
          const {
            error,
          } = await supabase.rpc(
            "update_long_term_asset",
            {
              p_asset_id: assetId,
              p_name:
                "Updated Land Asset",
              p_asset_type:
                "property",
              p_purchase_price:
                10000,
              p_acquisition_cost:
                500,
              p_purchase_date:
                "2026-01-15",
              p_description:
                "Updated long-term asset",
            },
          );

          expect(error).toBeNull();

          const {
            data: asset,
            error: assetError,
          } = await supabase
            .from("long_term_assets")
            .select(
              "id, name, asset_type, currency, purchase_price, acquisition_cost, current_value, purchase_date, description, status, archived_at",
            )
            .eq("id", assetId)
            .single();

          expect(assetError).toBeNull();
          expect(asset).toBeTruthy();

          expect(asset.id).toBe(assetId);

          expect(asset.name).toBe(
            "Updated Land Asset",
          );

          expect(asset.asset_type).toBe(
            "property",
          );

          expect(asset.currency).toBe("BDT");

          expect(
            Number(asset.purchase_price),
          ).toBe(10000);

          expect(
            Number(asset.acquisition_cost),
          ).toBe(500);

          expect(
            Number(asset.current_value),
          ).toBe(10500);

          expect(
            asset.purchase_date,
          ).toBe("2026-01-15");

          expect(
            asset.description,
          ).toBe(
            "Updated long-term asset",
          );

          expect(asset.status).toBe(
            "active",
          );

          expect(
            asset.archived_at,
          ).toBeNull();
        } finally {
          await cleanupAsset(assetId);
        }
      },
    );

    it(
      "rejects an empty asset name",
      async () => {
        const {
          assetId,
        } = await createTestAsset();

        try {
          const {
            data,
            error,
          } = await supabase.rpc(
            "update_long_term_asset",
            {
              p_asset_id: assetId,
              p_name: "   ",
              p_asset_type: "land",
              p_purchase_price: 10000,
              p_acquisition_cost: 500,
              p_purchase_date:
                "2026-01-15",
              p_description: null,
            },
          );

          expect(data).toBeNull();
          expect(error).toBeTruthy();

          expect(
            error!.message,
          ).toContain(
            "Asset name cannot be empty",
          );
        } finally {
          await cleanupAsset(assetId);
        }
      },
    );

    it(
      "rejects an asset name longer than 150 characters",
      async () => {
        const {
          assetId,
        } = await createTestAsset();

        try {
          const {
            data,
            error,
          } = await supabase.rpc(
            "update_long_term_asset",
            {
              p_asset_id: assetId,
              p_name: "A".repeat(151),
              p_asset_type: "land",
              p_purchase_price: 10000,
              p_acquisition_cost: 500,
              p_purchase_date:
                "2026-01-15",
              p_description: null,
            },
          );

          expect(data).toBeNull();
          expect(error).toBeTruthy();

          expect(
            error!.message,
          ).toContain(
            "Asset name cannot exceed 150 characters",
          );
        } finally {
          await cleanupAsset(assetId);
        }
      },
    );

    it(
      "rejects an invalid asset type",
      async () => {
        const {
          assetId,
        } = await createTestAsset();

        try {
          const {
            data,
            error,
          } = await supabase.rpc(
            "update_long_term_asset",
            {
              p_asset_id: assetId,
              p_name:
                "Updated Asset",
              p_asset_type:
                "invalid_asset_type",
              p_purchase_price: 10000,
              p_acquisition_cost: 500,
              p_purchase_date:
                "2026-01-15",
              p_description: null,
            },
          );

          expect(data).toBeNull();
          expect(error).toBeTruthy();

          expect(
            error!.message,
          ).toContain(
            "Invalid asset type",
          );
        } finally {
          await cleanupAsset(assetId);
        }
      },
    );

    it(
      "rejects changing the purchase price after asset creation",
      async () => {
        const {
          assetId,
        } = await createTestAsset();

        try {
          const {
            data,
            error,
          } = await supabase.rpc(
            "update_long_term_asset",
            {
              p_asset_id: assetId,
              p_name:
                "Updated Asset",
              p_asset_type: "land",
              p_purchase_price:
                15000,
              p_acquisition_cost:
                500,
              p_purchase_date:
                "2026-01-15",
              p_description: null,
            },
          );

          expect(data).toBeNull();
          expect(error).toBeTruthy();

          expect(
            error!.message,
          ).toContain(
            "Purchase price cannot be changed after asset creation",
          );
        } finally {
          await cleanupAsset(assetId);
        }
      },
    );

    it(
      "rejects changing the acquisition cost after asset creation",
      async () => {
        const {
          assetId,
        } = await createTestAsset();

        try {
          const {
            data,
            error,
          } = await supabase.rpc(
            "update_long_term_asset",
            {
              p_asset_id: assetId,
              p_name:
                "Updated Asset",
              p_asset_type: "land",
              p_purchase_price:
                10000,
              p_acquisition_cost:
                1200,
              p_purchase_date:
                "2026-01-15",
              p_description: null,
            },
          );

          expect(data).toBeNull();
          expect(error).toBeTruthy();

          expect(
            error!.message,
          ).toContain(
            "Acquisition cost cannot be changed after asset creation",
          );
        } finally {
          await cleanupAsset(assetId);
        }
      },
    );

    it(
      "rejects changing the purchase date after asset creation",
      async () => {
        const {
          assetId,
        } = await createTestAsset();

        try {
          const {
            data,
            error,
          } = await supabase.rpc(
            "update_long_term_asset",
            {
              p_asset_id: assetId,
              p_name:
                "Updated Asset",
              p_asset_type: "land",
              p_purchase_price:
                10000,
              p_acquisition_cost:
                500,
              p_purchase_date:
                "2026-02-20",
              p_description: null,
            },
          );

          expect(data).toBeNull();
          expect(error).toBeTruthy();

          expect(
            error!.message,
          ).toContain(
            "Purchase date cannot be changed after asset creation",
          );
        } finally {
          await cleanupAsset(assetId);
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
          "update_long_term_asset",
          {
            p_asset_id:
              "00000000-0000-0000-0000-000000000000",
            p_name:
              "Missing Asset",
            p_asset_type: "land",
            p_purchase_price: 10000,
            p_acquisition_cost: 500,
            p_purchase_date:
              "2026-01-15",
            p_description: null,
          },
        );

        expect(data).toBeNull();
        expect(error).toBeTruthy();

        expect(
          error!.message,
        ).toContain(
          "Long-term asset not found",
        );
      },
    );

    it(
      "rejects updating a sold asset",
      async () => {
        const {
          assetId,
        } = await createTestAsset();

        try {
          /*
           * Fixture setup intentionally uses the
           * admin client. The authenticated RPC
           * remains the operation under test.
           */
          const {
            error: statusError,
          } = await admin
            .from("long_term_assets")
            .update({
              status: "sold",
              archived_at:
                new Date().toISOString(),
            })
            .eq("id", assetId);

          expect(statusError).toBeNull();

          const {
            data,
            error,
          } = await supabase.rpc(
            "update_long_term_asset",
            {
              p_asset_id: assetId,
              p_name:
                "Should Not Update",
              p_asset_type: "land",
              p_purchase_price: 10000,
              p_acquisition_cost: 500,
              p_purchase_date:
                "2026-01-15",
              p_description: null,
            },
          );

          expect(data).toBeNull();
          expect(error).toBeTruthy();

          expect(
            error!.message,
          ).toContain(
            "Only active long-term assets can be updated",
          );
        } finally {
          await cleanupAsset(assetId);
        }
      },
    );

    it(
      "rejects updating a cancelled asset",
      async () => {
        const {
          assetId,
        } = await createTestAsset();

        try {
          /*
           * Fixture setup intentionally uses the
           * admin client.
           */
          const {
            error: statusError,
          } = await admin
            .from("long_term_assets")
            .update({
              status: "cancelled",
              archived_at:
                new Date().toISOString(),
            })
            .eq("id", assetId);

          expect(statusError).toBeNull();

          const {
            data,
            error,
          } = await supabase.rpc(
            "update_long_term_asset",
            {
              p_asset_id: assetId,
              p_name:
                "Should Not Update",
              p_asset_type: "land",
              p_purchase_price: 10000,
              p_acquisition_cost: 500,
              p_purchase_date:
                "2026-01-15",
              p_description: null,
            },
          );

          expect(data).toBeNull();
          expect(error).toBeTruthy();

          expect(
            error!.message,
          ).toContain(
            "Only active long-term assets can be updated",
          );
        } finally {
          await cleanupAsset(assetId);
        }
      },
    );

    it(
      "rejects updating an archived asset",
      async () => {
        const {
          assetId,
        } = await createTestAsset();

        try {
          /*
           * Fixture setup intentionally uses the
           * admin client.
           */
          const {
            error: archiveError,
          } = await admin
            .from("long_term_assets")
            .update({
              status: "cancelled",
              archived_at:
                new Date().toISOString(),
            })
            .eq("id", assetId);

          expect(
            archiveError,
          ).toBeNull();

          const {
            data: archivedAsset,
            error:
              archivedAssetError,
          } = await supabase
            .from("long_term_assets")
            .select(
              "status, archived_at",
            )
            .eq("id", assetId)
            .single();

          expect(
            archivedAssetError,
          ).toBeNull();

          expect(
            archivedAsset?.status,
          ).toBe("cancelled");

          expect(
            archivedAsset?.archived_at,
          ).not.toBeNull();

          const {
            data,
            error,
          } = await supabase.rpc(
            "update_long_term_asset",
            {
              p_asset_id: assetId,
              p_name:
                "Should Not Update",
              p_asset_type: "land",
              p_purchase_price: 10000,
              p_acquisition_cost: 500,
              p_purchase_date:
                "2026-01-15",
              p_description: null,
            },
          );

          expect(data).toBeNull();
          expect(error).toBeTruthy();

          expect(
            error!.message,
          ).toContain(
            "Only active long-term assets can be updated",
          );
        } finally {
          await cleanupAsset(assetId);
        }
      },
    );
  },
);

