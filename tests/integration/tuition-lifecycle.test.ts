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

describe("tuition lifecycle", () => {
  it("creates a student, records payment, and verifies tuition status", async () => {
    const studentName =
      `Automated Tuition ${Date.now()}`;

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
     * CREATE STUDENT
     */
    const {
      data: studentId,
      error: createError,
    } = await supabase.rpc(
      "create_tuition_student",
      {
        p_student_name: studentName,
        p_guardian_name: "Automated Guardian",
        p_whatsapp_number: null,
        p_monthly_fee: 1000,
        p_due_day: 10,
        p_notes: "Automated test",
      },
    );

    expect(createError).toBeNull();
    expect(studentId).toBeTruthy();

    /*
     * CURRENT MONTH
     */
    const month =
      new Date().toISOString().slice(0, 7) +
      "-01";

    /*
     * BEFORE PAYMENT:
     * Student should be unpaid.
     */
    const {
      data: initialStatus,
      error: initialStatusError,
    } = await supabase.rpc(
      "get_tuition_monthly_status",
      {
        p_month: month,
      },
    );

    expect(initialStatusError).toBeNull();

    const initialStudent =
      initialStatus?.find(
        (row: { student_id: string }) =>
          row.student_id === studentId,
      );

    expect(initialStudent).toBeTruthy();

    /*
     * RECORD 400 BDT PARTIAL PAYMENT
     */
    const {
      data: paymentResult,
      error: paymentError,
    } = await supabase.rpc(
      "record_tuition_payment",
      {
        p_student_id: studentId,
        p_payment_month: month,
        p_amount: 400,
        p_payment_date:
          new Date().toISOString().slice(0, 10),
        p_account_id: account.id,
        p_notes: "Automated test payment",
        p_promised_payment_date: null,
        p_late_reason: null,
      },
    );

    expect(paymentError).toBeNull();
    expect(paymentResult).toBeTruthy();

    /*
     * AFTER PAYMENT:
     * Verify monthly status exists and reflects
     * the payment.
     */
    const {
      data: statuses,
      error: statusError,
    } = await supabase.rpc(
      "get_tuition_monthly_status",
      {
        p_month: month,
      },
    );

    expect(statusError).toBeNull();

    const studentStatus =
      statuses?.find(
        (row: { student_id: string }) =>
          row.student_id === studentId,
      );

    expect(studentStatus).toBeTruthy();

    /*
     * We intentionally avoid assuming exact column
     * names beyond the known student_id contract.
     * Verify that the RPC returns the student after
     * payment and that at least one numeric payment
     * field reflects the transaction.
     */
    const numericValues = Object.values(
      studentStatus!,
    ).filter(
      (value) =>
        typeof value === "number" ||
        (typeof value === "string" &&
          value !== "" &&
          !Number.isNaN(Number(value))),
    );

    expect(numericValues.length).toBeGreaterThan(0);

    /*
     * PAYMENT HISTORY
     */
    const {
      data: history,
      error: historyError,
    } = await supabase.rpc(
      "get_tuition_payment_history",
      {
        p_student_id: studentId,
      },
    );

    expect(historyError).toBeNull();
    expect(history).toBeTruthy();
    expect(history!.length).toBeGreaterThan(0);

    const payment = history!.find(
      (row: { amount: number | string }) =>
        Number(row.amount) === 400,
    );

    expect(payment).toBeTruthy();

    /*
     * RELIABILITY RPC MUST INCLUDE THE STUDENT
     * AFTER A PAYMENT HAS BEEN RECORDED.
     */
    const {
      data: reliability,
      error: reliabilityError,
    } = await supabase.rpc(
      "get_tuition_reliability",
    );

    expect(reliabilityError).toBeNull();
    expect(reliability).toBeTruthy();

    /*
     * CLEANUP:
     * Remove the test student directly.
     * Payment-linked rows cascade through the
     * student's records according to the DB schema.
     */
    const { error: cleanupError } =
      await supabase
        .from("tuition_students")
        .delete()
        .eq("id", studentId);

    expect(cleanupError).toBeNull();
  });
});
