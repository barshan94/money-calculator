import { createClient } from "@/lib/supabase/server";

export type LoanBalance = {
  id: string;
  person_name: string;
  loan_type: "lent" | "borrowed";
  principal_amount: number;
  repaid_amount: number;
  remaining_amount: number;
  currency: string;
  status: string;
  whatsapp_number: string | null;
  start_datetime: string | null;
  due_date: string | null;
};

type LoanBalanceRow = {
  id: string;
  person_name: string;
  loan_type: "lent" | "borrowed";
  principal_amount: number | string;
  repaid_amount: number | string;
  remaining_amount: number | string;
  currency: string;
  status: string;
  whatsapp_number: string | null;
  start_datetime: string | null;
  due_date: string | null;
};

export async function getLoanBalances(): Promise<
  LoanBalance[]
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const { data, error } = await supabase.rpc(
    "get_loan_balances",
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(
    (row: LoanBalanceRow) => ({
      id: row.id,
      person_name: row.person_name,
      loan_type: row.loan_type,
      principal_amount: Number(
        row.principal_amount,
      ),
      repaid_amount: Number(
        row.repaid_amount,
      ),
      remaining_amount: Number(
        row.remaining_amount,
      ),
      currency: row.currency,
      status: row.status,
      whatsapp_number:
        row.whatsapp_number,
      start_datetime:
        row.start_datetime,
      due_date:
        row.due_date,
    }),
  );
}

