import { getAccountBalances } from "../finance/get-account-balances";
import { getMonthlyNetWorth } from "../finance/get-monthly-net-worth";
import {
  calculateNetWorthForecast,
  type NetWorthForecastMonth,
} from "./calculate-net-worth-forecast";

export type NetWorthForecast = {
  currency: string;
  months: NetWorthForecastMonth[];
};

export type GetNetWorthForecastOptions = {
  lookbackMonths: number;
  months: number;
};

export async function getNetWorthForecast(
  options: GetNetWorthForecastOptions,
): Promise<NetWorthForecast[]> {
  const {
    lookbackMonths,
    months,
  } = options;

  const accountBalances =
    await getAccountBalances();

  const currencies = new Set<string>();

  for (const account of accountBalances) {
    currencies.add(account.currency);
  }

  const results: NetWorthForecast[] = [];

  for (const currency of currencies) {
    const history =
      await getMonthlyNetWorth(currency);

    if (history.length === 0) {
      continue;
    }

    const forecast =
      calculateNetWorthForecast({
        history: history.map((month) => ({
          month: month.month,
          netWorth: month.net_worth,
        })),
        lookbackMonths,
        months,
      });

    if (forecast.length === 0) {
      continue;
    }

    results.push({
      currency,
      months: forecast,
    });
  }

  return results;
}

