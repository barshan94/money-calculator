import { describe, expect, it } from "vitest";
import {
  calculateRecurringCashFlow,
} from "../../src/lib/intelligence/calculate-recurring-cash-flow";

describe("calculateRecurringCashFlow", () => {
  it("converts recurring income to a monthly amount", () => {
    const result = calculateRecurringCashFlow([
      {
        transactionType: "income",
        amount: 12000,
        frequency: "monthly",
      },
      {
        transactionType: "income",
        amount: 1200,
        frequency: "yearly",
      },
    ]);

    expect(result.monthlyIncome).toBe(12100);
    expect(result.monthlyExpenses).toBe(0);
  });

  it("converts recurring expenses to a monthly amount", () => {
    const result = calculateRecurringCashFlow([
      {
        transactionType: "expense",
        amount: 100,
        frequency: "daily",
      },
      {
        transactionType: "expense",
        amount: 500,
        frequency: "weekly",
      },
      {
        transactionType: "expense",
        amount: 2000,
        frequency: "monthly",
      },
      {
        transactionType: "expense",
        amount: 12000,
        frequency: "yearly",
      },
    ]);

    expect(result.monthlyExpenses).toBeCloseTo(
      (100 * 365) / 12 +
        (500 * 52) / 12 +
        2000 +
        12000 / 12,
    );
  });

  it("ignores transfers", () => {
    const result = calculateRecurringCashFlow([
      {
        transactionType: "transfer",
        amount: 10000,
        frequency: "monthly",
      },
    ]);

    expect(result).toEqual({
      monthlyIncome: 0,
      monthlyExpenses: 0,
    });
  });

  it("ignores invalid or negative amounts", () => {
    const result = calculateRecurringCashFlow([
      {
        transactionType: "income",
        amount: Number.NaN,
        frequency: "monthly",
      },
      {
        transactionType: "expense",
        amount: -500,
        frequency: "monthly",
      },
    ]);

    expect(result).toEqual({
      monthlyIncome: 0,
      monthlyExpenses: 0,
    });
  });

  it("handles multiple income and expense transactions", () => {
    const result = calculateRecurringCashFlow([
      {
        transactionType: "income",
        amount: 10000,
        frequency: "monthly",
      },
      {
        transactionType: "income",
        amount: 500,
        frequency: "weekly",
      },
      {
        transactionType: "expense",
        amount: 3000,
        frequency: "monthly",
      },
      {
        transactionType: "expense",
        amount: 12000,
        frequency: "yearly",
      },
    ]);

    expect(result.monthlyIncome).toBeCloseTo(
      10000 + (500 * 52) / 12,
    );

    expect(result.monthlyExpenses).toBe(4000);
  });
});
