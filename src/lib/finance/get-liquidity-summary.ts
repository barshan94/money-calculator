import { createClient } from "@/lib/supabase/server";

export type LiquiditySummary = {
  currency: string;
  totalAssets: number;
  immediateLiquid: number;
  nearLiquid: number;
  receivables: number;
  longTerm: number;
  totalLiquidAndReceivable: number;
};

type LiquiditySummaryRow = {
  currency: string;
  total_assets: number | string | null;
  immediate_liquid: number | string | null;
  near_liquid: number | string | null;
  receivables: number | string | null;
  long_term: number | string | null;
  total_liquid_and_receivable:
    | number
    | string
    | null;
};

export async function getLiquiditySummary(): Promise<
  LiquiditySummary[]
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const { data, error } = await supabase.rpc(
    "get_liquidity_summary",
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(
    (row: LiquiditySummaryRow) => ({
      currency: row.currency,
      totalAssets: Number(row.total_assets ?? 0),
      immediateLiquid: Number(
        row.immediate_liquid ?? 0,
      ),
      nearLiquid: Number(row.near_liquid ?? 0),
      receivables: Number(row.receivables ?? 0),
      longTerm: Number(row.long_term ?? 0),
      totalLiquidAndReceivable: Number(
        row.total_liquid_and_receivable ?? 0,
      ),
    }),
  );
}

