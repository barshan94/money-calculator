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
      "id, name, currency, account_type, is_system, is_archived",
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

  for (const transaction of saleTransactions ?? []) {
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

async function getAccountBalance(accountId: string) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_account_balances",
  );

  expect(error).toBeNull();

  const account = data?.find(
    (item) => item.id === accountId,
  );

  expect(account).toBeTruthy();

  return Number(account.balance);
}

async function getLedgerBalance(
  accountId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from("transaction_entries")
    .select(
      "amount, entry_type",
    )
    .eq(
      "account_id",
      accountId,
    );

  expect(error).toBeNull();

  return (data ?? []).reduce(
    (total, entry) => {
      const amount =
        Number(entry.amount);

      return (
        total +
        (
          entry.entry_type ===
          "debit"
            ? amount
            : -amount
        )
      );
    },
    0,
  );
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
          const destinationBefore =
            await getAccountBalance(
              sourceAccount.id,
            );

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

          const destinationAfter =
            await getAccountBalance(
              sourceAccount.id,
            );

          expect(
            destinationAfter -
              destinationBefore,
          ).toBe(costBasis);

          const {
            data: asset,
            error:
              assetError,
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
            await getTransaction(
              `Long-term asset sale: ${asset?.name}`,
            );

          expect(
            transaction,
          ).toBeTruthy();
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
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

          const destinationBefore =
            await getAccountBalance(
              sourceAccount.id,
            );

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

          const destinationAfter =
            await getAccountBalance(
              sourceAccount.id,
            );

          expect(
            destinationAfter -
              destinationBefore,
          ).toBe(salePrice);

          const {
            data: gainAccount,
            error:
              gainAccountError,
          } = await supabase
            .from("accounts")
            .select("id")
            .eq(
              "name",
              "Gain on Long-Term Asset Sale",
            )
            .eq(
              "currency",
              "BDT",
            )
            .eq(
              "account_type",
              "income",
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

          expect(
            gainAccountError,
          ).toBeNull();

          const transaction =
            await getTransaction(
              `Long-term asset sale: ${(
                await supabase
                  .from(
                    "long_term_assets",
                  )
                  .select("name")
                  .eq(
                    "id",
                    assetId,
                  )
                  .single()
              ).data?.name}`,
            );

          expect(
            transaction,
          ).toBeTruthy();

          const entries =
            await getTransactionEntries(
              transaction!.id,
            );

          const gainEntry =
            entries.find(
              (entry) =>
                entry.account_id ===
                gainAccount!.id,
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

          const {
            data: lossAccount,
            error:
              lossAccountError,
          } = await supabase
            .from("accounts")
            .select("id")
            .eq(
              "name",
              "Loss on Long-Term Asset Sale",
            )
            .eq(
              "currency",
              "BDT",
            )
            .eq(
              "account_type",
              "expense",
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

          expect(
            lossAccountError,
          ).toBeNull();

          const {
            data: asset,
            error:
              assetError,
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
                lossAccount!.id,
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
          const {
            data: assetAccount,
            error:
              assetAccountError,
          } = await supabase
            .from("accounts")
            .select("id")
            .eq(
              "name",
              "Long-Term Assets",
            )
            .eq(
              "currency",
              "BDT",
            )
            .eq(
              "account_type",
              "asset",
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

          expect(
            assetAccountError,
          ).toBeNull();

          const before =
            await getLedgerBalance(
              assetAccount!.id,
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

          const after =
            await getLedgerBalance(
              assetAccount!.id,
            );

          expect(
            after - before,
          ).toBe(-costBasis);
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
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
            error:
              assetError,
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
    );

    it(
      "rejects a currency mismatch",
      async () => {
        const {
          assetId,
        } = await createTestAsset();

        try {
          const {
            data,
            error,
          } = await supabase.rpc(
            "sell_long_term_asset",
            {
              p_asset_id:
                assetId,
              p_sale_price:
                15000,
              p_sale_date:
                "2026-03-01",
              p_destination_account_id:
                "00000000-0000-0000-0000-000000000000",
              p_description: null,
            },
          );

          expect(data).toBeNull();
          expect(error).toBeTruthy();

          expect(
            error!.message,
          ).toContain(
            "Invalid destination account",
          );
        } finally {
          await cleanupAsset(
            assetId,
          );
        }
      },
    );
  },
);