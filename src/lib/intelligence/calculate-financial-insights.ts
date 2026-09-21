export type FinancialInsightType =
  | "health"
  | "trend"
  | "forecast"
  | "goal"
  | "budget"
  | "risk";

export type FinancialInsightSeverity =
  | "info"
  | "warning"
  | "critical";

export type FinancialInsight = {
  type: FinancialInsightType;
  severity: FinancialInsightSeverity;
  title: string;
  message: string;
  value?: number;
  unit?: "currency" | "percent" | "months" | "days" | "count";
};

export type FinancialInsightRiskWarning = {
  severity: "warning" | "critical";
  title: string;
  message: string;
  value: number;
  threshold: number;
  type:
    | "low_liquid_coverage"
    | "high_receivable_dependency"
    | "high_recurring_expense_burden";
};

export type FinancialInsightsInput = {
  averageMonthlyIncome: number | null;
  averageMonthlyExpenses: number | null;
  averageMonthlySurplus: number | null;
  savingsRate: number | null;
  expenseRatio: number | null;

  incomeDirection:
    | "up"
    | "down"
    | "stable"
    | "insufficient-data";
  expenseDirection:
    | "up"
    | "down"
    | "stable"
    | "insufficient-data";
  netDirection:
    | "up"
    | "down"
    | "stable"
    | "insufficient-data";

  latestNet: number | null;

  projectedCashFlowNet: number | null;
  projectedNetWorthChange: number | null;

  goalCount: number;
  goalsPastDue: number;
  goalsCompleted: number;

  budgetCount: number;
  budgetsAtRisk: number;
  budgetsProjectedOver: number;

  riskWarnings: FinancialInsightRiskWarning[];
};

export function calculateFinancialInsights(
  input: FinancialInsightsInput,
): FinancialInsight[] {
  const insights: FinancialInsight[] = [];

  if (
    input.averageMonthlyIncome !== null &&
    input.averageMonthlyExpenses !== null &&
    input.averageMonthlySurplus !== null
  ) {
    if (input.averageMonthlySurplus < 0) {
      insights.push({
        type: "health",
        severity: "critical",
        title: "Average monthly deficit",
        message:
          "Average monthly expenses are higher than average monthly income.",
        value: input.averageMonthlySurplus,
        unit: "currency",
      });
    } else if (input.averageMonthlySurplus > 0) {
      insights.push({
        type: "health",
        severity: "info",
        title: "Positive average monthly surplus",
        message:
          "Average monthly income is higher than average monthly expenses.",
        value: input.averageMonthlySurplus,
        unit: "currency",
      });
    }
  }

  if (
    input.savingsRate !== null &&
    Number.isFinite(input.savingsRate) &&
    input.savingsRate < 0
  ) {
    insights.push({
      type: "health",
      severity: "critical",
      title: "Negative savings rate",
      message:
        "Average monthly expenses exceed average monthly income.",
      value: input.savingsRate,
      unit: "percent",
    });
  }

  if (input.incomeDirection === "up") {
    insights.push({
      type: "trend",
      severity: "info",
      title: "Income is increasing",
      message:
        "The latest income is higher than the previous period.",
    });
  } else if (input.incomeDirection === "down") {
    insights.push({
      type: "trend",
      severity: "warning",
      title: "Income is decreasing",
      message:
        "The latest income is lower than the previous period.",
    });
  }

  if (input.expenseDirection === "up") {
    insights.push({
      type: "trend",
      severity: "warning",
      title: "Expenses are increasing",
      message:
        "The latest expenses are higher than the previous period.",
    });
  } else if (input.expenseDirection === "down") {
    insights.push({
      type: "trend",
      severity: "info",
      title: "Expenses are decreasing",
      message:
        "The latest expenses are lower than the previous period.",
    });
  }

  if (input.netDirection === "up") {
    insights.push({
      type: "trend",
      severity: "info",
      title: "Net cash flow is improving",
      message:
        "The latest net result is higher than the previous period.",
    });
  } else if (input.netDirection === "down") {
    insights.push({
      type: "trend",
      severity: "warning",
      title: "Net cash flow is declining",
      message:
        "The latest net result is lower than the previous period.",
    });
  }

  for (const warning of input.riskWarnings) {
    insights.push({
      type: "risk",
      severity: warning.severity,
      title: warning.title,
      message: warning.message,
      value: warning.value,
      unit:
        warning.type === "low_liquid_coverage"
          ? "months"
          : "percent",
    });
  }

  if (input.budgetsProjectedOver > 0) {
    insights.push({
      type: "budget",
      severity: "warning",
      title: "Budgets are projected to exceed their limits",
      message:
        "One or more active budgets are projected to exceed their configured limits.",
      value: input.budgetsProjectedOver,
      unit: "count",
    });
  } else if (input.budgetsAtRisk > 0) {
    insights.push({
      type: "budget",
      severity: "warning",
      title: "Budgets need attention",
      message:
        "One or more active budgets are currently projected to exceed their limits by a relatively small margin.",
      value: input.budgetsAtRisk,
      unit: "count",
    });
  }

  if (input.goalsPastDue > 0) {
    insights.push({
      type: "goal",
      severity: "warning",
      title: "Goals are past due",
      message:
        "One or more active goals have passed their target dates without being completed.",
      value: input.goalsPastDue,
      unit: "count",
    });
  }

  if (input.goalsCompleted > 0) {
    insights.push({
      type: "goal",
      severity: "info",
      title: "Goals completed",
      message:
        "One or more tracked goals have reached their target amounts.",
      value: input.goalsCompleted,
      unit: "count",
    });
  }

  if (
    input.projectedCashFlowNet !== null &&
    input.projectedCashFlowNet < 0
  ) {
    insights.push({
      type: "forecast",
      severity: "warning",
      title: "Projected negative cash flow",
      message:
        "The current cash-flow methodology projects a negative monthly net result.",
      value: input.projectedCashFlowNet,
      unit: "currency",
    });
  }

  if (
    input.projectedNetWorthChange !== null &&
    input.projectedNetWorthChange < 0
  ) {
    insights.push({
      type: "forecast",
      severity: "warning",
      title: "Projected net-worth decline",
      message:
        "The current net-worth methodology projects a decrease in net worth.",
      value: input.projectedNetWorthChange,
      unit: "currency",
    });
  }

  return insights;
}
