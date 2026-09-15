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

describe("account protection", () => {
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
    "protects system accounts from archive, unarchive, and delete",
    async () => {
      /*
       * Find a system account owned by the application.
       */
      const {
        data: systemAccounts,
        error: accountError,
      } = await supabase
        .from("accounts")
        .select(
          "id, name, is_system, is_archived",
        )
        .eq("is_system", true)
        .limit(1);

      expect(accountError).toBeNull();
      expect(systemAccounts).toHaveLength(1);

      const systemAccount =
        systemAccounts![0];

      expect(systemAccount.is_system).toBe(true);

      /*
       * SYSTEM ACCOUNT MUST NOT BE ARCHIVED.
       */
      const {
        error: archiveError,
      } = await supabase.rpc(
        "archive_account",
        {
          p_account_id:
            systemAccount.id,
        },
      );

      expect(archiveError).toBeTruthy();

      expect(
        archiveError!.message,
      ).toContain("Account not found");

      /*
       * SYSTEM ACCOUNT MUST NOT BE UNARCHIVED.
       *
       * This should fail whether the system
       * account is currently archived or not.
       */
      const {
        error: unarchiveError,
      } = await supabase.rpc(
        "unarchive_account",
        {
          p_account_id:
            systemAccount.id,
        },
      );

      expect(unarchiveError).toBeTruthy();

      expect(
        unarchiveError!.message,
      ).toContain("Account not found");

      /*
       * SYSTEM ACCOUNT MUST NOT BE PERMANENTLY DELETED.
       */
      const {
        error: deleteError,
      } = await supabase.rpc(
        "delete_account",
        {
          p_account_id:
            systemAccount.id,
        },
      );

      expect(deleteError).toBeTruthy();

      expect(
        deleteError!.message,
      ).toContain(
        "Only archived accounts can be permanently deleted",
      );

      /*
       * FINAL SAFETY CHECK:
       * system account must still exist.
       */
      const {
        data: stillExists,
        error: verifyError,
      } = await supabase
        .from("accounts")
        .select(
          "id, is_system, is_archived",
        )
        .eq(
          "id",
          systemAccount.id,
        )
        .single();

      expect(verifyError).toBeNull();
      expect(stillExists).toBeTruthy();
      expect(stillExists!.is_system).toBe(true);
    },
  );
});


