import { getAccountBalances } from "../finance/get-account-balances";
import { getMonthlyIncomeExpense } from "../finance/get-monthly-income-expense";
import { getRecurringTransactions } from "../finance/get-recurring-transactions";
import { calculateCashFlowForecast } from "./calculate-cash-flow-forecast";
import {
  calculateRecurringCashFlowByMonth,
  type RecurringCashFlowByMonthInput,
} from "./calculate-recurring-cash-flow-by-month";

export type CashFlowForecast = {
  currency: string;
  months: ReturnType<typeof calculateCashFlowForecast>;
};

export type GetCashFlowForecastOptions = {
  lookbackMonths: number;
  months: number;
  startDate?: string;
};

export async function getCashFlowForecast(
  options: GetCashFlowForecastOptions,
): Promise<CashFlowForecast[]> {
  const {
    lookbackMonths,
    months,
    startDate = new Date().toISOString().slice(0, 10),
  } = options;

  const [accountBalances, recurringTransactions] =
    await Promise.all([
      getAccountBalances(),
      getRecurringTransactions(),
    ]);

  const currencies = new Set<string>();

  for (const account of accountBalances) {
    currencies.add(account.currency);
  }

  for (const transaction of recurringTransactions) {
    currencies.add(transaction.currency);
  }

  const results: CashFlowForecast[] = [];

  for (const currency of currencies) {
    const history = await getMonthlyIncomeExpense(currency);

    const baseline = calculateCashFlowForecast({
      history,
      lookbackMonths,
      months,
    });

    if (baseline.length === 0) {
      continue;
    }

    const recurringInput: RecurringCashFlowByMonthInput[] =
      recurringTransactions
        .filter(
          (transaction) =>
            transaction.currency === currency,
        )
        .map((transaction) => ({
          transactionType:
            transaction.transactionType,
          amount: transaction.amount,
          frequency: transaction.frequency,
          nextRunDate:
            transaction.nextRunDate,
        }));

    const recurring =
      calculateRecurringCashFlowByMonth(
        recurringInput,
        startDate,
        months,
      );

    const combined = baseline.map(
      (month, index) => ({
        ...month,
        projectedIncome:
          month.projectedIncome +
          recurring[index].monthlyIncome,
        projectedExpenses:
          month.projectedExpenses +
          recurring[index].monthlyExpenses,
        projectedNet:
          month.projectedNet +
          recurring[index].monthlyIncome -
          recurring[index].monthlyExpenses,
      }),
    );

    results.push({
      currency,
      months: combined,
    });
  }

  return results;
}

