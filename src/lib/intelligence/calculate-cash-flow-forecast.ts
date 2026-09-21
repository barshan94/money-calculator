export type CashFlowForecastHistory = {
  month: string;
  income: number;
  expenses: number;
};

export type CashFlowForecastInput = {
  history: CashFlowForecastHistory[];
  lookbackMonths: number;
  months: number;
};

export type CashFlowForecastMonth = {
  monthIndex: number;
  projectedIncome: number;
  projectedExpenses: number;
  projectedNet: number;
};

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

export function calculateCashFlowForecast(
  input: CashFlowForecastInput,
): CashFlowForecastMonth[] {
  if (
    !Number.isInteger(input.lookbackMonths) ||
    input.lookbackMonths <= 0 ||
    !Number.isInteger(input.months) ||
    input.months <= 0
  ) {
    return [];
  }

  const validHistory = input.history.filter(
    (month) =>
      Number.isFinite(month.income) &&
      Number.isFinite(month.expenses),
  );

  if (validHistory.length === 0) {
    return [];
  }

  const recentHistory = validHistory.slice(
    -input.lookbackMonths,
  );

  const baselineMonthlyIncome = average(
    recentHistory.map((month) => month.income),
  );

  const baselineMonthlyExpenses = average(
    recentHistory.map((month) => month.expenses),
  );

  if (
    baselineMonthlyIncome === null ||
    baselineMonthlyExpenses === null
  ) {
    return [];
  }

  return Array.from(
    { length: input.months },
    (_, index) => {
      const projectedIncome = baselineMonthlyIncome;
      const projectedExpenses =
        baselineMonthlyExpenses;

      return {
        monthIndex: index + 1,
        projectedIncome,
        projectedExpenses,
        projectedNet:
          projectedIncome - projectedExpenses,
      };
    },
  );
}
