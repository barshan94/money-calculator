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

const fakeId =
  "00000000-0000-0000-0000-000000000000";

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

describe("authorization boundaries", () => {
  it(
    "rejects forged account IDs through account RPCs",
    async () => {
      const update =
        await supabase.rpc(
          "update_account",
          {
            p_account_id: fakeId,
            p_name:
              "Unauthorized Account",
            p_account_type: "asset",
            p_currency: "BDT",
            p_liquidity_class:
              "immediate",
          },
        );

      expect(update.data).toBeNull();
      expect(update.error).toBeTruthy();

      const archive =
        await supabase.rpc(
          "archive_account",
          {
            p_account_id: fakeId,
          },
        );

      expect(archive.data).toBeNull();
      expect(archive.error).toBeTruthy();

      const deleteResult =
        await supabase.rpc(
          "delete_account",
          {
            p_account_id: fakeId,
          },
        );

      expect(deleteResult.data).toBeNull();
      expect(
        deleteResult.error,
      ).toBeTruthy();
    },
  );

  it(
    "rejects forged IDs across loan, deposit, investment, and asset RPCs",
    async () => {
      const loan =
        await supabase.rpc(
          "cancel_loan",
          {
            p_loan_id: fakeId,
          },
        );

      expect(loan.data).toBeNull();
      expect(loan.error).toBeTruthy();

      const deposit =
        await supabase.rpc(
          "update_deposit",
          {
            p_deposit_id: fakeId,
            p_name:
              "Unauthorized Deposit",
            p_interest_rate: 10,
            p_maturity_amount: 1000,
            p_maturity_date: null,
            p_description: null,
          },
        );

      expect(deposit.data).toBeNull();
      expect(
        deposit.error,
      ).toBeTruthy();

      const investment =
        await supabase.rpc(
          "update_investment",
          {
            p_investment_id: fakeId,
            p_name:
              "Unauthorized Investment",
            p_description: null,
          },
        );

      expect(
        investment.data,
      ).toBeNull();
      expect(
        investment.error,
      ).toBeTruthy();

      const asset =
        await supabase.rpc(
          "update_long_term_asset",
          {
            p_asset_id: fakeId,
            p_name:
              "Unauthorized Asset",
            p_asset_type: "other",
            p_description: null,
          },
        );

      expect(asset.data).toBeNull();
      expect(
        asset.error,
      ).toBeTruthy();
    },
  );

  it(
    "prevents direct insertion into protected financial tables",
    async () => {
      const loanInsert =
        await supabase
          .from("loans")
          .insert({
            user_id:
              "00000000-0000-0000-0000-000000000001",
            person_name:
              "Unauthorized",
            loan_type: "lent",
            principal_amount: 100,
            currency: "BDT",
            start_date:
              new Date().toISOString(),
          });

      expect(
        loanInsert.error,
      ).toBeTruthy();

      const depositInsert =
        await supabase
          .from("deposits")
          .insert({
            user_id:
              "00000000-0000-0000-0000-000000000001",
            name: "Unauthorized",
            deposit_type: "savings",
            principal_amount: 100,
            currency: "BDT",
            start_date:
              new Date()
                .toISOString()
                .slice(0, 10),
          });

      expect(
        depositInsert.error,
      ).toBeTruthy();

      const assetInsert =
        await supabase
          .from("long_term_assets")
          .insert({
            user_id:
              "00000000-0000-0000-0000-000000000001",
            name: "Unauthorized",
            asset_type: "other",
            currency: "BDT",
            purchase_date:
              new Date()
                .toISOString()
                .slice(0, 10),
            purchase_price: 100,
            acquisition_cost: 0,
            current_value: 100,
          });

      expect(
        assetInsert.error,
      ).toBeTruthy();
    },
  );

  it(
    "does not allow direct account ownership changes",
    async () => {
      const {
        data: accounts,
        error,
      } = await supabase
        .from("accounts")
        .select("id, user_id")
        .eq("is_system", false)
        .eq("is_archived", false)
        .limit(1);

      expect(error).toBeNull();
      expect(accounts).toHaveLength(1);

      const account = accounts![0];
      const originalUserId =
        account.user_id;

      const forgedUserId =
        "00000000-0000-0000-0000-000000000001";

      const result =
        await supabase
          .from("accounts")
          .update({
            user_id: forgedUserId,
          })
          .eq("id", account.id);

      /*
       * Supabase may return no error when
       * RLS silently prevents the UPDATE.
       * Therefore verify the actual stored value.
       */
      expect(result.error).toBeNull();

      const {
        data: verify,
        error: verifyError,
      } = await supabase
        .from("accounts")
        .select("user_id")
        .eq("id", account.id)
        .single();

      expect(verifyError).toBeNull();
      expect(verify).toBeTruthy();

      expect(verify!.user_id).toBe(
        originalUserId,
      );

      /*
       * If the forged ID was actually stored,
       * this is a genuine security failure.
       */
      expect(verify!.user_id).not.toBe(
        forgedUserId,
      );
    },
  );
});