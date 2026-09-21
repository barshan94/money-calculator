import { createClient } from "@/lib/supabase/server";

export type RecurringTransaction = {
  id: string;
  name: string;
  transactionType: "expense" | "income" | "transfer";
  amount: number;
  currency: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  nextRunDate: string;
};

type RecurringTransactionRow = {
  id: string;
  name: string;
  transaction_type: "expense" | "income" | "transfer";
  amount: number | string | null;
  currency: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  next_run_date: string;
};

export async function getRecurringTransactions(): Promise<
  RecurringTransaction[]
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const { data, error } = await supabase
    .from("recurring_transactions")
    .select(`
      id,
      name,
      transaction_type,
      amount,
      currency,
      frequency,
      next_run_date
    `)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("next_run_date");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(
    (row: RecurringTransactionRow) => ({
      id: row.id,
      name: row.name,
      transactionType: row.transaction_type,
      amount: Number(row.amount ?? 0),
      currency: row.currency,
      frequency: row.frequency,
      nextRunDate: row.next_run_date,
    }),
  );
}

