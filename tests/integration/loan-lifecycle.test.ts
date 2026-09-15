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

type Account = {
  id: string;
  currency: string;
};

type LoanBalance = {
  id: string;
  person_name: string;
  loan_type: string;
  principal_amount: number;
  repaid_amount: number;
  remaining_amount: number;
  currency: string;
  status: string;
};

async function getAccount(): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, currency")
    .eq("is_system", false)
    .eq("is_archived", false)
    .in("account_type", ["asset", "liability"])
    .limit(1)
    .single();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as Account;
}

describe("loan lifecycle", () => {
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

  it("creates, repays, updates, cancels repayment, and cancels loan", async () => {
    const account = await getAccount();

    /*
     * CREATE LOAN
     */
    const {
      data: loanId,
      error: loanError,
    } = await supabase.rpc(
      "create_loan_with_transaction",
      {
        p_person_name:
          "Automated Loan Lifecycle Test",
        p_loan_type: "lent",
        p_principal_amount: 100,
        p_currency: account.currency,
        p_start_datetime:
          new Date().toISOString(),
        p_source_account_id:
          account.id,
        p_due_date: null,
        p_description:
          "Automated loan lifecycle test",
        p_whatsapp_number: null,
      },
    );

    expect(loanError).toBeNull();
    expect(loanId).toBeTruthy();

    /*
     * VERIFY CREATED LOAN
     */
    let loans: LoanBalance[] | null = null;
    let error: unknown = null;

    ({ data: loans, error } =
      await supabase.rpc(
        "get_loan_balances",
      ));

    expect(error).toBeNull();

    let loan = loans?.find(
      (item) => item.id === loanId,
    );

    expect(loan).toBeTruthy();
    expect(
      Number(loan!.principal_amount),
    ).toBe(100);
    expect(
      Number(loan!.repaid_amount),
    ).toBe(0);
    expect(
      Number(loan!.remaining_amount),
    ).toBe(100);
    expect(loan!.status).toBe("active");

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

    const repaymentTransactionId =
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
      Number(loan!.repaid_amount),
    ).toBe(30);
    expect(
      Number(loan!.remaining_amount),
    ).toBe(70);
    expect(loan!.status).toBe("active");

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
      Number(loan!.repaid_amount),
    ).toBe(50);
    expect(
      Number(loan!.remaining_amount),
    ).toBe(50);
    expect(loan!.status).toBe("active");

    /*
     * EDGE CASE:
     * NaN / Infinity repayment amounts
     */
    const specialAmounts = [
      "NaN",
      "Infinity",
      "-Infinity",
    ];

    for (const amount of specialAmounts) {
      const {
        data: specialData,
        error: specialError,
      } = await supabase.rpc(
        "update_loan_repayment",
        {
          p_transaction_id:
            repaymentTransactionId,
          p_amount: amount,
          p_account_id: account.id,
          p_payment_datetime:
            new Date().toISOString(),
          p_description:
            `Invalid repayment amount: ${amount}`,
        },
      );

      expect(specialData).toBeNull();
      expect(specialError).toBeTruthy();
      expect(specialError!.message).toContain(
        "finite number greater than zero",
      );
    }

    /*
     * VERIFY INVALID UPDATES
     * DID NOT DAMAGE THE ORIGINAL
     * 50 BDT REPAYMENT
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
      Number(loan!.repaid_amount),
    ).toBe(50);
    expect(
      Number(loan!.remaining_amount),
    ).toBe(50);
    expect(loan!.status).toBe("active");

    /*
     * CANCEL REPAYMENT
     */
    const {
      data: repaymentReversalId,
      error: cancelRepaymentError,
    } = await supabase.rpc(
      "cancel_loan_repayment",
      {
        p_transaction_id:
          repaymentTransactionId,
      },
    );

    expect(cancelRepaymentError).toBeNull();
    expect(repaymentReversalId).toBeTruthy();

    /*
     * VERIFY REPAYMENT CANCELLED
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
      Number(loan!.repaid_amount),
    ).toBe(0);
    expect(
      Number(loan!.remaining_amount),
    ).toBe(100);
    expect(loan!.status).toBe("active");

    /*
     * CANCEL LOAN
     */
    const { error: cancelLoanError } =
      await supabase.rpc(
        "cancel_loan",
        {
          p_loan_id: loanId,
        },
      );

    expect(cancelLoanError).toBeNull();

    /*
     * VERIFY LOAN CANCELLED
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
    expect(loan!.status).toBe("cancelled");
  });
});