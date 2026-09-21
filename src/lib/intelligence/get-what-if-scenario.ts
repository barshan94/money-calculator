import { getAccountBalances } from "../finance/get-account-balances";
import { getMonthlyIncomeExpense } from "../finance/get-monthly-income-expense";
import {
  calculateWhatIfScenario,
  type WhatIfScenarioResult,
} from "./calculate-what-if-scenario";

export type GetWhatIfScenarioOptions = {
  incomeChange: number;
  expenseChange: number;
  months: number;
  lookbackMonths?: number;
};

export type WhatIfScenario = {
  currency: string;
  scenario: WhatIfScenarioResult;
};

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return (
    values.reduce(
      (total, value) => total + value,
      0,
    ) / values.length
  );
}

export async function getWhatIfScenario(
  options: GetWhatIfScenarioOptions,
): Promise<WhatIfScenario[]> {
  const {
    incomeChange,
    expenseChange,
    months,
    lookbackMonths = 6,
  } = options;

  const accountBalances =
    await getAccountBalances();

  const currencies = new Set<string>();

  for (const account of accountBalances) {
    currencies.add(account.currency);
  }

  const results: WhatIfScenario[] = [];

  for (const currency of currencies) {
    const history =
      await getMonthlyIncomeExpense(currency);

    if (history.length === 0) {
      continue;
    }

    const validHistory = history.filter(
      (month) =>
        Number.isFinite(month.income) &&
        Number.isFinite(month.expenses),
    );

    const recentHistory = validHistory.slice(
      -lookbackMonths,
    );

    const averageIncome = average(
      recentHistory.map(
        (month) => month.income,
      ),
    );

    const averageExpenses = average(
      recentHistory.map(
        (month) => month.expenses,
      ),
    );

    if (
      averageIncome === null ||
      averageExpenses === null
    ) {
      continue;
    }

    const scenario =
      calculateWhatIfScenario({
        monthlyIncome: averageIncome,
        monthlyExpenses: averageExpenses,
        incomeChange,
        expenseChange,
        months,
      });

    if (scenario === null) {
      continue;
    }

    results.push({
      currency,
      scenario,
    });
  }

  return results;
}
