import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type SearchResultItem = {
  id: string;
  type:
    | "transaction"
    | "loan"
    | "account"
    | "student"
    | "deposit"
    | "investment"
    | "asset";
  label: string;
  sublabel: string | null;
  url: string;
};

export type SearchResponse = {
  results: SearchResultItem[];
  query: string;
  /** Number of categories that failed to query. 0 means a clean search. */
  partial: boolean;
};

// Max results per category to keep the palette fast
const PER_CATEGORY = 5;

// Shortest query worth hitting the database with.
const MIN_QUERY_LENGTH = 2;

// Upper bound on user input so a pasted blob cannot become an
// unbounded ilike pattern or an oversized request.
const MAX_QUERY_LENGTH = 100;

/**
 * Escapes the characters that are special inside a PostgREST `or(...)`
 * filter string. The `or` grammar treats `,` as a filter separator and
 * `(`/`)`/`.` as structural tokens, so an unescaped user query could
 * otherwise alter which rows the filter matches.
 */
function escapeOrFilterValue(value: string): string {
  return value.replace(/[,().%*\\]/g, (char) => `\\${char}`);
}

/**
 * Escapes a value for use inside an `ilike` pattern so that `%` and `_`
 * are matched literally instead of acting as SQL wildcards. The result is
 * still wrapped in `%...%` by the caller.
 */
function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = (searchParams.get("q") ?? "").trim();

  // Collapse whitespace so a multi-space query does not produce a
  // pattern full of redundant wildcards.
  const query = rawQuery.replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH);

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json<SearchResponse>({
      results: [],
      query,
      partial: false,
    });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const ilike = `%${escapeIlikePattern(query)}%`;

  // The `or(...)` filter is parsed as PostgREST filter syntax rather than
  // passed as a value, so it needs grammar escaping instead.
  const orFilter = `student_name.ilike.${escapeOrFilterValue(
    query,
  )},guardian_name.ilike.${escapeOrFilterValue(query)}`;

  const [
    txResult,
    loansResult,
    accountsResult,
    studentsResult,
    depositsResult,
    investmentsResult,
    assetsResult,
  ] = await Promise.all([
    // Transactions — match on description
    supabase
      .from("transactions")
      .select("id, description, transaction_date, status")
      .eq("user_id", user.id)
      .ilike("description", ilike)
      .order("transaction_date", { ascending: false })
      .limit(PER_CATEGORY),

    // Loans — match on person_name
    supabase
      .from("loans")
      .select("id, person_name, loan_type, status, currency")
      .eq("user_id", user.id)
      .ilike("person_name", ilike)
      .limit(PER_CATEGORY),

    // Accounts — match on name
    supabase
      .from("accounts")
      .select("id, name, account_type, currency")
      .eq("user_id", user.id)
      .ilike("name", ilike)
      .limit(PER_CATEGORY),

    // Tuition students — match on student_name or guardian_name
    supabase
      .from("tuition_students")
      .select("id, student_name, monthly_fee, is_active")
      .eq("user_id", user.id)
      .or(orFilter)
      .limit(PER_CATEGORY),

    // Deposits — match on name
    supabase
      .from("deposits")
      .select("id, name, currency, status")
      .eq("user_id", user.id)
      .ilike("name", ilike)
      .limit(PER_CATEGORY),

    // Investments — match on name
    supabase
      .from("investments")
      .select("id, name, currency, status")
      .eq("user_id", user.id)
      .ilike("name", ilike)
      .limit(PER_CATEGORY),

    // Long-term assets — match on name
    supabase
      .from("long_term_assets")
      .select("id, name, currency, status")
      .eq("user_id", user.id)
      .ilike("name", ilike)
      .limit(PER_CATEGORY),
  ]);

  const results: SearchResultItem[] = [];
  let failedCategories = 0;

  // Transactions
  if (txResult.error) failedCategories++;
  for (const row of txResult.data ?? []) {
    results.push({
      id: row.id,
      type: "transaction",
      label: row.description ?? "Transaction",
      sublabel: row.transaction_date,
      url: `/transactions/${row.id}`,
    });
  }

  // Loans
  if (loansResult.error) failedCategories++;
  for (const row of loansResult.data ?? []) {
    results.push({
      id: row.id,
      type: "loan",
      label: row.person_name,
      sublabel: `${row.loan_type === "lent" ? "Lent" : "Borrowed"} · ${row.status}`,
      url: `/loans/${row.id}`,
    });
  }

  // Accounts
  if (accountsResult.error) failedCategories++;
  for (const row of accountsResult.data ?? []) {
    results.push({
      id: row.id,
      type: "account",
      label: row.name,
      sublabel: `${row.account_type} · ${row.currency}`,
      url: `/accounts/${row.id}`,
    });
  }

  // Tuition students
  if (studentsResult.error) failedCategories++;
  for (const row of studentsResult.data ?? []) {
    results.push({
      id: row.id,
      type: "student",
      label: row.student_name,
      sublabel: `Tuition · ৳${Number(row.monthly_fee).toLocaleString()}/mo${row.is_active ? "" : " · inactive"}`,
      url: `/tuition`,
    });
  }

  // Deposits
  if (depositsResult.error) failedCategories++;
  for (const row of depositsResult.data ?? []) {
    results.push({
      id: row.id,
      type: "deposit",
      label: row.name,
      sublabel: `Deposit · ${row.currency} · ${row.status}`,
      url: `/deposits/${row.id}`,
    });
  }

  // Investments
  if (investmentsResult.error) failedCategories++;
  for (const row of investmentsResult.data ?? []) {
    results.push({
      id: row.id,
      type: "investment",
      label: row.name,
      sublabel: `Investment · ${row.currency} · ${row.status}`,
      url: `/investments/${row.id}`,
    });
  }

  // Long-term assets
  if (assetsResult.error) failedCategories++;
  for (const row of assetsResult.data ?? []) {
    results.push({
      id: row.id,
      type: "asset",
      label: row.name,
      sublabel: `Asset · ${row.currency} · ${row.status}`,
      url: `/long-term-assets/${row.id}`,
    });
  }

  const failedAll =
    failedCategories > 0 && results.length === 0;

  return NextResponse.json<SearchResponse>(
    {
      results,
      query,
      partial: failedCategories > 0,
    },
    failedAll ? { status: 502 } : undefined,
  );
}
