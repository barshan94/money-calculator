import { createClient } from "@/lib/supabase/server";

export type BudgetProgress = {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  currency: string;
  period: string;
  startDate: string;
  endDate: string | null;
};

type BudgetProgressRow = {
  id: string;
  category_id: string;
  category_name: string;
  amount: number | string;
  spent: number | string;
  remaining: number | string;
  percentage: number | string;
  currency: string;
  period: string;
  start_date: string;
  end_date: string | null;
};

export async function getBudgetProgress(): Promise<
  BudgetProgress[]
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const { data, error } = await supabase.rpc(
    "get_budget_progress",
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: BudgetProgressRow) => ({
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    amount: Number(row.amount),
    spent: Number(row.spent),
    remaining: Number(row.remaining),
    percentage: Number(row.percentage),
    currency: row.currency,
    period: row.period,
    startDate: row.start_date,
    endDate: row.end_date,
  }));
}