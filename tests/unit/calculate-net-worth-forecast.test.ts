import { describe, expect, it } from "vitest";
import {
  calculateNetWorthForecast,
} from "../../src/lib/intelligence/calculate-net-worth-forecast";

describe("calculateNetWorthForecast", () => {
  it("projects future net worth using average monthly change", () => {
    const result = calculateNetWorthForecast({
      history: [
        { month: "2026-01", netWorth: 100000 },
        { month: "2026-02", netWorth: 110000 },
        { month: "2026-03", netWorth: 120000 },
      ],
      lookbackMonths: 3,
      months: 3,
    });

    expect(result).toEqual([
      {
        monthIndex: 1,
        projectedNetWorth: 130000,
        projectedChange: 10000,
      },
      {
        monthIndex: 2,
        projectedNetWorth: 140000,
        projectedChange: 10000,
      },
      {
        monthIndex: 3,
        projectedNetWorth: 150000,
        projectedChange: 10000,
      },
    ]);
  });

  it("uses only the requested lookback period", () => {
    const result = calculateNetWorthForecast({
      history: [
        { month: "2026-01", netWorth: 50000 },
        { month: "2026-02", netWorth: 60000 },
        { month: "2026-03", netWorth: 100000 },
        { month: "2026-04", netWorth: 110000 },
      ],
      lookbackMonths: 2,
      months: 2,
    });

    expect(result).toEqual([
      {
        monthIndex: 1,
        projectedNetWorth: 120000,
        projectedChange: 10000,
      },
      {
        monthIndex: 2,
        projectedNetWorth: 130000,
        projectedChange: 10000,
      },
    ]);
  });

  it("preserves a negative average change", () => {
    const result = calculateNetWorthForecast({
      history: [
        { month: "2026-01", netWorth: 100000 },
        { month: "2026-02", netWorth: 90000 },
        { month: "2026-03", netWorth: 80000 },
      ],
      lookbackMonths: 3,
      months: 2,
    });

    expect(result).toEqual([
      {
        monthIndex: 1,
        projectedNetWorth: 70000,
        projectedChange: -10000,
      },
      {
        monthIndex: 2,
        projectedNetWorth: 60000,
        projectedChange: -10000,
      },
    ]);
  });

  it("ignores invalid historical values", () => {
    const result = calculateNetWorthForecast({
      history: [
        { month: "2026-01", netWorth: 100000 },
        { month: "2026-02", netWorth: Number.NaN },
        { month: "2026-03", netWorth: 120000 },
      ],
      lookbackMonths: 3,
      months: 1,
    });

    expect(result).toEqual([
      {
        monthIndex: 1,
        projectedNetWorth: 140000,
        projectedChange: 20000,
      },
    ]);
  });

  it("returns empty when there is not enough history to calculate change", () => {
    const result = calculateNetWorthForecast({
      history: [
        { month: "2026-01", netWorth: 100000 },
      ],
      lookbackMonths: 3,
      months: 3,
    });

    expect(result).toEqual([]);
  });

  it("returns empty for invalid configuration", () => {
    expect(
      calculateNetWorthForecast({
        history: [
          { month: "2026-01", netWorth: 100000 },
          { month: "2026-02", netWorth: 110000 },
        ],
        lookbackMonths: 0,
        months: 3,
      }),
    ).toEqual([]);

    expect(
      calculateNetWorthForecast({
        history: [
          { month: "2026-01", netWorth: 100000 },
          { month: "2026-02", netWorth: 110000 },
        ],
        lookbackMonths: 3,
        months: 0,
      }),
    ).toEqual([]);
  });
});

