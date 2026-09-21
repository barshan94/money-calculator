import { describe, expect, it } from "vitest";
import { calculateLiquidityRiskWarnings } from "@/lib/intelligence/calculate-liquidity-risk-warnings";

describe("calculateLiquidityRiskWarnings", () => {
  it("warns when liquid coverage is below one month", () => {
    const result = calculateLiquidityRiskWarnings({
      liquidCoverageMonths: 0.7,
      receivableDependency: 20,
      recurringExpenseBurden: 30,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: "low_liquid_coverage",
      severity: "critical",
      value: 0.7,
      threshold: 1,
    });
  });

  it("warns when receivable dependency exceeds 50 percent", () => {
    const result = calculateLiquidityRiskWarnings({
      liquidCoverageMonths: 3,
      receivableDependency: 60,
      recurringExpenseBurden: 30,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: "high_receivable_dependency",
      severity: "warning",
      value: 60,
      threshold: 50,
    });
  });

  it("warns when recurring expenses exceed 50 percent of income", () => {
    const result = calculateLiquidityRiskWarnings({
      liquidCoverageMonths: 3,
      receivableDependency: 20,
      recurringExpenseBurden: 60,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: "high_recurring_expense_burden",
      severity: "warning",
      value: 60,
      threshold: 50,
    });
  });

  it("returns all applicable warnings", () => {
    const result = calculateLiquidityRiskWarnings({
      liquidCoverageMonths: 0.5,
      receivableDependency: 70,
      recurringExpenseBurden: 80,
    });

    expect(result).toHaveLength(3);
  });

  it("returns no warnings when metrics are within thresholds", () => {
    const result = calculateLiquidityRiskWarnings({
      liquidCoverageMonths: 3,
      receivableDependency: 30,
      recurringExpenseBurden: 40,
    });

    expect(result).toEqual([]);
  });

  it("ignores unavailable metrics", () => {
    const result = calculateLiquidityRiskWarnings({
      liquidCoverageMonths: null,
      receivableDependency: null,
      recurringExpenseBurden: null,
    });

    expect(result).toEqual([]);
  });

  it("ignores non-finite metrics", () => {
    const result = calculateLiquidityRiskWarnings({
      liquidCoverageMonths: Number.NaN,
      receivableDependency: Number.POSITIVE_INFINITY,
      recurringExpenseBurden: Number.NEGATIVE_INFINITY,
    });

    expect(result).toEqual([]);
  });
});
