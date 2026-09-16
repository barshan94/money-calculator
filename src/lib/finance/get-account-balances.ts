import { createClient } from "@/lib/supabase/server";

export type AccountBalance = {
  id: string;
  name: string;
  account_type:
    | "asset"
    | "liability"
    | "income"
    | "expense";
  currency: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
  is_archived: boolean;
};

type AccountBalanceRow = {
  id: string;
  name: string;
  account_type:
    | "asset"
    | "liability"
    | "income"
    | "expense";
  currency: string;
  debit_total: number | string;
  credit_total: number | string;
  balance: number | string;
  is_archived: boolean;
};

export async function getAccountBalances(): Promise<
  AccountBalance[]
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const { data, error } = await supabase.rpc(
    "get_account_balances",
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(
    (row: AccountBalanceRow) => ({
      id: row.id,
      name: row.name,
      account_type: row.account_type,
      currency: row.currency,
      debitTotal: Number(row.debit_total),
      creditTotal: Number(row.credit_total),
      balance: Number(row.balance),
      is_archived: row.is_archived,
    }),
  );
}

