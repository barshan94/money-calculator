import {
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const email =
  process.env.PLAYWRIGHT_TEST_EMAIL;

const password =
  process.env.PLAYWRIGHT_TEST_PASSWORD;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables",
  );
}

if (!email || !password) {
  throw new Error(
    "Missing Playwright test credentials",
  );
}

let supabase: SupabaseClient;

type Category = {
  id: string;
  name: string;
  ledger_account_id: string;
  currency: string;
};

type AssetAccount = {
  id: string;
  currency: string;
};

function currentDate(): string {
  return new Date().toISOString();
}

function currentMonth(): string {
  return currentDate().slice(0, 7);
}

function futureDate(): string {
  return "2110-01-15T12:00:00.000Z";
}

function monthKey(value: unknown): string {
  return String(value).slice(0, 7);
}

async function getExpenseCategory(): Promise<Category> {
  const {
    data,
    error,
  } = await supabase
    .from("categories")
    .select(`
      id,
      name,
      ledger_account_id,
      accounts!inner(currency)
    `)
    .eq("category_type", "expense")
    .eq("is_archived", false)
    .not("ledger_account_id", "is", null)
    .limit(1)
    .single();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  const row = data as unknown as {
    id: string;
    name: string;
    ledger_account_id: string;
    accounts: {
      currency: string;
    };
  };

  return {
    id: row.id,
    name: row.name,
    ledger_account_id: row.ledger_account_id,
    currency: row.accounts.currency,
  };
}

async function getIncomeCategory(): Promise<Category> {
  const {
    data,
    error,
  } = await supabase
    .from("categories")
    .select(`
      id,
      name,
      ledger_account_id,
      accounts!inner(currency)
    `)
    .eq("category_type", "income")
    .eq("is_archived", false)
    .not("ledger_account_id", "is", null)
    .eq("accounts.currency", "BDT")
    .limit(1)
    .single();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  const row = data as unknown as {
    id: string;
    name: string;
    ledger_account_id: string;
    accounts: {
      currency: string;
    };
  };

  return {
    id: row.id,
    name: row.name,
    ledger_account_id: row.ledger_account_id,
    currency: row.accounts.currency,
  };
}

async function getBdtAssetAccount(): Promise<AssetAccount> {
  const {
    data,
    error,
  } = await supabase
    .from("accounts")
    .select("id, currency")
    .eq("is_system", false)
    .eq("is_archived", false)
    .eq("account_type", "asset")
    .eq("currency", "BDT")
    .limit(1)
    .single();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as AssetAccount;
}

async function createExpenseTransaction(
  category: Category,
  accountId: string,
  amount: number,
  transactionDate: string,
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "create_transaction",
    {
      p_transaction_date: transactionDate,
      p_description:
        "Financial report test expense",
      p_reference: null,
      p_notes: null,
      p_entries: [
        {
          account_id:
            category.ledger_account_id,
          category_id: category.id,
          amount,
          entry_type: "debit",
        },
        {
          account_id: accountId,
          category_id: null,
          amount,
          entry_type: "credit",
        },
      ],
    },
  );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as string;
}

async function createIncomeTransaction(
  category: Category,
  accountId: string,
  amount: number,
  transactionDate: string,
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "create_transaction",
    {
      p_transaction_date: transactionDate,
      p_description:
        "Financial report test income",
      p_reference: null,
      p_notes: null,
      p_entries: [
        {
          account_id: accountId,
          category_id: null,
          amount,
          entry_type: "debit",
        },
        {
          account_id:
            category.ledger_account_id,
          category_id: category.id,
          amount,
          entry_type: "credit",
        },
      ],
    },
  );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as string;
}

async function voidTransaction(
  transactionId: string,
) {
  const { error } =
    await supabase.rpc(
      "void_transaction",
      {
        p_transaction_id:
          transactionId,
      },
    );

  expect(error).toBeNull();
}

async function getFinancialSummaryRow() {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_financial_summary",
  );

  expect(error).toBeNull();

  return (
    (data ?? []) as Array<{
      currency: string;
      income: number | string;
      expense: number | string;
      profit: number | string;
    }>
  ).find(
    (row) => row.currency === "BDT",
  );
}

async function getMonthlyIncomeExpenseRow() {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_monthly_income_expense",
    {
      p_currency: "BDT",
    },
  );

  expect(error).toBeNull();

  return (
    (data ?? []) as Array<{
      month: string;
      income: number | string;
      expenses: number | string;
      net: number | string;
    }>
  ).find(
    (row) =>
      monthKey(row.month) ===
      currentMonth(),
  );
}

async function getMonthlyNetWorthRow() {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_monthly_net_worth",
    {
      p_currency: "BDT",
    },
  );

  expect(error).toBeNull();

  return (
    (data ?? []) as Array<{
      month: string;
      assets: number | string;
      liabilities: number | string;
      net_worth: number | string;
    }>
  ).find(
    (row) =>
      monthKey(row.month) ===
      currentMonth(),
  );
}

async function getReportsSummaryRow() {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_reports_summary",
  );

  expect(error).toBeNull();

  return (
    (data ?? []) as Array<{
      currency: string;
      income: number | string;
      expenses: number | string;
      assets: number | string;
      liabilities: number | string;
    }>
  ).find(
    (row) => row.currency === "BDT",
  );
}

describe("financial report calculations", () => {
  beforeAll(async () => {
    supabase = createClient(
      supabaseUrl,
      supabaseKey,
    );

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    expect(error).toBeNull();
  });

  it("calculates financial summary from income and expense transactions", async () => {
    const incomeCategory =
      await getIncomeCategory();

    const expenseCategory =
      await getExpenseCategory();

    const account =
      await getBdtAssetAccount();

    const before =
      await getFinancialSummaryRow();

    const beforeIncome =
      Number(before?.income ?? 0);

    const beforeExpense =
      Number(before?.expense ?? 0);

    const beforeProfit =
      Number(before?.profit ?? 0);

    const incomeTransaction =
      await createIncomeTransaction(
        incomeCategory,
        account.id,
        200,
        currentDate(),
      );

    const expenseTransaction =
      await createExpenseTransaction(
        expenseCategory,
        account.id,
        100,
        currentDate(),
      );

    const after =
      await getFinancialSummaryRow();

    expect(after).toBeTruthy();

    expect(Number(after!.income))
      .toBe(beforeIncome + 200);

    expect(Number(after!.expense))
      .toBe(beforeExpense + 100);

    expect(Number(after!.profit))
      .toBe(beforeProfit + 100);

    await voidTransaction(
      incomeTransaction,
    );

    await voidTransaction(
      expenseTransaction,
    );

    const restored =
      await getFinancialSummaryRow();

    expect(Number(restored?.income ?? 0))
      .toBe(beforeIncome);

    expect(Number(restored?.expense ?? 0))
      .toBe(beforeExpense);

    expect(Number(restored?.profit ?? 0))
      .toBe(beforeProfit);
  });

  it("calculates monthly income, expenses, and net", async () => {
    const incomeCategory =
      await getIncomeCategory();

    const expenseCategory =
      await getExpenseCategory();

    const account =
      await getBdtAssetAccount();

    const before =
      await getMonthlyIncomeExpenseRow();

    const beforeIncome =
      Number(before?.income ?? 0);

    const beforeExpenses =
      Number(before?.expenses ?? 0);

    const beforeNet =
      Number(before?.net ?? 0);

    const incomeTransaction =
      await createIncomeTransaction(
        incomeCategory,
        account.id,
        200,
        currentDate(),
      );

    const expenseTransaction =
      await createExpenseTransaction(
        expenseCategory,
        account.id,
        100,
        currentDate(),
      );

    const after =
      await getMonthlyIncomeExpenseRow();

    expect(after).toBeTruthy();

    expect(Number(after!.income))
      .toBe(beforeIncome + 200);

    expect(Number(after!.expenses))
      .toBe(beforeExpenses + 100);

    expect(Number(after!.net))
      .toBe(beforeNet + 100);

    await voidTransaction(
      incomeTransaction,
    );

    await voidTransaction(
      expenseTransaction,
    );

    const restored =
      await getMonthlyIncomeExpenseRow();

    expect(Number(restored?.income ?? 0))
      .toBe(beforeIncome);

    expect(Number(restored?.expenses ?? 0))
      .toBe(beforeExpenses);

    expect(Number(restored?.net ?? 0))
      .toBe(beforeNet);
  });

  it("calculates monthly net worth from asset and liability effects", async () => {
    const incomeCategory =
      await getIncomeCategory();

    const account =
      await getBdtAssetAccount();

    const before =
      await getMonthlyNetWorthRow();

    const beforeAssets =
      Number(before?.assets ?? 0);

    const beforeLiabilities =
      Number(before?.liabilities ?? 0);

    const beforeNetWorth =
      Number(before?.net_worth ?? 0);

    const transaction =
      await createIncomeTransaction(
        incomeCategory,
        account.id,
        200,
        currentDate(),
      );

    const after =
      await getMonthlyNetWorthRow();

    expect(after).toBeTruthy();

    expect(Number(after!.assets))
      .toBe(beforeAssets + 200);

    expect(Number(after!.liabilities))
      .toBe(beforeLiabilities);

    expect(Number(after!.net_worth))
      .toBe(beforeNetWorth + 200);

    await voidTransaction(
      transaction,
    );

    const restored =
      await getMonthlyNetWorthRow();

    expect(Number(restored?.assets ?? 0))
      .toBe(beforeAssets);

    expect(Number(restored?.liabilities ?? 0))
      .toBe(beforeLiabilities);

    expect(Number(restored?.net_worth ?? 0))
      .toBe(beforeNetWorth);
  });

  it("calculates all-time reports summary", async () => {
    const incomeCategory =
      await getIncomeCategory();

    const expenseCategory =
      await getExpenseCategory();

    const account =
      await getBdtAssetAccount();

    const before =
      await getReportsSummaryRow();

    const beforeIncome =
      Number(before?.income ?? 0);

    const beforeExpenses =
      Number(before?.expenses ?? 0);

    const beforeAssets =
      Number(before?.assets ?? 0);

    const beforeLiabilities =
      Number(before?.liabilities ?? 0);

    const incomeTransaction =
      await createIncomeTransaction(
        incomeCategory,
        account.id,
        200,
        currentDate(),
      );

    const expenseTransaction =
      await createExpenseTransaction(
        expenseCategory,
        account.id,
        100,
        currentDate(),
      );

    const after =
      await getReportsSummaryRow();

    expect(after).toBeTruthy();

    expect(Number(after!.income))
      .toBe(beforeIncome + 200);

    expect(Number(after!.expenses))
      .toBe(beforeExpenses + 100);

    expect(Number(after!.assets))
      .toBe(beforeAssets + 100);

    expect(Number(after!.liabilities))
      .toBe(beforeLiabilities);

    await voidTransaction(
      incomeTransaction,
    );

    await voidTransaction(
      expenseTransaction,
    );

    const restored =
      await getReportsSummaryRow();

    expect(Number(restored?.income ?? 0))
      .toBe(beforeIncome);

    expect(Number(restored?.expenses ?? 0))
      .toBe(beforeExpenses);

    expect(Number(restored?.assets ?? 0))
      .toBe(beforeAssets);

    expect(Number(restored?.liabilities ?? 0))
      .toBe(beforeLiabilities);
  });

  it("calculates budget progress and removes voided spending", async () => {
    const category =
      await getExpenseCategory();

    const budgetStart =
      "2110-01-01";

    const {
      data: budgetId,
      error: budgetError,
    } = await supabase.rpc(
      "create_budget",
      {
        p_category_id: category.id,
        p_amount: 500,
        p_currency: category.currency,
        p_period: "monthly",
        p_start_date: budgetStart,
        p_end_date: null,
      },
    );

    expect(budgetError).toBeNull();
    expect(budgetId).toBeTruthy();

    const {
      data: beforeData,
      error: beforeError,
    } = await supabase.rpc(
      "get_budget_progress",
    );

    expect(beforeError).toBeNull();

    const before = (
      (beforeData ?? []) as Array<{
        id: string;
        spent: number | string;
        remaining: number | string;
        percentage: number | string;
      }>
    ).find(
      (row) => row.id === budgetId,
    );

    expect(before).toBeTruthy();

    const beforeSpent =
      Number(before!.spent);

    const beforeRemaining =
      Number(before!.remaining);

    const beforePercentage =
      Number(before!.percentage);

    const {
      data: accounts,
      error: accountError,
    } = await supabase
      .from("accounts")
      .select("id")
      .eq("is_system", false)
      .eq("is_archived", false)
      .eq("account_type", "asset")
      .eq("currency", category.currency)
      .limit(1);

    expect(accountError).toBeNull();
    expect(accounts).toHaveLength(1);

    const transaction =
      await createExpenseTransaction(
        category,
        accounts![0].id,
        100,
        futureDate(),
      );

    const {
      data: afterData,
      error: afterError,
    } = await supabase.rpc(
      "get_budget_progress",
    );

    expect(afterError).toBeNull();

    const after = (
      (afterData ?? []) as Array<{
        id: string;
        spent: number | string;
        remaining: number | string;
        percentage: number | string;
      }>
    ).find(
      (row) => row.id === budgetId,
    );

    expect(after).toBeTruthy();

    expect(Number(after!.spent))
      .toBe(beforeSpent + 100);

    expect(Number(after!.remaining))
      .toBe(beforeRemaining - 100);

    expect(Number(after!.percentage))
      .toBe(beforePercentage + 20);

    await voidTransaction(
      transaction,
    );

    const {
      data: restoredData,
      error: restoredError,
    } = await supabase.rpc(
      "get_budget_progress",
    );

    expect(restoredError).toBeNull();

    const restored = (
      (restoredData ?? []) as Array<{
        id: string;
        spent: number | string;
        remaining: number | string;
        percentage: number | string;
      }>
    ).find(
      (row) => row.id === budgetId,
    );

    expect(restored).toBeTruthy();

    expect(Number(restored!.spent))
      .toBe(beforeSpent);

    expect(Number(restored!.remaining))
      .toBe(beforeRemaining);

    expect(Number(restored!.percentage))
      .toBe(beforePercentage);

    const {
      error: archiveError,
    } = await supabase.rpc(
      "archive_budget",
      {
        p_budget_id: budgetId,
      },
    );

    expect(archiveError).toBeNull();

    const {
      error: deleteError,
    } = await supabase.rpc(
      "delete_budget",
      {
        p_budget_id: budgetId,
      },
    );

    expect(deleteError).toBeNull();
  });
});

