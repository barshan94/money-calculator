import { createClient } from "@/lib/supabase/server";

export type TuitionMonthlyStatus = {
  student_id: string;
  student_name: string;
  monthly_fee: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: "paid" | "partial" | "unpaid";
};

type TuitionMonthlyStatusRow = {
  student_id: string;
  student_name: string;
  monthly_fee: number | string;
  paid_amount: number | string;
  remaining_amount: number | string;
  payment_status: "paid" | "partial" | "unpaid";
};

export async function getTuitionMonthlyStatus(
  month: string,
): Promise<TuitionMonthlyStatus[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const { data, error } = await supabase.rpc(
    "get_tuition_monthly_status",
    {
      p_month: month,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(
    (row: TuitionMonthlyStatusRow) => ({
      student_id: row.student_id,
      student_name: row.student_name,
      monthly_fee: Number(row.monthly_fee ?? 0),
      paid_amount: Number(row.paid_amount ?? 0),
      remaining_amount: Number(
        row.remaining_amount ?? 0,
      ),
      payment_status: row.payment_status,
    }),
  );
}

