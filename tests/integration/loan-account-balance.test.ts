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
  expect(data).toBeTruthy();

  const account = data?.find(
    (item) => item.id === accountId,
  );

  expect(account).toBeTruthy();

  return Number(account.balance);
}

describe("loan account balance integrity", () => {
  it("restores the account balance after a lent loan is fully reversed", async () => {
    let loanId: string | null = null;
    let repaymentId: string | null = null;

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
      .limit(1);

    expect(accountError).toBeNull();
    expect(accounts).toHaveLength(1);

    const account = accounts![0];

    const initialBalance =
      await getAccountBalance(account.id);

    try {
      /*
       * Create lent loan.
       */
      const {
        data: createdLoanId,
        error: createError,
      } = await supabase.rpc(
        "create_loan_with_transaction",
        {
          p_person_name:
            `Balance Test ${Date.now()}`,
          p_loan_type: "lent",
          p_principal_amount: 100,
          p_currency: "BDT",
          p_start_datetime:
            new Date().toISOString(),
          p_source_account_id: account.id,
          p_due_date: null,
          p_description:
            "Account balance integration test",
          p_whatsapp_number: null,
        },
      );

      expect(createError).toBeNull();
      expect(createdLoanId).toBeTruthy();

      loanId = createdLoanId;

      /*
       * Lending 100 reduces the source
       * account by 100.
       */
      const afterLoan =
        await getAccountBalance(account.id);

      expect(afterLoan).toBe(
        initialBalance - 100,
      );

      /*
       * Receive 40 repayment.
       */
      const {
        data: repaymentTransactionId,
        error: repaymentError,
      } = await supabase.rpc(
        "record_loan_repayment",
        {
          p_loan_id: loanId,
          p_amount: 40,
          p_account_id: account.id,
          p_payment_datetime:
            new Date().toISOString(),
          p_description:
            "Balance repayment test",
        },
      );

      expect(repaymentError).toBeNull();
      expect(repaymentTransactionId).toBeTruthy();

      repaymentId =
        repaymentTransactionId;

      const afterRepayment =
        await getAccountBalance(account.id);

      expect(afterRepayment).toBe(
        initialBalance - 60,
      );

      /*
       * Reverse the repayment.
       */
      const {
        error: cancelRepaymentError,
      } = await supabase.rpc(
        "cancel_loan_repayment",
        {
          p_transaction_id: repaymentId,
        },
      );

      expect(
        cancelRepaymentError,
      ).toBeNull();

      const afterRepaymentReversal =
        await getAccountBalance(account.id);

      expect(
        afterRepaymentReversal,
      ).toBe(initialBalance - 100);

      /*
       * Cancel the original loan.
       */
      const {
        error: cancelLoanError,
      } = await supabase.rpc(
        "cancel_loan",
        {
          p_loan_id: loanId,
        },
      );

      expect(
        cancelLoanError,
      ).toBeNull();

      /*
       * The entire ledger should now be
       * restored to its original balance.
       */
      const finalBalance =
        await getAccountBalance(account.id);

      expect(finalBalance).toBe(
        initialBalance,
      );
    } finally {
      /*
       * Safety cleanup.
       */
      if (loanId) {
        const {
          data: loans,
        } = await supabase.rpc(
          "get_loan_balances",
        );

        const loan = loans?.find(
          (item) => item.id === loanId,
        );

        if (
          loan &&
          loan.status === "active" &&
          Number(loan.repaid_amount) === 0
        ) {
          await supabase.rpc(
            "cancel_loan",
            {
              p_loan_id: loanId,
            },
          );
        }
      }
    }
  });
});
