import { createClient } from "@/lib/supabase/server";

export type FinancialSummary = {
  income: number;
  expense: number;
  profit: number;
};

export async function getFinancialSummary(): Promise<
  Record<string, FinancialSummary>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const { data, error } = await supabase.rpc(
    "get_financial_summary",
  );

  if (error) {
    throw new Error(error.message);
  }

  const summary: Record<string, FinancialSummary> = {};

  for (const row of data ?? []) {
    summary[row.currency] = {
      income: Number(row.income ?? 0),
      expense: Number(row.expense ?? 0),
      profit: Number(row.profit ?? 0),
    };
  }

  return summary;
}