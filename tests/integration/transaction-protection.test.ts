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

async function createNormalTransaction(
  accounts: Account[],
) {
  const { data, error } =
    await supabase.rpc(
      "create_transaction",
      {
        p_transaction_date:
          new Date().toISOString(),
        p_description:
          "Protection test transaction",
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

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as string;
}

async function expectUpdateRejected(
  transactionId: string,
  accounts: Account[],
  expectedMessage: string,
) {
  const { data, error } =
    await supabase.rpc(
      "update_transaction",
      {
        p_transaction_id: transactionId,
        p_entries: [
          {
            account_id: accounts[0].id,
            category_id: null,
            amount: 200,
            entry_type: "debit",
          },
          {
            account_id: accounts[1].id,
            category_id: null,
            amount: 200,
            entry_type: "credit",
          },
        ],
        p_transaction_date:
          new Date().toISOString(),
        p_description:
          "Should not be editable",
      },
    );

  expect(data).toBeNull();
  expect(error).toBeTruthy();
  expect(error!.message).toContain(
    expectedMessage,
  );
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

if (error) {
  console.log("AUTH ERROR:", error.message);
}

expect(error).toBeNull();
    

    expect(error).toBeNull();
  });

  it(
    "rejects editing a cancelled transaction",
    async () => {
      const accounts = await getAccounts();

      const transactionId =
        await createNormalTransaction(
          accounts,
        );

      const {
        data: reversalId,
        error: voidError,
      } = await supabase.rpc(
        "void_transaction",
        {
          p_transaction_id: transactionId,
        },
      );

      expect(voidError).toBeNull();
      expect(reversalId).toBeTruthy();

      await expectUpdateRejected(
        transactionId,
        accounts,
        "Reversed transactions cannot be edited",
      );
    },
  );

  it(
    "rejects editing a reversal transaction",
    async () => {
      const accounts = await getAccounts();

      const transactionId =
        await createNormalTransaction(
          accounts,
        );

      const {
        data: reversalId,
        error: voidError,
      } = await supabase.rpc(
        "void_transaction",
        {
          p_transaction_id: transactionId,
        },
      );

      expect(voidError).toBeNull();
      expect(reversalId).toBeTruthy();

      await expectUpdateRejected(
        reversalId,
        accounts,
        "Cancellation/reversal transactions cannot be edited",
      );
    },
  );

  it(
    "rejects editing an already reversed original",
    async () => {
      const accounts = await getAccounts();

      const transactionId =
        await createNormalTransaction(
          accounts,
        );

      const {
        error: firstVoidError,
      } = await supabase.rpc(
        "void_transaction",
        {
          p_transaction_id: transactionId,
        },
      );

      expect(firstVoidError).toBeNull();

      await expectUpdateRejected(
        transactionId,
        accounts,
        "Reversed transactions cannot be edited",
      );
    },
  );

  it(
    "rejects editing a loan transaction",
    async () => {
      const accounts = await getAccounts();

      const loanAccount =
        accounts.find(
          (account) =>
            account.currency === "BDT",
        );

      expect(loanAccount).toBeTruthy();

      const {
        data: loanId,
        error: loanError,
      } = await supabase.rpc(
        "create_loan_with_transaction",
        {
          p_person_name:
            `Protection Test ${Date.now()}`,
          p_loan_type: "lent",
          p_principal_amount: 100,
          p_currency: "BDT",


          p_start_datetime:
  new Date().toISOString(),
          
          p_source_account_id:
            loanAccount!.id,
          p_due_date: null,
          p_description:
            "Transaction protection test",
          p_whatsapp_number: null,
        },
      );

      expect(loanError).toBeNull();
      expect(loanId).toBeTruthy();

      const {
        data: loanTransactions,
        error:
          transactionError,
      } = await supabase
        .from("transactions")
        .select("id")
        .eq("loan_id", loanId)
        .eq("status", "posted");

      expect(transactionError).toBeNull();
      expect(
        loanTransactions,
      ).toHaveLength(1);

      await expectUpdateRejected(
        loanTransactions![0].id,
        accounts,
        "Loan transactions must be edited from the loan record",
      );

      /*
       * Clean up the test loan through the
       * normal loan workflow.
       */
      const { error: cancelError } =
        await supabase.rpc(
          "cancel_loan",
          {
            p_loan_id: loanId,
          },
        );

      expect(cancelError).toBeNull();
    },
  );

  it(
    "rejects voiding a tuition payment through the generic transaction workflow",
    async () => {
      const accounts = await getAccounts();

      const tuitionAccount = accounts.find(
  (account) => account.currency === "BDT",
);

      

      expect(tuitionAccount).toBeTruthy();

      const {
        data: studentId,
        error: studentError,
      } = await supabase.rpc(
        "create_tuition_student",
        {
          p_student_name: `Protection Tuition ${Date.now()}`,
          p_guardian_name: "Protection Guardian",
          p_whatsapp_number: null,
          p_monthly_fee: 1000,
          p_due_day: 10,
          p_notes: "Transaction protection test",
        },
      );

      expect(studentError).toBeNull();
      expect(studentId).toBeTruthy();

      const month =
        new Date().toISOString().slice(0, 7) + "-01";

      const {
        data: transactionId,
        error: paymentError,
      } = await supabase.rpc(
        "record_tuition_payment",
        {
          p_student_id: studentId,
          p_payment_month: month,
          p_amount: 400,
          p_payment_date: new Date()
            .toISOString()
            .slice(0, 10),
          p_account_id: tuitionAccount.id,
          p_notes: "Protection test payment",
          p_promised_payment_date: null,
          p_late_reason: null,
        },
      );

      expect(paymentError).toBeNull();
      expect(transactionId).toBeTruthy();

      const {
        data: voidResult,
        error: voidError,
      } = await supabase.rpc(
        "void_transaction",
        {
          p_transaction_id: transactionId,
        },
      );

      expect(voidResult).toBeNull();
      expect(voidError).not.toBeNull();
      expect(voidError.message).toContain(
        "Tuition payments must be cancelled from the Tuition section",
      );

      const {
        data: transaction,
        error: transactionCheckError,
      } = await supabase
        .from("transactions")
        .select("id, status")
        .eq("id", transactionId)
        .single();

      expect(transactionCheckError).toBeNull();
      expect(transaction).toEqual({
        id: transactionId,
        status: "posted",
      });

      const {
        data: payment,
        error: paymentLookupError,
      } = await supabase
        .from("tuition_payments")
        .select("id")
        .eq("transaction_id", transactionId)
        .single();

      expect(paymentLookupError).toBeNull();
      expect(payment).toBeTruthy();

      const {
        error: cancelPaymentError,
      } = await supabase.rpc(
        "cancel_tuition_payment",
        {
          p_payment_id: payment.id,
        },
      );

      expect(cancelPaymentError).toBeNull();

      const {
        error: archiveError,
      } = await supabase.rpc(
        "archive_tuition_student",
        {
          p_student_id: studentId,
        },
      );

      expect(archiveError).toBeNull();
    },
  );

});

