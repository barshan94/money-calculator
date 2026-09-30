import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/finance/format-money";

export type SearchResultKind =
  | "transaction"
  | "loan"
  | "account"
  | "student";

export type SearchResult = {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle: string;
  meta: string;
  href: string;
};

// ── raw row shapes ────────────────────────────────────────

type TransactionRow = {
  id: string;
  transaction_date: string;
  description: string | null;
  status: "posted" | "voided";
};

type LoanRow = {
  id: string;
  person_name: string;
  loan_type: "lent" | "borrowed";
  principal_amount: number | string;
  currency: string;
  status: string;
  description: string | null;
};

type AccountRow = {
  id: string;
  name: string;
  account_type: string;
  currency: string;
  is_archived: boolean;
};

type StudentRow = {
  id: string;
  student_name: string;
  guardian_name: string | null;
  monthly_fee: number | string;
  is_active: boolean;
};

// ── main export ───────────────────────────────────────────

export async function globalSearch(
  query: string,
): Promise<{
  results: SearchResult[];
  counts: Record<SearchResultKind, number>;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const q = query.trim();

  if (!q) {
    return {
      results: [],
      counts: {
        transaction: 0,
        loan: 0,
        account: 0,
        student: 0,
      },
    };
  }

  const pattern = `%${q}%`;

  const [
    transactionsResult,
    loansResult,
    accountsResult,
    studentsResult,
  ] = await Promise.all([
    // Transactions — match on description
    supabase
      .from("transactions")
      .select(
        "id, transaction_date, description, status",
      )
      .eq("user_id", user.id)
      .ilike("description", pattern)
      .order("transaction_date", { ascending: false })
      .limit(20),

    // Loans — match on person_name or description
    supabase
      .from("loans")
      .select(
        "id, person_name, loan_type, principal_amount, currency, status, description",
      )
      .eq("user_id", user.id)
      .or(
        `person_name.ilike.${pattern},description.ilike.${pattern}`,
      )
      .order("created_at", { ascending: false })
      .limit(20),

    // Accounts — match on name
    supabase
      .from("accounts")
      .select(
        "id, name, account_type, currency, is_archived",
      )
      .eq("user_id", user.id)
      .eq("is_system", false)
      .ilike("name", pattern)
      .order("name")
      .limit(20),

    // Tuition students — match on student_name or guardian_name
    supabase
      .from("tuition_students")
      .select(
        "id, student_name, guardian_name, monthly_fee, is_active",
      )
      .eq("user_id", user.id)
      .or(
        `student_name.ilike.${pattern},guardian_name.ilike.${pattern}`,
      )
      .order("student_name")
      .limit(20),
  ]);

  const transactions = (
    (transactionsResult.data ?? []) as TransactionRow[]
  ).map(
    (row): SearchResult => ({
      id: row.id,
      kind: "transaction",
      title: row.description ?? "Transaction",
      subtitle: new Date(
        `${row.transaction_date}T00:00:00`,
      ).toLocaleDateString("en-BD", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      meta: row.status === "voided" ? "Voided" : "Posted",
      href: `/transactions/${row.id}`,
    }),
  );

  const loans = (
    (loansResult.data ?? []) as LoanRow[]
  ).map(
    (row): SearchResult => ({
      id: row.id,
      kind: "loan",
      title: row.person_name,
      subtitle:
        row.loan_type === "lent"
          ? `Lent · ${formatMoney(Number(row.principal_amount), row.currency)}`
          : `Borrowed · ${formatMoney(Number(row.principal_amount), row.currency)}`,
      meta: row.status,
      href: `/loans/${row.id}`,
    }),
  );

  const accounts = (
    (accountsResult.data ?? []) as AccountRow[]
  ).map(
    (row): SearchResult => ({
      id: row.id,
      kind: "account",
      title: row.name,
      subtitle: `${row.account_type} · ${row.currency}`,
      meta: row.is_archived ? "Archived" : "Active",
      href: `/accounts/${row.id}`,
    }),
  );

  const students = (
    (studentsResult.data ?? []) as StudentRow[]
  ).map(
    (row): SearchResult => ({
      id: row.id,
      kind: "student",
      title: row.student_name,
      subtitle: row.guardian_name
        ? `Guardian: ${row.guardian_name}`
        : `Fee: ${formatMoney(Number(row.monthly_fee), "BDT")}/mo`,
      meta: row.is_active ? "Active" : "Inactive",
      href: `/tuition`,
    }),
  );

  const results = [
    ...accounts,
    ...transactions,
    ...loans,
    ...students,
  ];

  return {
    results,
    counts: {
      transaction: transactions.length,
      loan: loans.length,
      account: accounts.length,
      student: students.length,
    },
  };
}
