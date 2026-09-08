import { createClient } from "@/lib/supabase/server";

export type ReportsSummary = {
  income: Record<string, number>;
  expenses: Record<string, number>;
  assets: Record<string, number>;
  liabilities: Record<string, number>;
};

export async function getReportsSummary(): Promise<ReportsSummary> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const { data, error } = await supabase.rpc(
    "get_reports_summary",
  );

  if (error) {
    throw new Error(error.message);
  }

  const summary: ReportsSummary = {
    income: {},
    expenses: {},
    assets: {},
    liabilities: {},
  };

  for (const row of data ?? []) {
    const currency = row.currency;

    summary.income[currency] = Number(row.income ?? 0);
    summary.expenses[currency] = Number(row.expenses ?? 0);
    summary.assets[currency] = Number(row.assets ?? 0);
    summary.liabilities[currency] = Number(
      row.liabilities ?? 0,
    );
  }

  return summary;
}