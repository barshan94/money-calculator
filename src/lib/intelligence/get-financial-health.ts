import { getLiquiditySummary } from "../finance/get-liquidity-summary";
import { getMonthlyIncomeExpense } from "../finance/get-monthly-income-expense";
import { getRecurringTransactions } from "../finance/get-recurring-transactions";
import {
  calculateFinancialHealthMetrics,
  type FinancialHealthMetrics,
} from "./get-financial-health-metrics";
import { calculateRecurringMonthlyExpenses } from "./normalize-recurring-expenses";

export type FinancialHealth = {
  currency: string;
  metrics: FinancialHealthMetrics;
};

export async function getFinancialHealth(): Promise<
  FinancialHealth[]
> {
  const [liquidity, recurringTransactions] =
    await Promise.all([
      getLiquiditySummary(),
      getRecurringTransactions(),
    ]);

  const currencies = new Set<string>();

  for (const item of liquidity) {
    currencies.add(item.currency);
  }

  for (const item of recurringTransactions) {
    currencies.add(item.currency);
  }

  const results: FinancialHealth[] = [];

  for (const currency of currencies) {
    const history =
      await getMonthlyIncomeExpense(currency);

    const currencyLiquidity =
      liquidity.find(
        (item) => item.currency === currency,
      );

    const recurringMonthlyExpenses =
      calculateRecurringMonthlyExpenses(
        recurringTransactions
          .filter(
            (item) =>
              item.currency === currency &&
              item.transactionType === "expense",
          )
          .map((item) => ({
            amount: item.amount,
            frequency: item.frequency,
          })),
      );

    results.push({
      currency,
      metrics: calculateFinancialHealthMetrics({
        history,
        liquidity: {
          totalAssets:
            currencyLiquidity?.totalAssets ?? 0,
          immediateLiquid:
            currencyLiquidity?.immediateLiquid ?? 0,
          receivables:
            currencyLiquidity?.receivables ?? 0,
        },
        recurringMonthlyExpenses,
      }),
    });
  }

  return results;
}


