import {
  calculateCashFlowForecast,
  type CashFlowForecastHistory,
  type CashFlowForecastMonth,
} from "./calculate-cash-flow-forecast";
import {
  calculateRecurringCashFlow,
  type RecurringCashFlowInput,
} from "./calculate-recurring-cash-flow";

export type CashFlowForecastWithRecurringInput = {
  history: CashFlowForecastHistory[];
  recurringTransactions: RecurringCashFlowInput[];
  lookbackMonths: number;
  months: number;
};

export function calculateCashFlowForecastWithRecurring(
  input: CashFlowForecastWithRecurringInput,
): CashFlowForecastMonth[] {
  const baselineForecast = calculateCashFlowForecast({
    history: input.history,
    lookbackMonths: input.lookbackMonths,
    months: input.months,
  });

  if (baselineForecast.length === 0) {
    return [];
  }

  const recurring = calculateRecurringCashFlow(
    input.recurringTransactions,
  );

  return baselineForecast.map((month) => ({
    ...month,
    projectedIncome:
      month.projectedIncome + recurring.monthlyIncome,
    projectedExpenses:
      month.projectedExpenses +
      recurring.monthlyExpenses,
    projectedNet:
      month.projectedNet +
      recurring.monthlyIncome -
      recurring.monthlyExpenses,
  }));
}
