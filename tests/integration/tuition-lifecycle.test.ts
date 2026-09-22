
import { beforeAll, describe, expect, it } from "vitest";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const email = process.env.PLAYWRIGHT_TEST_EMAIL!;
const password = process.env.PLAYWRIGHT_TEST_PASSWORD!;

let supabase: SupabaseClient;

type AccountBalanceRow = {
  id: string;
  balance: number | string;
};

type TuitionStatusRow = {
  student_id: string;
  payment_status: string;
  paid_amount: number | string;
  remaining_amount: number | string;
};

type TuitionPaymentRow = {
  id: string;
  transaction_id: string;
  amount: number | string;
  status: string;
};

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

  const account = (
    data as AccountBalanceRow[] | null
  )?.find(
    (row) => row.id === accountId,
  );

  expect(account).toBeTruthy();

  return Number(account!.balance);
}

async function getStudentStatus(
  studentId: string,
  month: string,
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_tuition_monthly_status",
    {
      p_month: month,
    },
  );

  expect(error).toBeNull();

  const student = (
    data as TuitionStatusRow[] | null
  )?.find(
    (row) => row.student_id === studentId,
  );

  expect(student).toBeTruthy();

  return student!;
}

async function getPaymentByTransaction(
  transactionId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from("tuition_payments")
    .select(
      "id, transaction_id, amount, status",
    )
    .eq(
      "transaction_id",
      transactionId,
    )
    .single();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as TuitionPaymentRow;
}

describe("tuition lifecycle", () => {
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
  "creates, edits, cancels, settles, and reverses tuition payments",
  async () => {
      const studentName =
        `Automated Tuition ${Date.now()}`;

      /*
       * Find a real user-owned BDT asset account.
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
       * Capture the real balance before the test.
       */
      const initialBalance =
        await getAccountBalance(
          account.id,
        );

      /*
       * Current month.
       */
      const month =
        new Date().toISOString().slice(0, 7) +
        "-01";

      const paymentDate =
        new Date()
          .toISOString()
          .slice(0, 10);

      /*
       * CREATE STUDENT
       */
      const {
        data: studentId,
        error: createError,
      } = await supabase.rpc(
        "create_tuition_student",
        {
          p_student_name: studentName,
          p_guardian_name:
            "Automated Guardian",
          p_whatsapp_number: null,
          p_monthly_fee: 1000,
          p_due_day: 10,
          p_notes: "Automated test",
        },
      );

      expect(createError).toBeNull();
      expect(studentId).toBeTruthy();

      /*
       * BEFORE PAYMENT
       */
      const initialStatus =
        await getStudentStatus(
          studentId,
          month,
        );

      expect(
        initialStatus.payment_status,
      ).toBe("unpaid");

      expect(
        Number(initialStatus.paid_amount),
      ).toBe(0);

      expect(
        Number(initialStatus.remaining_amount),
      ).toBe(1000);

      /*
       * STUDENT CREATION MUST NOT CHANGE
       * THE FINANCIAL ACCOUNT.
       */
      expect(
        await getAccountBalance(
          account.id,
        ),
      ).toBe(initialBalance);

      /*
       * RECORD 400 BDT PARTIAL PAYMENT
       *
       * record_tuition_payment returns
       * the transaction ID.
       */
      const {
        data: firstTransactionId,
        error: paymentError,
      } = await supabase.rpc(
        "record_tuition_payment",
        {
          p_student_id: studentId,
          p_payment_month: month,
          p_amount: 400,
          p_payment_date: paymentDate,
          p_account_id: account.id,
          p_notes:
            "Automated partial payment",
          p_promised_payment_date: null,
          p_late_reason: null,
        },
      );

      expect(paymentError).toBeNull();
      expect(firstTransactionId).toBeTruthy();

      /*
       * Resolve the tuition payment row.
       */
      const firstPayment =
        await getPaymentByTransaction(
          firstTransactionId,
        );

      expect(
        Number(firstPayment.amount),
      ).toBe(400);

      expect(
        firstPayment.status,
      ).toBe("posted");

      /*
       * 400 / 1000 => PARTIAL
       */
      const partialStatus =
        await getStudentStatus(
          studentId,
          month,
        );

      expect(
        partialStatus.payment_status,
      ).toBe("partial");

      expect(
        Number(partialStatus.paid_amount),
      ).toBe(400);

      expect(
        Number(partialStatus.remaining_amount),
      ).toBe(600);

      /*
       * ACCOUNT +400
       */
      expect(
        await getAccountBalance(
          account.id,
        ),
      ).toBe(initialBalance + 400);

      /*
       * PAYMENT HISTORY
       */
      const {
        data: historyAfterPartial,
        error:
          historyAfterPartialError,
      } = await supabase.rpc(
        "get_tuition_payment_history",
        {
          p_student_id: studentId,
        },
      );

      expect(
        historyAfterPartialError,
      ).toBeNull();

      expect(historyAfterPartial).toBeTruthy();

      const partialHistoryPayment =
        historyAfterPartial?.find(
          (row: {
            amount: number | string;
          }) =>
            Number(row.amount) === 400,
        );

      expect(
        partialHistoryPayment,
      ).toBeTruthy();


      /*
       * INVALID EDIT: 400 -> 1100
       *
       * Monthly fee is 1000 BDT.
       * This must fail and leave the original
       * payment and account balance unchanged.
       */
      const {
        data: invalidUpdateTransactionId,
        error: invalidUpdateError,
      } = await supabase.rpc(
        "update_tuition_payment",
        {
          p_payment_id:
            firstPayment.id,
          p_payment_month: month,
          p_amount: 1100,
          p_payment_date: paymentDate,
          p_account_id: account.id,
          p_notes:
            "Should be rejected",
          p_promised_payment_date: null,
          p_late_reason: null,
        },
      );

      expect(
        invalidUpdateError,
      ).toBeTruthy();

      expect(
        invalidUpdateTransactionId,
      ).toBeNull();

      /*
       * ORIGINAL 400 BDT PAYMENT MUST REMAIN.
       */
      const paymentAfterInvalidUpdate =
        await getPaymentByTransaction(
          firstTransactionId,
        );

      expect(
        Number(
          paymentAfterInvalidUpdate.amount,
        ),
      ).toBe(400);

      expect(
        paymentAfterInvalidUpdate.status,
      ).toBe("posted");

      /*
       * ACCOUNT BALANCE MUST REMAIN UNCHANGED.
       */
      expect(
        await getAccountBalance(
          account.id,
        ),
      ).toBe(initialBalance + 400);
    


      /*
       * EDIT 400 -> 600
       */
      const {
        data: updatedTransactionId,
        error: updateError,
      } = await supabase.rpc(
        "update_tuition_payment",
        {
          p_payment_id:
            firstPayment.id,
          p_payment_month: month,
          p_amount: 600,
          p_payment_date: paymentDate,
          p_account_id: account.id,
          p_notes:
            "Automated edited payment",
          p_promised_payment_date: null,
          p_late_reason: null,
        },
      );

      expect(updateError).toBeNull();

      expect(
        updatedTransactionId,
      ).toBe(firstTransactionId);

      /*
       * PAYMENT RECORD MUST NOW BE 600.
       */
      const updatedPayment =
        await getPaymentByTransaction(
          firstTransactionId,
        );

      expect(
        Number(updatedPayment.amount),
      ).toBe(600);

      expect(
        updatedPayment.status,
      ).toBe("posted");

      /*
       * 600 / 1000 => PARTIAL
       */
      const editedStatus =
        await getStudentStatus(
          studentId,
          month,
        );

      expect(
        editedStatus.payment_status,
      ).toBe("partial");

      expect(
        Number(editedStatus.paid_amount),
      ).toBe(600);

      expect(
        Number(editedStatus.remaining_amount),
      ).toBe(400);

      /*
       * ACCOUNT MUST NOW BE +600.
       */
      expect(
        await getAccountBalance(
          account.id,
        ),
      ).toBe(initialBalance + 600);

      /*
       * CANCEL THE 600 BDT PAYMENT.
       */
      const {
        data: reversalId,
        error: cancelError,
      } = await supabase.rpc(
        "cancel_tuition_payment",
        {
          p_payment_id:
            firstPayment.id,
        },
      );

      expect(cancelError).toBeNull();
      expect(reversalId).toBeTruthy();

      /*
       * ORIGINAL PAYMENT REMAINS IN HISTORY
       * BUT BECOMES CANCELLED.
       */
      const cancelledPayment =
        await getPaymentByTransaction(
          firstTransactionId,
        );

      expect(
        cancelledPayment.status,
      ).toBe("cancelled");

      expect(
        Number(cancelledPayment.amount),
      ).toBe(600);

      /*
       * CANCELLED PAYMENT MUST NO LONGER
       * COUNT TOWARD MONTHLY STATUS.
       */
      const unpaidStatus =
        await getStudentStatus(
          studentId,
          month,
        );

      expect(
        unpaidStatus.payment_status,
      ).toBe("unpaid");

      expect(
        Number(unpaidStatus.paid_amount),
      ).toBe(0);

      expect(
        Number(unpaidStatus.remaining_amount),
      ).toBe(1000);

      /*
       * ACCOUNT MUST RETURN TO
       * THE ORIGINAL BALANCE.
       */
      expect(
        await getAccountBalance(
          account.id,
        ),
      ).toBe(initialBalance);

      /*
       * CANCELLING AGAIN MUST FAIL.
       */
      const {
        error: secondCancelError,
      } = await supabase.rpc(
        "cancel_tuition_payment",
        {
          p_payment_id:
            firstPayment.id,
        },
      );

      expect(
        secondCancelError,
      ).toBeTruthy();

      expect(
        secondCancelError!.message,
      ).toContain(
        "already been cancelled",
      );

      /*
       * RECORD FULL 1000 BDT PAYMENT.
       */
      const {
        data: fullTransactionId,
        error: fullPaymentError,
      } = await supabase.rpc(
        "record_tuition_payment",
        {
          p_student_id: studentId,
          p_payment_month: month,
          p_amount: 1000,
          p_payment_date: paymentDate,
          p_account_id: account.id,
          p_notes:
            "Automated full payment",
          p_promised_payment_date: null,
          p_late_reason: null,
        },
      );

      expect(
        fullPaymentError,
      ).toBeNull();

      expect(
        fullTransactionId,
      ).toBeTruthy();

      /*
       * Resolve the full payment.
       */
      const fullPayment =
        await getPaymentByTransaction(
          fullTransactionId,
        );

      expect(
        Number(fullPayment.amount),
      ).toBe(1000);

      expect(
        fullPayment.status,
      ).toBe("posted");

      /*
       * 1000 / 1000 => PAID
       */
      const paidStatus =
        await getStudentStatus(
          studentId,
          month,
        );

      expect(
        paidStatus.payment_status,
      ).toBe("paid");

      expect(
        Number(paidStatus.paid_amount),
      ).toBe(1000);

      expect(
        Number(paidStatus.remaining_amount),
      ).toBe(0);

      /*
       * ACCOUNT +1000
       */
      expect(
        await getAccountBalance(
          account.id,
        ),
      ).toBe(initialBalance + 1000);

      /*
       * PAYMENT HISTORY:
       * cancelled 600
       * posted 1000
       */
      const {
        data: finalHistory,
        error: finalHistoryError,
      } = await supabase.rpc(
        "get_tuition_payment_history",
        {
          p_student_id: studentId,
        },
      );

      expect(
        finalHistoryError,
      ).toBeNull();

      expect(finalHistory).toBeTruthy();

      const cancelledPaymentHistory =
  finalHistory!.find(
    (row: {
      payment_id: string;
      amount: number | string;
    }) =>
      Number(row.amount) === 600 &&
      row.payment_id === firstPayment.id,
  );

expect(
  cancelledPaymentHistory,
).toBeTruthy();

const postedPaymentHistory =
  finalHistory!.find(
    (row: {
      payment_id: string;
      amount: number | string;
    }) =>
      Number(row.amount) === 1000 &&
      row.payment_id === fullPayment.id,
  );

expect(
  postedPaymentHistory,
).toBeTruthy();
      /*
       * RELIABILITY RPC MUST INCLUDE
       * THE TEST STUDENT.
       */
      const {
        data: reliability,
        error: reliabilityError,
      } = await supabase.rpc(
        "get_tuition_reliability",
      );

      expect(
        reliabilityError,
      ).toBeNull();

      expect(reliability).toBeTruthy();

      const reliabilityStudent =
        reliability?.find(
          (row: {
            student_id: string;
          }) =>
            row.student_id ===
            studentId,
        );

      expect(
        reliabilityStudent,
      ).toBeTruthy();

      /*
       * CANCEL THE FINAL 1000 BDT PAYMENT.
       *
       * This verifies that a successful payment
       * can also be reversed.
       */
      const {
        data: finalReversalId,
        error: finalCancelError,
      } = await supabase.rpc(
        "cancel_tuition_payment",
        {
          p_payment_id:
            fullPayment.id,
        },
      );

      expect(
        finalCancelError,
      ).toBeNull();

      expect(
        finalReversalId,
      ).toBeTruthy();

      /*
       * AFTER REVERSING THE FINAL PAYMENT:
       * monthly status must return to unpaid.
       */
      const finalUnpaidStatus =
        await getStudentStatus(
          studentId,
          month,
        );

      expect(
        finalUnpaidStatus.payment_status,
      ).toBe("unpaid");

      expect(
        Number(
          finalUnpaidStatus.paid_amount,
        ),
      ).toBe(0);

      expect(
        Number(
          finalUnpaidStatus.remaining_amount,
        ),
      ).toBe(1000);

      /*
       * FINAL ACCOUNT INTEGRITY:
       * all test financial effects are reversed.
       */
      expect(
        await getAccountBalance(
          account.id,
        ),
      ).toBe(initialBalance);

      /*
       * CLEANUP STUDENT.
       */
      const {
        error: cleanupError,
      } = await supabase
        .from("tuition_students")
        .delete()
        .eq("id", studentId);

      expect(cleanupError).toBeNull();
    },
     30000,
  );
});
