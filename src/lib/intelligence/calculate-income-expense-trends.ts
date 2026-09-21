export type IncomeExpenseTrendHistory = {
  month: string;
  income: number;
  expenses: number;
  net: number;
};

export type IncomeExpenseTrendDirection =
  | "up"
  | "down"
  | "stable"
  | "insufficient-data";

export type IncomeExpenseTrends = {
  monthsAnalyzed: number;

  averageIncome: number | null;
  averageExpenses: number | null;
  averageNet: number | null;

  latestIncome: number | null;
  latestExpenses: number | null;
  latestNet: number | null;

  incomeChange: number | null;
  expenseChange: number | null;
  netChange: number | null;

  incomeDirection: IncomeExpenseTrendDirection;
  expenseDirection: IncomeExpenseTrendDirection;
  netDirection: IncomeExpenseTrendDirection;
};

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return (
    values.reduce((total, value) => total + value, 0) /
    values.length
  );
}

function percentageChange(
  previous: number,
  current: number,
): number | null {
  if (
    !Number.isFinite(previous) ||
    !Number.isFinite(current)
  ) {
    return null;
  }

  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

function getDirection(
  change: number | null,
): IncomeExpenseTrendDirection {
  if (change === null) {
    return "insufficient-data";
  }

  const threshold = 1;

  if (change > threshold) {
    return "up";
  }

  if (change < -threshold) {
    return "down";
  }

  return "stable";
}

export function calculateIncomeExpenseTrends(
  history: IncomeExpenseTrendHistory[],
): IncomeExpenseTrends {
  const validHistory = history.filter(
    (month) =>
      Number.isFinite(month.income) &&
      Number.isFinite(month.expenses) &&
      Number.isFinite(month.net),
  );

  if (validHistory.length === 0) {
    return {
      monthsAnalyzed: 0,

      averageIncome: null,
      averageExpenses: null,
      averageNet: null,

      latestIncome: null,
      latestExpenses: null,
      latestNet: null,

      incomeChange: null,
      expenseChange: null,
      netChange: null,

      incomeDirection: "insufficient-data",
      expenseDirection: "insufficient-data",
      netDirection: "insufficient-data",
    };
  }

  const averageIncome = average(
    validHistory.map((month) => month.income),
  );

  const averageExpenses = average(
    validHistory.map((month) => month.expenses),
  );

  const averageNet = average(
    validHistory.map((month) => month.net),
  );

  const latest = validHistory[validHistory.length - 1];

  const previous =
    validHistory.length >= 2
      ? validHistory[validHistory.length - 2]
      : null;

  const incomeChange =
    previous !== null
      ? percentageChange(
          previous.income,
          latest.income,
        )
      : null;

  const expenseChange =
    previous !== null
      ? percentageChange(
          previous.expenses,
          latest.expenses,
        )
      : null;

  const netChange =
    previous !== null
      ? percentageChange(
          previous.net,
          latest.net,
        )
      : null;

  return {
    monthsAnalyzed: validHistory.length,

    averageIncome,
    averageExpenses,
    averageNet,

    latestIncome: latest.income,
    latestExpenses: latest.expenses,
    latestNet: latest.net,

    incomeChange,
    expenseChange,
    netChange,

    incomeDirection: getDirection(incomeChange),
    expenseDirection: getDirection(expenseChange),
    netDirection: getDirection(netChange),
  };
}

