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
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
}

if (!email || !password) {
  throw new Error(
    "Missing PLAYWRIGHT_TEST_EMAIL or PLAYWRIGHT_TEST_PASSWORD",
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

describe("loan lifecycle", () => {
  it("creates, repays, updates, cancels repayment, and cancels loan", async () => {
    let loanId: string | null = null;
    let repaymentTransactionId: string | null = null;

    try {
      /*
       * Find a normal BDT asset account.
       */
      const {
        data: accounts,
        error: accountError,
      } = await supabase
        .from("accounts")
        .select(
          "id, name, currency, account_type, is_system, is_archived",
        )
        .eq("currency", "BDT")
        .eq("account_type", "asset")
        .eq("is_system", false)
        .eq("is_archived", false)
        .limit(1);

      expect(accountError).toBeNull();
      expect(accounts).toHaveLength(1);

      const account = accounts![0];

      /*
       * CREATE LOAN
       */
      const personName =
        `Automated Test ${Date.now()}`;

      const {
        data: createdLoanId,
        error: createError,
      } = await supabase.rpc(
        "create_loan_with_transaction",
        {
          p_person_name: personName,
          p_loan_type: "lent",
          p_principal_amount: 100,
          p_currency: "BDT",
          p_start_datetime:
            new Date().toISOString(),
          p_source_account_id: account.id,
          p_due_date: null,
          p_description:
            "Automated integration test",
          p_whatsapp_number: null,
        },
      );

      expect(createError).toBeNull();
      expect(createdLoanId).toBeTruthy();

      loanId = createdLoanId;

      /*
       * VERIFY INITIAL BALANCE
       */
      let { data: loans, error } =
        await supabase.rpc(
          "get_loan_balances",
        );

      expect(error).toBeNull();

      let loan = loans?.find(
        (item) => item.id === loanId,
      );

      expect(loan).toBeTruthy();
      expect(
        Number(loan.remaining_amount),
      ).toBe(100);
      expect(
        Number(loan.repaid_amount),
      ).toBe(0);
      expect(loan.status).toBe("active");

      /*
       * REPAY 30
       */
      const {
        data: repaymentId,
        error: repaymentError,
      } = await supabase.rpc(
        "record_loan_repayment",
        {
          p_loan_id: loanId,
          p_amount: 30,
          p_account_id: account.id,
          p_payment_datetime:
            new Date().toISOString(),
          p_description:
            "Automated repayment test",
        },
      );

      expect(repaymentError).toBeNull();
      expect(repaymentId).toBeTruthy();

      repaymentTransactionId =
        repaymentId;

      /*
       * VERIFY 30 REPAID
       */
      ({ data: loans, error } =
        await supabase.rpc(
          "get_loan_balances",
        ));

      expect(error).toBeNull();

      loan = loans?.find(
        (item) => item.id === loanId,
      );

      expect(loan).toBeTruthy();
      expect(
        Number(loan.repaid_amount),
      ).toBe(30);
      expect(
        Number(loan.remaining_amount),
      ).toBe(70);
      expect(loan.status).toBe("active");

      /*
       * UPDATE REPAYMENT: 30 → 50
       */
      const {
        error: updateError,
      } = await supabase.rpc(
        "update_loan_repayment",
        {
          p_transaction_id:
            repaymentTransactionId,
          p_amount: 50,
          p_account_id: account.id,
          p_payment_datetime:
            new Date().toISOString(),
          p_description:
            "Updated automated repayment",
        },
      );

      expect(updateError).toBeNull();

      /*
       * VERIFY 50 REPAID
       */
      ({ data: loans, error } =
        await supabase.rpc(
          "get_loan_balances",
        ));

      expect(error).toBeNull();

      loan = loans?.find(
        (item) => item.id === loanId,
      );

      expect(loan).toBeTruthy();
      expect(
        Number(loan.repaid_amount),
      ).toBe(50);
      expect(
        Number(loan.remaining_amount),
      ).toBe(50);
      expect(loan.status).toBe("active");

      /*
       * CANCEL REPAYMENT
       */
      const {
        data: reversalId,
        error: cancelRepaymentError,
      } = await supabase.rpc(
        "cancel_loan_repayment",
        {
          p_transaction_id:
            repaymentTransactionId,
        },
      );

      expect(
        cancelRepaymentError,
      ).toBeNull();

      expect(reversalId).toBeTruthy();

      /*
       * VERIFY REPAYMENT WAS REVERSED
       */
      ({ data: loans, error } =
        await supabase.rpc(
          "get_loan_balances",
        ));

      expect(error).toBeNull();

      loan = loans?.find(
        (item) => item.id === loanId,
      );

      expect(loan).toBeTruthy();
      expect(
        Number(loan.repaid_amount),
      ).toBe(0);
      expect(
        Number(loan.remaining_amount),
      ).toBe(100);
      expect(loan.status).toBe("active");

      /*
       * CANCEL LOAN
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
       * VERIFY CANCELLED
       */
      ({ data: loans, error } =
        await supabase.rpc(
          "get_loan_balances",
        ));

      expect(error).toBeNull();

      loan = loans?.find(
        (item) => item.id === loanId,
      );

      expect(loan).toBeTruthy();
      expect(loan.status).toBe(
        "cancelled",
      );
    } finally {
      /*
       * Safety cleanup.
       *
       * Normally the test has already cancelled
       * the loan. If it failed earlier, attempt
       * to cancel the loan only when possible.
       */
      if (loanId) {
        const {
          data: remainingLoans,
        } = await supabase.rpc(
          "get_loan_balances",
        );

        const loan =
          remainingLoans?.find(
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
