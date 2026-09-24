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
let testUserId: string;

beforeAll(async () => {
  supabase =
    createAuthenticatedClient();

  admin = createAdminClient();

  await signInTestUser(supabase);

  const {
    data: userData,
    error: userError,
  } =
    await supabase.auth.getUser();

  expect(userError).toBeNull();
  expect(userData.user).toBeTruthy();

  testUserId = userData.user!.id;
});

async function getTestAccount() {
  const {
    data,
    error,
  } = await supabase
    .from("accounts")
    .select(
      "id, name, currency, account_type, is_system, is_archived",
    )
    .eq(
      "user_id",
      testUserId,
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

async function getSystemAccount(
  name: string,
  accountType: string,
  currency: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from("accounts")
    .select(
      "id, name, currency, account_type, is_system, is_archived",
    )
    .eq(
      "user_id",
      testUserId,
    )
    .eq(
      "name",
      name,
    )
    .eq(
      "currency",
      currency,
    )
    .eq(
      "account_type",
      accountType,
    )
    .eq(
      "is_system",
      true,
    )
    .eq(
      "is_archived",
      false,
    )
    .single();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data!;
}

async function createTestAsset() {
  const sourceAccount =
    await getTestAccount();

  const name =
    `Sale Test Asset ${Date.now()}-${Math.random()}`;

  const purchasePrice = 10000;
  const acquisitionCost = 500;

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
        "Long-term asset sale integration test",
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

async function cleanupAsset(
  assetId: string,
) {
  /*
   * Reads intentionally use the authenticated
   * client so normal user visibility/RLS
   * continues to be exercised.
   */
  const {
    data: asset,
    error: assetError,
  } = await supabase
    .from("long_term_assets")
    .select(
      "id, name, purchase_transaction_id",
    )
    .eq("id", assetId)
    .maybeSingle();

  expect(assetError).toBeNull();

  if (!asset) {
    return;
  }

  const purchaseTransactionId =
    asset.purchase_transaction_id;

  /*
   * Find related transactions before removing
   * the asset. The purchase transaction is
   * referenced by long_term_assets through a
   * foreign key.
   */
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

  const {
    data: saleTransactions,
    error: saleTransactionError,
  } = await supabase
    .from("transactions")
    .select("id")
    .eq(
      "description",
      `Long-term asset sale: ${asset.name}`,
    );

  expect(
    saleTransactionError,
  ).toBeNull();

  /*
   * The asset must be deleted BEFORE the
   * purchase transaction because
   *
   * long_term_assets.purchase_transaction_id
   * -> transactions.id
   *
   * Cleanup intentionally uses the service-role
   * client because authenticated users will not
   * retain direct DELETE privileges in production.
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

  /*
   * Sale transactions do not own the asset FK,
   * so they can now be cleaned up normally.
   */
  for (const transaction of
    saleTransactions ?? []) {
    const {
      error: entriesDeleteError,
    } = await admin
      .from("transaction_entries")
      .delete()
      .eq(
        "transaction_id",
        transaction.id,
      );

    expect(
      entriesDeleteError,
    ).toBeNull();

    const {
      error: transactionDeleteError,
    } = await admin
      .from("transactions")
      .delete()
      .eq(
        "id",
        transaction.id,
      );

    expect(
      transactionDeleteError,
    ).toBeNull();
  }

  /*
   * Purchase transaction can now be removed
   * because the long-term asset row no longer
   * references it.
   */
  for (const transaction of
    transactions ?? []) {
    const {
      error: entriesDeleteError,
    } = await admin
      .from("transaction_entries")
      .delete()
      .eq(
        "transaction_id",
        transaction.id,
      );

    expect(
      entriesDeleteError,
    ).toBeNull();

    const {
      error: transactionDeleteError,
    } = await admin
      .from("transactions")
      .delete()
      .eq(
        "id",
        transaction.id,
      );

    expect(
      transactionDeleteError,
    ).toBeNull();
  }

  /*
   * Defensive cleanup in case the description
   * lookup ever misses the purchase transaction.
   *
   * Normally this row has already been removed
   * above. If it still exists, remove its entries
   * and then the transaction.
   */
  if (purchaseTransactionId) {
    const {
      data: remainingPurchase,
      error:
        remainingPurchaseError,
    } = await admin
      .from("transactions")
      .select("id")
      .eq(
        "id",
        purchaseTransactionId,
      )
      .maybeSingle();

    expect(
      remainingPurchaseError,
    ).toBeNull();

    if (remainingPurchase) {
      const {
        error: entriesDeleteError,
      } = await admin
        .from("transaction_entries")
        .delete()
        .eq(
          "transaction_id",
          purchaseTransactionId,
        );

      expect(
        entriesDeleteError,
      ).toBeNull();

      const {
        error: transactionDeleteError,
      } = await admin
        .from("transactions")
        .delete()
        .eq(
          "id",
          purchaseTransactionId,
        );

      expect(
        transactionDeleteError,
      ).toBeNull();
    }
  }
}

async function getTransaction(
  description: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from("transactions")
    .select(
      "id, description, status, transaction_type",
    )
    .eq(
      "description",
      description,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    )
    .limit(1)
    .maybeSingle();

  expect(error).toBeNull();

  return data;
}

async function getTransactionEntries(
  transactionId: string,
) {
  const {
    data,
    error,
  } = await supabase
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

async function getSaleTransaction(
  assetId: string,
) {
  const {
    data: asset,
    error: assetError,
  } = await supabase
    .from("long_term_assets")
    .select("name")
    .eq("id", assetId)
    .single();

  expect(assetError).toBeNull();
  expect(asset).toBeTruthy();

  const transaction =
    await getTransaction(
      `Long-term asset sale: ${asset!.name}`,
    );

  expect(transaction).toBeTruthy();

  return transaction!;
}

describe(
  "long-term asset sale lifecycle",
  () => {
    it(
      "sells an asset at cost without gain or loss",
      async () => {
        const {
          assetId,
          sourceAccount,
          costBasis,
        } = await createTestAsset();

        try {
          const {
            error,
          } = await supabase.rpc(
            "sell_long_term_asset",
            {
              p_asset_id:
                assetId,
              p_sale_price:
                costBasis,
              p_sale_date:
                "2026-03-01",
              p_destination_account_id:
                sourceAccount.id,
              p_description: null,
            },
          );

          expect(error).toBeNull();

          const {
            data: asset,
            error: assetError,
          } = await supabase
            .from(
              "long_term_assets",
            )
            .select(
              "name, status, archived_at, current_value",
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
            asset?.status,
          ).toBe("sold");

          expect(
            asset?.archived_at,
          ).not.toBeNull();

          const transaction =
            await getSaleTransaction(
              assetId,
            );

          const entries =
            await getTransactionEntries(
              transaction.id,
            );

          const destinationEntry =
            entries.find(
              (entry) =>
                entry.account_id ===
                  sourceAccount.id &&
                entry.entry_type ===
                  "debit",
            );

          expect(
            destinationEntry,
          ).toBeTruthy();

          expect(
            Number(
              destinationEntry!.amount,
            ),
          ).toBe(costBasis);

          const gainEntry =
            entries.find(
              (entry) =>
                entry.entry_type ===
                  "credit" &&
                Number(entry.amount) === 0,
            );

          expect(
            gainEntry,
          ).toBeUndefined();
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
      30000,
    );

    it(
      "records a gain when sale price exceeds cost basis",
      async () => {
        const {
          assetId,
          sourceAccount,
          costBasis,
        } = await createTestAsset();

        try {
          const salePrice =
            15000;

          const {
            error,
          } = await supabase.rpc(
            "sell_long_term_asset",
            {
              p_asset_id:
                assetId,
              p_sale_price:
                salePrice,
              p_sale_date:
                "2026-03-01",
              p_destination_account_id:
                sourceAccount.id,
              p_description: null,
            },
          );

          expect(error).toBeNull();

          const gainAccount =
            await getSystemAccount(
              "Gain on Long-Term Asset Sale",
              "income",
              "BDT",
            );

          const transaction =
            await getSaleTransaction(
              assetId,
            );

          const entries =
            await getTransactionEntries(
              transaction.id,
            );

          const destinationEntry =
            entries.find(
              (entry) =>
                entry.account_id ===
                  sourceAccount.id &&
                entry.entry_type ===
                  "debit",
            );

          expect(
            destinationEntry,
          ).toBeTruthy();

          expect(
            Number(
              destinationEntry!.amount,
            ),
          ).toBe(salePrice);

          const gainEntry =
            entries.find(
              (entry) =>
                entry.account_id ===
                gainAccount.id,
            );

          expect(
            gainEntry,
          ).toBeTruthy();

          expect(
            gainEntry!.entry_type,
          ).toBe("credit");

          expect(
            Number(
              gainEntry!.amount,
            ),
          ).toBe(
            salePrice -
              costBasis,
          );
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
      30000,
    );

    it(
      "records a loss when sale price is below cost basis",
      async () => {
        const {
          assetId,
          sourceAccount,
          costBasis,
        } = await createTestAsset();

        try {
          const salePrice =
            8000;

          const {
            error,
          } = await supabase.rpc(
            "sell_long_term_asset",
            {
              p_asset_id:
                assetId,
              p_sale_price:
                salePrice,
              p_sale_date:
                "2026-03-01",
              p_destination_account_id:
                sourceAccount.id,
              p_description: null,
            },
          );

          expect(error).toBeNull();

          const lossAccount =
            await getSystemAccount(
              "Loss on Long-Term Asset Sale",
              "expense",
              "BDT",
            );

          const {
            data: asset,
            error: assetError,
          } = await supabase
            .from(
              "long_term_assets",
            )
            .select("name")
            .eq(
              "id",
              assetId,
            )
            .single();

          expect(
            assetError,
          ).toBeNull();

          const transaction =
            await getTransaction(
              `Long-term asset sale: ${asset!.name}`,
            );

          expect(
            transaction,
          ).toBeTruthy();

          const entries =
            await getTransactionEntries(
              transaction!.id,
            );

          const lossEntry =
            entries.find(
              (entry) =>
                entry.account_id ===
                lossAccount.id,
            );

          expect(
            lossEntry,
          ).toBeTruthy();

          expect(
            lossEntry!.entry_type,
          ).toBe("debit");

          expect(
            Number(
              lossEntry!.amount,
            ),
          ).toBe(
            costBasis -
              salePrice,
          );
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
      30000,
    );

    it(
      "removes the asset cost basis from the Long-Term Assets account",
      async () => {
        const {
          assetId,
          sourceAccount,
          costBasis,
        } = await createTestAsset();

        try {
          const assetAccount =
            await getSystemAccount(
              "Long-Term Assets",
              "asset",
              "BDT",
            );

          const {
            error,
          } = await supabase.rpc(
            "sell_long_term_asset",
            {
              p_asset_id:
                assetId,
              p_sale_price:
                costBasis + 2000,
              p_sale_date:
                "2026-03-01",
              p_destination_account_id:
                sourceAccount.id,
              p_description: null,
            },
          );

          expect(error).toBeNull();

          const saleTransaction =
            await getSaleTransaction(
              assetId,
            );

          expect(
            saleTransaction.status,
          ).toBe("posted");

          const saleEntries =
            await getTransactionEntries(
              saleTransaction.id,
            );

          const assetCreditEntry =
            saleEntries.find(
              (entry) =>
                entry.account_id ===
                  assetAccount.id &&
                entry.entry_type ===
                  "credit",
            );

          expect(
            assetCreditEntry,
          ).toBeTruthy();

          expect(
            Number(
              assetCreditEntry!.amount,
            ),
          ).toBe(costBasis);
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
      30000,
    );

    it(
      "creates a balanced sale transaction",
      async () => {
        const {
          assetId,
          sourceAccount,
          costBasis,
        } = await createTestAsset();

        try {
          const salePrice =
            14000;

          const {
            data: asset,
            error: assetError,
          } = await supabase
            .from(
              "long_term_assets",
            )
            .select("name")
            .eq(
              "id",
              assetId,
            )
            .single();

          expect(
            assetError,
          ).toBeNull();

          const {
            error,
          } = await supabase.rpc(
            "sell_long_term_asset",
            {
              p_asset_id:
                assetId,
              p_sale_price:
                salePrice,
              p_sale_date:
                "2026-03-01",
              p_destination_account_id:
                sourceAccount.id,
              p_description: null,
            },
          );

          expect(error).toBeNull();

          const transaction =
            await getTransaction(
              `Long-term asset sale: ${asset!.name}`,
            );

          expect(
            transaction,
          ).toBeTruthy();

          const entries =
            await getTransactionEntries(
              transaction!.id,
            );

          const debitTotal =
            entries
              .filter(
                (entry) =>
                  entry.entry_type ===
                  "debit",
              )
              .reduce(
                (sum, entry) =>
                  sum +
                  Number(
                    entry.amount,
                  ),
                0,
              );

          const creditTotal =
            entries
              .filter(
                (entry) =>
                  entry.entry_type ===
                  "credit",
              )
              .reduce(
                (sum, entry) =>
                  sum +
                  Number(
                    entry.amount,
                  ),
                0,
              );

          expect(
            debitTotal,
          ).toBe(
            creditTotal,
          );

          expect(
            debitTotal,
          ).toBe(salePrice);
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
      30000,
    );

    it(
      "rejects a second sale of the same asset",
      async () => {
        const {
          assetId,
          sourceAccount,
          costBasis,
        } = await createTestAsset();

        try {
          const {
            error: firstError,
          } = await supabase.rpc(
            "sell_long_term_asset",
            {
              p_asset_id:
                assetId,
              p_sale_price:
                costBasis,
              p_sale_date:
                "2026-03-01",
              p_destination_account_id:
                sourceAccount.id,
              p_description: null,
            },
          );

          expect(
            firstError,
          ).toBeNull();

          const {
            data,
            error,
          } = await supabase.rpc(
            "sell_long_term_asset",
            {
              p_asset_id:
                assetId,
              p_sale_price:
                costBasis,
              p_sale_date:
                "2026-03-02",
              p_destination_account_id:
                sourceAccount.id,
              p_description: null,
            },
          );

          expect(data).toBeNull();
          expect(error).toBeTruthy();

          expect(
            error!.message,
          ).toContain(
            "Only active long-term assets can be sold",
          );
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
      30000,
    );

    it(
      "rejects an invalid sale price",
      async () => {
        const {
          assetId,
        } = await createTestAsset();

        try {
          for (const salePrice of [
            "NaN",
            "Infinity",
            "-Infinity",
            0,
            -100,
          ]) {
            const {
              data,
              error,
            } = await supabase.rpc(
              "sell_long_term_asset",
              {
                p_asset_id:
                  assetId,
                p_sale_price:
                  salePrice,
                p_sale_date:
                  "2026-03-01",
                p_destination_account_id:
                  (
                    await getTestAccount()
                  ).id,
                p_description:
                  null,
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
              "Sale price must be a finite number greater than zero",
            );
          }
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
      30000,
    );
  },
);

