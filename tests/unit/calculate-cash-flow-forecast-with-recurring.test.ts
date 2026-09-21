import { describe, expect, it } from "vitest";
import {
  calculateCashFlowForecastWithRecurring,
} from "../../src/lib/intelligence/calculate-cash-flow-forecast-with-recurring";

describe("calculateCashFlowForecastWithRecurring", () => {
  it("combines historical baseline with recurring income and expenses", () => {
    const result =
      calculateCashFlowForecastWithRecurring({
        history: [
          {
            month: "2026-01",
            income: 10000,
            expenses: 4000,
          },
          {
            month: "2026-02",
            income: 12000,
            expenses: 5000,
          },
        ],
        recurringTransactions: [
          {
            transactionType: "income",
            amount: 2000,
            frequency: "monthly",
          },
          {
            transactionType: "expense",
            amount: 1000,
            frequency: "monthly",
          },
        ],
        lookbackMonths: 2,
        months: 2,
      });

    expect(result).toEqual([
      {
        monthIndex: 1,
        projectedIncome: 13000,
        projectedExpenses: 5500,
        projectedNet: 7500,
      },
      {
        monthIndex: 2,
        projectedIncome: 13000,
        projectedExpenses: 5500,
        projectedNet: 7500,
      },
    ]);
  });

  it("does not let recurring transfers affect the forecast", () => {
    const result =
      calculateCashFlowForecastWithRecurring({
        history: [
          {
            month: "2026-01",
            income: 10000,
            expenses: 4000,
          },
        ],
        recurringTransactions: [
          {
            transactionType: "transfer",
            amount: 5000,
            frequency: "monthly",
          },
        ],
        lookbackMonths: 1,
        months: 1,
      });

    expect(result[0]).toEqual({
      monthIndex: 1,
      projectedIncome: 10000,
      projectedExpenses: 4000,
      projectedNet: 6000,
    });
  });

  it("returns an empty forecast when the historical forecast is invalid", () => {
    const result =
      calculateCashFlowForecastWithRecurring({
        history: [],
        recurringTransactions: [
          {
            transactionType: "income",
            amount: 2000,
            frequency: "monthly",
          },
        ],
        lookbackMonths: 3,
        months: 3,
      });

    expect(result).toEqual([]);
  });
});
