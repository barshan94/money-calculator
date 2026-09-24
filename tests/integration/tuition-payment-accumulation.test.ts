import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createAdminClient,
  createAuthenticatedClient,
  signInTestUser,
} from "./test-helpers";

let supabase: SupabaseClient;
let admin: SupabaseClient;

type TuitionStatusRow = {
  student_id: string;
  student_name: string;
  monthly_fee: number | string;
  paid_amount: number | string;
  remaining_amount: number | string;
  payment_status: string;
};

type PaymentRow = {
  id: string;
  transaction_id: string;
  amount: number | string;
  status: string;
};

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
    (row) =>
      row.student_id === studentId,
  );

  expect(student).toBeTruthy();

  return student!;
}

async function getPayment(
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

  return data as PaymentRow;
}

describe(
  "tuition payment accumulation",
  () => {
    beforeAll(async () => {
      supabase =
        createAuthenticatedClient();

      admin = createAdminClient();

      await signInTestUser(supabase);
    });

    it(
      "accumulates partial payments and prevents exceeding the monthly fee",
      async () => {
        const studentName =
          `Automated Tuition Accumulation ${Date.now()}`;

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
         * Create a student with a 1000 BDT monthly fee.
         */
        const {
          data: studentId,
          error: createError,
        } = await supabase.rpc(
          "create_tuition_student",
          {
            p_student_name:
              studentName,
            p_guardian_name:
              "Automated Guardian",
            p_whatsapp_number: null,
            p_monthly_fee: 1000,
            p_due_day: 10,
            p_notes:
              "Automated accumulation test",
          },
        );

        expect(createError).toBeNull();
        expect(studentId).toBeTruthy();

        const month =
          new Date()
            .toISOString()
            .slice(0, 7) +
          "-01";

        const paymentDate =
          new Date()
            .toISOString()
            .slice(0, 10);

        /*
         * FIRST PAYMENT: 400 BDT
         */
        const {
          data: firstTransactionId,
          error: firstPaymentError,
        } = await supabase.rpc(
          "record_tuition_payment",
          {
            p_student_id: studentId,
            p_payment_month: month,
            p_amount: 400,
            p_payment_date:
              paymentDate,
            p_account_id:
              account.id,
            p_notes: "First partial",
            p_promised_payment_date:
              null,
            p_late_reason: null,
          },
        );

        expect(
          firstPaymentError,
        ).toBeNull();

        expect(
          firstTransactionId,
        ).toBeTruthy();

        /*
         * 400 / 1000 => PARTIAL
         */
        const firstStatus =
          await getStudentStatus(
            studentId,
            month,
          );

        expect(
          firstStatus.payment_status,
        ).toBe("partial");

        expect(
          Number(
            firstStatus.paid_amount,
          ),
        ).toBe(400);

        expect(
          Number(
            firstStatus.remaining_amount,
          ),
        ).toBe(600);

        /*
         * SECOND PAYMENT: 600 BDT
         */
        const {
          data: secondTransactionId,
          error: secondPaymentError,
        } = await supabase.rpc(
          "record_tuition_payment",
          {
            p_student_id: studentId,
            p_payment_month: month,
            p_amount: 600,
            p_payment_date:
              paymentDate,
            p_account_id:
              account.id,
            p_notes:
              "Final partial payment",
            p_promised_payment_date:
              null,
            p_late_reason: null,
          },
        );

        expect(
          secondPaymentError,
        ).toBeNull();

        expect(
          secondTransactionId,
        ).toBeTruthy();

        /*
         * 400 + 600 = 1000 => PAID
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
          Number(
            paidStatus.paid_amount,
          ),
        ).toBe(1000);

        expect(
          Number(
            paidStatus.remaining_amount,
          ),
        ).toBe(0);

        /*
         * THIRD PAYMENT MUST FAIL.
         *
         * The month is already fully paid.
         */
        const {
          error: duplicatePaymentError,
        } = await supabase.rpc(
          "record_tuition_payment",
          {
            p_student_id: studentId,
            p_payment_month: month,
            p_amount: 1,
            p_payment_date:
              paymentDate,
            p_account_id:
              account.id,
            p_notes:
              "Should be rejected",
            p_promised_payment_date:
              null,
            p_late_reason: null,
          },
        );

        expect(
          duplicatePaymentError,
        ).toBeTruthy();

        /*
         * PAYMENT HISTORY MUST CONTAIN
         * EXACTLY THE TWO POSTED PAYMENTS.
         */
        const {
          data: payments,
          error: historyError,
        } = await supabase
          .from("tuition_payments")
          .select(
            "id, transaction_id, amount, status",
          )
          .eq(
            "student_id",
            studentId,
          )
          .eq(
            "payment_month",
            month,
          )
          .eq(
            "status",
            "posted",
          )
          .order("created_at");

        expect(historyError).toBeNull();
        expect(payments).toHaveLength(2);

        const amounts =
          payments!.map(
            (payment) =>
              Number(payment.amount),
          );

        expect(amounts).toEqual([
          400,
          600,
        ]);

        /*
         * BOTH TRANSACTIONS MUST EXIST
         * AS POSTED PAYMENTS.
         */
        const firstPayment =
          await getPayment(
            firstTransactionId,
          );

        const secondPayment =
          await getPayment(
            secondTransactionId,
          );

        expect(
          firstPayment.status,
        ).toBe("posted");

        expect(
          secondPayment.status,
        ).toBe("posted");

        expect(
          Number(firstPayment.amount),
        ).toBe(400);

        expect(
          Number(secondPayment.amount),
        ).toBe(600);

        /*
         * CLEAN UP FIRST PAYMENT.
         */
        const {
          error: firstCancelError,
        } = await supabase.rpc(
          "cancel_tuition_payment",
          {
            p_payment_id:
              firstPayment.id,
          },
        );

        expect(
          firstCancelError,
        ).toBeNull();

        /*
         * After cancelling 400:
         *
         * 600 remains posted.
         * Month becomes PARTIAL again.
         */
        const afterFirstCancel =
          await getStudentStatus(
            studentId,
            month,
          );

        expect(
          afterFirstCancel.payment_status,
        ).toBe("partial");

        expect(
          Number(
            afterFirstCancel.paid_amount,
          ),
        ).toBe(600);

        expect(
          Number(
            afterFirstCancel.remaining_amount,
          ),
        ).toBe(400);

        /*
         * CLEAN UP SECOND PAYMENT.
         */
        const {
          error: secondCancelError,
        } = await supabase.rpc(
          "cancel_tuition_payment",
          {
            p_payment_id:
              secondPayment.id,
          },
        );

        expect(
          secondCancelError,
        ).toBeNull();

        /*
         * BOTH PAYMENTS CANCELLED:
         * Month returns to UNPAID.
         */
        const finalStatus =
          await getStudentStatus(
            studentId,
            month,
          );

        expect(
          finalStatus.payment_status,
        ).toBe("unpaid");

        expect(
          Number(
            finalStatus.paid_amount,
          ),
        ).toBe(0);

        expect(
          Number(
            finalStatus.remaining_amount,
          ),
        ).toBe(1000);

        /*
         * FINAL CLEANUP
         *
         * Cleanup intentionally uses the
         * service-role client because production
         * authenticated users will not retain
         * direct DELETE privileges on this table.
         */
        const {
          error: cleanupError,
        } = await admin
          .from("tuition_students")
          .delete()
          .eq("id", studentId);

        expect(cleanupError).toBeNull();
      },
    );
  },
);
