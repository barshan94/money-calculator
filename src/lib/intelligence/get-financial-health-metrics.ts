export type FinancialHealthHistory = {
  month: string;
  income: number;
  expenses: number;
  net: number;
};

export type FinancialHealthLiquidity = {
  totalAssets: number;
  immediateLiquid: number;
  receivables: number;
};

export type FinancialHealthInput = {
  history: FinancialHealthHistory[];
  liquidity: FinancialHealthLiquidity;
  recurringMonthlyExpenses: number;
};

export type FinancialHealthMetrics = {
  monthsOfHistory: number;
  averageMonthlyIncome: number | null;
  averageMonthlyExpenses: number | null;
  averageMonthlySurplus: number | null;
  savingsRate: number | null;
  expenseRatio: number | null;
  liquidCoverageMonths: number | null;
  receivableDependency: number | null;
  recurringExpenseBurden: number | null;
};

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function safePercentage(
  numerator: number,
  denominator: number,
): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return null;
  }

  if (denominator <= 0) {
    return null;
  }

  return (numerator / denominator) * 100;
}

export function calculateFinancialHealthMetrics(
  input: FinancialHealthInput,
): FinancialHealthMetrics {
  const history = input.history.filter(
    (month) =>
      Number.isFinite(month.income) &&
      Number.isFinite(month.expenses) &&
      Number.isFinite(month.net),
  );

  const averageMonthlyIncome = average(
    history.map((month) => month.income),
  );

  const averageMonthlyExpenses = average(
    history.map((month) => month.expenses),
  );

  const averageMonthlySurplus =
    averageMonthlyIncome !== null &&
    averageMonthlyExpenses !== null
      ? averageMonthlyIncome - averageMonthlyExpenses
      : null;

  const savingsRate =
    averageMonthlySurplus !== null &&
    averageMonthlyIncome !== null
      ? safePercentage(
          averageMonthlySurplus,
          averageMonthlyIncome,
        )
      : null;

  const expenseRatio =
    averageMonthlyExpenses !== null &&
    averageMonthlyIncome !== null
      ? safePercentage(
          averageMonthlyExpenses,
          averageMonthlyIncome,
        )
      : null;

  const liquidCoverageMonths =
    averageMonthlyExpenses !== null &&
    averageMonthlyExpenses > 0 &&
    Number.isFinite(input.liquidity.immediateLiquid)
      ? input.liquidity.immediateLiquid /
        averageMonthlyExpenses
      : null;

  const receivableDependency = safePercentage(
    input.liquidity.receivables,
    input.liquidity.totalAssets,
  );

  const recurringExpenseBurden =
    averageMonthlyIncome !== null
      ? safePercentage(
          input.recurringMonthlyExpenses,
          averageMonthlyIncome,
        )
      : null;

  return {
    monthsOfHistory: history.length,
    averageMonthlyIncome,
    averageMonthlyExpenses,
    averageMonthlySurplus,
    savingsRate,
    expenseRatio,
    liquidCoverageMonths,
    receivableDependency,
    recurringExpenseBurden,
  };
}

