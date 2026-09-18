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

async function getAccount() {
  const {
    data,
    error,
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

  expect(error).toBeNull();
  expect(data).toHaveLength(1);

  return data![0].id;
}

async function createStudent(
  fee = 1000,
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "create_tuition_student",
    {
      p_student_name:
        `Tuition Edge ${Date.now()}-${Math.random()}`,
      p_guardian_name:
        "Edge Guardian",
      p_whatsapp_number: null,
      p_monthly_fee: fee,
      p_due_day: 10,
      p_notes:
        "Tuition edge-case test",
    },
  );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as string;
}

async function recordPayment(
  studentId: string,
  accountId: string,
  amount: number,
  month: string,
) {
  return await supabase.rpc(
    "record_tuition_payment",
    {
      p_student_id: studentId,
      p_payment_month: month,
      p_amount: amount,
      p_payment_date:
        new Date()
          .toISOString()
          .slice(0, 10),
      p_account_id: accountId,
      p_notes:
        "Tuition edge payment",
      p_promised_payment_date: null,
      p_late_reason: null,
    },
  );
}

async function getStatus(
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

  const row = (
    data as Array<{
      student_id: string;
      payment_status: string;
      paid_amount: number | string;
      remaining_amount: number | string;
    }>
  )?.find(
    (item) =>
      item.student_id === studentId,
  );

  expect(row).toBeTruthy();

  return row!;
}

describe("tuition edge cases", () => {
  it("rejects zero payment", async () => {
    const accountId =
      await getAccount();

    const studentId =
      await createStudent();

    const result =
      await recordPayment(
        studentId,
        accountId,
        0,
        "2026-09-01",
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("rejects negative payment", async () => {
    const accountId =
      await getAccount();

    const studentId =
      await createStudent();

    const result =
      await recordPayment(
        studentId,
        accountId,
        -100,
        "2026-09-01",
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("allows partial payment and reports partial status", async () => {
    const accountId =
      await getAccount();

    const studentId =
      await createStudent(1000);

    const result =
      await recordPayment(
        studentId,
        accountId,
        400,
        "2026-09-01",
      );

    expect(result.error).toBeNull();
    expect(result.data).toBeTruthy();

    const status =
      await getStatus(
        studentId,
        "2026-09-01",
      );

    expect(
      status.payment_status,
    ).toBe("partial");

    expect(
      Number(status.paid_amount),
    ).toBe(400);

    expect(
      Number(status.remaining_amount),
    ).toBe(600);
  });

  it("allows multiple partial payments up to the monthly fee", async () => {
    const accountId =
      await getAccount();

    const studentId =
      await createStudent(1000);

    const first =
      await recordPayment(
        studentId,
        accountId,
        400,
        "2026-09-01",
      );

    expect(first.error).toBeNull();

    const second =
      await recordPayment(
        studentId,
        accountId,
        600,
        "2026-09-01",
      );

    expect(second.error).toBeNull();

    const status =
      await getStatus(
        studentId,
        "2026-09-01",
      );

    expect(
      status.payment_status,
    ).toBe("paid");

    expect(
      Number(status.paid_amount),
    ).toBe(1000);

    expect(
      Number(status.remaining_amount),
    ).toBe(0);
  });

  it("rejects payment exceeding the remaining monthly fee", async () => {
    const accountId =
      await getAccount();

    const studentId =
      await createStudent(1000);

    const first =
      await recordPayment(
        studentId,
        accountId,
        400,
        "2026-09-01",
      );

    expect(first.error).toBeNull();

    const second =
      await recordPayment(
        studentId,
        accountId,
        601,
        "2026-09-01",
      );

    expect(second.data).toBeNull();
    expect(second.error).toBeTruthy();

    const status =
      await getStatus(
        studentId,
        "2026-09-01",
      );

    expect(
      Number(status.paid_amount),
    ).toBe(400);

    expect(
      Number(status.remaining_amount),
    ).toBe(600);
  });

  it("rejects payment after the month is fully paid", async () => {
    const accountId =
      await getAccount();

    const studentId =
      await createStudent(1000);

    const first =
      await recordPayment(
        studentId,
        accountId,
        1000,
        "2026-09-01",
      );

    expect(first.error).toBeNull();

    const second =
      await recordPayment(
        studentId,
        accountId,
        1,
        "2026-09-01",
      );

    expect(second.data).toBeNull();
    expect(second.error).toBeTruthy();
  });

  it("keeps a new month unpaid before any payment", async () => {
    const studentId =
      await createStudent(1000);

    const status =
      await getStatus(
        studentId,
        "2026-10-01",
      );

    expect(
      status.payment_status,
    ).toBe("unpaid");

    expect(
      Number(status.paid_amount),
    ).toBe(0);

    expect(
      Number(status.remaining_amount),
    ).toBe(1000);
  });

  it("rejects payment for a non-existent student", async () => {
    const accountId =
      await getAccount();

    const result =
      await recordPayment(
        "00000000-0000-0000-0000-000000000000",
        accountId,
        100,
        "2026-09-01",
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("rejects payment using a non-existent account", async () => {
    const studentId =
      await createStudent();

    const result =
      await recordPayment(
        studentId,
        "00000000-0000-0000-0000-000000000000",
        100,
        "2026-09-01",
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("rejects payment against an archived student", async () => {
    const accountId =
      await getAccount();

    const studentId =
      await createStudent();

    const archive =
      await supabase.rpc(
        "archive_tuition_student",
        {
          p_student_id: studentId,
        },
      );

    expect(archive.error).toBeNull();

    const result =
      await recordPayment(
        studentId,
        accountId,
        100,
        "2026-09-01",
      );

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

