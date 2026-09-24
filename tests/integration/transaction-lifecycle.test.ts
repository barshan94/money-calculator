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

describe("transaction lifecycle", () => {
  it(
    "creates, updates, voids, and preserves the transaction audit trail",
    async () => {
      const {
        data: accounts,
        error: accountError,
      } = await supabase
        .from("accounts")
        .select(
          "id, currency, account_type, is_system, is_archived",
        )
        .eq("currency", "BDT")
        .eq("account_type", "asset")
        .eq("is_system", false)
        .eq("is_archived", false)
        .limit(2);

      expect(accountError).toBeNull();
      expect(accounts).toHaveLength(2);

      const sourceAccount = accounts![0];
      const destinationAccount = accounts![1];

      const initialSource =
        await getAccountBalance(
          sourceAccount.id,
        );

      const initialDestination =
        await getAccountBalance(
          destinationAccount.id,
        );

      const description =
        `Automated transaction test ${Date.now()}`;

      /*
       * CREATE
       *
       * Destination = debit
       * Source = credit
       */
      const {
        data: transactionId,
        error: createError,
      } = await supabase.rpc(
        "create_transaction",
        {
          p_transaction_date:
            new Date().toISOString(),
          p_description: description,
          p_reference: null,
          p_notes: null,
          p_entries: [
            {
              account_id:
                destinationAccount.id,
              category_id: null,
              amount: 100,
              entry_type: "debit",
            },
            {
              account_id:
                sourceAccount.id,
              category_id: null,
              amount: 100,
              entry_type: "credit",
            },
          ],
        },
      );

      expect(createError).toBeNull();
      expect(transactionId).toBeTruthy();

      expect(
        await getAccountBalance(
          sourceAccount.id,
        ),
      ).toBe(initialSource - 100);

      expect(
        await getAccountBalance(
          destinationAccount.id,
        ),
      ).toBe(initialDestination + 100);

      /*
       * UPDATE
       *
       * Change 100 → 60.
       */
      const {
        error: updateError,
      } = await supabase.rpc(
        "update_transaction",
        {
          p_transaction_id: transactionId,
          p_transaction_date:
            new Date().toISOString(),
          p_description:
            `${description} updated`,
          p_entries: [
            {
              account_id:
                destinationAccount.id,
              category_id: null,
              amount: 60,
              entry_type: "debit",
            },
            {
              account_id:
                sourceAccount.id,
              category_id: null,
              amount: 60,
              entry_type: "credit",
            },
          ],
        },
      );

      expect(updateError).toBeNull();

      expect(
        await getAccountBalance(
          sourceAccount.id,
        ),
      ).toBe(initialSource - 60);

      expect(
        await getAccountBalance(
          destinationAccount.id,
        ),
      ).toBe(initialDestination + 60);

      /*
       * VERIFY ORIGINAL TRANSACTION
       */
      const {
        data: original,
        error: originalError,
      } = await supabase
        .from("transactions")
        .select(
          "id, status, reversal_of_id",
        )
        .eq("id", transactionId)
        .single();

      expect(originalError).toBeNull();
      expect(original).toBeTruthy();
      expect(original.status).toBe("posted");
      expect(original.reversal_of_id).toBeNull();

      /*
       * VOID
       */
      const {
        error: voidError,
      } = await supabase.rpc(
        "void_transaction",
        {
          p_transaction_id: transactionId,
        },
      );

      expect(voidError).toBeNull();

      /*
       * ACCOUNT BALANCES MUST RETURN
       * EXACTLY TO THEIR ORIGINAL VALUES.
       */
      expect(
        await getAccountBalance(
          sourceAccount.id,
        ),
      ).toBe(initialSource);

      expect(
        await getAccountBalance(
          destinationAccount.id,
        ),
      ).toBe(initialDestination);

      /*
       * ORIGINAL TRANSACTION MUST REMAIN.
       */
      const {
        data: voidedOriginal,
        error: voidedOriginalError,
      } = await supabase
        .from("transactions")
        .select(
          "id, status, reversal_of_id",
        )
        .eq("id", transactionId)
        .single();

      expect(
        voidedOriginalError,
      ).toBeNull();

      expect(
        voidedOriginal,
      ).toBeTruthy();

      expect(
        voidedOriginal.status,
      ).toBe("posted");

      expect(
        voidedOriginal.reversal_of_id,
      ).toBeNull();

      /*
       * FIND THE POSTED REVERSAL.
       */
      const {
        data: reversal,
        error: reversalError,
      } = await supabase
        .from("transactions")
        .select(
          "id, status, reversal_of_id, transaction_type",
        )
        .eq(
          "reversal_of_id",
          transactionId,
        )
        .eq("status", "posted")
        .maybeSingle();

      expect(reversalError).toBeNull();

      expect(reversal).toBeTruthy();

      expect(reversal.status).toBe(
        "posted",
      );

      expect(
        reversal.reversal_of_id,
      ).toBe(transactionId);
    },
    30_000,
  );
});

