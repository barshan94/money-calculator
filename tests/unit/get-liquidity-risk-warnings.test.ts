import { describe, expect, it, vi } from "vitest";

const {
  mockGetFinancialHealth,
} = vi.hoisted(() => ({
  mockGetFinancialHealth: vi.fn(),
}));

vi.mock(
  "@/lib/intelligence/get-financial-health",
  () => ({
    getFinancialHealth:
      mockGetFinancialHealth,
  }),
);

import { getLiquidityRiskWarnings } from "@/lib/intelligence/get-liquidity-risk-warnings";

describe("getLiquidityRiskWarnings", () => {
  it("returns warnings for each currency", async () => {
    mockGetFinancialHealth.mockResolvedValue([
      {
        currency: "BDT",
        metrics: {
          monthsOfHistory: 12,
          averageMonthlyIncome: 10000,
          averageMonthlyExpenses: 5000,
          averageMonthlySurplus: 5000,
          savingsRate: 50,
          expenseRatio: 50,
          liquidCoverageMonths: 0.5,
          receivableDependency: 60,
          recurringExpenseBurden: 70,
        },
      },
    ]);

    const result =
      await getLiquidityRiskWarnings();

    expect(result).toHaveLength(1);
    expect(result[0].currency).toBe("BDT");
    expect(result[0].warnings).toHaveLength(3);

    expect(result[0].warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "low_liquid_coverage",
        }),
        expect.objectContaining({
          type: "high_receivable_dependency",
        }),
        expect.objectContaining({
          type: "high_recurring_expense_burden",
        }),
      ]),
    );
  });

  it("returns an empty warning list when metrics are within thresholds", async () => {
    mockGetFinancialHealth.mockResolvedValue([
      {
        currency: "BDT",
        metrics: {
          monthsOfHistory: 12,
          averageMonthlyIncome: 10000,
          averageMonthlyExpenses: 5000,
          averageMonthlySurplus: 5000,
          savingsRate: 50,
          expenseRatio: 50,
          liquidCoverageMonths: 3,
          receivableDependency: 20,
          recurringExpenseBurden: 30,
        },
      },
    ]);

    const result =
      await getLiquidityRiskWarnings();

    expect(result).toEqual([
      {
        currency: "BDT",
        warnings: [],
      },
    ]);
  });

  it("preserves currencies separately", async () => {
    mockGetFinancialHealth.mockResolvedValue([
      {
        currency: "BDT",
        metrics: {
          monthsOfHistory: 12,
          averageMonthlyIncome: 10000,
          averageMonthlyExpenses: 5000,
          averageMonthlySurplus: 5000,
          savingsRate: 50,
          expenseRatio: 50,
          liquidCoverageMonths: 2,
          receivableDependency: 20,
          recurringExpenseBurden: 30,
        },
      },
      {
        currency: "USD",
        metrics: {
          monthsOfHistory: 12,
          averageMonthlyIncome: 1000,
          averageMonthlyExpenses: 500,
          averageMonthlySurplus: 500,
          savingsRate: 50,
          expenseRatio: 50,
          liquidCoverageMonths: 0.5,
          receivableDependency: 20,
          recurringExpenseBurden: 30,
        },
      },
    ]);

    const result =
      await getLiquidityRiskWarnings();

    expect(result).toHaveLength(2);
    expect(result[0].currency).toBe("BDT");
    expect(result[0].warnings).toHaveLength(0);
    expect(result[1].currency).toBe("USD");
    expect(result[1].warnings).toHaveLength(1);
    expect(result[1].warnings[0].type).toBe(
      "low_liquid_coverage",
    );
  });

  it("propagates financial health errors", async () => {
    mockGetFinancialHealth.mockRejectedValue(
      new Error("Financial health failed"),
    );

    await expect(
      getLiquidityRiskWarnings(),
    ).rejects.toThrow(
      "Financial health failed",
    );
  });
});
