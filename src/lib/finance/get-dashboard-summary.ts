import { createClient } from "@/lib/supabase/server";
import { getLoanBalances } from "@/lib/finance/get-loan-balances";

export type DashboardSummary = {
  loansLent: Record<string, number>;
  loansBorrowed: Record<string, number>;
  deposits: Record<string, number>;
  investments: Record<string, number>;
  goals: {
    count: number;
    totalTarget: Record<string, number>;
    totalCurrent: Record<string, number>;
  };
  budgets: {
    count: number;
    overBudget: number;
  };
  recurring: {
    count: number;
  };
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const [
    loans,
    depositsResult,
    investmentsResult,
    goalsResult,
    budgetsResult,
    recurringResult,
  ] = await Promise.all([
    getLoanBalances(),

    supabase
      .from("deposits")
      .select("currency, principal_amount, status")
      .eq("status", "active"),

    supabase
      .from("investment_performance")
      .select("currency, current_value, status, archived_at")
      .eq("status", "active")
      .is("archived_at", null),

    supabase
      .from("goals")
      .select(
        "currency, target_amount, current_amount, status",
      )
      .eq("status", "active"),

    supabase.rpc("get_budget_progress"),

    supabase
      .from("recurring_transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true),
  ]);

  if (depositsResult.error) {
    throw new Error(depositsResult.error.message);
  }

  if (investmentsResult.error) {
    throw new Error(investmentsResult.error.message);
  }

  if (goalsResult.error) {
    throw new Error(goalsResult.error.message);
  }

  if (budgetsResult.error) {
    throw new Error(budgetsResult.error.message);
  }

  if (recurringResult.error) {
    throw new Error(recurringResult.error.message);
  }

  const loansLent: Record<string, number> = {};
  const loansBorrowed: Record<string, number> = {};

  for (const loan of loans) {
    if (
      loan.status !== "active" ||
      Number(loan.remaining_amount) <= 0
    ) {
      continue;
    }

    const currency = loan.currency;
    const amount = Number(loan.remaining_amount);

    if (loan.loan_type === "lent") {
      loansLent[currency] =
        (loansLent[currency] ?? 0) + amount;
    }

    if (loan.loan_type === "borrowed") {
      loansBorrowed[currency] =
        (loansBorrowed[currency] ?? 0) + amount;
    }
  }

  const deposits: Record<string, number> = {};

  for (const deposit of depositsResult.data ?? []) {
    const currency = deposit.currency;

    deposits[currency] =
      (deposits[currency] ?? 0) +
      Number(deposit.principal_amount ?? 0);
  }

  const investments: Record<string, number> = {};

  for (const investment of investmentsResult.data ?? []) {
    const currency = investment.currency;

    investments[currency] =
      (investments[currency] ?? 0) +
      Number(investment.current_value ?? 0);
  }

  const goals = {
    count: 0,
    totalTarget: {} as Record<string, number>,
    totalCurrent: {} as Record<string, number>,
  };

  for (const goal of goalsResult.data ?? []) {
    const currency = goal.currency;

    goals.count += 1;

    goals.totalTarget[currency] =
      (goals.totalTarget[currency] ?? 0) +
      Number(goal.target_amount ?? 0);

    goals.totalCurrent[currency] =
      (goals.totalCurrent[currency] ?? 0) +
      Number(goal.current_amount ?? 0);
  }

  const budgets = {
    count: 0,
    overBudget: 0,
  };

  for (const budget of budgetsResult.data ?? []) {
    if (!budget.is_active) {
      continue;
    }

    budgets.count += 1;

    if (
      Number(budget.spent ?? 0) >
      Number(budget.amount ?? 0)
    ) {
      budgets.overBudget += 1;
    }
  }

  return {
    loansLent,
    loansBorrowed,
    deposits,
    investments,
    goals,
    budgets,
    recurring: {
      count: recurringResult.data?.length ?? 0,
    },
  };
}

