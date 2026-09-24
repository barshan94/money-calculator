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

async function getTestAccount() {
  const { data, error } =
    await supabase
      .from("accounts")
      .select(
        "id, name, currency",
      )
      .eq("is_system", false)
      .eq("currency", "BDT")
      .limit(1)
      .maybeSingle();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data!;
}

async function createTestAsset() {
  const sourceAccount =
    await getTestAccount();

  const name =
    `Cancel Test Asset ${Date.now()}-${Math.random()}`;

  const purchasePrice = 100000;
  const acquisitionCost = 5000;

  const costBasis =
    purchasePrice +
    acquisitionCost;

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
        "Long-term asset cancellation integration test",
    },
  );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return {
    assetId: data as string,
    sourceAccount,
    purchasePrice,
    acquisitionCost,
    costBasis,
  };
}

async function getTransactionEntries(
  transactionId: string,
) {
  const { data, error } =
    await supabase
      .from("transaction_entries")
      .select(
        "account_id, amount, entry_type",
      )
      .eq(
        "transaction_id",
        transactionId,
      );

  expect(error).toBeNull();

  return data ?? [];
}

async function cleanupAsset(
  assetId: string,
) {
  /*
   * Reads intentionally use the authenticated
   * client so the test continues to exercise
   * normal user visibility/RLS.
   */
  const { data: asset } =
    await supabase
      .from("long_term_assets")
      .select(
        "purchase_transaction_id",
      )
      .eq("id", assetId)
      .maybeSingle();

  if (!asset) {
    return;
  }

  const purchaseTransactionId =
    asset.purchase_transaction_id;

  let reversalId:
    | string
    | null = null;

  if (purchaseTransactionId) {
    const { data: reversal } =
      await supabase
        .from("transactions")
        .select("id")
        .eq(
          "reversal_of_id",
          purchaseTransactionId,
        )
        .maybeSingle();

    reversalId =
      reversal?.id ?? null;
  }

  /*
   * The long_term_assets row contains a foreign
   * key pointing to the purchase transaction.
   *
   * Therefore the asset must be deleted BEFORE
   * deleting the purchase transaction.
   *
   * Cleanup intentionally uses the service-role
   * client because production authenticated
   * users will not retain direct DELETE privileges.
   */
  const {
    error: assetDeleteError,
  } = await admin
    .from("long_term_assets")
    .delete()
    .eq("id", assetId);

  expect(
    assetDeleteError,
  ).toBeNull();

  if (reversalId) {
    const {
      error: reversalEntriesDeleteError,
    } = await admin
      .from("transaction_entries")
      .delete()
      .eq(
        "transaction_id",
        reversalId,
      );

    expect(
      reversalEntriesDeleteError,
    ).toBeNull();

    const {
      error: reversalDeleteError,
    } = await admin
      .from("transactions")
      .delete()
      .eq(
        "id",
        reversalId,
      );

    expect(
      reversalDeleteError,
    ).toBeNull();
  }

  if (purchaseTransactionId) {
    const {
      error: purchaseEntriesDeleteError,
    } = await admin
      .from("transaction_entries")
      .delete()
      .eq(
        "transaction_id",
        purchaseTransactionId,
      );

    expect(
      purchaseEntriesDeleteError,
    ).toBeNull();

    const {
      error: purchaseDeleteError,
    } = await admin
      .from("transactions")
      .delete()
      .eq(
        "id",
        purchaseTransactionId,
      );

    expect(
      purchaseDeleteError,
    ).toBeNull();
  }
}

describe(
  "long-term asset cancellation lifecycle",
  () => {
    beforeAll(async () => {
      supabase =
        createAuthenticatedClient();

      admin = createAdminClient();

      await signInTestUser(supabase);
    });

    it(
      "cancels an asset and reverses its purchase transaction",
      async () => {
        const {
          assetId,
          sourceAccount,
          costBasis,
        } =
          await createTestAsset();

        try {
          const {
            data: assetAccount,
            error: assetAccountError,
          } =
            await supabase
              .from("accounts")
              .select(
                "id, name, currency",
              )
              .eq(
                "name",
                "Long-Term Assets",
              )
              .eq(
                "is_system",
                true,
              )
              .maybeSingle();

          expect(
            assetAccountError,
          ).toBeNull();

          expect(
            assetAccount,
          ).toBeTruthy();

          const {
            error: cancelError,
          } =
            await supabase.rpc(
              "cancel_long_term_asset",
              {
                p_asset_id: assetId,
              },
            );

          expect(
            cancelError,
          ).toBeNull();

          const {
            data: asset,
            error: assetError,
          } =
            await supabase
              .from("long_term_assets")
              .select(
                `
                  id,
                  status,
                  archived_at,
                  purchase_transaction_id
                `,
              )
              .eq("id", assetId)
              .single();

          expect(
            assetError,
          ).toBeNull();

          expect(asset).toBeTruthy();

          expect(
            asset!.status,
          ).toBe("cancelled");

          expect(
            asset!.archived_at,
          ).not.toBeNull();

          expect(
            asset!.purchase_transaction_id,
          ).toBeTruthy();

          const {
            data: purchaseTransaction,
            error:
              purchaseTransactionError,
          } =
            await supabase
              .from("transactions")
              .select(
                `
                  id,
                  status,
                  reversal_of_id
                `,
              )
              .eq(
                "id",
                asset!
                  .purchase_transaction_id,
              )
              .single();

          expect(
            purchaseTransactionError,
          ).toBeNull();

          expect(
            purchaseTransaction,
          ).toBeTruthy();

          expect(
            purchaseTransaction!.status,
          ).toBe("posted");

          expect(
            purchaseTransaction!
              .reversal_of_id,
          ).toBeNull();

          const {
            data: reversal,
            error: reversalError,
          } =
            await supabase
              .from("transactions")
              .select(
                `
                  id,
                  status,
                  reversal_of_id
                `,
              )
              .eq(
                "reversal_of_id",
                asset!
                  .purchase_transaction_id,
              )
              .maybeSingle();

          expect(
            reversalError,
          ).toBeNull();

          expect(
            reversal,
          ).toBeTruthy();

          expect(
            reversal!.status,
          ).toBe("posted");

          expect(
            reversal!.reversal_of_id,
          ).toBe(
            asset!
              .purchase_transaction_id,
          );

          const reversalEntries =
            await getTransactionEntries(
              reversal!.id,
            );

          const longTermAssetEntry =
            reversalEntries.find(
              (entry) =>
                entry.account_id ===
                  assetAccount!.id &&
                entry.entry_type ===
                  "credit",
            );

          expect(
            longTermAssetEntry,
          ).toBeTruthy();

          expect(
            Number(
              longTermAssetEntry!.amount,
            ),
          ).toBe(costBasis);

          const sourceEntry =
            reversalEntries.find(
              (entry) =>
                entry.account_id ===
                  sourceAccount.id &&
                entry.entry_type ===
                  "debit",
            );

          expect(
            sourceEntry,
          ).toBeTruthy();

          expect(
            Number(
              sourceEntry!.amount,
            ),
          ).toBe(costBasis);
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
    );

    it(
      "rejects cancelling the same asset twice",
      async () => {
        const {
          assetId,
        } = await createTestAsset();

        try {
          const firstCancel =
            await supabase.rpc(
              "cancel_long_term_asset",
              {
                p_asset_id: assetId,
              },
            );

          expect(
            firstCancel.error,
          ).toBeNull();

          const secondCancel =
            await supabase.rpc(
              "cancel_long_term_asset",
              {
                p_asset_id: assetId,
              },
            );

          expect(
            secondCancel.error,
          ).not.toBeNull();
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
    );

    it(
      "rejects cancelling a non-existent asset",
      async () => {
        const fakeAssetId =
          "00000000-0000-0000-0000-000000000000";

        const result =
          await supabase.rpc(
            "cancel_long_term_asset",
            {
              p_asset_id: fakeAssetId,
            },
          );

        expect(
          result.error,
        ).not.toBeNull();
      },
    );
  },
);

