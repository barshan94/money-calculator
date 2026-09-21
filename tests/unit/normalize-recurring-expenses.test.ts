import { describe, expect, it } from "vitest";

import {
  calculateRecurringMonthlyExpenses,
  normalizeRecurringExpenseToMonthly,
} from "../../src/lib/intelligence/normalize-recurring-expenses";

describe("normalizeRecurringExpenseToMonthly", () => {
  it("keeps monthly expenses unchanged", () => {
    expect(
      normalizeRecurringExpenseToMonthly({
        amount: 12000,
        frequency: "monthly",
      }),
    ).toBe(12000);
  });

  it("converts yearly expenses to monthly", () => {
    expect(
      normalizeRecurringExpenseToMonthly({
        amount: 12000,
        frequency: "yearly",
      }),
    ).toBe(1000);
  });

  it("converts weekly expenses to monthly", () => {
    expect(
      normalizeRecurringExpenseToMonthly({
        amount: 5200,
        frequency: "weekly",
      }),
    ).toBeCloseTo(22533.33, 2);
  });

  it("converts daily expenses to monthly", () => {
    expect(
      normalizeRecurringExpenseToMonthly({
        amount: 365,
        frequency: "daily",
      }),
    ).toBeCloseTo(11102.08, 2);
  });

  it("returns zero for invalid amounts", () => {
    expect(
      normalizeRecurringExpenseToMonthly({
        amount: -500,
        frequency: "monthly",
      }),
    ).toBe(0);

    expect(
      normalizeRecurringExpenseToMonthly({
        amount: Number.NaN,
        frequency: "monthly",
      }),
    ).toBe(0);
  });
});

describe("calculateRecurringMonthlyExpenses", () => {
  it("combines different recurring frequencies", () => {
    const result = calculateRecurringMonthlyExpenses([
      {
        amount: 12000,
        frequency: "monthly",
      },
      {
        amount: 12000,
        frequency: "yearly",
      },
      {
        amount: 5200,
        frequency: "weekly",
      },
    ]);

    expect(result).toBeCloseTo(35533.33, 2);
  });

  it("returns zero for an empty list", () => {
    expect(calculateRecurringMonthlyExpenses([])).toBe(0);
  });
});

