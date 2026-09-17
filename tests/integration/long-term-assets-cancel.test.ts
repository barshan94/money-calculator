
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

  const {
    error,
  } = await supabase.auth.signInWithPassword({
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

  return data;
}

async function getAccountBalance(
  accountId: string,
) {
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
      "amount, entry_type, transactions!inner(status)",
    )
    .eq("account_id", accountId)
    .eq(
      "transactions.status",
      "posted",
    );

  expect(error).toBeNull();

  return (data ?? []).reduce(
    (total, entry) => {
      const amount = Number(
        entry.amount,
      );

      return (
        total +
        (entry.entry_type === "debit"
          ? amount
          : -amount)
      );
    },
    0,
  );
}

async function createTestAsset(
  sourceAccount: Awaited<
    ReturnType<typeof getTestAccount>
  >,
) {
  const {
    data: assetId,
    error,
  } = await supabase.rpc(
    "create_long_term_asset",
    {
      p_name:
        `Cancel Test ${Date.now()}`,
      p_asset_type: "land",
      p_currency: "BDT",
      p_purchase_price: 100000,
      p_acquisition_cost: 5000,
      p_purchase_date:
        "2026-03-01",
      p_source_account_id:
        sourceAccount.id,
      p_description:
        "Cancellation integration test",
    },
  );

  expect(error).toBeNull();
  expect(assetId).toBeTruthy();

  const {
    data: asset,
    error: assetError,
  } = await supabase
    .from("long_term_assets")
    .select(
      "id, name, purchase_transaction_id, status, currency, purchase_price, acquisition_cost",
    )
    .eq("id", assetId)
    .single();

  expect(assetError).toBeNull();
  expect(asset).toBeTruthy();

  return {
    asset,
  };
}

async function cleanupAsset(
  assetId: string,
) {
  const {
    data: asset,
  } = await supabase
    .from("long_term_assets")
    .select(
      "purchase_transaction_id",
    )
    .eq("id", assetId)
    .maybeSingle();

  if (
    asset?.purchase_transaction_id
  ) {
    const {
      data: reversal,
    } = await supabase
      .from("transactions")
      .select("id")
      .eq(
        "reversal_of_id",
        asset.purchase_transaction_id,
      )
      .maybeSingle();

    if (reversal?.id) {
      await supabase
        .from("transaction_entries")
        .delete()
        .eq(
          "transaction_id",
          reversal.id,
        );

      await supabase
        .from("transactions")
        .delete()
        .eq(
          "id",
          reversal.id,
        );
    }

    await supabase
      .from("transaction_entries")
      .delete()
      .eq(
        "transaction_id",
        asset.purchase_transaction_id,
      );

    await supabase
      .from("transactions")
      .delete()
      .eq(
        "id",
        asset.purchase_transaction_id,
      );
  }

  await supabase
    .from("long_term_assets")
    .delete()
    .eq("id", assetId);
}

describe(
  "long-term asset cancellation lifecycle",
  () => {
    it(
      "cancels an asset and reverses its purchase transaction",
      async () => {
        const sourceAccount =
          await getTestAccount();

        const sourceBefore =
          await getAccountBalance(
            sourceAccount.id,
          );

        const {
          asset,
        } = await createTestAsset(
          sourceAccount,
        );

        const costBasis =
          Number(asset.purchase_price) +
          Number(asset.acquisition_cost);

        const {
          data: assetAccount,
          error: assetAccountError,
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

        expect(
          assetAccount,
        ).toBeTruthy();

        const ledgerBefore =
          await getLedgerBalance(
            assetAccount.id,
          );

        try {
          const {
            error,
          } = await supabase.rpc(
            "cancel_long_term_asset",
            {
              p_asset_id:
                asset.id,
            },
          );

          expect(error).toBeNull();

          const sourceAfter =
            await getAccountBalance(
              sourceAccount.id,
            );

          expect(
            sourceAfter,
          ).toBe(sourceBefore);

          const ledgerAfter =
            await getLedgerBalance(
              assetAccount.id,
            );

          expect(
            ledgerAfter,
          ).toBe(
            ledgerBefore - costBasis,
          );

          const {
            data: cancelledAsset,
            error: cancelledAssetError,
          } = await supabase
            .from(
              "long_term_assets",
            )
            .select(
              "status, archived_at",
            )
            .eq(
              "id",
              asset.id,
            )
            .single();

          expect(
            cancelledAssetError,
          ).toBeNull();

          expect(
            cancelledAsset?.status,
          ).toBe("cancelled");

          expect(
            cancelledAsset?.archived_at,
          ).not.toBeNull();

          const {
            data: transaction,
            error: transactionError,
          } = await supabase
            .from("transactions")
            .select(
              "id, status, reversal_of_id",
            )
            .eq(
              "id",
              asset.purchase_transaction_id,
            )
            .single();

          expect(
            transactionError,
          ).toBeNull();

          expect(
            transaction?.status,
          ).toBe("posted");

          expect(
            transaction?.reversal_of_id,
          ).toBeNull();

          const {
            data: reversal,
            error: reversalError,
          } = await supabase
            .from("transactions")
            .select(
              "id, status, reversal_of_id",
            )
            .eq(
              "reversal_of_id",
              asset.purchase_transaction_id,
            )
            .single();

          expect(
            reversalError,
          ).toBeNull();

          expect(
            reversal,
          ).toBeTruthy();

          expect(
            reversal?.status,
          ).toBe("posted");

          expect(
            reversal?.reversal_of_id,
          ).toBe(
            asset.purchase_transaction_id,
          );
        } finally {
          await cleanupAsset(
            asset.id,
          );
        }
      },
    );

    it(
      "rejects cancelling the same asset twice",
      async () => {
        const sourceAccount =
          await getTestAccount();

        const {
          asset,
        } = await createTestAsset(
          sourceAccount,
        );

        try {
          const {
            error: firstError,
          } = await supabase.rpc(
            "cancel_long_term_asset",
            {
              p_asset_id:
                asset.id,
            },
          );

          expect(
            firstError,
          ).toBeNull();

          const {
            error: secondError,
          } = await supabase.rpc(
            "cancel_long_term_asset",
            {
              p_asset_id:
                asset.id,
            },
          );

          expect(
            secondError,
          ).not.toBeNull();

          expect(
            secondError?.message,
          ).toContain(
            "Only active long-term assets can be cancelled",
          );
        } finally {
          await cleanupAsset(
            asset.id,
          );
        }
      },
    );

    it(
      "rejects cancelling a non-existent asset",
      async () => {
        const {
          error,
        } = await supabase.rpc(
          "cancel_long_term_asset",
          {
            p_asset_id:
              "00000000-0000-0000-0000-000000000000",
          },
        );

        expect(error).not.toBeNull();

        expect(
          error?.message,
        ).toContain(
          "Long-term asset not found",
        );
      },
    );
  },
);