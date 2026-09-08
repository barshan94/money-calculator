import { createClient } from "@/lib/supabase/server";

type MonthlyReport = {
  month: string;
  income: number;
  expenses: number;
  net: number;
};

type MonthlyReportRow = {
  month: string;
  income: number | string | null;
  expenses: number | string | null;
  net: number | string | null;
};

export async function getMonthlyIncomeExpense(
  currency = "BDT",
): Promise<MonthlyReport[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const { data, error } = await supabase.rpc(
    "get_monthly_income_expense",
    {
      p_currency: currency,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: MonthlyReportRow) => ({
    month: row.month,
    income: Number(row.income ?? 0),
    expenses: Number(row.expenses ?? 0),
    net: Number(row.net ?? 0),
  }));
}