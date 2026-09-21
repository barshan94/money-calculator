import { describe, expect, it } from "vitest";
import {
  calculateIncomeExpenseTrends,
} from "../../src/lib/intelligence/calculate-income-expense-trends";

describe("calculateIncomeExpenseTrends", () => {
  it("returns insufficient data for empty history", () => {
    const result = calculateIncomeExpenseTrends([]);

    expect(result.monthsAnalyzed).toBe(0);
    expect(result.averageIncome).toBeNull();
    expect(result.averageExpenses).toBeNull();
    expect(result.averageNet).toBeNull();

    expect(result.incomeDirection).toBe("insufficient-data");
    expect(result.expenseDirection).toBe("insufficient-data");
    expect(result.netDirection).toBe("insufficient-data");
  });

  it("calculates averages and latest values for one month", () => {
    const result = calculateIncomeExpenseTrends([
      {
        month: "2026-08",
        income: 10000,
        expenses: 4000,
        net: 6000,
      },
    ]);

    expect(result.monthsAnalyzed).toBe(1);
    expect(result.averageIncome).toBe(10000);
    expect(result.averageExpenses).toBe(4000);
    expect(result.averageNet).toBe(6000);

    expect(result.latestIncome).toBe(10000);
    expect(result.latestExpenses).toBe(4000);
    expect(result.latestNet).toBe(6000);

    expect(result.incomeChange).toBeNull();
    expect(result.expenseChange).toBeNull();
    expect(result.netChange).toBeNull();

    expect(result.incomeDirection).toBe("insufficient-data");
  });

  it("calculates month-to-month percentage changes", () => {
    const result = calculateIncomeExpenseTrends([
      {
        month: "2026-08",
        income: 10000,
        expenses: 4000,
        net: 6000,
      },
      {
        month: "2026-09",
        income: 12000,
        expenses: 5000,
        net: 7000,
      },
    ]);

    expect(result.incomeChange).toBe(20);
    expect(result.expenseChange).toBe(25);
    expect(result.netChange).toBeCloseTo(16.6666667);

    expect(result.incomeDirection).toBe("up");
    expect(result.expenseDirection).toBe("up");
    expect(result.netDirection).toBe("up");
  });

  it("treats changes within one percent as stable", () => {
    const result = calculateIncomeExpenseTrends([
      {
        month: "2026-08",
        income: 10000,
        expenses: 5000,
        net: 5000,
      },
      {
        month: "2026-09",
        income: 10050,
        expenses: 4975,
        net: 5075,
      },
    ]);

    expect(result.incomeDirection).toBe("stable");
    expect(result.expenseDirection).toBe("stable");
  });

  it("detects downward trends", () => {
    const result = calculateIncomeExpenseTrends([
      {
        month: "2026-08",
        income: 12000,
        expenses: 6000,
        net: 6000,
      },
      {
        month: "2026-09",
        income: 10000,
        expenses: 4000,
        net: 6000,
      },
    ]);

    expect(result.incomeChange).toBeCloseTo(-16.6666667);
    expect(result.expenseChange).toBeCloseTo(-33.3333333);

    expect(result.incomeDirection).toBe("down");
    expect(result.expenseDirection).toBe("down");
  });

  it("ignores invalid historical rows", () => {
    const result = calculateIncomeExpenseTrends([
      {
        month: "2026-07",
        income: 10000,
        expenses: 4000,
        net: 6000,
      },
      {
        month: "2026-08",
        income: Number.NaN,
        expenses: 5000,
        net: 5000,
      },
      {
        month: "2026-09",
        income: 12000,
        expenses: 5000,
        net: 7000,
      },
    ]);

    expect(result.monthsAnalyzed).toBe(2);
    expect(result.latestIncome).toBe(12000);
    expect(result.incomeChange).toBe(20);
  });

  it("handles a zero previous value without inventing a percentage", () => {
    const result = calculateIncomeExpenseTrends([
      {
        month: "2026-08",
        income: 0,
        expenses: 0,
        net: 0,
      },
      {
        month: "2026-09",
        income: 10000,
        expenses: 2000,
        net: 8000,
      },
    ]);

    expect(result.incomeChange).toBeNull();
    expect(result.expenseChange).toBeNull();
    expect(result.netChange).toBeNull();

    expect(result.incomeDirection).toBe("insufficient-data");
  });
});
