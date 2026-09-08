import { createClient } from "@/lib/supabase/server";

type CategoryExpenseRow = {
  category: string;
  amount: number | string;
};

export async function getCategoryExpenseReport(
  currency = "BDT",
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const { data, error } = await supabase.rpc(
    "get_category_expense_report",
    {
      p_currency: currency,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row: CategoryExpenseRow) => ({
      category: row.category,
      amount: Number(row.amount),
    }))
    .sort(
      (
        a: { category: string; amount: number },
        b: { category: string; amount: number },
      ) => b.amount - a.amount,
    );
}