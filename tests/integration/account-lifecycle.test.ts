import {
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
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

describe("account lifecycle", () => {
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

  it(
    "archives, restores, and protects an account with transaction history",
    async () => {
      const accountName =
        `Lifecycle Test ${Date.now()}`;

      /*
       * Create the account through the normal
       * application RPC so RLS is respected.
       */
      const {
        data: accountId,
        error: createError,
      } = await supabase.rpc(
        "create_account",
        {
          p_name: accountName,
          p_account_type: "asset",
          p_currency: "BDT",
          p_liquidity_class: "immediate",
        },
      );

      expect(createError).toBeNull();
      expect(accountId).toBeTruthy();

      /*
       * Verify the account exists and is active.
       */
      const {
        data: account,
        error: accountError,
      } = await supabase
        .from("accounts")
        .select(
          "id, name, account_type, currency, is_archived",
        )
        .eq("id", accountId)
        .single();

      expect(accountError).toBeNull();
      expect(account).toBeTruthy();
      expect(account!.is_archived).toBe(false);

      /*
       * Archive.
       */
      const {
        error: archiveError,
      } = await supabase.rpc(
        "archive_account",
        {
          p_account_id: accountId,
        },
      );

      expect(archiveError).toBeNull();

      const {
        data: archivedAccount,
        error: archivedError,
      } = await supabase
        .from("accounts")
        .select("id, is_archived")
        .eq("id", accountId)
        .single();

      expect(archivedError).toBeNull();
      expect(archivedAccount).toBeTruthy();
      expect(
        archivedAccount!.is_archived,
      ).toBe(true);

      /*
       * Restore.
       */
      const {
        error: unarchiveError,
      } = await supabase.rpc(
        "unarchive_account",
        {
          p_account_id: accountId,
        },
      );

      expect(unarchiveError).toBeNull();

      const {
        data: restoredAccount,
        error: restoredError,
      } = await supabase
        .from("accounts")
        .select("id, is_archived")
        .eq("id", accountId)
        .single();

      expect(restoredError).toBeNull();
      expect(restoredAccount).toBeTruthy();
      expect(
        restoredAccount!.is_archived,
      ).toBe(false);

      /*
       * Archive again before testing deletion.
       */
      const {
        error: secondArchiveError,
      } = await supabase.rpc(
        "archive_account",
        {
          p_account_id: accountId,
        },
      );

      expect(
        secondArchiveError,
      ).toBeNull();

      /*
       * Find another active user-owned BDT
       * asset/liability account.
       */
      const {
        data: otherAccounts,
        error: otherAccountError,
      } = await supabase
        .from("accounts")
        .select(
          "id, account_type, currency",
        )
        .eq(
          "user_id",
          (
            await supabase.auth.getUser()
          ).data.user!.id,
        )
        .eq("is_system", false)
        .eq("is_archived", false)
        .eq("currency", "BDT")
        .in("account_type", [
          "asset",
          "liability",
        ])
        .neq("id", accountId)
        .limit(1);

      expect(otherAccountError).toBeNull();
      expect(otherAccounts).toHaveLength(1);

      /*
       * Create a balanced transaction involving
       * the archived account.
       *
       * This should be rejected because archived
       * accounts cannot be used for new transactions.
       *
       * Therefore, restore it temporarily first.
       */
      const {
        error: restoreForTransactionError,
      } = await supabase.rpc(
        "unarchive_account",
        {
          p_account_id: accountId,
        },
      );

      expect(
        restoreForTransactionError,
      ).toBeNull();

      const {
        data: transactionId,
        error: transactionError,
      } = await supabase.rpc(
        "create_transaction",
        {
          p_transaction_date:
            new Date().toISOString(),
          p_description:
            "Account lifecycle history",
          p_reference: null,
          p_notes: null,
          p_entries: [
            {
              account_id: accountId,
              category_id: null,
              amount: 100,
              entry_type: "debit",
            },
            {
              account_id:
                otherAccounts![0].id,
              category_id: null,
              amount: 100,
              entry_type: "credit",
            },
          ],
        },
      );

      expect(transactionError).toBeNull();
      expect(transactionId).toBeTruthy();

      /*
       * Archive again.
       */
      const {
        error: finalArchiveError,
      } = await supabase.rpc(
        "archive_account",
        {
          p_account_id: accountId,
        },
      );

      expect(
        finalArchiveError,
      ).toBeNull();

      /*
       * Permanent deletion must be blocked
       * because the account has transaction history.
       */
      const {
        error: deleteError,
      } = await supabase.rpc(
        "delete_account",
        {
          p_account_id: accountId,
        },
      );

      expect(deleteError).toBeTruthy();

      expect(
        deleteError!.message,
      ).toContain(
        "transaction history",
      );

      /*
       * The account must still exist and remain archived.
       */
      const {
        data: protectedAccount,
        error: protectedError,
      } = await supabase
        .from("accounts")
        .select("id, is_archived")
        .eq("id", accountId)
        .single();

      expect(protectedError).toBeNull();
      expect(protectedAccount).toBeTruthy();
      expect(
        protectedAccount!.is_archived,
      ).toBe(true);

      /*
       * Reverse the test transaction through
       * the normal transaction lifecycle.
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
       * The account still has historical entries,
       * so permanent deletion remains correctly blocked.
       *
       * Leave the account archived as a deliberate
       * test artifact only if cleanup is impossible.
       *
       * Try to restore it so the test does not leave
       * unnecessary archived state.
       */
      const {
        error: finalUnarchiveError,
      } = await supabase.rpc(
        "unarchive_account",
        {
          p_account_id: accountId,
        },
      );

      expect(
        finalUnarchiveError,
      ).toBeNull();

      /*
       * Verify it was restored.
       */
      const {
        data: finalAccount,
        error: finalAccountError,
      } = await supabase
        .from("accounts")
        .select("id, is_archived")
        .eq("id", accountId)
        .single();

      expect(finalAccountError).toBeNull();
      expect(finalAccount).toBeTruthy();
      expect(
        finalAccount!.is_archived,
      ).toBe(false);
    },
  );
});

