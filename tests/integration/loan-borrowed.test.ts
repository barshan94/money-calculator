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

describe("borrowed loan lifecycle", () => {
  it("creates, repays, settles, reverses, and cancels a borrowed loan", async () => {
    let loanId: string | null = null;
    let firstRepaymentId: string | null = null;
    let secondRepaymentId: string | null = null;

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

      /*
       * CREATE BORROWED LOAN
       */
      const {
        data: createdLoanId,
        error: createError,
      } = await supabase.rpc(
        "create_loan_with_transaction",
        {
          p_person_name:
            `Borrowed Test ${Date.now()}`,
          p_loan_type: "borrowed",
          p_principal_amount: 100,
          p_currency: "BDT",
          p_start_datetime:
            new Date().toISOString(),
          p_source_account_id: account.id,
          p_due_date: null,
          p_description:
            "Automated borrowed loan test",
          p_whatsapp_number: null,
        },
      );

      expect(createError).toBeNull();
      expect(createdLoanId).toBeTruthy();

      loanId = createdLoanId;

      /*
       * VERIFY INITIAL STATE
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
      expect(loan.loan_type).toBe(
        "borrowed",
      );
      expect(
        Number(loan.principal_amount),
      ).toBe(100);
      expect(
        Number(loan.repaid_amount),
      ).toBe(0);
      expect(
        Number(loan.remaining_amount),
      ).toBe(100);
      expect(loan.status).toBe("active");

      /*
       * REPAY 40
       */
      const {
        data: firstRepayment,
        error: firstRepaymentError,
      } = await supabase.rpc(
        "record_loan_repayment",
        {
          p_loan_id: loanId,
          p_amount: 40,
          p_account_id: account.id,
          p_payment_datetime:
            new Date().toISOString(),
          p_description:
            "Borrowed repayment 40",
        },
      );

      expect(
        firstRepaymentError,
      ).toBeNull();

      expect(firstRepayment).toBeTruthy();

      firstRepaymentId =
        firstRepayment;

      /*
       * VERIFY 40 REPAID
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
      ).toBe(40);
      expect(
        Number(loan.remaining_amount),
      ).toBe(60);
      expect(loan.status).toBe("active");

      /*
       * REPAY REMAINING 60
       */
      const {
        data: secondRepayment,
        error: secondRepaymentError,
      } = await supabase.rpc(
        "record_loan_repayment",
        {
          p_loan_id: loanId,
          p_amount: 60,
          p_account_id: account.id,
          p_payment_datetime:
            new Date().toISOString(),
          p_description:
            "Borrowed repayment 60",
        },
      );

      expect(
        secondRepaymentError,
      ).toBeNull();

      expect(secondRepayment).toBeTruthy();

      secondRepaymentId =
        secondRepayment;

      /*
       * VERIFY SETTLED
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
      ).toBe(100);
      expect(
        Number(loan.remaining_amount),
      ).toBe(0);
      expect(loan.status).toBe("settled");

      /*
       * CANCEL SECOND REPAYMENT.
       *
       * This should return the loan to active
       * with 40 already repaid.
       */
      const {
        error: cancelSecondError,
      } = await supabase.rpc(
        "cancel_loan_repayment",
        {
          p_transaction_id:
            secondRepaymentId,
        },
      );

      expect(
        cancelSecondError,
      ).toBeNull();

      /*
       * VERIFY 40 REMAINING
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
      ).toBe(40);
      expect(
        Number(loan.remaining_amount),
      ).toBe(60);
      expect(loan.status).toBe("active");

      /*
       * CANCEL FIRST REPAYMENT.
       */
      const {
        error: cancelFirstError,
      } = await supabase.rpc(
        "cancel_loan_repayment",
        {
          p_transaction_id:
            firstRepaymentId,
        },
      );

      expect(
        cancelFirstError,
      ).toBeNull();

      /*
       * VERIFY FULL RESTORATION
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
