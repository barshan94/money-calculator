import { describe, expect, it } from "vitest";
import {
  calculateFinancialHealthMetrics,
  type FinancialHealthInput,
} from "../../src/lib/intelligence/get-financial-health-metrics";

function createInput(
  overrides: Partial<FinancialHealthInput> = {},
): FinancialHealthInput {
  return {
    history: [
      {
        month: "2026-01",
        income: 50000,
        expenses: 40000,
        net: 10000,
      },
      {
        month: "2026-02",
        income: 60000,
        expenses: 45000,
        net: 15000,
      },
    ],
    liquidity: {
      totalAssets: 200000,
      immediateLiquid: 100000,
      receivables: 20000,
    },
    recurringMonthlyExpenses: 10000,
    ...overrides,
  };
}

describe("calculateFinancialHealthMetrics", () => {
  it("calculates the main financial health metrics", () => {
    const result = calculateFinancialHealthMetrics(createInput());

    expect(result.monthsOfHistory).toBe(2);
    expect(result.averageMonthlyIncome).toBe(55000);
    expect(result.averageMonthlyExpenses).toBe(42500);
    expect(result.averageMonthlySurplus).toBe(12500);

    expect(result.savingsRate).toBeCloseTo(
      22.7272727273,
    );

    expect(result.expenseRatio).toBeCloseTo(
      77.2727272727,
    );

    expect(result.liquidCoverageMonths).toBeCloseTo(
      2.35294117647,
    );

    expect(result.receivableDependency).toBe(10);

    expect(result.recurringExpenseBurden).toBeCloseTo(
      18.1818181818,
    );
  });

  it("returns null percentage metrics when average income is zero", () => {
    const result = calculateFinancialHealthMetrics(
      createInput({
        history: [
          {
            month: "2026-01",
            income: 0,
            expenses: 10000,
            net: -10000,
          },
        ],
      }),
    );

    expect(result.averageMonthlyIncome).toBe(0);
    expect(result.averageMonthlyExpenses).toBe(10000);
    expect(result.averageMonthlySurplus).toBe(-10000);

    expect(result.savingsRate).toBeNull();
    expect(result.expenseRatio).toBeNull();
    expect(result.recurringExpenseBurden).toBeNull();

    expect(result.liquidCoverageMonths).toBe(10);
  });

  it("returns null liquid coverage when there is no expense baseline", () => {
    const result = calculateFinancialHealthMetrics(
      createInput({
        history: [
          {
            month: "2026-01",
            income: 50000,
            expenses: 0,
            net: 50000,
          },
        ],
      }),
    );

    expect(result.averageMonthlyExpenses).toBe(0);
    expect(result.liquidCoverageMonths).toBeNull();
  });

  it("returns null for receivable dependency when total assets are zero", () => {
    const result = calculateFinancialHealthMetrics(
      createInput({
        liquidity: {
          totalAssets: 0,
          immediateLiquid: 0,
          receivables: 0,
        },
      }),
    );

    expect(result.receivableDependency).toBeNull();
  });

  it("handles negative monthly surplus without clamping it", () => {
    const result = calculateFinancialHealthMetrics(
      createInput({
        history: [
          {
            month: "2026-01",
            income: 30000,
            expenses: 40000,
            net: -10000,
          },
        ],
      }),
    );

    expect(result.averageMonthlySurplus).toBe(-10000);
    expect(result.savingsRate).toBeCloseTo(-33.3333333333);
    expect(result.expenseRatio).toBeCloseTo(133.3333333333);
  });

  it("ignores invalid historical rows", () => {
    const result = calculateFinancialHealthMetrics(
      createInput({
        history: [
          {
            month: "2026-01",
            income: 50000,
            expenses: 40000,
            net: 10000,
          },
          {
            month: "2026-02",
            income: Number.NaN,
            expenses: 40000,
            net: Number.NaN,
          },
          {
            month: "2026-03",
            income: Number.POSITIVE_INFINITY,
            expenses: 40000,
            net: Number.POSITIVE_INFINITY,
          },
        ],
      }),
    );

    expect(result.monthsOfHistory).toBe(1);
    expect(result.averageMonthlyIncome).toBe(50000);
    expect(result.averageMonthlyExpenses).toBe(40000);
    expect(result.averageMonthlySurplus).toBe(10000);
  });

  it("supports empty historical data", () => {
    const result = calculateFinancialHealthMetrics(
      createInput({
        history: [],
      }),
    );

    expect(result.monthsOfHistory).toBe(0);
    expect(result.averageMonthlyIncome).toBeNull();
    expect(result.averageMonthlyExpenses).toBeNull();
    expect(result.averageMonthlySurplus).toBeNull();
    expect(result.savingsRate).toBeNull();
    expect(result.expenseRatio).toBeNull();
    expect(result.liquidCoverageMonths).toBeNull();
    expect(result.recurringExpenseBurden).toBeNull();
  });
});

