import { createClient } from "@/lib/supabase/server";

export type MonthlyNetWorth = {
  month: string;
  assets: number;
  liabilities: number;
  net_worth: number;
};

type MonthlyNetWorthRow = {
  month: string;
  assets: number | null;
  liabilities: number | null;
  net_worth: number | null;
};

export async function getMonthlyNetWorth(
  currency: string,
): Promise<MonthlyNetWorth[]> {
  const supabase = await createClient();

  const {
    data: rawData,
    error,
  } = await supabase.rpc(
    "get_monthly_net_worth",
    {
      p_currency: currency,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  const rows: MonthlyNetWorthRow[] =
    (rawData ?? []) as MonthlyNetWorthRow[];

  return rows.map(
    (row: MonthlyNetWorthRow): MonthlyNetWorth => ({
      month: row.month,
      assets: Number(row.assets ?? 0),
      liabilities: Number(row.liabilities ?? 0),
      net_worth: Number(row.net_worth ?? 0),
    }),
  );
}