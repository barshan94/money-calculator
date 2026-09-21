import { getFinancialHealth } from "./get-financial-health";
import { getIncomeExpenseTrends } from "./get-income-expense-trends";
import { getCashFlowForecast } from "./get-cash-flow-forecast";
import { getNetWorthForecast } from "./get-net-worth-forecast";
import { getGoalForecasts } from "./get-goal-forecasts";
import { getBudgetIntelligence } from "./get-budget-intelligence";
import { getLiquidityRiskWarnings } from "./get-liquidity-risk-warnings";
import {
  calculateFinancialInsights,
  type FinancialInsight,
} from "./calculate-financial-insights";

export type FinancialInsightsByCurrency = {
  currency: string;
  insights: FinancialInsight[];
};

export async function getFinancialInsights(): Promise<
  FinancialInsightsByCurrency[]
> {
  const lookbackMonths = 6;
  const forecastMonths = 6;

  const [
    financialHealth,
    incomeExpenseTrends,
    cashFlowForecast,
    netWorthForecast,
    goalForecasts,
    budgetIntelligence,
    liquidityRiskWarnings,
  ] = await Promise.all([
    getFinancialHealth(),
    getIncomeExpenseTrends(),
    getCashFlowForecast({
      lookbackMonths,
      months: forecastMonths,
    }),
    getNetWorthForecast({
      lookbackMonths,
      months: forecastMonths,
    }),
    getGoalForecasts(),
    getBudgetIntelligence(),
    getLiquidityRiskWarnings(),
  ]);

  const currencies = new Set<string>();

  for (const item of financialHealth) {
    currencies.add(item.currency);
  }

  for (const item of incomeExpenseTrends) {
    currencies.add(item.currency);
  }

  for (const item of cashFlowForecast) {
    currencies.add(item.currency);
  }

  for (const item of netWorthForecast) {
    currencies.add(item.currency);
  }

  for (const item of goalForecasts) {
    currencies.add(item.currency);
  }

  for (const item of budgetIntelligence) {
    currencies.add(item.currency);
  }

  for (const item of liquidityRiskWarnings) {
    currencies.add(item.currency);
  }

  const results: FinancialInsightsByCurrency[] = [];

  for (const currency of currencies) {
    const health = financialHealth.find(
      (item) => item.currency === currency,
    );

    const trends = incomeExpenseTrends.find(
      (item) => item.currency === currency,
    );

    const cashFlow = cashFlowForecast.find(
      (item) => item.currency === currency,
    );

    const netWorth = netWorthForecast.find(
      (item) => item.currency === currency,
    );

    const goals = goalForecasts.filter(
      (item) => item.currency === currency,
    );

    const budgets = budgetIntelligence.filter(
      (item) => item.currency === currency,
    );

    const risk = liquidityRiskWarnings.find(
      (item) => item.currency === currency,
    );

    const insights = calculateFinancialInsights({
      averageMonthlyIncome:
        health?.metrics.averageMonthlyIncome ?? null,

      averageMonthlyExpenses:
        health?.metrics.averageMonthlyExpenses ?? null,

      averageMonthlySurplus:
        health?.metrics.averageMonthlySurplus ?? null,

      savingsRate:
        health?.metrics.savingsRate ?? null,

      expenseRatio:
        health?.metrics.expenseRatio ?? null,

      incomeDirection:
        trends?.trends.incomeDirection ??
        "insufficient-data",

      expenseDirection:
        trends?.trends.expenseDirection ??
        "insufficient-data",

      netDirection:
        trends?.trends.netDirection ??
        "insufficient-data",

      latestNet:
        trends?.trends.latestNet ?? null,

      projectedCashFlowNet:
        cashFlow?.months[0]?.projectedNet ?? null,

      projectedNetWorthChange:
        netWorth?.months[0]?.projectedChange ?? null,

      goalCount: goals.length,

      goalsPastDue: goals.filter(
        (goal) => goal.forecast.isPastDue,
      ).length,

      goalsCompleted: goals.filter(
        (goal) => goal.forecast.isCompleted,
      ).length,

      budgetCount: budgets.length,

      budgetsAtRisk: budgets.filter(
        (budget) =>
          budget.intelligence.status === "at_risk",
      ).length,

      budgetsProjectedOver: budgets.filter(
        (budget) =>
          budget.intelligence.status ===
          "projected_over_budget",
      ).length,

      riskWarnings:
        risk?.warnings ?? [],
    });

    results.push({
      currency,
      insights,
    });
  }

  return results;
}
