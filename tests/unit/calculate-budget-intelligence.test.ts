import { describe, expect, it } from "vitest";
import { calculateBudgetIntelligence } from "@/lib/intelligence/calculate-budget-intelligence";

describe("calculateBudgetIntelligence", () => {
  it("projects spending when a budget is halfway through its period", () => {
    const result = calculateBudgetIntelligence({
      amount: 10000,
      spent: 5000,
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      asOfDate: "2026-07-16",
    });

    expect(result).toMatchObject({
      elapsedDays: 15,
      remainingDays: 15,
      currentDailySpending: 5000 / 15,
      projectedSpending: 10000,
      projectedDifference: 0,
      status: "on_track",
    });
  });

  it("detects projected overspending beyond the warning threshold", () => {
    const result = calculateBudgetIntelligence({
      amount: 10000,
      spent: 8000,
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      asOfDate: "2026-07-16",
    });

    expect(result?.projectedSpending).toBeGreaterThan(
      11000,
    );
    expect(result?.projectedDifference).toBeGreaterThan(
      1000,
    );
    expect(result?.status).toBe(
      "projected_over_budget",
    );
  });

  it("detects an at-risk budget within the warning threshold", () => {
    const result = calculateBudgetIntelligence({
      amount: 10000,
      spent: 5200,
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      asOfDate: "2026-07-16",
    });

    expect(result?.projectedSpending).toBe(10400);
    expect(result?.projectedDifference).toBe(400);
    expect(result?.status).toBe("at_risk");
  });

  it("handles zero spending", () => {
    const result = calculateBudgetIntelligence({
      amount: 10000,
      spent: 0,
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      asOfDate: "2026-07-16",
    });

    expect(result?.currentDailySpending).toBe(0);
    expect(result?.projectedSpending).toBe(0);
    expect(result?.projectedDifference).toBe(-10000);
    expect(result?.status).toBe("on_track");
  });

  it("handles a completed budget period", () => {
    const result = calculateBudgetIntelligence({
      amount: 10000,
      spent: 12000,
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      asOfDate: "2026-08-01",
    });

    expect(result?.elapsedDays).toBe(30);
    expect(result?.remainingDays).toBe(0);
    expect(result?.projectedSpending).toBe(12000);
    expect(result?.projectedDifference).toBe(2000);
    expect(result?.status).toBe(
      "projected_over_budget",
    );
  });

  it("returns null for invalid configuration", () => {
    const result = calculateBudgetIntelligence({
      amount: 0,
      spent: 100,
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      asOfDate: "2026-07-16",
    });

    expect(result).toBeNull();
  });
});
