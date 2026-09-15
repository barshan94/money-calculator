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

type TuitionStatusRow = {
  student_id: string;
  student_name: string;
  monthly_fee: number | string;
  paid_amount: number | string;
  remaining_amount: number | string;
  payment_status: string;
};

describe("tuition payment edge cases", () => {
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
    "rejects invalid and over-limit tuition payments",
    async () => {
      const studentName =
        `Automated Tuition Edge ${Date.now()}`;

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
          p_student_name: studentName,
          p_guardian_name:
            "Automated Guardian",
          p_whatsapp_number: null,
          p_monthly_fee: 1000,
          p_due_day: 10,
          p_notes: "Automated edge test",
        },
      );

      expect(createError).toBeNull();
      expect(studentId).toBeTruthy();

      const month =
        new Date().toISOString().slice(0, 7) +
        "-01";

      const paymentDate =
        new Date()
          .toISOString()
          .slice(0, 10);

      /*
       * ZERO PAYMENT MUST FAIL.
       */
      const {
        error: zeroError,
      } = await supabase.rpc(
        "record_tuition_payment",
        {
          p_student_id: studentId,
          p_payment_month: month,
          p_amount: 0,
          p_payment_date: paymentDate,
          p_account_id: account.id,
          p_notes: null,
          p_promised_payment_date: null,
          p_late_reason: null,
        },
      );

      expect(zeroError).toBeTruthy();

      /*
       * NEGATIVE PAYMENT MUST FAIL.
       */
      const {
        error: negativeError,
      } = await supabase.rpc(
        "record_tuition_payment",
        {
          p_student_id: studentId,
          p_payment_month: month,
          p_amount: -100,
          p_payment_date: paymentDate,
          p_account_id: account.id,
          p_notes: null,
          p_promised_payment_date: null,
          p_late_reason: null,
        },
      );

      expect(negativeError).toBeTruthy();

      /*
       * OVERPAYMENT MUST FAIL.
       *
       * Monthly fee is 1000 BDT.
       */
      const {
        error: overpaymentError,
      } = await supabase.rpc(
        "record_tuition_payment",
        {
          p_student_id: studentId,
          p_payment_month: month,
          p_amount: 1001,
          p_payment_date: paymentDate,
          p_account_id: account.id,
          p_notes: null,
          p_promised_payment_date: null,
          p_late_reason: null,
        },
      );

      expect(overpaymentError).toBeTruthy();

      /*
       * VALID PAYMENT SHOULD STILL WORK
       * AFTER THE FAILED ATTEMPTS.
       */
      const {
        data: transactionId,
        error: validPaymentError,
      } = await supabase.rpc(
        "record_tuition_payment",
        {
          p_student_id: studentId,
          p_payment_month: month,
          p_amount: 1000,
          p_payment_date: paymentDate,
          p_account_id: account.id,
          p_notes:
            "Valid edge-case payment",
          p_promised_payment_date: null,
          p_late_reason: null,
        },
      );

      expect(validPaymentError).toBeNull();
      expect(transactionId).toBeTruthy();

      /*
       * MONTH SHOULD NOW BE PAID.
       */
      const {
        data: status,
        error: statusError,
      } = await supabase.rpc(
        "get_tuition_monthly_status",
        {
          p_month: month,
        },
      );

      expect(statusError).toBeNull();
      expect(status).toBeTruthy();

      const studentStatus =
        (status as TuitionStatusRow[]).find(
          (row) =>
            row.student_id === studentId,
        );

      expect(studentStatus).toBeTruthy();

      expect(
        studentStatus!.payment_status,
      ).toBe("paid");

      expect(
        Number(
          studentStatus!.paid_amount,
        ),
      ).toBe(1000);

      expect(
        Number(
          studentStatus!.remaining_amount,
        ),
      ).toBe(0);

      /*
       * CLEAN UP THE POSTED PAYMENT FIRST.
       */
      const {
        data: payment,
        error: paymentLookupError,
      } = await supabase
        .from("tuition_payments")
        .select("id, status")
        .eq(
          "transaction_id",
          transactionId,
        )
        .single();

      expect(
        paymentLookupError,
      ).toBeNull();

      expect(payment).toBeTruthy();
      expect(payment!.status).toBe("posted");

      const {
        error: cancelError,
      } = await supabase.rpc(
        "cancel_tuition_payment",
        {
          p_payment_id: payment!.id,
        },
      );

      expect(cancelError).toBeNull();

      /*
       * FINAL CLEANUP:
       * Remove the temporary student.
       */
      const {
        error: cleanupError,
      } = await supabase
        .from("tuition_students")
        .delete()
        .eq("id", studentId);

      expect(cleanupError).toBeNull();
    },
  );
});

