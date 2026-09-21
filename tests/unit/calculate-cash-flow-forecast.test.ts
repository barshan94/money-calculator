import { describe, expect, it } from "vitest";
import {
  calculateCashFlowForecast,
} from "../../src/lib/intelligence/calculate-cash-flow-forecast";

describe("calculateCashFlowForecast", () => {
  it("uses the most recent months as the forecast baseline", () => {
    const result = calculateCashFlowForecast({
      history: [
        { month: "2026-01", income: 5000, expenses: 3000 },
        { month: "2026-02", income: 7000, expenses: 4000 },
        { month: "2026-03", income: 9000, expenses: 5000 },
      ],
      lookbackMonths: 2,
      months: 3,
    });

    expect(result).toEqual([
      {
        monthIndex: 1,
        projectedIncome: 8000,
        projectedExpenses: 4500,
        projectedNet: 3500,
      },
      {
        monthIndex: 2,
        projectedIncome: 8000,
        projectedExpenses: 4500,
        projectedNet: 3500,
      },
      {
        monthIndex: 3,
        projectedIncome: 8000,
        projectedExpenses: 4500,
        projectedNet: 3500,
      },
    ]);
  });

  it("uses all available history when lookback is larger than history", () => {
    const result = calculateCashFlowForecast({
      history: [
        { month: "2026-01", income: 10000, expenses: 6000 },
        { month: "2026-02", income: 12000, expenses: 8000 },
      ],
      lookbackMonths: 12,
      months: 1,
    });

    expect(result[0]).toEqual({
      monthIndex: 1,
      projectedIncome: 11000,
      projectedExpenses: 7000,
      projectedNet: 4000,
    });
  });

  it("ignores invalid historical months", () => {
    const result = calculateCashFlowForecast({
      history: [
        { month: "2026-01", income: Number.NaN, expenses: 6000 },
        { month: "2026-02", income: 10000, expenses: 5000 },
      ],
      lookbackMonths: 2,
      months: 1,
    });

    expect(result[0].projectedIncome).toBe(10000);
    expect(result[0].projectedExpenses).toBe(5000);
    expect(result[0].projectedNet).toBe(5000);
  });

  it("preserves a negative projected net", () => {
    const result = calculateCashFlowForecast({
      history: [
        { month: "2026-01", income: 5000, expenses: 7000 },
      ],
      lookbackMonths: 6,
      months: 2,
    });

    expect(result[0].projectedNet).toBe(-2000);
    expect(result[1].projectedNet).toBe(-2000);
  });

  it("returns an empty forecast for invalid configuration", () => {
    expect(
      calculateCashFlowForecast({
        history: [
          { month: "2026-01", income: 10000, expenses: 5000 },
        ],
        lookbackMonths: 0,
        months: 3,
      }),
    ).toEqual([]);

    expect(
      calculateCashFlowForecast({
        history: [
          { month: "2026-01", income: 10000, expenses: 5000 },
        ],
        lookbackMonths: 3,
        months: 0,
      }),
    ).toEqual([]);

    expect(
      calculateCashFlowForecast({
        history: [],
        lookbackMonths: 3,
        months: 3,
      }),
    ).toEqual([]);
  });
});
