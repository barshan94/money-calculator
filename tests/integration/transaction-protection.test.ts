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

async function getAccounts() {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, currency")
    .eq("is_system", false)
    .eq("is_archived", false)
    .in("account_type", ["asset", "liability"])
    .limit(3);

  expect(error).toBeNull();
  expect(data).toBeTruthy();
  expect(data!.length).toBeGreaterThanOrEqual(2);

  return data as Account[];
}

describe("transaction protection", () => {
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

  it("rejects editing a cancelled transaction", async () => {
    const accounts = await getAccounts();

    const { data: transactionId, error: createError } =
      await supabase.rpc("create_transaction", {
        p_transaction_date: new Date().toISOString(),
        p_description: "Cancelled edit protection",
        p_reference: null,
        p_notes: null,
        p_entries: [
          {
            account_id: accounts[0].id,
            category_id: null,
            amount: 100,
            entry_type: "debit",
          },
          {
            account_id: accounts[1].id,
            category_id: null,
            amount: 100,
            entry_type: "credit",
          },
        ],
      });

    expect(createError).toBeNull();
    expect(transactionId).toBeTruthy();

    const { error: voidError } =
      await supabase.rpc("void_transaction", {
        p_transaction_id: transactionId,
      });

    expect(voidError).toBeNull();

    const { data, error } =
      await supabase.rpc("update_transaction", {
        p_transaction_id: transactionId,
        p_entries: [
          {
            account_id: accounts[0].id,
            category_id: null,
            amount: 50,
            entry_type: "debit",
          },
          {
            account_id: accounts[1].id,
            category_id: null,
            amount: 50,
            entry_type: "credit",
          },
        ],
        p_transaction_date: new Date().toISOString(),
        p_description: "Should not update",
      });

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error!.message).toContain(
      "Reversed transactions cannot be edited",
    );
  });

  it("rejects editing a reversal transaction", async () => {
    const accounts = await getAccounts();

    const { data: transactionId, error: createError } =
      await supabase.rpc("create_transaction", {
        p_transaction_date: new Date().toISOString(),
        p_description: "Reversal edit protection",
        p_reference: null,
        p_notes: null,
        p_entries: [
          {
            account_id: accounts[0].id,
            category_id: null,
            amount: 100,
            entry_type: "debit",
          },
          {
            account_id: accounts[1].id,
            category_id: null,
            amount: 100,
            entry_type: "credit",
          },
        ],
      });

    expect(createError).toBeNull();
    expect(transactionId).toBeTruthy();

    const { data: reversalId, error: voidError } =
      await supabase.rpc("void_transaction", {
        p_transaction_id: transactionId,
      });

    expect(voidError).toBeNull();
    expect(reversalId).toBeTruthy();

    const { data, error } =
      await supabase.rpc("update_transaction", {
        p_transaction_id: reversalId,
        p_entries: [
          {
            account_id: accounts[0].id,
            category_id: null,
            amount: 50,
            entry_type: "credit",
          },
          {
            account_id: accounts[1].id,
            category_id: null,
            amount: 50,
            entry_type: "debit",
          },
        ],
        p_transaction_date: new Date().toISOString(),
        p_description: "Should not update reversal",
      });

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error!.message).toContain(
      "Cancellation/reversal transactions cannot be edited",
    );
  });

  it("rejects editing an already reversed original transaction", async () => {
    const accounts = await getAccounts();

    const { data: transactionId, error: createError } =
      await supabase.rpc("create_transaction", {
        p_transaction_date: new Date().toISOString(),
        p_description: "Already reversed protection",
        p_reference: null,
        p_notes: null,
        p_entries: [
          {
            account_id: accounts[0].id,
            category_id: null,
            amount: 100,
            entry_type: "debit",
          },
          {
            account_id: accounts[1].id,
            category_id: null,
            amount: 100,
            entry_type: "credit",
          },
        ],
      });

    expect(createError).toBeNull();
    expect(transactionId).toBeTruthy();

    const { error: voidError } =
      await supabase.rpc("void_transaction", {
        p_transaction_id: transactionId,
      });

    expect(voidError).toBeNull();

    const { data, error } =
      await supabase.rpc("update_transaction", {
        p_transaction_id: transactionId,
        p_entries: [
          {
            account_id: accounts[0].id,
            category_id: null,
            amount: 50,
            entry_type: "debit",
          },
          {
            account_id: accounts[1].id,
            category_id: null,
            amount: 50,
            entry_type: "credit",
          },
        ],
        p_transaction_date: new Date().toISOString(),
        p_description:
          "Should not update reversed transaction",
      });

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error!.message).toContain(
      "Reversed transactions cannot be edited",
    );
  });

  it("rejects editing a loan transaction", async () => {
    const accounts = await getAccounts();

    const {
      data: loanId,
      error: loanError,
    } = await supabase.rpc(
      "create_loan_with_transaction",
      {
        p_person_name:
          "Transaction Protection Test",
        p_loan_type: "lent",
        p_principal_amount: 100,
        p_currency: accounts[0].currency,
        p_start_datetime:
          new Date().toISOString(),
        p_source_account_id:
          accounts[0].id,
        p_due_date: null,
        p_description:
          "Transaction protection loan test",
        p_whatsapp_number: null,
      },
    );

    expect(loanError).toBeNull();
    expect(loanId).toBeTruthy();

    const {
      data: loanTransaction,
      error: transactionQueryError,
    } = await supabase
      .from("transactions")
      .select("id, loan_id, loan_transaction_role")
      .eq("loan_id", loanId)
      .eq("loan_transaction_role", "origin")
      .single();

    expect(transactionQueryError).toBeNull();
    expect(loanTransaction?.id).toBeTruthy();

    const { data, error } =
      await supabase.rpc("update_transaction", {
        p_transaction_id:
          loanTransaction!.id,
        p_entries: [
          {
            account_id: accounts[0].id,
            category_id: null,
            amount: 50,
            entry_type: "debit",
          },
          {
            account_id: accounts[1].id,
            category_id: null,
            amount: 50,
            entry_type: "credit",
          },
        ],
        p_transaction_date: new Date().toISOString(),
        p_description:
          "Should not update loan transaction",
      });

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error!.message).toContain(
      "Loan transactions must be edited from the loan record",
    );

    const { error: cancelError } =
      await supabase.rpc("cancel_loan", {
        p_loan_id: loanId,
      });

    expect(cancelError).toBeNull();
  });

  it("rejects voiding a tuition payment through the generic transaction workflow", async () => {
    const accounts = await getAccounts();

    const {
      data: studentId,
      error: studentError,
    } = await supabase.rpc(
      "create_tuition_student",
      {
        p_student_name:
          "Transaction Protection Tuition",
        p_guardian_name: null,
        p_whatsapp_number: null,
        p_monthly_fee: 1000,
        p_due_day: 10,
        p_notes: null,
      },
    );

    expect(studentError).toBeNull();
    expect(studentId).toBeTruthy();

    const paymentMonth =
      new Date().toISOString().slice(0, 7) + "-01";

    const {
      data: transactionId,
      error: paymentError,
    } = await supabase.rpc(
      "record_tuition_payment",
      {
        p_student_id: studentId,
        p_payment_date:
          new Date().toISOString().slice(0, 10),
        p_amount: 400,
        p_payment_month: paymentMonth,
        p_account_id: accounts[0].id,
        p_notes: null,
        p_promised_payment_date: null,
        p_late_reason: null,
      },
    );

    expect(paymentError).toBeNull();
    expect(transactionId).toBeTruthy();

    const {
      data: payment,
      error: paymentQueryError,
    } = await supabase
      .from("tuition_payments")
      .select("id, transaction_id")
      .eq("transaction_id", transactionId)
      .single();

    expect(paymentQueryError).toBeNull();
    expect(payment?.transaction_id).toBe(
      transactionId,
    );

    const { data, error } =
      await supabase.rpc("void_transaction", {
        p_transaction_id: transactionId,
      });

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error!.message).toContain(
      "Tuition payments must be cancelled from the Tuition section",
    );

    const {
      data: transaction,
      error: transactionError,
    } = await supabase
      .from("transactions")
      .select("status")
      .eq("id", transactionId)
      .single();

    expect(transactionError).toBeNull();
    expect(transaction?.status).toBe("posted");

    const {
      error: cancelPaymentError,
    } = await supabase.rpc(
      "cancel_tuition_payment",
      {
        p_payment_id: payment!.id,
      },
    );

    expect(cancelPaymentError).toBeNull();

    const {
      error: archiveError,
    } = await supabase.rpc(
      "update_tuition_student",
      {
        p_student_id: studentId,
        p_is_active: false,
      },
    );

    if (archiveError) {
      await supabase.rpc(
        "archive_tuition_student",
        {
          p_student_id: studentId,
        },
      );
    }
  });

  it("prevents duplicate posted reversals", async () => {
    const accounts = await getAccounts();

    const {
      data: transactionId,
      error: createError,
    } = await supabase.rpc(
      "create_transaction",
      {
        p_transaction_date:
          new Date().toISOString(),
        p_description:
          "Duplicate reversal protection test",
        p_reference: null,
        p_notes: null,
        p_entries: [
          {
            account_id: accounts[0].id,
            category_id: null,
            amount: 100,
            entry_type: "debit",
          },
          {
            account_id: accounts[1].id,
            category_id: null,
            amount: 100,
            entry_type: "credit",
          },
        ],
      },
    );

    expect(createError).toBeNull();
    expect(transactionId).toBeTruthy();

    const {
      data: firstReversalId,
      error: firstVoidError,
    } = await supabase.rpc("void_transaction", {
      p_transaction_id: transactionId,
    });

    expect(firstVoidError).toBeNull();
    expect(firstReversalId).toBeTruthy();

    const {
      data: secondReversalId,
      error: secondVoidError,
    } = await supabase.rpc("void_transaction", {
      p_transaction_id: transactionId,
    });

    expect(secondReversalId).toBeNull();
    expect(secondVoidError).toBeTruthy();
    expect(secondVoidError!.message).toContain(
      "already been cancelled",
    );

    const {
      data: reversals,
      error: reversalQueryError,
    } = await supabase
      .from("transactions")
      .select(
        "id, status, reversal_of_id",
      )
      .eq(
        "reversal_of_id",
        transactionId,
      )
      .eq("status", "posted");

    expect(reversalQueryError).toBeNull();
    expect(reversals).toHaveLength(1);
    expect(reversals![0].id).toBe(
      firstReversalId,
    );
  });
});