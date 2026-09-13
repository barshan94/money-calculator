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

describe("loan settlement lifecycle", () => {
  it("settles a loan and safely returns it to active", async () => {
    let loanId: string | null = null;
    let repaymentId: string | null = null;

    try {
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
       * CREATE 100 BDT LOAN
       */
      const {
        data: createdLoanId,
        error: createError,
      } = await supabase.rpc(
        "create_loan_with_transaction",
        {
          p_person_name:
            `Settlement Test ${Date.now()}`,
          p_loan_type: "lent",
          p_principal_amount: 100,
          p_currency: "BDT",
          p_start_datetime:
            new Date().toISOString(),
          p_source_account_id: account.id,
          p_due_date: null,
          p_description:
            "Automated settlement test",
          p_whatsapp_number: null,
        },
      );

      expect(createError).toBeNull();
      expect(createdLoanId).toBeTruthy();

      loanId = createdLoanId;

      /*
       * REPAY ENTIRE LOAN
       */
      const {
        data: createdRepaymentId,
        error: repaymentError,
      } = await supabase.rpc(
        "record_loan_repayment",
        {
          p_loan_id: loanId,
          p_amount: 100,
          p_account_id: account.id,
          p_payment_datetime:
            new Date().toISOString(),
          p_description:
            "Full repayment test",
        },
      );

      expect(repaymentError).toBeNull();
      expect(createdRepaymentId).toBeTruthy();

      repaymentId = createdRepaymentId;

      /*
       * VERIFY SETTLED
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
        Number(loan.principal_amount),
      ).toBe(100);
      expect(
        Number(loan.repaid_amount),
      ).toBe(100);
      expect(
        Number(loan.remaining_amount),
      ).toBe(0);
      expect(loan.status).toBe("settled");

      /*
       * SETTLED LOAN CANNOT BE CANCELLED
       */
      const {
        error: cancelSettledError,
      } = await supabase.rpc(
        "cancel_loan",
        {
          p_loan_id: loanId,
        },
      );

      expect(
        cancelSettledError,
      ).not.toBeNull();

      expect(
        cancelSettledError?.message,
      ).toContain(
        "Settled loan cannot be cancelled",
      );

      /*
       * CANCEL THE FULL REPAYMENT
       *
       * This should restore the loan to active.
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

      /*
       * VERIFY ACTIVE AGAIN
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
       * NOW THE LOAN CAN BE CANCELLED.
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
       * Safety cleanup if the test fails
       * before normal cancellation.
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
