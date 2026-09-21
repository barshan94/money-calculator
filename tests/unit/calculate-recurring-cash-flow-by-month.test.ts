import { describe, expect, it } from "vitest";
import { calculateRecurringCashFlowByMonth } from "../../src/lib/intelligence/calculate-recurring-cash-flow-by-month";

describe("calculateRecurringCashFlowByMonth", () => {
  it("places monthly recurring income into the correct months", () => {
    const result = calculateRecurringCashFlowByMonth(
      [
        {
          transactionType: "income",
          amount: 10000,
          frequency: "monthly",
          nextRunDate: "2026-10-15",
        },
      ],
      "2026-10-01",
      3,
    );

    expect(result).toEqual([
      {
        monthIndex: 1,
        monthlyIncome: 10000,
        monthlyExpenses: 0,
      },
      {
        monthIndex: 2,
        monthlyIncome: 10000,
        monthlyExpenses: 0,
      },
      {
        monthIndex: 3,
        monthlyIncome: 10000,
        monthlyExpenses: 0,
      },
    ]);
  });

  it("places yearly recurring expenses only in their scheduled month", () => {
    const result = calculateRecurringCashFlowByMonth(
      [
        {
          transactionType: "expense",
          amount: 120000,
          frequency: "yearly",
          nextRunDate: "2027-01-15",
        },
      ],
      "2026-10-01",
      6,
    );

    expect(result[0].monthlyExpenses).toBe(0);
    expect(result[1].monthlyExpenses).toBe(0);
    expect(result[2].monthlyExpenses).toBe(0);
    expect(result[3].monthlyExpenses).toBe(120000);
    expect(result[4].monthlyExpenses).toBe(0);
    expect(result[5].monthlyExpenses).toBe(0);
  });

  it("counts daily recurring expenses across forecast months", () => {
    const result = calculateRecurringCashFlowByMonth(
      [
        {
          transactionType: "expense",
          amount: 100,
          frequency: "daily",
          nextRunDate: "2026-10-01",
        },
      ],
      "2026-10-01",
      2,
    );

    expect(result[0].monthlyExpenses).toBe(3100);
    expect(result[1].monthlyExpenses).toBe(3000);
  });

  it("counts weekly recurring income according to actual occurrence dates", () => {
    const result = calculateRecurringCashFlowByMonth(
      [
        {
          transactionType: "income",
          amount: 1000,
          frequency: "weekly",
          nextRunDate: "2026-10-03",
        },
      ],
      "2026-10-01",
      2,
    );

    expect(result[0].monthlyIncome).toBe(5000);
    expect(result[1].monthlyIncome).toBe(4000);
  });

  it("advances occurrences that are before the forecast start", () => {
    const result = calculateRecurringCashFlowByMonth(
      [
        {
          transactionType: "income",
          amount: 5000,
          frequency: "monthly",
          nextRunDate: "2026-08-15",
        },
      ],
      "2026-10-01",
      2,
    );

    expect(result[0].monthlyIncome).toBe(5000);
    expect(result[1].monthlyIncome).toBe(5000);
  });

  it("ignores recurring transfers", () => {
    const result = calculateRecurringCashFlowByMonth(
      [
        {
          transactionType: "transfer",
          amount: 10000,
          frequency: "monthly",
          nextRunDate: "2026-10-15",
        },
      ],
      "2026-10-01",
      2,
    );

    expect(result).toEqual([
      {
        monthIndex: 1,
        monthlyIncome: 0,
        monthlyExpenses: 0,
      },
      {
        monthIndex: 2,
        monthlyIncome: 0,
        monthlyExpenses: 0,
      },
    ]);
  });

  it("ignores invalid amounts and dates", () => {
    const result = calculateRecurringCashFlowByMonth(
      [
        {
          transactionType: "expense",
          amount: -100,
          frequency: "monthly",
          nextRunDate: "2026-10-15",
        },
        {
          transactionType: "expense",
          amount: 200,
          frequency: "monthly",
          nextRunDate: "invalid-date",
        },
      ],
      "2026-10-01",
      1,
    );

    expect(result[0].monthlyExpenses).toBe(0);
  });

  it("returns an empty result for invalid month count", () => {
    expect(
      calculateRecurringCashFlowByMonth(
        [],
        "2026-10-01",
        0,
      ),
    ).toEqual([]);

    expect(
      calculateRecurringCashFlowByMonth(
        [],
        "2026-10-01",
        -1,
      ),
    ).toEqual([]);
  });

  it("handles a monthly recurrence starting on January 31 without skipping February", () => {
    const result = calculateRecurringCashFlowByMonth(
      [
        {
          transactionType: "expense",
          amount: 3000,
          frequency: "monthly",
          nextRunDate: "2027-01-31",
        },
      ],
      "2027-01-01",
      3,
    );

    expect(result[0].monthlyExpenses).toBe(3000);
    expect(result[1].monthlyExpenses).toBe(3000);
    expect(result[2].monthlyExpenses).toBe(3000);
  });
});
