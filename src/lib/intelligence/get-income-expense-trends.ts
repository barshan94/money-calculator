import { getAccountBalances } from "../finance/get-account-balances";
import { getMonthlyIncomeExpense } from "../finance/get-monthly-income-expense";
import {
  calculateIncomeExpenseTrends,
  type IncomeExpenseTrends,
} from "./calculate-income-expense-trends";

export type IncomeExpenseTrendsResult = {
  currency: string;
  trends: IncomeExpenseTrends;
};

export async function getIncomeExpenseTrends(): Promise<
  IncomeExpenseTrendsResult[]
> {
  const accountBalances = await getAccountBalances();

  const currencies = new Set<string>();

  for (const account of accountBalances) {
    currencies.add(account.currency);
  }

  const results: IncomeExpenseTrendsResult[] = [];

  for (const currency of currencies) {
    const history = await getMonthlyIncomeExpense(currency);

    if (history.length === 0) {
      continue;
    }

    results.push({
      currency,
      trends: calculateIncomeExpenseTrends(history),
    });
  }

  return results;
}

